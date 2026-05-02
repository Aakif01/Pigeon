import ws from "./client.js"

let actions = document.querySelector(".actions");
let ellipsis = document.querySelector(".ellipsis");

ellipsis.addEventListener("click", () => {
  actions.classList.toggle("block");
  ellipsis.classList.toggle("active")
})

ws.addEventListener("message", (e) => {

  let data = JSON.parse(e.data);

  if (data.type === "new-message") {

    let convoId = data.conversation;

    console.log("New message for:", convoId);

    let friendItem =
      document.querySelector(
        `[data-convo="${convoId}"]`
      );

    let friendsContainer =
      document.querySelector("main");

    if (friendItem && friendsContainer) {

      console.log("Moving chat to top");

      friendsContainer.prepend(
        friendItem.parentElement
      );

    }

  }
  
  if (data.type === "new-friend") {

    alert("New friend arrived");
    
    let friendsContainer =
      document.querySelector("main");


    let convoId = data.convoId;
    let firstName = data.firstName;

    let existing =
      document.querySelector(
        `[data-convo="${convoId}"]`
      );

    if (existing) return;

    let anchor = document.createElement("a");

    anchor.href = `/pigeon/chat/${convoId}`;

    anchor.innerHTML = `
      <div class="chat" data-convo="${convoId}">
        <div class="dp">
          <img src="/images/profile.png" />
        </div>
        <div class="user">
          <p>+91${firstName}</p>
        </div>
      </div>
    `;

    friendsContainer.prepend(anchor);

  }

});