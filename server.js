const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

console.log("Socket server running on port 3001");

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

    io.to(roomSession(data.sessionId)).emit("msg", {
      sessionId: String(data.sessionId),
      text: String(data.text),
      senderRole: data.senderRole === "consultor" ? "consultor" : "cliente",
      at: Date.now(),
    });
  });

  socket.on("call_request", ({ consultorId, sessionId, clienteNome }) => {
    if (!consultorId || !sessionId) return;

    console.log(`call_request consultor=${consultorId} session=${sessionId}`);

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

    console.log(`call_accept ${sessionId}`);

    io.to(roomSession(sessionId)).emit("call_status", {
      sessionId,
      status: "accepted",
      at: Date.now(),
    });
  });

  socket.on("call_reject", ({ consultorId, sessionId }) => {
    if (!consultorId || !sessionId) return;

    console.log(`call_reject ${sessionId}`);

    io.to(roomSession(sessionId)).emit("session_ended", {
      sessionId: String(sessionId),
      reason: "rejected",
      at: Date.now(),
    });
  });

  socket.on("session_end", ({ sessionId }) => {
    if (!sessionId) return;

    console.log(`session_end ${sessionId}`);

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