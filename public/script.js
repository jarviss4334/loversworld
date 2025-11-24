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

// --- Join chat function ---
window.joinChat = function(name) {
  username = name;
  socket.emit("new user", username);
};

// --- Append message ---
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

// --- Form submit ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!input.value || !username) return;
  const msg = { user: username, text: input.value };
  socket.emit("chat message", msg);
  appendMessage(msg, "sent");
  input.value = "";
  socket.emit("stop typing", username);
});

// --- Receive text messages ---
socket.on("chat message", (msg) => {
  if (msg.user !== username) appendMessage(msg, "received");
});

// --- Voice recording ---
async function ensureMediaStream() {
  if (mediaStream) return mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return mediaStream;
  } catch (err) {
    alert("Microphone access denied.");
    throw err;
  }
}

async function startRecording() {
  if (!username) { alert("Enter your name first."); return; }
  socket.emit("start recording", username);

  try {
    const stream = await ensureMediaStream();
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };
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
    recordBtn.setAttribute("aria-pressed", "true");
  } catch (err) {
    console.error("startRecording error:", err);
  }
}

function stopRecording() {
  if (!username) return;
  socket.emit("stop recording", username);
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  recordBtn.textContent = "🎤";
  recordBtn.setAttribute("aria-pressed", "false");
}

// Mouse & touch events
recordBtn.addEventListener("mousedown", e => { e.preventDefault(); startRecording(); });
recordBtn.addEventListener("mouseup",   e => { e.preventDefault(); stopRecording(); });
recordBtn.addEventListener("touchstart", e => { e.preventDefault(); startRecording(); }, { passive: false });
recordBtn.addEventListener("touchend",   e => { e.preventDefault(); stopRecording(); }, { passive: false });

// --- Receive voice messages ---
socket.on("voice message", (msg) => {
  const li = document.createElement("li");
  li.classList.add(msg.user === username ? "sent" : "received");

  const label = document.createElement("div");
  label.style.fontWeight = "600";
  label.textContent = `${msg.user}: `;

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = msg.audio;
  audio.preload = "none";
  audio.style.maxWidth = "100%";

  li.appendChild(label);
  li.appendChild(audio);

  const glowEnabled = document.getElementById("toggle-glow");
  if (glowEnabled && glowEnabled.checked) {
    li.classList.add("glow");
    li.addEventListener("animationend", () => li.classList.remove("glow"), { once: true });
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// --- Flowers effect ---
function createFlower() {
  const flower = document.createElement("div");
  flower.classList.add("flower");
  flower.innerText = "🌸";
  flower.style.left = Math.random() * 100 + "vw";
  flower.style.animationDuration = 3 + Math.random() * 3 + "s";
  document.body.appendChild(flower);
  setTimeout(() => flower.remove(), 6000);
}
document.getElementById("toggle-flowers").addEventListener("change", (e) => {
  if (e.target.checked) flowerInterval = setInterval(createFlower, 500);
  else { clearInterval(flowerInterval); document.querySelectorAll(".flower").forEach(f => f.remove()); }
});

// --- Lightning effect ---
const lightningContainer = document.getElementById("lightning-container");
const flashOverlay = document.getElementById("flash-overlay");

function strikeLightning() {
  if (!document.getElementById("toggle-lightning").checked) return;
  const segments = [];
  let x = 0, y = 0;

  for (let i = 0; i < 15; i++) {
    const seg = document.createElement("div");
    seg.classList.add("lightning-segment");
    const angle = Math.random() * 40 - 20;
    seg.style.transform = `rotate(${angle}deg)`;
    seg.style.left = x + "px";
    seg.style.top = y + "px";
    lightningContainer.appendChild(seg);
    segments.push(seg);
    x += 20 + Math.random() * 10;
    y += 30 + Math.random() * 10;
  }

  segments.forEach((seg, index) => {
    setTimeout(() => { seg.style.opacity = 1; setTimeout(() => seg.remove(), 150); }, index*50);
  });

  flashOverlay.style.opacity = 0.5;
  setTimeout(() => flashOverlay.style.opacity = 0, 150);
}
setInterval(strikeLightning, 5000 + Math.random() * 3000);

// --- Active Users ---
function updateUsersList() {
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";
  activeUsers.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    if(u === username) li.style.fontWeight = "bold";
    usersList.appendChild(li);
  });
}
socket.on("update users", (usersArray) => { activeUsers = new Set(usersArray); updateUsersList(); });

// --- Typing indicator ---
input.addEventListener("input", () => {
  if (!isTyping) { socket.emit("typing", username); isTyping = true; }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => { socket.emit("stop typing", username); isTyping = false; }, 1000);
});
socket.on("typing", (user) => { if(user !== username) { usersTyping.add(user); updateIndicator(); } });
socket.on("stop typing", (user) => { usersTyping.delete(user); updateIndicator(); });
socket.on("start recording", (user) => { if(user !== username) { recordingUsers.add(user); updateIndicator(); } });
socket.on("stop recording", (user) => { recordingUsers.delete(user); updateIndicator(); });
function updateIndicator() {
  if (recordingUsers.size > 0) typingIndicator.textContent = Array.from(recordingUsers).join(", ") + " is recording audio...";
  else if (usersTyping.size > 0) typingIndicator.textContent = Array.from(usersTyping).join(", ") + " is typing...";
  else typingIndicator.textContent = "";
}

// --- Smooth slideshow for page & chat container ---
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
let bgIndex = 0;
const pageBg = document.createElement("div");
pageBg.id = "page-bg";
document.body.prepend(pageBg);
const chatContainer = document.querySelector(".chat-container");

function changeBackgrounds() {
  const nextImage = bgImages[bgIndex];
  bgIndex = (bgIndex + 1) % bgImages.length;

  // Page background fade
  pageBg.style.opacity = 0;
  setTimeout(() => { pageBg.style.backgroundImage = `url('${nextImage}')`; pageBg.style.opacity = 1; }, 200);

  // Chat container background fade
  chatContainer.style.setProperty('--chat-bg-next', `url('${nextImage}')`);
  chatContainer.style.opacity = 0;
  setTimeout(() => { chatContainer.style.backgroundImage = `url('${nextImage}')`; chatContainer.style.opacity = 1; }, 200);
}

changeBackgrounds();
setInterval(changeBackgrounds, 20000);

// --- 3-dot menu toggle ---
const menuBtn = document.getElementById("menu-btn");
const effectSwitches = document.getElementById("effect-switches");

menuBtn.addEventListener("click", () => {
  effectSwitches.classList.toggle("show");
});

