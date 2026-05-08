let ws;

if (!window.ws) {

  const protocol =
    window.location.protocol === "https:" ? "wss" : "ws";

  ws = new WebSocket(`${protocol}://${window.location.host}`);

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