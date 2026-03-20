const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const httpserver = http.Server(app);
const io = socketio(httpserver);

const directory = path.join(__dirname, "public");
app.use(express.static(directory));
httpserver.listen(3000);

let waiting = null;
const pairs = new Map();
const usernames = new Map();
const connected = new Set();

io.on("connection", function (socket) {
  connected.add(socket.id);

  // Broadcast to all, and send directly to this socket after a short
  // delay so its listeners are registered before it arrives
  io.emit("online_count", connected.size);
  setTimeout(() => socket.emit("online_count", connected.size), 200);

  // Client can also explicitly request the count (fired on connect)
  socket.on("get_online_count", () => {
    socket.emit("online_count", connected.size);
  });

  socket.on("find", function (username) {
    if (!username || username.trim() === "") return;
    usernames.set(socket.id, username.trim());

    const oldPartner = pairs.get(socket.id);
    if (oldPartner) {
      io.to(oldPartner).emit("partner_left");
      pairs.delete(oldPartner);
    }
    pairs.delete(socket.id);

    if (waiting && waiting.id !== socket.id && waiting.connected) {
      const partner = waiting;
      waiting = null;
      pairs.set(socket.id, partner.id);
      pairs.set(partner.id, socket.id);
      socket.emit("matched", usernames.get(partner.id));
      partner.emit("matched", usernames.get(socket.id));
    } else {
      waiting = socket;
      socket.emit("waiting");
    }
  });

  socket.on("send", function (message) {
    const partnerId = pairs.get(socket.id);
    if (!partnerId) return;
    io.to(partnerId).emit("receive", { text: message, from: usernames.get(socket.id), self: false });
    socket.emit("receive", { text: message, from: "You", self: true });
  });

  socket.on("typing", function (isTyping) {
    const partnerId = pairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit("typing", isTyping);
  });

  socket.on("disconnect", function () {
    connected.delete(socket.id);
    io.emit("online_count", connected.size);

    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partner_left");
      pairs.delete(partnerId);
    }
    pairs.delete(socket.id);
    usernames.delete(socket.id);
    if (waiting && waiting.id === socket.id) waiting = null;
  });
});
