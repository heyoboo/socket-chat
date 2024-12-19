var socket;
var usernameInput
var chatIDInput;
var messageInput;
var chatRoom;
var chat;
var dingSound;
var messages = [];
var delay = true;

function onload() {
  socket = io();
  console.log(socket)
  usernameInput = document.getElementById("NameInput");
  chatIDInput = document.getElementById("IDInput");
  messageInput = document.getElementById("ComposedMessage");
  chatRoom = document.getElementById("RoomID");
  chat = document.getElementById("Chat");
  dingSound = document.getElementById("Ding");

  socket.on("join", function(room) {
    chatRoom.innerHTML = "Chatroom : " + room;
  })

  socket.on("recieve", function(message) {
    console.log(message);
    /*
    if (messages.length < 16){
      messages.push(message);
      dingSound.currentTime = 0;
      dingSound.play();
    }
    else{
      messages.shift();
      messages.push(message);
    }
    */

    messages.push(message);
    dingSound.currentTime = 0;
    dingSound.play();

    /*
      for (i = 0; i < messages.length; i++){}*/


    chat.innerHTML += `<p id="Message${messages.length - 1}">${messages[messages.length - 1]}</p>`

    /*       document.getElementById("Message"+i).innerHTML = messages[i];
            document.getElementById("Message"+i).style.color = "white";*/

  })
}

function Connect() {
  socket.emit("join", chatIDInput.value, usernameInput.value);
}

function Send() {
  if (delay && messageInput.value.replace(/\s/g, "") != "") {
    delay = false;
    setTimeout(delayReset, 1000);
    socket.emit("send", messageInput.value);
    messageInput.value = "";
  }
}

function delayReset() {
  delay = true;
}