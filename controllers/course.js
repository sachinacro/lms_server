import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";

// ✅ Get All Courses
export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find().populate("createdBy", "name");
  res.status(200).json({ courses });
});



export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: "Unauthorized request" });
  }

  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id)) {
    return res.status(403).json({
      message: "You have not subscribed to this course",
    });
  }

  res.json({ lectures });
});
// export const fetchLectures = TryCatch(async (req, res) => {
//   if (!req.user || !req.user._id) {
//     return res.status(401).json({ message: "Unauthorized request" });
//   }

//   const lectures = await Lecture.find({ course: req.params.id });

//   const user = await User.findById(req.user._id);

//   if (user.role === "admin") {
//     // ✅ Add hasQuiz flag to each lecture
//     const updatedLectures = lectures.map(lecture => ({
//       ...lecture._doc,
//       hasQuiz: lecture.quiz && lecture.quiz.length > 0,
//     }));
//     return res.json({ lectures: updatedLectures });
//   }

//   if (!user.subscription.includes(req.params.id)) {
//     return res.status(403).json({
//       message: "You have not subscribed to this course",
//     });
//   }

//   const updatedLectures = lectures.map(lecture => ({
//     ...lecture._doc,
//     hasQuiz: lecture.quiz && lecture.quiz.length > 0,
//   }));

//   res.json({ lectures: updatedLectures });
// });


export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lecture });
  }

  if (!user.subscription.includes(lecture.course))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lecture });
});

// Example controller (controllers/userController.js)

export const getMyCourses = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "subscription",
    select: "title image thumbnail price duration createdBy", // 👈 Make sure createdBy is here
    populate: {
      path: "createdBy",
      select: "name",
    },
  });

  const courses = await Promise.all(
    user.subscription.map(async (course) => {
      const totalLectures = await Lecture.countDocuments({ course: course._id });
      const progress = await Progress.findOne({
        user: req.user._id,
        course: course._id,
      });

      const watchedLectures = progress?.completedLectures?.length || 0;

      return {
        _id: course._id,
        title: course.title,
        image: course.image || course.thumbnail || "", // ✅ Safeguard
        price: course.price,
        duration: course.duration,
        createdBy: {
          name: course.createdBy?.name || "Unknown", // ✅ Instructor safe fallback
        },
        totalLectures,
        watchedLectures,
      };
    })
  );

  res.status(200).json({ courses });
});










export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  const course = await Courses.findById(req.params.id);

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({
      message: "You already have this course",
    });
  }

  const options = {
    amount: Number(course.price * 100),
    currency: "INR",
  };

  const order = await instance.orders.create(options);

  res.status(201).json({
    order,
    course,
  });
});

// export const checkout = TryCatch(async (req, res) => {
//   const user = await User.findById(req.user._id);
//   const course = await Courses.findById(req.params.id);

//   if (!course) {
//     return res.status(404).json({
//       message: "Course not found",
//     });
//   }

//   if (!user) {
//     return res.status(404).json({
//       message: "User not found",
//     });
//   }

//   if (user.subscription.includes(course._id)) {
//     return res.status(400).json({
//       message: "You already have this course",
//     });
//   }

//   const options = {
//     amount: Number(course.price * 100), // in paise
//     currency: "INR",
//     receipt: `receipt_${Date.now()}`, // optional but useful for debugging
//   };

//   const order = await instance.orders.create(options);

//   res.status(201).json({
//     order,
//     course,
//   });
// });


export const paymentVerification = TryCatch(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.Razorpay_Secret)
    .update(body)
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    const user = await User.findById(req.user._id);

    const course = await Courses.findById(req.params.id);

    user.subscription.push(course._id);

    await Progress.create({
      course: course._id,
      completedLectures: [],
      user: req.user._id,
    });

    await user.save();

    res.status(200).json({
      message: "Course Purchased Successfully",
    });
  } else {
    return res.status(400).json({
      message: "Payment Failed",
    });
  }
});

// export const addProgress = TryCatch(async (req, res) => {
//   const progress = await Progress.findOne({
//     user: req.user._id,
//     course: req.query.course,
//   });

//   const { lectureId } = req.query;

//   if (progress.completedLectures.includes(lectureId)) {
//     return res.json({
//       message: "Progress recorded",
//     });
//   }

//   progress.completedLectures.push(lectureId);

//   await progress.save();

//   res.status(201).json({
//     message: "new Progress added",
//   });
// });
// export const addProgress = TryCatch(async (req, res) => {
//   const { course, lectureId } = req.query;

//   // 🟡 Fetch Lecture (to check if quiz is present)
//   const lecture = await Lecture.findById(lectureId);
//   if (!lecture) {
//     return res.status(404).json({ message: "Lecture not found" });
//   }

//   // 🟢 Fetch Progress
//   let progress = await Progress.findOne({
//     user: req.user._id,
//     course,
//   });

//   if (!progress) {
//     // If no progress exists yet, create one
//     progress = await Progress.create({
//       user: req.user._id,
//       course,
//       completedLectures: [],
//     });
//   }

//   // ✅ Already marked
//   if (progress.completedLectures.includes(lectureId)) {
//     return res.json({ message: "Progress already recorded" });
//   }

//   // 🔐 Check: If quiz exists for this lecture, require passing quiz
//   if (lecture.quiz && lecture.quiz.length > 0) {
//     // Option 1: Check from DB if user has passed quiz (recommended)
// //     const user = await User.findById(req.user._id);
// //    if (
// //   !user.quizProgress ||
// //   !user.quizProgress instanceof Map ||
// //   !user.quizProgress.get(lectureId) ||
// //   user.quizProgress.get(lectureId).passed !== true
// // ) {
// //   return res.status(400).json({
// //     message: "You must pass the quiz to complete this lecture.",
// //   });
// // }
// const user = await User.findById(req.user._id);
// const quizProgress = user.quizProgress || {};

// if (
//   lecture.quiz.length > 0 &&
//   (!quizProgress[lectureId] || quizProgress[lectureId].passed !== true)
// ) {
//   return res.status(400).json({
//     message: "You must pass the quiz to complete this lecture.",
//   });
// }


//   }

//   // 🎯 Mark this lecture as completed
//   progress.completedLectures.push(lectureId);
//   await progress.save();

//   res.status(201).json({ message: "New progress added" });
// });
export const addProgress = TryCatch(async (req, res) => {
  const { course, lectureId } = req.query;

  // 🟡 Fetch Lecture (to check if quiz is present)
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  // 🟢 Fetch Progress
  let progress = await Progress.findOne({
    user: req.user._id,
    course,
  });

  if (!progress) {
    progress = await Progress.create({
      user: req.user._id,
      course,
      completedLectures: [],
    });
  }

  // ✅ Already marked
  if (progress.completedLectures.includes(lectureId)) {
    return res.json({ message: "Progress already recorded" });
  }

  // 🔐 Check quiz requirement
  if (lecture.quiz && lecture.quiz.length > 0) {
    const user = await User.findById(req.user._id);

    let quizProgress = user.quizProgress;

    // Handle case: if Map stored as object
    if (quizProgress instanceof Map) {
      quizProgress = Object.fromEntries(quizProgress); // Convert to plain object
    }

    const quizData = quizProgress?.[lectureId];

    if (!quizData || quizData.passed !== true) {
      return res.status(400).json({
        message: "You must pass the quiz to complete this lecture.",
      });
    }
  }

  // 🎯 Mark lecture as completed
  progress.completedLectures.push(lectureId);
  await progress.save();

  res.status(201).json({ message: "New progress added" });
});



export const getYourProgress = TryCatch(async (req, res) => {
  const courseId = req.query.course;
  const progress = await Progress.findOne({
    user: req.user._id,
    course: courseId,
  });

  if (!progress) {
  const allLecturesList = await Lecture.find({ course: courseId });
  return res.status(200).json({
    courseProgressPercentage: 0,
    completedLectures: [],
    allLectures: allLecturesList.length,
    progress: [],
  });
}

  const allLecturesList = await Lecture.find({ course: courseId });
  const allLectures = allLecturesList.length;
  const completedLectures = progress.completedLectures.length;
  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  // ✅ Get quizProgress properly as a Map
  const user = await User.findById(req.user._id);
  const quizProgress = user.quizProgress || new Map();

  // ✅ Check if all quiz passed
  const lecturesWithQuiz = allLecturesList.filter(
    (lec) => lec.quiz && lec.quiz.length > 0
  );

  let allQuizPassed = true;
  for (const lec of lecturesWithQuiz) {
    const prog = quizProgress.get(lec._id.toString());
    if (!prog || prog.passed !== true) {
      allQuizPassed = false;
      break;
    }
  }

  // ✅ Send clean response
  res.json({
    courseProgressPercentage: Math.round(courseProgressPercentage),
    completedLectures: progress.completedLectures,
    allLectures,
    progress: [
      {
        quizPassed: allQuizPassed,
        completedLectures: progress.completedLectures,
        quizProgress: Object.fromEntries(quizProgress), // optional, converts Map to object
      },
    ],
  });
});

