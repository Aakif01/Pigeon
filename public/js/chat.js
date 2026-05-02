import ws from "./client.js";

let userInput = document.querySelector(".user-input")
let sendBtn = document.querySelector(".send-btn");

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function scrollToBottom() {
  let chatContainer = document.querySelector(".chat");

  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function formatExistingTimes() {
  document.querySelectorAll(".time").forEach(el => {
    const timestamp = el.dataset.time;

    if (timestamp) {
      el.textContent = formatTime(timestamp);
    }
  });
}

window.addEventListener("load", () => {
  formatExistingTimes();
  scrollToBottom();
});


sendBtn.addEventListener("click", (e) => {
  ws.send(JSON.stringify({
    type: "message",
    senderId: sender,
    conversation: conversation,
    message: userInput.value
  }))
  
  userInput.value = ""
})

ws.addEventListener("message", (e) => {
  let data = JSON.parse(e.data);

  if(data.type == "new-message"){
    let chat = document.querySelector(".chat");
    let message = document.createElement("div");

    message.innerText = data.message;
    message.classList.add("message");
    
    if(data.sender.toString() !== sender.toString()){
      message.classList.add("receiver");
    }
    
    let timeSpan = document.createElement("span");
    timeSpan.classList.add("time");
    
    let timestamp = data.createdAt || new Date();

    timeSpan.textContent = formatTime(timestamp);
    
    message.appendChild(timeSpan);
    
    chat.appendChild(message)
    scrollToBottom();
  }
})
