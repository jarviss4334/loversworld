// server.js (fixed)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Map of socket.id => username
const connectedUsers = new Map();
// Rooms map: roomId => Set of socket ids
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

  // Immediately assign the connecting socket to a room (prevents global broadcasts)
  let roomId = findAvailableRoom();
  if (!roomId) {
    roomId = createRoom();
  }

  socket.join(roomId);
  rooms.get(roomId).add(socket.id);
  socket.data.roomId = roomId;

  // Inform the socket of its assigned room (client may ignore; it's optional)
  socket.emit("room assigned", roomId);

  // Update the users list for this room (usernames may arrive later when 'new user' fires)
  io.to(roomId).emit("update users", getUsernamesInRoom(roomId));

  // Assign username when client sends it (don't delay room assignment)
  socket.on("new user", (username) => {
    if (!username) return;
    connectedUsers.set(socket.id, username);
    // Emit updated usernames to only the members of this socket's room
    const r = socket.data.roomId;
    if (r) io.to(r).emit("update users", getUsernamesInRoom(r));
    console.log(`${username} set for socket ${socket.id} in ${r}`);
  });

  // Chat message -> emit only to the user's room
  socket.on("chat message", (msg) => {
    const r = socket.data.roomId;
    if (!r) return;
    io.to(r).emit("chat message", msg);
  });

  // Voice message -> room only
  socket.on("voice message", (msg) => {
    const r = socket.data.roomId;
    if (!r) return;
    io.to(r).emit("voice message", msg);
  });

  // Typing indicators -> broadcast to room (excluding sender)
  socket.on("typing", (user) => {
    const r = socket.data.roomId;
    if (!r) return;
    socket.to(r).emit("typing", user);
  });

  socket.on("stop typing", (user) => {
    const r = socket.data.roomId;
    if (!r) return;
    socket.to(r).emit("stop typing", user);
  });

  // Voice recording indicators -> room only
  socket.on("start recording", (user) => {
    const r = socket.data.roomId;
    if (!r) return;
    socket.to(r).emit("start recording", user);
  });

  socket.on("stop recording", (user) => {
    const r = socket.data.roomId;
    if (!r) return;
    socket.to(r).emit("stop recording", user);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const r = socket.data.roomId;
    if (r && rooms.has(r)) {
      const members = rooms.get(r);
      members.delete(socket.id);

      // Remove username mapping
      if (connectedUsers.has(socket.id)) connectedUsers.delete(socket.id);

      // If room becomes empty, delete it
      if (members.size === 0) {
        rooms.delete(r);
        console.log(`${r} deleted (empty)`);
      } else {
        // Otherwise update the remaining users in the room
        io.to(r).emit("update users", getUsernamesInRoom(r));
        console.log(`${r} now has ${members.size} member(s) after disconnect`);
      }
    } else {
      // Ensure we still remove username if somehow connectedUsers had it
      if (connectedUsers.has(socket.id)) connectedUsers.delete(socket.id);
    }
  });

  // Catch any socket errors to prevent server crash
  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

// Handle port conflicts gracefully
const PORT = process.env.PORT || 3000;
server.listen(PORT)
  .on("listening", () => console.log(`Server running on port ${PORT}`))
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Try closing previous server or changing the port.`);
    } else {
      console.error("Server error:", err);
    }
  });
