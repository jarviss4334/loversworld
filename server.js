const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));
app.get("/ping", (req, res) => {
  res.send("Server is alive ✅");
});
const connectedUsers = new Map();
const rooms = new Map();
let roomCounter = 1;
function createRoom() {
  const roomId = `room-${roomCounter++}`;
  rooms.set(roomId, new Set());
  return roomId;
}

function findAvailableRoom() {
  for (const [roomId, members] of rooms.entries()) {
    if (members.size < 2) return roomId;
  }
  return null;
}

function getUsernamesInRoom(roomId) {
  const members = rooms.get(roomId) || new Set();
  const names = [];
  for (const socketId of members) {
    const uname = connectedUsers.get(socketId);
    if (uname) names.push(uname);
  }
  return names;
}
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  let roomId = findAvailableRoom() || createRoom();
  socket.join(roomId);
  rooms.get(roomId).add(socket.id);
  socket.data.roomId = roomId;

  socket.emit("room assigned", roomId);
  io.to(roomId).emit("update users", getUsernamesInRoom(roomId));
  socket.on("new user", (username) => {
    if (!username) return;
    connectedUsers.set(socket.id, username);
    io.to(roomId).emit("update users", getUsernamesInRoom(roomId));
  });
  socket.on("chat message", (msg) => {
    socket.broadcast.to(roomId).emit("chat message", msg);
  });
  socket.on("voice message", (msg) => {
    socket.broadcast.to(roomId).emit("voice message", msg);
  });
  socket.on("typing", (user) => socket.to(roomId).emit("typing", user));
  socket.on("stop typing", (user) => socket.to(roomId).emit("stop typing", user));
  socket.on("start recording", (user) => socket.to(roomId).emit("start recording", user));
  socket.on("stop recording", (user) => socket.to(roomId).emit("stop recording", user));
  socket.on("delete message", (data) => {
    io.to(roomId).emit("delete message", data);
  });
  socket.on("disconnect", () => {
    rooms.get(roomId)?.delete(socket.id);
    connectedUsers.delete(socket.id);
    if (rooms.get(roomId)?.size === 0) {
      rooms.delete(roomId);
      console.log(`${roomId} deleted (empty)`);
    } else {
      io.to(roomId).emit("update users", getUsernamesInRoom(roomId));
    }
    console.log("User disconnected:", socket.id);
  });
  socket.on("error", (err) => console.error("Socket error:", err));
});
app.get("/config", (req, res) => {
  res.json({
    musicEnabled: process.env.MUSIC_ENABLED === "true",
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
