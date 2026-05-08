require('dotenv').config()

const express = require("express");
const app = express();
const http = require("http");
const webSocket = require("ws");
const path = require("path");
const session = require("express-session");
const ejsMate = require("ejs-mate");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const MongoStore = require('connect-mongo').default;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const User = require("./models/users/user.js")
const Conversation = require("./models/chat/conversation.js");
const Message = require("./models/chat/message.js");
const multer = require("multer");
const { storage } = require("./cloudConfig");

const upload = multer({ storage });

const server = http.createServer(app);

let dbUrl = process.env.ATLASDB_URL;

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET_KEY
  },
  touchAfter: 24*3600
});

store.on("error", () => {
  console.log("ERROR in MONGO SESSION STORE", error)
})

const sessionVariables = {
  store: store,
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}

const sessionParser = session(sessionVariables);


main()
.then( () => console.log("Connected to backend"))
.catch( (err) => console.log(err) );

async function main(){
  await mongoose.connect(dbUrl, {dbName: "pigeon"});
  console.log("Connected DB:", mongoose.connection.name);
}

app.engine("ejs", ejsMate);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(sessionParser);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("includes", path.join(__dirname, "includes"));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy({ usernameField: "phone" }, User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



function isLoggedIn(req, res, next){
  if(!req.user) {
    return res.redirect("/pigeon/login");
    
  }
  next();
}

async function isMember(req, res, next) {
  try {
    let { convoId } = req.params;

    let conversation = await Conversation.findOne({
      _id: convoId,
      members: req.user._id
    });

    if (!conversation) {
      req.flash("error", "permission denied")
      return res.redirect("/pigeon");
    }

    req.conversation = conversation;

    next();

  } catch (err) {
    console.log(err);
    return res.redirect("/pigeon");
  }
}

const users = {};

app.use( async(req, res, next) => {
  if(req.path !== "/pigeon"){
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  }
  res.locals.user = req.user;
  
  next();
})

app.get("/", (req, res) => {
  res.redirect("/pigeon");
})

app.get("/pigeon", isLoggedIn, (req, res) => {
  res.status(200).render("chat/loading.ejs")
})

app.get("/pigeon/data", isLoggedIn, wrapAsync(async(req, res) => {
  let userId = req.user._id;
  let user = await User.findById(userId).populate("friends.user").populate("friends.convoId");
  
  user.friends.sort((a, b) => {

  let timeA = a.convoId?.lastMessageAt || 0;
  let timeB = b.convoId?.lastMessageAt || 0;

  return timeB - timeA;

});
  
  res.render("chat/home.ejs", { user })
}));

app.get("/pigeon/register", (req, res) => {
  res.status(200).render("user/register.ejs")
})

app.post("/pigeon/register", wrapAsync(async(req, res) => {
  try{
    
  let {phone, password} = req.body;
  
  let newUser = new User({
    phone: phone,
    friends: []
  });
  
  const registeredUser = await User.register(newUser, password);
  
  req.login(registeredUser, (err) => {

      if (err) return next(err);

      res.redirect("/pigeon/user"); 

    });
  } catch(err){
    console.log(err);
    req.flash("error", err.message)
    res.redirect("/pigeon/register");
  }
}));

app.get("/pigeon/user", isLoggedIn, (req, res) => {
  res.render("user/user.ejs");
});

app.post(
  "/pigeon/user/update",
  isLoggedIn,
  upload.single("dp"),
  wrapAsync(async (req, res) => {

    try {

      let userId = req.user._id;

      let updateData = {};

      if (req.body.username && req.body.username.trim() !== "") {

        updateData.username =
          req.body.username.trim();

      }

      if (req.file) {

        updateData.profile = {
          url: req.file.path,
          filename: req.file.filename
        };

      }

      if (Object.keys(updateData).length > 0) {

        await User.findByIdAndUpdate(
          userId,
          updateData
        );

      }

      res.redirect("/pigeon/");

    } catch (err) {

      req.flash("error", err.message)
      res.redirect("/pigeon/user");

    }

  }
));

app.get("/pigeon/login", (req, res) => {
  res.status(200).render("user/login.ejs")
})

app.post(
  "/pigeon/login",
  passport.authenticate("local", {
    successRedirect: "/pigeon",
    failureRedirect: "/pigeon/login",
    failureFlash: true
  })
);

app.get("/pigeon/logout", (req, res) => {
  req.logout( (err) => {
    if(err){
      next(err);
    }
    req.flash("success", "You are logged out!")
    res.redirect("/pigeon/login")
  });
})

app.get("/pigeon/new", (req, res) => {
  res.status(200).render("user/friend.ejs")
});

app.post("/pigeon/new", wrapAsync(async(req, res) => {
  let {phone, firstName, lastName} = req.body;
  
  if(!firstName){
    if(lastName){
      firstName = lastName;
      lastName = "";
    } else{
      firstName = `+91${phone}`
    }
  }
  
  if(!phone){
    req.flash("error", "Phone Number is required");
    return res.status(400).redirect("/pigeon/new")
  }
  
  let friend = await User.findOne({ phone }).populate("friends.user");
  if(!friend){
    req.flash("error", "user not found. Invite them on pigeon")
    return res.status(404).redirect("/pigeon");
  }
  
  let userId = req.user._id;
  
  let user = await User.findById(userId).populate("friends.user");
  
  if(friend._id.toString() === userId.toString()) return res.redirect("/pigeon");
  
  let convo = await Conversation.findOne({ members: { $all: [userId, friend._id] } });

  if (!convo) {
    convo = new Conversation({ members: [userId, friend._id] });
    await convo.save();
  }
  await User.updateOne({ _id: userId, "friends.user": { $ne: friend._id } }, {
    $push: {
      friends: {
        convoId: convo._id,
        user: friend._id,
        firstName,
        lastName
      }
    }
  }
);

res.status(201).redirect("/pigeon");
}));

app.get("/pigeon/chat/:convoId",  isLoggedIn, isMember, wrapAsync(async(req, res) => {
  let {convoId} = req.params
  let conversation = req.conversation;
  let messages = await Message.find({ conversation: convoId });
  
  let friendId = conversation.members.find(
  member => member.toString() !== req.user._id.toString()
);

  let friend = await User.findById(friendId);
  
  let friendInfo = req.user.friends.find( f => f.user.toString() == friendId.toString());
  
  let name = friendInfo.firstName + " " + friendInfo.lastName || " ";
  
  res.render("chat/chat.ejs", {friend, messages, convoId, name})
}))

const wss = new webSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("updated to websocket");
  
  sessionParser(req, {}, async () => {
    
    if (!req.session.passport) {
      ws.close(1008, "Unauthorized");
      return;
    }
    
    let phone = req.session.passport.user;
    

      
      let user = await User.findOne({ phone });
      users[user._id.toString()] = ws;
      if(users[user._id.toString()]){
        console.log("New user joined");
      } else{
        console.log("error in storing user")
      }
      
      ws.on("close", () => {

  console.log("Socket closed for:", user._id.toString());

  delete users[user._id.toString()];

});
    
    ws.on("message", async (msg) => {
    let data = JSON.parse(msg.toString());
    
    
    if(data.type == "message"){
      let convoId = data.conversation;
      
      let conversation = await Conversation.findById(convoId);
      if(!conversation){
        console.log("Conversation not found");
        return;
      }
       
      let friendId = conversation.members.find( m => m.toString() != user._id.toString());

      let friend = await User.findById(friendId);
   
      if(!friend){
        console.log("Friend not found");
        return;
      }
      
      if(!data.message){
        console.log("Message text is required");
        return;
      }
      
      let message = new Message({
        sender: user._id,
        conversation: convoId,
        message: data.message
      });
      
      await message.save();
      
      await Conversation.findByIdAndUpdate( convoId, { lastMessageAt: new Date() });
      
      let isFriend = friend.friends.some( friend => friend.user.toString() === user._id.toString());
      
      if(!isFriend){
        await User.updateOne({ _id: friendId, "friends.user": { $ne: user._id } }, {
    $push: {
      friends: {
        convoId: convoId,
        user: user._id,
        firstName: `+91${phone}`,
        lastName: ""
      }
    }
  })
  
      if(users[friendId.toString()]){
       users[friendId.toString()].send(JSON.stringify({
         type: "new-friend",
         convoId: convoId,
         firstName: `+91${phone}`,
       }))
      }
      }
      if(users[friendId.toString()]){
        console.log("Friend found")
        users[friendId.toString()].send(JSON.stringify({
          type: "new-message",
          conversation: convoId,
          sender: user._id,
          message: data.message
        }))
      }else{
        console.log("Friend not found in users");
      }
      
      ws.send(JSON.stringify({
          type: "new-message",
          conversation: convoId,
          sender: user._id,
          message: data.message
        }))
      }
    })
  });
  
  });
  
  app.all(/.*/, (req, res, next)=>{
  next(new ExpressError(404, "Page not found"));
});
  
  app.use( (err, req, res, next) => {
  let {statusCode=500, message="Something went wrong"} = err
  res.status(statusCode).render("error.ejs", {statusCode, message})
})
  
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});