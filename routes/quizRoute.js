import express from "express";
import { Lecture } from "../models/Lecture.js";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { User } from "../models/User.js";
import { Courses } from "../models/Courses.js";

const router = express.Router();

// 🟢 Student or Admin: Fetch quiz for lecture
router.get("/quiz/:lectureId", isAuth, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    res.json({ quiz: lecture.quiz });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🟢 Student: Submit quiz
router.post("/quiz/submit/:lectureId", isAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture)
      return res.status(404).json({ message: "Lecture not found" });

    const quiz = lecture.quiz;
    if (!quiz || quiz.length === 0)
      return res.status(400).json({ message: "No quiz found for this lecture" });

    let correctCount = 0;
    quiz.forEach((q, i) => {
      const correct = q.correctAnswer?.toString().trim().toLowerCase();
      const given = answers[i]?.toString().trim().toLowerCase();
      if (correct === given) correctCount++;
    });

    const passed = correctCount >= Math.ceil(quiz.length * 0.5); // 50% pass criteria

    // ✅ User progress update
    const user = await User.findById(req.user._id);

    if (!user.quizProgress) user.quizProgress = new Map();

    const lectureId = req.params.lectureId;

    user.quizProgress.set(lectureId, {
      passed,
      score: correctCount,
    });

    await user.save();

    res.json({
      total: quiz.length,
      correct: correctCount,
      passed,
      message: passed ? "Quiz passed!" : "Quiz failed. Try again.",
    });
  } catch (error) {
    console.log("Quiz Submit Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




// 🔴 Admin: Create quiz
// 🔴 Admin: Create quiz with ownership check
router.post("/quiz/create/:lectureId", isAuth, isAdmin, async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { quiz } = req.body;
    console.log("Incoming quiz data:", req.body.quiz);

    if (!quiz || !Array.isArray(quiz)) {
      return res.status(400).json({ message: "Quiz data invalid" });
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const course = await Courses.findById(lecture.course).populate("createdBy");

    if (!course) {
      return res.status(404).json({ message: "Parent course not found" });
    }

    // ✅ Null safety check
//   console.log("Lecture ID:", lectureId);
// console.log("User:", req.user);
// console.log("Course CreatedBy:", course.createdBy);

if (!course.createdBy || course.createdBy.id !== req.user._id.toString()) {
  return res.status(403).json({ message: "You are not allowed to create quiz for this lecture" });
}


    // ✅ Append existing + new quiz safely
    lecture.quiz = [...(lecture.quiz || []), ...quiz];
    await lecture.save();

    res.status(200).json({ message: "Quiz added successfully" });
  } catch (error) {
    console.error("Quiz creation error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// // ✅ FINAL QUIZ ROUTE (Full Safe)
// router.post("/quiz/create/:lectureId", isAuth, isAdmin, async (req, res) => {
//   try {
//     const { lectureId } = req.params;
//     const { quiz } = req.body;
//     console.log("Incoming quiz data:", req.body.quiz);

//     if (!quiz || !Array.isArray(quiz)) {
//       return res.status(400).json({ message: "Quiz data invalid" });
//     }

//   const lecture = await Lecture.findById(lectureId);
// if (!lecture) {
//   console.log("Lecture not found");
//   return res.status(404).json({ message: "Lecture not found" });
// }
// console.log("Lecture course id:", lecture.course);

// if (!lecture.course) {
//   console.log("Lecture.course is undefined or null");
//   return res.status(400).json({ message: "Lecture course missing" });
// }

// const course = await Courses.findById(lecture.course);
// console.log("Course fetched:", course);

// if (!course) {
//   console.log("Course not found");
//   return res.status(404).json({ message: "Course not found" });
// }

// if (!course.createdBy) {
//   console.log("Course.createdBy is undefined");
//   return res.status(400).json({ message: "Course createdBy missing" });
// }


    // ✅ Append existing + new quiz safely
//     lecture.quiz = [...(lecture.quiz || []), ...quiz];
//     await lecture.save();

//     res.status(200).json({ message: "Quiz added successfully" });
//   } catch (error) {
//     console.error("Quiz creation error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });


router.put("/quiz/update/:lectureId", isAuth, isAdmin, async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { quiz } = req.body;

    if (!quiz || !Array.isArray(quiz)) {
      return res.status(400).json({ message: "Quiz data invalid" });
    }

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    lecture.quiz = quiz;
    await lecture.save();

    res.status(200).json({ message: "Quiz updated successfully" });
  } catch (error) {
    console.error("Quiz update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/quiz/delete/:lectureId", isAuth, isAdmin, async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    lecture.quiz = [];  // simply empty the quiz array
    await lecture.save();

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Quiz deletion error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;