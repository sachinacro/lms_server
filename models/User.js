import mongoose from "mongoose";
import bcrypt from "bcrypt";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    mainrole: {
      type: String,
      default: "user",
    },
    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    resetPasswordOtp: {
      type: Number,
    },
    resetPasswordExpire: {
      type: Date,
    },
    googleId: {
  type: String,
  unique: true,
  sparse: true,
},

quizProgress: {
  type: Map,
  of: {
    passed: { type: Boolean, default: false },
    score: Number, // optional
  },
  default: {},
},
instructor: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}
,


    subscription: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courses",
      },
    ],
  },
  
  {
    timestamps: true,
  }
);

// Hash password before saving
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords during login
schema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", schema);
