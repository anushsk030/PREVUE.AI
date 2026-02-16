import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },

  profileImage: {
    type: String,
    default: null,
  },

  resetPasswordToken: {
    type: String,
  },

  resetPasswordExpire: {
    type: Date,
  },
});

const user = mongoose.model("user", userSchema, "user");
export default user;
