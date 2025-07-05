import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true
}
,
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // 🔧 Add this field:
  enrolledUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    },
  ],

  // 👇 Ye zaroor hona chahiye
  lectures: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture", // ✅ Ref hona chahiye
    },
  ],
});

export const Courses = mongoose.model("Courses", schema);
