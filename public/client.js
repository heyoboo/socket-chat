"use strict";
const socket = io();

// Request count once socket is confirmed connected
socket.on("connect", () => socket.emit("get_online_count"));

let myName = "",
  chatActive = false;
let sendDelay = true,
  isTyping = false,
  typingTimer = null;

// elements
const lobbyEl = document.getElementById("lobby");
const waitingEl = document.getElementById("waiting");
const chatEl = document.getElementById("chat-screen");
const nameInput = document.getElementById("name-input");
const findBtn = document.getElementById("find-btn");
const cancelBtn = document.getElementById("cancel-wait-btn");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const nextBtn = document.getElementById("next-btn");
const skipBtn = document.getElementById("skip-btn");
const messagesEl = document.getElementById("messages");
const partnerLbl = document.getElementById("partner-label");
const statusDot = document.getElementById("status-dot");
const typingEl = document.getElementById("typing-indicator");
const typingName = document.getElementById("typing-name");
const charCount = document.getElementById("char-count");
const onlineNum = document.getElementById("online-num");

// ── Theme ──────────────────────────────────────────────────────
const themeBtn = document.getElementById("theme-toggle");
const root = document.documentElement;
if ((localStorage.getItem("theme") || "dark") === "light") {
  root.classList.add("light");
  themeBtn.textContent = "dark";
}
themeBtn.addEventListener("click", () => {
  const l = root.classList.toggle("light");
  themeBtn.textContent = l ? "dark" : "light";
  localStorage.setItem("theme", l ? "light" : "dark");
});

// ── Audio ──────────────────────────────────────────────────────
const actx = new (window.AudioContext || window.webkitAudioContext)();
function tone(freq, type, dur, vol) {
  const o = actx.createOscillator(),
    g = actx.createGain();
  o.connect(g);
  g.connect(actx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, actx.currentTime);
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.start();
  o.stop(actx.currentTime + dur);
}
function playSend() {
  tone(880, "sine", 0.08, 0.1);
}
function playReceive() {
  tone(660, "sine", 0.1, 0.13);
  setTimeout(() => tone(880, "sine", 0.14, 0.1), 55);
}
document.addEventListener(
  "click",
  () => {
    if (actx.state === "suspended") actx.resume();
  },
  { once: true },
);

// ── Screen ─────────────────────────────────────────────────────
function show(el) {
  [lobbyEl, waitingEl, chatEl].forEach((e) => e.classList.remove("active"));
  el.classList.add("active");
}

// ── Lobby ──────────────────────────────────────────────────────
nameInput.addEventListener("input", () => {
  findBtn.disabled = !nameInput.value.trim();
});
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") findBtn.click();
});
findBtn.addEventListener("click", () => {
  const n = nameInput.value.trim();
  if (!n) return;
  myName = n;
  socket.emit("find", n);
  show(waitingEl);
});
cancelBtn.addEventListener("click", () => show(lobbyEl));

// ── Find new ───────────────────────────────────────────────────
function findNew() {
  socket.emit("find", myName);
  nextBtn.classList.remove("visible");
  msgInput.disabled = false;
  sendBtn.disabled = false;
  statusDot.style.background = "var(--green)";
  chatActive = false;
  show(waitingEl);
}
skipBtn.addEventListener("click", findNew);
nextBtn.addEventListener("click", findNew);

// ── Socket events ───────────────────────────────────────────────
socket.on("online_count", (n) => {
  onlineNum.textContent = n;
});
socket.on("waiting", () => show(waitingEl));

socket.on("matched", (name) => {
  chatActive = true;
  partnerLbl.textContent = name;
  typingName.textContent = name;
  messagesEl.innerHTML = "";
  nextBtn.classList.remove("visible");
  msgInput.disabled = false;
  sendBtn.disabled = false;
  statusDot.style.background = "var(--green)";
  addSystem("connected — say hello");
  show(chatEl);
  msgInput.focus();
});

socket.on("receive", ({ text, from, self }) => {
  addMessage(text, from, self);
  if (!self) playReceive();
});

socket.on("typing", (isT) => typingEl.classList.toggle("show", isT));

socket.on("partner_left", () => {
  chatActive = false;
  addSystem("stranger disconnected");
  statusDot.style.background = "var(--red)";
  msgInput.disabled = true;
  sendBtn.disabled = true;
  nextBtn.classList.add("visible");
  typingEl.classList.remove("show");
});

// ── Typing ─────────────────────────────────────────────────────
msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
  const r = 500 - msgInput.value.length;
  charCount.textContent = r;
  charCount.classList.toggle("warn", r < 50);
  if (!isTyping && chatActive) {
    isTyping = true;
    socket.emit("typing", true);
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    socket.emit("typing", false);
  }, 1200);
});

// ── Send ───────────────────────────────────────────────────────
function sendMessage() {
  const t = msgInput.value.trim();
  if (!t || !sendDelay || msgInput.disabled) return;
  sendDelay = false;
  setTimeout(() => (sendDelay = true), 600);
  socket.emit("send", t);
  msgInput.value = "";
  msgInput.style.height = "auto";
  charCount.textContent = "500";
  charCount.classList.remove("warn");
  playSend();
  isTyping = false;
  socket.emit("typing", false);
  clearTimeout(typingTimer);
}
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Helpers ────────────────────────────────────────────────────
function addMessage(text, from, self) {
  const d = document.createElement("div");
  d.className = "msg " + (self ? "self" : "other");
  d.innerHTML = `<div class="sender">${esc(from)}</div>${esc(text)}`;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function addSystem(text) {
  const d = document.createElement("div");
  d.className = "system-msg";
  d.textContent = text;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
