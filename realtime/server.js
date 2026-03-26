const http = require("http");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const PORT = Number(process.env.PORT || 3001);

const basePath =
  process.env.SQLITE_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.NODE_ENV === "production" ? "/data" : process.cwd());

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

const dbPath = path.join(basePath, "data.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);

const allowedOrigins = [
  "http://localhost:3000",
  "https://www.sacraluna.pt",
  "https://sacraluna.pt",
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_SOCKET_URL,
].filter(Boolean);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("socket server running");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const roomConsultor = (consultorId) => `consultor:${consultorId}`;
const roomSession = (sessionId) => `session:${sessionId}`;

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("register_consultor", ({ consultorId }) => {
    if (!consultorId) return;

    socket.join(roomConsultor(consultorId));
    console.log(`consultor ${consultorId} joined ${roomConsultor(consultorId)}`);
  });

  socket.on("join", ({ sessionId }) => {
    if (!sessionId) return;

    socket.join(roomSession(sessionId));
    console.log(`socket ${socket.id} joined ${roomSession(sessionId)}`);
  });

  socket.on("msg", (data) => {
    if (!data?.sessionId || !data?.text) return;

    const sessionId = String(data.sessionId);
    const text = String(data.text).trim();
    const senderRole = data.senderRole === "consultor" ? "consultor" : "cliente";

    if (!text) return;

    try {
      db.prepare(
        `
        INSERT INTO chat_messages (session_id, sender_role, text, sent_at)
        VALUES (?, ?, ?, strftime('%s','now'))
        `
      ).run(sessionId, senderRole, text);
    } catch (e) {
      console.error("ERRO ao guardar chat_messages:", e);
    }

    io.to(roomSession(sessionId)).emit("msg", {
      sessionId,
      text,
      senderRole,
      at: Date.now(),
    });
  });

  socket.on("call_request", ({ consultorId, sessionId, clienteNome }) => {
    if (!consultorId || !sessionId) return;

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

    io.to(roomSession(sessionId)).emit("call_status", {
      sessionId: String(sessionId),
      status: "accepted",
      at: Date.now(),
    });
  });

  socket.on("call_reject", ({ consultorId, sessionId }) => {
    if (!consultorId || !sessionId) return;

    io.to(roomSession(sessionId)).emit("session_ended", {
      sessionId: String(sessionId),
      reason: "rejected",
      at: Date.now(),
    });
  });

  socket.on("session_end", ({ sessionId }) => {
    if (!sessionId) return;

    io.to(roomSession(sessionId)).emit("session_ended", {
      sessionId: String(sessionId),
      reason: "finished",
      at: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});