const socket = io();

let username = "";

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const recordBtn = document.getElementById("record-btn");
const typingIndicator = document.getElementById("typing-indicator");

let flowerInterval = null;
let lightningInterval = null;
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];

let usersTyping = new Set();
let recordingUsers = new Set();
let activeUsers = new Set();
let typingTimeout;
let isTyping = false;

// Join Chat
window.joinChat = function(name) {
  username = name;
  socket.emit("new user", username);
};

// Append Message
function appendMessage(msgObj, type) {
  const li = document.createElement("li");
  li.classList.add(type);
  li.innerHTML = `<strong>${msgObj.user}:</strong> ${msgObj.text}`;

  const glowEnabled = document.getElementById("toggle-glow");
  if (glowEnabled && glowEnabled.checked) {
    li.classList.add("glow");
    li.addEventListener("animationend", () => li.classList.remove("glow"), { once: true });
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// Send text
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!input.value || !username) return;

  const msg = { user: username, text: input.value };
  socket.emit("chat message", msg);

  appendMessage(msg, "sent");

  const lastMsg = document.querySelector("#messages li:last-child");
  if (lastMsg) {
    const glowToggle = document.getElementById("toggle-glow");
    const heartToggle = document.getElementById("toggle-heart"); // rename toggle if needed

    // Glow effect
    if (glowToggle && glowToggle.checked) {
      lastMsg.classList.add("glow");
      lastMsg.addEventListener("animationend", () => {
        lastMsg.classList.remove("glow");
      }, { once: true });
    }

    // Heart ripple effect
    if (heartToggle && heartToggle.checked) {
      const heart = document.createElement("div");
      heart.classList.add("heart-ripple");
      lastMsg.appendChild(heart);
      setTimeout(() => heart.remove(), 700);
    }
  }

  input.value = "";
  socket.emit("stop typing", username);
});

// Receive text
socket.on("chat message", (msg) => {
  if (msg.user !== username) {
    appendMessage(msg, "received");

    const lastMsg = document.querySelector("#messages li:last-child");
    if (lastMsg) {
      const glowToggle = document.getElementById("toggle-glow");
      const heartToggle = document.getElementById("toggle-heart");

      // Glow effect
      if (glowToggle && glowToggle.checked) {
        lastMsg.classList.add("glow");
        lastMsg.addEventListener("animationend", () => {
          lastMsg.classList.remove("glow");
        }, { once: true });
      }

      // Heart ripple effect
      if (heartToggle && heartToggle.checked) {
        const heart = document.createElement("div");
        heart.classList.add("heart-ripple");
        lastMsg.appendChild(heart);
        setTimeout(() => heart.remove(), 700);
      }
    }
  }
});



async function startRecording() {
  if (!username) return alert("Enter your name first.");
  socket.emit("start recording", username);

  const stream = await ensureMediaStream();
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("voice message", { user: username, audio: reader.result });
    };
    reader.readAsDataURL(blob);
  };
  mediaRecorder.start();
  recordBtn.textContent = "⏺️ Recording...";
}

function stopRecording() {
  socket.emit("stop recording", username);
  if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
  recordBtn.textContent = "🎤";
}

recordBtn.addEventListener("mousedown", e => { e.preventDefault(); startRecording(); });
recordBtn.addEventListener("mouseup", e => { e.preventDefault(); stopRecording(); });
recordBtn.addEventListener("touchstart", e => { e.preventDefault(); startRecording(); }, { passive: false });
recordBtn.addEventListener("touchend", e => { e.preventDefault(); stopRecording(); }, { passive: false });

// Receive voice messages
socket.on("voice message", (msg) => {
  const li = document.createElement("li");
  li.classList.add(msg.user === username ? "sent" : "received");

  li.innerHTML = `<strong>${msg.user}:</strong><br>`;
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = msg.audio;
  audio.preload = "none";
  audio.style.maxWidth = "100%";
  li.appendChild(audio);

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

function createFlower() {
  // Wrapper div for vertical fall
  const wrapper = document.createElement("div");
  wrapper.classList.add("flower-wrapper");

  // Flower div inside wrapper for sway + rotate + glow
  const flower = document.createElement("div");
  flower.classList.add("flower");
  flower.innerText = "🌸";

  // Random horizontal start position
  wrapper.style.left = Math.random() * 100 + "vw";

  // Random font size for depth effect
  flower.style.fontSize = (20 + Math.random() * 15) + "px";

  // Random animation durations
  const fallDuration = 4 + Math.random() * 3;   // 4-7s
  const swayDuration = 2 + Math.random() * 2;   // 2-4s
  const rotateDuration = 3 + Math.random() * 4; // 3-7s

  wrapper.style.animationDuration = `${fallDuration}s`;
  flower.style.animationDuration = `${swayDuration}s, ${rotateDuration}s`;

  wrapper.appendChild(flower);
  document.body.appendChild(wrapper);

  // Remove wrapper after max animation duration
  const maxDuration = Math.max(fallDuration, swayDuration, rotateDuration);
  setTimeout(() => wrapper.remove(), maxDuration * 1000);
}

// Toggle flowers
document.getElementById("toggle-flowers").addEventListener("change", (e) => {
  if (e.target.checked) flowerInterval = setInterval(createFlower, 500);
  else { 
    clearInterval(flowerInterval); 
    document.querySelectorAll(".flower-wrapper").forEach(f => f.remove()); 
  }
});


// Lightning
const lightningContainer = document.getElementById("lightning-container");
const flashOverlay = document.getElementById("flash-overlay");

function strikeLightning() {
  if (!document.getElementById("toggle-lightning").checked) return;

  flashOverlay.style.opacity = 0.5;
  setTimeout(() => flashOverlay.style.opacity = 0, 200);
}
setInterval(strikeLightning, 5000 + Math.random() * 3000);

// Active users
socket.on("update users", (usersArray) => {
  activeUsers = new Set(usersArray);
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";
  activeUsers.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    if(u === username) li.style.fontWeight = "bold";
    usersList.appendChild(li);
  });
});

// Typing system
input.addEventListener("input", () => {
  if (!isTyping) socket.emit("typing", username);
  isTyping = true;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => { socket.emit("stop typing", username); isTyping = false; }, 1000);
});

socket.on("typing", user => { if(user !== username){ usersTyping.add(user); updateIndicator(); }});
socket.on("stop typing", user => { usersTyping.delete(user); updateIndicator(); });

socket.on("start recording", user => { if(user !== username){ recordingUsers.add(user); updateIndicator(); }});
socket.on("stop recording", user => { recordingUsers.delete(user); updateIndicator(); });

function updateIndicator() {
  if (recordingUsers.size > 0) typingIndicator.textContent = [...recordingUsers].join(", ") + " is recording...";
  else if (usersTyping.size > 0) typingIndicator.textContent = [...usersTyping].join(", ") + " is typing...";
  else typingIndicator.textContent = "";
}

/* Background slideshow — FIXED — no zoom */
const bgImages = [
  "https://files.catbox.moe/jzvuld.jpg",
  "https://files.catbox.moe/huovh5.jpg",
  "https://files.catbox.moe/a0qix1.jpg",
  "https://files.catbox.moe/mgt1w8.jpg",
  "https://files.catbox.moe/gvz7za.jpg",
  "https://files.catbox.moe/h545yn.jpg",
  "https://files.catbox.moe/c5bv8w.jpg",
  "https://files.catbox.moe/iypooq.jpg",
  "https://files.catbox.moe/ylpobz.jpg",
  "https://files.catbox.moe/4u6cnb.jpg"
];

/* Background slideshow — slower timing (25s per image) */
let bgIndex = 0;
const chatContainer = document.querySelector(".chat-container");
chatContainer.style.backgroundImage = `url('${bgImages[0]}')`;

function changeBackground() {
  bgIndex = (bgIndex + 1) % bgImages.length;
  chatContainer.style.setProperty("--bg-next", `url('${bgImages[bgIndex]}')`);
  chatContainer.classList.add("fade-bg");

  setTimeout(() => {
    chatContainer.style.backgroundImage = `url('${bgImages[bgIndex]}')`;
    chatContainer.classList.remove("fade-bg");
  }, 1500); // fade duration remains 1.5s
}

// Change every 25 seconds
setInterval(changeBackground, 25000);

const menuBtn = document.getElementById("menu-btn");
const effectSwitches = document.getElementById("effect-switches");

menuBtn.addEventListener("click", () => {
  effectSwitches.classList.toggle("show");
});

// Optional: click outside to close the menu
document.addEventListener("click", (e) => {
  if (!menuBtn.contains(e.target) && !effectSwitches.contains(e.target)) {
    effectSwitches.classList.remove("show");
  }
});

