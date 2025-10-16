const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

const username = prompt("Enter your name:") || "User";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    const msg = { user: username, text: input.value };
    socket.emit("chat message", msg);
    input.value = "";
  }
});

socket.on("chat message", (msg) => {
  const item = document.createElement("li");
  item.textContent = `${msg.user}: ${msg.text}`;
  item.classList.add(msg.user === username ? "sent" : "received");
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
});
