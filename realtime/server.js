const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 3001);

const allowedOrigins = [
  "http://localhost:3000",
  "https://www.sacraluna.pt",
  "https://sacraluna.pt",
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.PUBLIC_SITE_URL,
].filter(Boolean);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("socket server running");
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin não permitida: ${origin}`));
    },
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
    if (!data || !data.sessionId || !data.text) return;

    io.to(roomSession(data.sessionId)).emit("msg", {
      sessionId: String(data.sessionId),
      text: String(data.text),
      senderRole: data.senderRole === "consultor" ? "consultor" : "cliente",
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