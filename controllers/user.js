import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendMail, { sendForgotMail } from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Progress } from "../models/Progress.js";
import { Lecture } from "../models/Lecture.js";
export const register = TryCatch(async (req, res) => {
  const { email, name, password, phone } = req.body;

  if (!email || !name || !password || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  const activationToken = jwt.sign(
    {
      user: { name, email, password, phone },
      otp,
    },
    process.env.Activation_Secret,
    { expiresIn: "5m" }
  );

  await sendMail(email, "E-learning - OTP Verification", { name, otp });

  res.status(200).json({
    message: "OTP sent to your email",
    activationToken,
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { activationToken, otp } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(activationToken, process.env.Activation_Secret);
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  if (decoded.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const { name, email, phone, password } = decoded.user;

  // ❗ Don't hash here — handled in schema middleware
  await User.create({
    name,
    email,
    phone,
    password, // raw password, schema will hash
  });

  res.json({ message: "User registered successfully" });
});

export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "No user with this email" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15d",
  });

  res.json({
    message: `Welcome back ${user.name}`,
    token,
    user,
  });
});

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "No user with this email" });

  const otp = Math.floor(100000 + Math.random() * 900000);
  user.resetPasswordOtp = otp;
  user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;

  await user.save();
  await sendForgotMail("E-Learning Password Reset OTP", { email, otp });

  res.json({ message: "OTP has been sent to your email." });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "No user with this email" });

  if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  if (user.resetPasswordOtp !== Number(otp)) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.password = newPassword; // ❗ raw password — schema will hash
  user.resetPasswordOtp = null;
  user.resetPasswordExpire = null;

  await user.save();

  res.json({ message: "Password has been reset successfully." });
});




export const myProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
});






export const getDashboardInfo = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "subscription",
      select: "title lectures",
      populate: {
        path: "lectures",
        select: "_id",
      },
    });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const totalCourses = user.subscription?.length || 0;
  let completedCourses = 0;

  for (const course of user.subscription || []) {
    const progress = await Progress.findOne({
      user: req.user._id,
      course: course._id,
    });

    const lectures = await Lecture.find({ course: course._id });
    const totalLectures = lectures.length;

    if (
      progress &&
      totalLectures > 0 &&
      progress.completedLectures?.length === totalLectures
    ) {
      completedCourses++;
    }
  }

  res.json({
    user: {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    stats: {
      totalCourses,
      completedCourses,
    },
    enrolledCourses: user.subscription,
  });
});


// route: GET /api/fix-courses



// Ek baar ke liye admin-only route bana le
// export const fixOldCourses = async (req, res) => {
//   const admin = await User.findOne({ name: "InfoBeans Foundation" });
//   if (!admin) return res.status(404).json({ message: "Admin not found" });

//   const courses = await Courses.find({ createdBy: { $type: "string" } });
// //  const courses = await Courses.find().populate("createdBy", "name");
// // courses.forEach(c => {
// //   console.log(`${c.title} - Created By: ${c.createdBy.name}`);
// // });

//   for (let course of courses) {
//     course.createdBy = admin._id;
//     await course.save();
//     console.log(`✅ Fixed: ${course.title}`);
//   }

//   res.json({ message: "All broken courses fixed." });
// };

// controller ya temp route me laga ke run kar
export const fixOldCourses = async (req, res) => {
  try {
    const adminId = "680ccf7fee7b43e4c1584c8c"; // ✅ sahi admin ka _id

    const updated = await Courses.updateMany(
      { createdBy: { $type: "string" } }, // ❌ sirf jahan string hai
      { $set: { createdBy: adminId } }     // ✅ fix to ObjectId
    );

    res.json({ message: "Courses fixed", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fix failed" });
  }
  // Example query (MongoDB shell ya Postman me bhi try kar sakta hai)
// const courses = await Courses.find().populate("createdBy", "name email role");
// console.log(courses);

};





// GET /api/user/completed
export const getCompletedCourses = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "subscription",
      select: "title lectures",
      populate: {
        path: "lectures",
        select: "title",
      },
    });
    for (const course of user.subscription) {
  // console.log("Course:", course.title);
  // console.log("Lectures in course:", course.lectures); // 👈 Yeh dekhna
}

  const completedCourses = [];

  for (const course of user.subscription) {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: course._id,
  });

  // console.log("Course:", course.title);
  // console.log("Course Lectures:", course.lectures?.length);
  // console.log("Progress Lectures:", progress?.completedLectures?.length);

  if (
    progress &&
    course.lectures?.length > 0 &&
    progress.completedLectures?.length === course.lectures.length
  ) {
    console.log("✅ Matched - Completed!");
    completedCourses.push({
      _id: course._id,
      title: course.title,
      completedLectures: progress.completedLectures.length,
      totalLectures: course.lectures.length,
       userId: user._id 
    });
  } else {
    console.log("❌ Not Completed");
  }
}


  res.json({ completedCourses });
});







export const updateProfile = TryCatch(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone) user.phone = phone;

  await user.save();

  res.json({ message: "Profile updated", user });
});

// import { OAuth2Client } from "google-auth-library";

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// export const googleLogin = TryCatch(async (req, res) => {
//   const { token } = req.body;

//   // 1. Verify Google token
//   const ticket = await client.verifyIdToken({
//     idToken: token,
//     audience: process.env.GOOGLE_CLIENT_ID,
//   });

//   const payload = ticket.getPayload();

//   const { sub: googleId, email, name, picture } = payload;

//   // 2. Check if user already exists
//   let user = await User.findOne({ email });

//   if (!user) {
//     // 3. Naya user create karo
//     user = await User.create({
//       name,
//       email,
//       googleId,
//       avatar: picture,
//       password: "googleuser", // placeholder password, not actually used
//       isVerified: true, // optionally mark as verified
//     });
//   }

//   // 4. Apne system ka JWT token banao
//   const authToken = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
//     expiresIn: "15d",
//   });

//   res.status(200).json({
//     message: `Welcome ${user.name}`,
//     token: authToken,
//     user,
//   });
// });
import admin from "../middlewares/firebaseAdmin.js";



export const googleLogin = TryCatch(async (req, res) => {
  const { token } = req.body;

  // ✅ Verify Firebase token
  const decodedToken = await admin.auth().verifyIdToken(token);
  const { email, name, picture, uid: googleId } = decodedToken;

  // ✅ Find or create user
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar: picture,
      password: "googleuser",
    });
  }

  // ✅ Generate app JWT
  const authToken = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15d",
  });

  res.status(200).json({
    message: `Welcome ${user.name}`,
    token: authToken,
    user,
  });
});
