const socket = io();
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const messages = document.getElementById("messages");
  const recordBtn = document.getElementById("record-btn");
  const typingIndicator = document.getElementById("typing-indicator");
  const replyBar = document.getElementById("reply-bar");
  const repliedMessageText = document.getElementById("replied-message-text");
  const cancelReplyBtn = document.getElementById("cancel-reply");
  const musicToggleLabel = document.getElementById("toggle-music-label");
  const musicToggle = document.getElementById("toggle-music");
  const musicController = document.getElementById("music-controller");
  const trackNameSpan = document.getElementById("track-name");
  const playPauseBtn = document.getElementById("play-pause");
  const nextBtn = document.getElementById("next-track");
  const prevBtn = document.getElementById("prev-track");
  const menuBtn = document.getElementById("menu-btn");
  const effectSwitches = document.getElementById("effect-switches");
  const lightningContainer = document.getElementById("lightning-container");
  const flashOverlay = document.getElementById("flash-overlay");
  let username = "";
  let messageCounter = 0;
  let repliedMessage = null; // { user, text } when replying
  let musicEnabled = false;
  let currentTrackIndex = 0;
  let currentAudio = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let flowerInterval = null;
  let usersTyping = new Set();
  let recordingUsers = new Set();
  let activeUsers = new Set();
  let typingTimeout = null;
  let isTyping = false;
  let startX = 0;
  let isRecording = false;
  let canceled = false;
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
  function playTrack(index) {
    if (currentAudio) currentAudio.pause();
    currentTrackIndex = index % musicUrls.length;
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
    if (musicController) musicController.style.display = "flex";
    playTrack(currentTrackIndex);
  }
  function stopMusic() {
    musicEnabled = false;
    if (currentAudio) currentAudio.pause();
    if (musicController) musicController.style.display = "none";
  }

  if (typeof RENDER_MUSIC_ENABLED !== "undefined" && RENDER_MUSIC_ENABLED === "true") {
    if (musicToggleLabel) musicToggleLabel.style.display = "flex";
    if (musicToggle) musicToggle.addEventListener("change", () => {
      if (musicToggle.checked) startMusic(); else stopMusic();
    });
  } else {
    if (musicToggleLabel) musicToggleLabel.style.display = "none";
    musicEnabled = false;
  }

  if (playPauseBtn) playPauseBtn.addEventListener("click", () => {
    if (!currentAudio) playTrack(currentTrackIndex);
    else if (currentAudio.paused) currentAudio.play();
    else currentAudio.pause();
  });
  if (nextBtn) nextBtn.addEventListener("click", () => { currentTrackIndex = (currentTrackIndex + 1) % musicUrls.length; playTrack(currentTrackIndex); });
  if (prevBtn) prevBtn.addEventListener("click", () => { currentTrackIndex = (currentTrackIndex - 1 + musicUrls.length) % musicUrls.length; playTrack(currentTrackIndex); });
socket.on("update users", (users) => {
    if (window.innerWidth >= 600) {
      activeUsers = new Set(users);
      updatePCActiveUsersList();
    }
  });

  function updatePCActiveUsersList() {
    const usersList = document.getElementById("users-list");
    if (!usersList) return;
    usersList.innerHTML = "";
    activeUsers.forEach(u => {
      const li = document.createElement("li");
      li.textContent = u;
      if (u === username) li.style.fontWeight = "bold";
      usersList.appendChild(li);
    });
  }

  window.joinChat = function(name) {
    if (!name) return alert("Please enter your name");
    username = name;
    if (window.innerWidth >= 600) {
      activeUsers.add(username);
      updatePCActiveUsersList();
    }
    socket.emit("new user", username);
  };
  function appendMessage(msgObj, type) {
    const li = document.createElement("li");
    li.classList.add(type);
    li.dataset.user = msgObj.user;
    li.dataset.text = msgObj.text || "";
    li.dataset.id = msgObj.id || (messageCounter++).toString(); // unique ID
    let replyHtml = "";
    if (msgObj.replied) {
      let preview = String(msgObj.replied.text || "").trim();
      if (preview.length > 120) preview = preview.slice(0, 117) + "...";
      replyHtml = `<div class="replied-preview" style="background:#f8f8f8; border-left:4px solid #ff69b4; padding:6px 8px; margin-bottom:6px; font-size:0.88em; border-radius:4px;">
                    <strong>${escapeHtml(msgObj.replied.user)}:</strong> ${escapeHtml(preview)}
                   </div>`;
    }

    li.innerHTML = `${replyHtml}<strong>${escapeHtml(msgObj.user)}:</strong> ${escapeHtml(msgObj.text)}`;
    const glowToggle = document.getElementById("toggle-glow");
    if (glowToggle && glowToggle.checked) {
      li.classList.add("glow");
      li.addEventListener("animationend", () => li.classList.remove("glow"), { once: true });
    }
    const heartToggle = document.getElementById("toggle-heart");
    if (heartToggle && heartToggle.checked) {
      const heart = document.createElement("div");
      heart.classList.add("heart-ripple");
      li.appendChild(heart);
      setTimeout(() => heart.remove(), 700);
    }
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!input.value || !username) return;

  const text = input.value.trim();
  const msg = {
    user: username,
    text,
    id: (messageCounter++).toString(),
    ts: Date.now()
  };
  if (repliedMessage) {
    msg.replied = {
      user: repliedMessage.user,
      text: repliedMessage.text,
      id: repliedMessage.id || null
    };
  }
  if (text === "dlt" && repliedMessage) {
    socket.emit("delete message", {
        targetUser: repliedMessage.user,
        targetText: repliedMessage.text,
        targetId: repliedMessage.id, // SEND ID
        commandUser: username,
        commandText: "dlt"
    });
    repliedMessage = null;
    if (replyBar) replyBar.style.display = "none";
    input.value = "";
    return;
  }
  socket.emit("chat message", msg);
  appendMessage(msg, "sent");
  repliedMessage = null;
  if (replyBar) replyBar.style.display = "none";
  input.value = "";
  socket.emit("stop typing", username);
});
socket.on("chat message", (msg) => {
  if (msg.user !== username) {
    appendMessage(msg, "received");
  }
});
function animateDeleteMessage(li) {
  const rect = li.getBoundingClientRect();
  const count = 50; 
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.classList.add("glow-particle");
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 80 + 20; // distance to fly
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    particle.style.setProperty("--x", x + "px");
    particle.style.setProperty("--y", y + "px");
    particle.style.left = centerX + "px";
    particle.style.top = centerY + "px";
    particle.style.animationDuration = (Math.random() * 0.8 + 0.6) + "s"; // vary speed
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1200);
  }
  li.style.transition = "opacity 0.6s, transform 0.6s";
  li.style.opacity = 0;
  li.style.transform = "scale(0.3) rotate(" + (Math.random()*30-15) + "deg)";
  setTimeout(() => li.remove(), 600);
}
socket.on("delete message", (data) => {
  const items = document.querySelectorAll("#messages li");

  items.forEach(li => {
    const u = li.getAttribute("data-user");
    const t = li.getAttribute("data-text");
    const id = li.getAttribute("data-id"); 
    if (
      id === data.targetId ||
      (u === data.targetUser && t === data.targetText)
    ) {
      animateDeleteMessage(li);
    }
    if (u === data.commandUser && t === data.commandText) {
      animateDeleteMessage(li);
    }
  });
});
function startRecordingIndicator() {
  console.log("Recording started...");
}

function stopRecordingIndicator() {
  console.log("Recording stopped...");
}
async function ensureMediaStream() {
  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return mediaStream;
}
function appendVoiceMessage(msg) {
  const li = document.createElement("li");
  li.classList.add(msg.user === username ? "sent" : "received");

  li.dataset.user = msg.user;
  li.dataset.text = "voice";
  li.dataset.id = msg.id;

  li.innerHTML = `<strong>${escapeHtml(msg.user)}:</strong><br>`;
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = msg.audio;
  audio.preload = "none";
  audio.style.maxWidth = "100%";
  li.appendChild(audio);

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

async function handleStart(e) {
  const slideText = document.getElementById("slideToCancel");
  if (isRecording) return;

  isRecording = true;
  canceled = false;
  startX = e.touches ? e.touches[0].clientX : e.clientX;

  slideText.classList.add("show");
  startRecordingIndicator();

  const stream = await ensureMediaStream();
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.canceled = false;

  mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

  mediaRecorder.onstart = () => {
    socket.emit("start recording", username);
  };

  mediaRecorder.onstop = () => {
    stopRecordingIndicator();

    if (!mediaRecorder.canceled) {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const voiceMsg = {
          user: username,
          audio: reader.result,
          id: (messageCounter++).toString(),
          ts: Date.now()
        };
        socket.emit("voice message", voiceMsg);
        appendVoiceMessage(voiceMsg); 
      };
      reader.readAsDataURL(blob);
    }

    socket.emit("stop recording", username);
    recordBtn.textContent = "🎤";
    isRecording = false;
    canceled = false;
  };

  mediaRecorder.start();
  recordBtn.textContent = "⏺️ Recording...";
}

function handleMove(e) {
  const slideText = document.getElementById("slideToCancel");
  if (!isRecording) return;

  const currentX = e.touches ? e.touches[0].clientX : e.clientX;
  const diff = startX - currentX;

  if (diff > 80) {
    canceled = true;
    slideText.classList.add("canceling");
    recordBtn.style.background = "gray";
  } else {
    canceled = false;
    slideText.classList.remove("canceling");
    recordBtn.style.background = "";
  }
}

function handleEnd() {
  const slideText = document.getElementById("slideToCancel");
  if (!isRecording) return;

  slideText.classList.remove("show", "canceling");
  recordBtn.style.background = "";

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.canceled = canceled;
    mediaRecorder.stop(); 
  } else {
    stopRecordingIndicator();
    recordBtn.textContent = "🎤";
    isRecording = false;
    canceled = false;
  }
}
recordBtn.addEventListener("mousedown", handleStart);
window.addEventListener("mousemove", handleMove);
window.addEventListener("mouseup", handleEnd);
recordBtn.addEventListener("touchstart", handleStart, { passive: false });
recordBtn.addEventListener("touchmove", handleMove, { passive: false });
recordBtn.addEventListener("touchend", handleEnd, { passive: false });
socket.on("voice message", (msg) => {
  if (msg.user !== username) {
    appendVoiceMessage(msg);
  }
});
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
  const toggleFlowers = document.getElementById("toggle-flowers");
  if (toggleFlowers) {
    toggleFlowers.addEventListener("change", (e) => {
      if (e.target.checked) flowerInterval = setInterval(createFlower, 500);
      else {
        clearInterval(flowerInterval);
        document.querySelectorAll(".flower-wrapper").forEach(f => f.remove());
      }
    });
  }
  function createTrail(x, y) {
    const trail = document.createElement("div");
    trail.classList.add("trail-particle");
    trail.style.left = x + "px";
    trail.style.top = y + "px";
    document.body.appendChild(trail);
    setTimeout(() => trail.remove(), 1000);
  }
  document.addEventListener("mousemove", (e) => {
    if (e.buttons) createTrail(e.clientX, e.clientY);
  });
  document.addEventListener("touchmove", (e) => {
    for (let t of e.touches) createTrail(t.clientX, t.clientY);
  }, { passive: true });
  function strikeLightning() {
    const toggleLightning = document.getElementById("toggle-lightning");
    if (!toggleLightning || !toggleLightning.checked) return;
    if (!flashOverlay) return;
    flashOverlay.style.opacity = 0.5;
    setTimeout(() => flashOverlay.style.opacity = 0, 200);
  }
  setInterval(strikeLightning, 5000 + Math.random() * 3000);
     let previousUsers = [];

socket.on("update users", (userList) => {
  if (window.innerWidth >= 600) {
    updatePCActiveUsersList(userList);
  } else {
    const joinedUsers = userList.filter((u) => !previousUsers.includes(u));
    const leftUsers = previousUsers.filter((u) => !userList.includes(u));
    joinedUsers.forEach((user) => showMobileNotification(user, "joined"));
    leftUsers.forEach((user) => showMobileNotification(user, "left"));
  }
  previousUsers = userList;
});
function showMobileNotification(uname, action) {
  console.log("MOBILE NOTIFICATION TRIGGERED:", uname, action);
  const container = document.getElementById("mobile-user-notifications");
  if (!container) return;
  const el = document.createElement("div");
  el.classList.add("mobile-notification");
  el.textContent = `${uname} ${action}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
input.addEventListener("input", () => {
  if (!isTyping) socket.emit("typing", username);
  isTyping = true;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop typing", username);
    isTyping = false;
  }, 1000);
});
socket.on("typing", user => {
  if (user !== username) {
    usersTyping.add(user);
    updateIndicator();
  }
});
socket.on("stop typing", user => {
  if (user !== username) {
    usersTyping.delete(user);
    updateIndicator();
  }
});
socket.on("start recording", user => {
  if (user !== username) {
    recordingUsers.add(user);
    updateIndicator();
  }
});
socket.on("stop recording", user => {
  if (user !== username) {
    recordingUsers.delete(user);
    updateIndicator();
  }
});
function updateIndicator() {
  if (recordingUsers.size > 0) {
    typingIndicator.textContent = [...recordingUsers].join(", ") + " is recording...";
  } else if (usersTyping.size > 0) {
    typingIndicator.textContent = [...usersTyping].join(", ") + " is typing...";
  } else {
    typingIndicator.textContent = "";
  }
}
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
  const chatContainer = document.querySelector(".chat-container");
  if (chatContainer) chatContainer.style.backgroundImage = `url('${bgImages[0]}')`;
  function changeBackground() {
    if (!chatContainer) return;
    bgIndex = (bgIndex + 1) % bgImages.length;
    chatContainer.style.setProperty("--bg-next", `url('${bgImages[bgIndex]}')`);
    chatContainer.classList.add("fade-bg");
    setTimeout(() => {
      chatContainer.style.backgroundImage = `url('${bgImages[bgIndex]}')`;
      chatContainer.classList.remove("fade-bg");
    }, 1500);
  }
  setInterval(changeBackground, 25000);

  if (menuBtn && effectSwitches) {
    menuBtn.addEventListener("click", () => {
      effectSwitches.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target) && !effectSwitches.contains(e.target)) {
        effectSwitches.classList.remove("show");
      }
    });
  }

  function setupReplyTriggers() {
    const container = messages;
    if (!container) return;
    let startX = 0;
    let startY = 0;
    const swipeThreshold = 80;
    let isMouseDown = false;
    function extractFromLi(li) {
      const strong = li.querySelector("strong");
      const user = strong ? (strong.textContent.replace(/:$/, "").trim()) : "";
      let full = li.innerText || "";
      if (strong) {
        const strongText = strong.textContent;
        full = full.replace(new RegExp("^" + escapeRegExp(strongText)), "").trim();
      }
      return { user, text: full };
    }

    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function handleTrigger(targetLi) {
      if (!targetLi) return;
      triggerReply(targetLi);
    }
    container.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });
    container.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return; // vertical scroll
      if (deltaX > swipeThreshold) {
        const target = e.target.closest("li");
        if (target) {
          e.preventDefault();
          handleTrigger(target);
          startX = touch.clientX;
        }
      }
    }, { passive: false });
    container.addEventListener("mousedown", (e) => { isMouseDown = true; startX = e.clientX; startY = e.clientY; });
    container.addEventListener("mousemove", (e) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      if (deltaX > swipeThreshold) {
        const target = e.target.closest("li");
        if (target) {
          handleTrigger(target);
          isMouseDown = false;
        }
      }
    });
    container.addEventListener("mouseup", () => { isMouseDown = false; });
    container.addEventListener("mouseleave", () => { isMouseDown = false; });
    container.addEventListener("click", (e) => {
      const target = e.target.closest("li");
      if (target) {
        setTimeout(() => {
          triggerReply(target);
        }, 100);
      }
    });
    function triggerReply(messageEl) {
      if (!messageEl || !username) {
        if (!username) {
          showMobileNotification("Please join chat first", "");
        }
        return;
      }
      const strong = messageEl.querySelector("strong");
      if (!strong) return;
      const user = strong.textContent.replace(/:$/, "").trim();
      let full = messageEl.innerText || "";
      full = full.replace(new RegExp("^" + escapeRegExp(strong.textContent)), "").trim();
      repliedMessage = {
    user,
    text: full,
    id: messageEl.dataset.id   // ADD THIS
};
      if (repliedMessageText) repliedMessageText.textContent = `${user}: ${full}`;
      if (replyBar) replyBar.style.display = "flex";
      messageEl.classList.add("replying");
      setTimeout(() => messageEl.classList.remove("replying"), 400);
      input.focus();
    }
    window.triggerReply = (el) => triggerReply(el);
  })();
  if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener("click", () => {
      repliedMessage = null;
      if (replyBar) replyBar.style.display = "none";
      input.value = "";
    });
  }
  function showMobileNotification(usernameText, action) {
    if (!usernameText) return;
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
    el.textContent = action ? `${usernameText} ${action}` : usernameText;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}); 
