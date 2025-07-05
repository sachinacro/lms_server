import express from "express";
import { User } from "../models/User.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import {
  getAllCourses,
  getSingleCourse,
  fetchLectures,
  fetchLecture,
  getMyCourses,
  checkout,
  paymentVerification,
} from "../controllers/course.js";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { generateCertificate } from "../controllers/certificate.js";

const router = express.Router();

router.get("/course/all", getAllCourses);
router.get("/course/:id", getSingleCourse);
router.get("/lectures/:id", isAuth, fetchLectures);
// router.get("/lecture/:id", isAuth, fetchLecture);
router.get("/mycourse", isAuth, getMyCourses);
router.post("/course/checkout/:id", isAuth, checkout);
router.post("/verification/:id", isAuth, paymentVerification);
router.post("/course/enroll/:id", isAuth, async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id; // Provided by isAuth middleware

  try {
    const course = await Courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.subscription.includes(courseId)) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    user.subscription.push(courseId);
    await user.save();

    course.enrolledUsers.push(userId); // Make sure this exists in your Courses model
    await course.save();

    res.status(200).json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/certificate/:courseId", isAuth, generateCertificate);
// GET /api/courses?search=react
router.get("/courses", async (req, res) => {
  const keyword = req.query.search
    ? {
        title: { $regex: req.query.search, $options: "i" },
      }
    : {};

  const courses = await Course.find({ ...keyword });
  res.json({ success: true, courses });
});
// 👇 Add this in your route file
router.get("/lecture/all", isAuth, isAdmin, async (req, res) => {
  try {
    const lectures = await Lecture.find().populate("course", "title");
    res.json({ lectures });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch lectures" });
  }
});
router.get("/lecture/:id", isAuth, fetchLecture);


export default router;
/*
http://localhost:5000/api/course/all
http://localhost:5000/api/course/680cd586ee7b43e4c1584cb7
http://localhost:3000/api/lectures/680cd586ee7b43e4c1584cb7
admin:=  "lectures": [
        {
            "_id": "680cd5f6ee7b43e4c1584cca",
            "title": "Data Scientist",
            "description": "Beginner to pro",
            "video": "uploads\\83822aae-2f34-4247-b630-0aae83262ce1.mp4",
            "course": "680cd586ee7b43e4c1584cb7",
            "createdAt": "2025-04-26T12:47:50.037Z",
            "__v": 0
        }
    ]
user:= "message": "You have not subscribed to this course"
http://localhost:3000/api/lecture/680cd586ee7b43e4c1584cb7
admin = {
    "lecture": null
}

http://localhost:3000/api/mycourse
{
    "courses": []
}
*/