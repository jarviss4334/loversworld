const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log("A user connected");

  // Broadcast chat messages to all clients
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  // Broadcast voice messages to all clients
  socket.on("voice message", (msg) => {
    io.emit("voice message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Use Render's dynamic port or fallback to 3000 for local testing
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
