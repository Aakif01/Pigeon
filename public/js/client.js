let ws;

if (!window.ws) {

  ws = new WebSocket("ws://localhost:3000");

ws.addEventListener("open", () => {

  console.log("WS opened");

  setTimeout(() => {

    ws.send(JSON.stringify({
      type: "join"
    }));

    console.log("Join sent");

  }, 100);

});

  window.ws = ws;

} else {
  ws = window.ws;
}

ws.addEventListener("close", (event) => {

  if (event.code === 1008) {
    window.location.href = "/pigeon/register";
  }

});

export default ws;