/* realtime/server.js */
const http = require("http");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
const path = require("path");

const PORT = 3001;

const dbPath = path.join(process.cwd(), "data.sqlite");
const db = new Database(dbPath);

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

// Rooms helpers
const roomConsultor = (consultorId) => `consultor:${consultorId}`;
const roomSession = (sessionId) => `session:${sessionId}`;

function setConsultorOnline(consultorId, online) {
  db.prepare(`
    UPDATE consultores
    SET online = ?, last_seen_at = strftime('%s','now')
    WHERE id = ?
  `).run(online ? 1 : 0, consultorId);
}

function setConsultorOcupado(consultorId, ocupado) {
  db.prepare(`
    UPDATE consultores
    SET ocupado = ?, last_seen_at = strftime('%s','now')
    WHERE id = ?
  `).run(ocupado ? 1 : 0, consultorId);
}

function getConsultorIdBySession(sessionId) {
  const row = db.prepare(`
    SELECT consultor_id
    FROM chat_sessions
    WHERE id = ?
  `).get(sessionId);

  return row?.consultor_id ? Number(row.consultor_id) : null;
}

io.on("connection", (socket) => {
  console.log("🔌 socket connected:", socket.id);

  socket.on("register_consultor", ({ consultorId }) => {
    if (!consultorId) return;

    const id = Number(consultorId);
    socket.consultorId = id;

    socket.join(roomConsultor(id));
    setConsultorOnline(id, true);
    setConsultorOcupado(id, false);

    console.log(`✅ consultor ${id} registado (${socket.id})`);
  });

  socket.on("join", ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(roomSession(sessionId));
    console.log(`🟦 joined session ${sessionId} (${socket.id})`);
  });

  socket.on("msg", (payload) => {
    if (!payload?.sessionId || !payload?.text) return;

    const msg = {
      sessionId: payload.sessionId,
      text: String(payload.text),
      senderRole: payload.senderRole === "consultor" ? "consultor" : "cliente",
      at: Date.now(),
    };

    io.to(roomSession(payload.sessionId)).emit("msg", msg);
  });

  socket.on("call_request", ({ consultorId, sessionId, clienteNome }) => {
    if (!consultorId || !sessionId) return;

    console.log(`📞 call_request consultor=${consultorId} session=${sessionId}`);

    io.to(roomConsultor(consultorId)).emit("incoming_call", {
      consultorId: Number(consultorId),
      sessionId: String(sessionId),
      clienteNome: clienteNome ? String(clienteNome) : "Cliente",
      at: Date.now(),
    });

    io.to(roomSession(sessionId)).emit("call_status", {
      sessionId: String(sessionId),
      status: "ringing",
      at: Date.now(),
    });
  });

  socket.on("call_accept", ({ consultorId, sessionId }) => {
    if (!consultorId || !sessionId) return;

    const id = Number(consultorId);

    console.log(`✅ call_accept consultor=${id} session=${sessionId}`);

    setConsultorOnline(id, true);
    setConsultorOcupado(id, true);

    io.to(roomConsultor(id)).emit("call_status", {
      sessionId: String(sessionId),
      status: "accepted",
      at: Date.now(),
    });

    io.to(roomSession(sessionId)).emit("call_status", {
      sessionId: String(sessionId),
      status: "accepted",
      at: Date.now(),
    });
  });

  socket.on("call_reject", ({ consultorId, sessionId }) => {
    if (!consultorId || !sessionId) return;

    const id = Number(consultorId);

    console.log(`❌ call_reject consultor=${id} session=${sessionId}`);

    setConsultorOnline(id, true);
    setConsultorOcupado(id, false);

    io.to(roomConsultor(id)).emit("call_status", {
      sessionId: String(sessionId),
      status: "rejected",
      at: Date.now(),
    });

    io.to(roomSession(sessionId)).emit("call_status", {
      sessionId: String(sessionId),
      status: "rejected",
      at: Date.now(),
    });
  });

  socket.on("session_end", ({ sessionId }, ack) => {
    if (!sessionId) {
      if (typeof ack === "function") ack({ ok: false });
      return;
    }

    console.log(`🛑 session_end session=${sessionId}`);

    const consultorId = getConsultorIdBySession(sessionId);

    if (consultorId) {
      setConsultorOnline(consultorId, true);
      setConsultorOcupado(consultorId, false);
    }

    io.to(roomSession(sessionId)).emit("session_ended", {
      sessionId: String(sessionId),
      at: Date.now(),
    });

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected:", socket.id);

    if (socket.consultorId) {
      setConsultorOnline(socket.consultorId, false);
      setConsultorOcupado(socket.consultorId, false);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🟩 Realtime server on http://localhost:${PORT}`);
});