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

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // New user joins
  socket.on("new user", (username) => {
    if (!username) return;
    connectedUsers.set(socket.id, username);
    io.emit("update users", Array.from(connectedUsers.values()));
    console.log("Users now:", Array.from(connectedUsers.values()));
  });

  // Chat message
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  // Voice message
  socket.on("voice message", (msg) => {
    io.emit("voice message", msg);
  });

  // Typing indicator
  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
  });

  socket.on("stop typing", (user) => {
    socket.broadcast.emit("stop typing", user);
  });

  // --- Voice recording indicator ---
  socket.on("start recording", (user) => {
    socket.broadcast.emit("start recording", user);
  });

  socket.on("stop recording", (user) => {
    socket.broadcast.emit("stop recording", user);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (connectedUsers.has(socket.id)) {
      connectedUsers.delete(socket.id);
      io.emit("update users", Array.from(connectedUsers.values()));
      console.log("User disconnected:", socket.id);
      console.log("Users now:", Array.from(connectedUsers.values()));
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
