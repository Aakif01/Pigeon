const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;


const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String
  },
  profile: {
    type: String
  },
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    convoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName:{
      type: String,
      trim: true
    }
    }]
}, {
  timestamps: true
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "phone"
});

module.exports = mongoose.model("User", userSchema);