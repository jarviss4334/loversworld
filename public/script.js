const socket = io();

// ---------------- MUSIC FEATURE ------------------
document.addEventListener("DOMContentLoaded", () => {

  let musicEnabled = false;
  let currentTrackIndex = 0;
  let currentAudio = null;

  const musicUrls = [
    "https://files.catbox.moe/x4wwty.mp4",
    "https://files.catbox.moe/dr6g3i.mp4",
    "https://files.catbox.moe/hic3ht.mp4",
    "https://files.catbox.moe/fhuh4s.mp4",
    "https://files.catbox.moe/t8e1x9.mp4",
    "https://files.catbox.moe/rmf1cg.mp4",
    "https://files.catbox.moe/ioeftv.mp4",
    "https://files.catbox.moe/ri548a.mp4",
    "https://files.catbox.moe/jl8hvn.mp4",
    "https://files.catbox.moe/ceyeyl.mp4",
    "https://files.catbox.moe/6rm8vd.mp4",
    "https://files.catbox.moe/bcrbr6.mp4",
    "https://files.catbox.moe/paqtae.mp4",
    "https://files.catbox.moe/mx0pha.mp4",
    "https://files.catbox.moe/wfj659.mp4",
    "https://files.catbox.moe/ip9a6m.mp4",
    "https://files.catbox.moe/uj0338.mp4",
    "https://files.catbox.moe/kofc8i.mp4",
    "https://files.catbox.moe/ggx6bs.mp3",
    "https://files.catbox.moe/jf1jjs.mp4",
    "https://files.catbox.moe/i5i7a2.mp4",
    "https://files.catbox.moe/ljzval.mp4",
    "https://files.catbox.moe/5qox9n.mp4",
    "https://files.catbox.moe/hi2whc.mp4",
    "https://files.catbox.moe/h5hevr.mp4",
    "https://files.catbox.moe/qevape.mp4",
    "https://files.catbox.moe/s4us9i.mp3",
    "https://files.catbox.moe/76g7qu.mp4",
    "https://files.catbox.moe/zb08d5.mp4",
    "https://files.catbox.moe/gzdd9f.mp3",
    "https://files.catbox.moe/ni30vo.mp4",
    "https://files.catbox.moe/zqmlpu.mp4",
    "https://files.catbox.moe/t12usb.mp4",
    "https://files.catbox.moe/9olfxv.mp4",
    "https://files.catbox.moe/i541iw.mp4",
    "https://files.catbox.moe/zfgl60.mp4",
    "https://files.catbox.moe/b6fybu.mp4",
    "https://files.catbox.moe/js05nr.mp4",
    "https://files.catbox.moe/5504r6.mp3",
    "https://files.catbox.moe/9pw1ym.mp4",
    "https://files.catbox.moe/9nv0nw.mp3",
    "https://files.catbox.moe/exa8zj.mp3"
  ];

  // ---------------- ELEMENTS ------------------
  const musicToggleLabel = document.getElementById("toggle-music-label");
  const musicToggle = document.getElementById("toggle-music");
  const musicController = document.getElementById("music-controller");
  const trackNameSpan = document.getElementById("track-name");
  const playPauseBtn = document.getElementById("play-pause");
  const nextBtn = document.getElementById("next-track");
  const prevBtn = document.getElementById("prev-track");

  // ---------------- MUSIC FUNCTIONS ------------------
  function playTrack(index) {
    if (currentAudio) currentAudio.pause();
    currentTrackIndex = index;
    currentAudio = new Audio(musicUrls[currentTrackIndex]);
    currentAudio.volume = 0.25;
    currentAudio.play().catch(err => console.log("Autoplay blocked:", err));
    trackNameSpan.textContent = `Track ${currentTrackIndex + 1}`;

    currentAudio.onended = () => {
      currentTrackIndex = (currentTrackIndex + 1) % musicUrls.length;
      playTrack(currentTrackIndex);
    };
  }

  function startMusic() {
    musicEnabled = true;
    showMusicController();
    playTrack(currentTrackIndex);
  }

  function stopMusic() {
    musicEnabled = false;
    if (currentAudio) currentAudio.pause();
  }

  function showMusicController() {
    musicController.style.display = "flex";
    musicController.style.zIndex = "12"; // ensures it's above chat
  }

  function setupMusicToggle() {
    musicToggle.addEventListener("change", () => {
      if (musicToggle.checked) startMusic();
      else {
        stopMusic();
        musicController.style.display = "none";
      }
    });
  }

  // ---------------- NAVIGATOR BUTTONS ------------------
  playPauseBtn.addEventListener("click", () => {
    if (!currentAudio) playTrack(currentTrackIndex);
    else if (currentAudio.paused) currentAudio.play();
    else currentAudio.pause();
  });

  nextBtn.addEventListener("click", () => {
    currentTrackIndex = (currentTrackIndex + 1) % musicUrls.length;
    playTrack(currentTrackIndex);
  });

  prevBtn.addEventListener("click", () => {
    currentTrackIndex = (currentTrackIndex - 1 + musicUrls.length) % musicUrls.length;
    playTrack(currentTrackIndex);
  });

  // ---------------- MUSIC TOGGLE VISIBILITY BASED ON ENV ------------------
  // Uncomment this line and set RENDER_MUSIC_ENABLED in your template/environment
  if (typeof RENDER_MUSIC_ENABLED !== "undefined" && RENDER_MUSIC_ENABLED === "true") {
    musicToggleLabel.style.display = "flex"; // show toggle only if enabled
    setupMusicToggle();
  } else {
    musicToggleLabel.style.display = "none"; // hidden by default
    musicEnabled = false;
  }

});


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
let container = document.getElementById("mobile-user-notifications");

//ACTIVE USERS LIST MYR
socket.on("update users", (users) => {
  if (window.innerWidth >= 600) {
    activeUsers = new Set(users);
    updatePCActiveUsersList();
  } else {
    // optional mobile handling
  }
});


//PC SHIT FUCK
function updatePCActiveUsersList() {
  const usersList = document.getElementById("users-list");
  if (!usersList) return;

  usersList.innerHTML = "";
  activeUsers.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    if (u === username) li.style.fontWeight = "bold"; // highlight yourself
    usersList.appendChild(li);
  });
}


//Join Chat

window.joinChat = function(name) {
  username = name;

  // Only add to activeUsers if desktop
  if (window.innerWidth >= 600) {
    activeUsers.add(username);
    updatePCActiveUsersList();
  }

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

async function ensureMediaStream() {
  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return mediaStream;
}




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

// --- Falling Flowers (existing) ---
function createFlower() {
  const wrapper = document.createElement("div");
  wrapper.classList.add("flower-wrapper");

  const flower = document.createElement("div");
  flower.classList.add("flower");
  flower.innerText = "🌸";

  wrapper.style.left = Math.random() * 100 + "vw";
  flower.style.fontSize = (20 + Math.random() * 15) + "px";

  const fallDuration = 4 + Math.random() * 3;
  const swayDuration = 2 + Math.random() * 2;
  const rotateDuration = 3 + Math.random() * 4;

  wrapper.style.animationDuration = `${fallDuration}s`;
  flower.style.animationDuration = `${swayDuration}s, ${rotateDuration}s`;

  wrapper.appendChild(flower);
  document.body.appendChild(wrapper);

  const maxDuration = Math.max(fallDuration, swayDuration, rotateDuration);
  setTimeout(() => wrapper.remove(), maxDuration * 1000);
}

document.getElementById("toggle-flowers").addEventListener("change", (e) => {
  if (e.target.checked) flowerInterval = setInterval(createFlower, 500);
  else { 
    clearInterval(flowerInterval); 
    document.querySelectorAll(".flower-wrapper").forEach(f => f.remove()); 
  }
});


// --- Glowing Trail Particles (NEW) ---

// Create a trail particle at given coordinates
function createTrail(x, y) {
  const trail = document.createElement("div");
  trail.classList.add("trail-particle");
  trail.style.left = x + "px";
  trail.style.top = y + "px";
  document.body.appendChild(trail);
  setTimeout(() => trail.remove(), 1000); // remove after fade
}

// Desktop: mouse drag
document.addEventListener("mousemove", (e) => {
  if (e.buttons) createTrail(e.clientX, e.clientY);
});

// Mobile: touch drag
document.addEventListener("touchmove", (e) => {
  e.preventDefault();
  for (let t of e.touches) createTrail(t.clientX, t.clientY);
}, { passive: false });


// Lightning
const lightningContainer = document.getElementById("lightning-container");
const flashOverlay = document.getElementById("flash-overlay");

function strikeLightning() {
  if (!document.getElementById("toggle-lightning").checked) return;

  flashOverlay.style.opacity = 0.5;
  setTimeout(() => flashOverlay.style.opacity = 0, 200);
}
setInterval(strikeLightning, 5000 + Math.random() * 3000);

// Mobile join/leave notifications and PC active list update
socket.on("user joined", (user) => {
  if (window.innerWidth >= 600) {
    activeUsers.add(user);
    updatePCActiveUsersList(); // desktop: update list
  } else {
    showMobileNotification(user, "joined"); // mobile: show notification
  }
});

socket.on("user left", (user) => {
  if (window.innerWidth >= 600) {
    activeUsers.delete(user);
    updatePCActiveUsersList(); // desktop: update list
  } else {
    showMobileNotification(user, "left"); // mobile: show notification
  }
});



// Function to show mobile handwriting-style notifications
function showMobileNotification(username, action) {
  let container = document.getElementById("mobile-user-notifications");
  if (!container) {
    container = document.createElement("div");
    container.id = "mobile-user-notifications";
    container.style.position = "absolute";
    container.style.top = "10px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "20";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.classList.add("mobile-notification");
  el.textContent = `${username} ${action}`;
  container.appendChild(el);

  setTimeout(() => el.remove(), 3000); // remove after 3 seconds
}


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
