import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js"; // ✅ named import

import {
  addLectures,
  createCourse,
  deleteCourse,
  deleteLecture,
  getAllStats,
  getAllUser,
  updateCourse,
  updateLecture,
  updateRole,
} from "../controllers/admin.js";
import { getAdminProfile, updateAdminProfile } from "../controllers/admin.js"; 
// import { upload } from "../middleware/multer.js";
import { User } from "../models/User.js";
import axios  from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv";
import FAQ from "../models/FAQ.js";
dotenv.config();

const router = express.Router();

router.post("/course/new", isAuth, isAdmin, upload.single("image"), createCourse);
router.post("/course/:id", isAuth, isAdmin, upload.single("video"), addLectures);
router.delete("/course/:id", isAuth, isAdmin, deleteCourse);
router.delete("/lecture/:id", isAuth, isAdmin, deleteLecture);
router.get("/status", isAuth, isAdmin, getAllStats);
router.put("/user/:id", isAuth, updateRole);
router.get("/users", isAuth, isAdmin, getAllUser);
router.get("/admin/profile", isAuth, isAdmin, getAdminProfile);
router.put("/admin/update", isAuth, isAdmin, updateAdminProfile); 

//update lecture and courses
router.put("/course/:id", isAuth, isAdmin, upload.single("image"), updateCourse);
router.put("/lecture/:id", isAuth, isAdmin, upload.single("video"), updateLecture);

// GET /api/quiz/results/:courseId
// GET /api/admin/quiz-results/:lectureId
router.get("/admin/quiz-results/:lectureId", isAuth, isAdmin, async (req, res) => {
  console.log("🔎 req.originalUrl:", req.originalUrl); // check full URL
  console.log("🧪 lectureId received:", req.params.lectureId);
  const { lectureId } = req.params;
console.log("🧪 lectureId received:", lectureId); 
  try {
    // Get all users who attempted this quiz
    const users = await User.find({ [`quizProgress.${lectureId}`]: { $exists: true } })
      .select("name email quizProgress");

    const results = users.map(user => {
      const quiz = user.quizProgress.get(lectureId);
      return {
        name: user.name,
        email: user.email,
        score: quiz?.score ?? 0,
        passed: quiz?.passed ?? false,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch quiz results" });
  }
});

// router.post("/ask-ai", async (req, res) => {
//     const { question } = req.body;

//     if (!question) {
//         return res.status(400).json({ answer: "❗ Question is required." });
//     }

//     try {
//         // --- 1. First, try to find the answer in your database (Caching) ---
//         // .trim() का उपयोग करें ताकि अतिरिक्त whitespace से बचें
//         const cachedAnswer = await FAQ.findOne({ question: question.trim() });
//         if (cachedAnswer) {
//             console.log("Serving answer from database cache for:", question.trim());
//             return res.json({ answer: cachedAnswer.answer });
//         }

//         // --- 2. If not found in database, then call OpenAI API ---
//         console.log("Answer not found in database. Calling OpenAI for:", question.trim());

//         const response = await axios.post(
//             "https://api.openai.com/v1/chat/completions",
//             {
//                 model: "gpt-3.5-turbo",
//                 messages: [{ role: "user", content: question }],
//                 temperature: 0.7,
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         console.log("🧠 AI API Raw Response Status:", response.status); // Add this for more clarity
//         console.log("🧠 AI API Raw Response Data:", response.data);   // Add this for more clarity


//         const answer = response.data.choices?.[0]?.message?.content?.trim();
//         if (answer) {
//             // --- 3. Save the new AI-generated answer to the database for future use ---
//             // isAIAnswered: true सेट करें ताकि पता चले यह AI से आया है
//             await FAQ.create({ question: question.trim(), answer: answer, isAIAnswered: true });
//             console.log("Saved new AI answer to database.");
//             return res.json({ answer });
//         } else {
//             console.warn("AI returned no content for question:", question);
//             return res.status(500).json({ answer: "No response from AI model. Please try a different question." });
//         }
//     } catch (error) {
//         console.error("🧠 AI API Error:", error.message);

//         if (error.response?.status === 429) {
//             // Frontend को specific message भेजे
//             return res.status(429).json({ answer: "⚠️ Rate limit exceeded. Please check your OpenAI account usage and billing. Try again later." });
//         } else if (error.response?.status) {
//             // Handle other API errors from OpenAI
//             console.error("OpenAI API full error response (status, data):", error.response.status, error.response.data);
//             return res.status(error.response.status).json({
//                 answer: `Error from AI service: ${error.response.data.error?.message || error.message}`
//             });
//         }
//         return res.status(500).json({ answer: "Something went wrong with AI request. Please try again." });
//     }
// });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

router.post("/ask-ai", async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ answer: "❗ Question is required." });
    }

    try {
        // --- 1. Sabse pehle, database mein answer dekhein (Caching) ---
        const cachedAnswer = await FAQ.findOne({ question: question.trim() });
        if (cachedAnswer) {
            console.log("Serving answer from database cache for:", question.trim());
            return res.json({ answer: cachedAnswer.answer });
        }

        // --- 2. Agar database mein nahi mila, toh Google Gemini API ko call karein ---
        console.log("Answer not found in database. Calling Google Gemini for:", question.trim());

        // *** CHANGE THIS LINE ***
        // 'gemini-pro' ki jagah 'gemini-1.5-flash' ya 'gemini-1.0-pro' try karein
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // <--- UPDATED MODEL

        const result = await model.generateContent(question);
        const response = await result.response;
        const answer = response.text().trim();

        if (answer) {
            // --- 3. Naye AI-generated answer ko database mein save karein ---
            await FAQ.create({ question: question.trim(), answer: answer, isAIAnswered: true });
            console.log("Saved new AI answer from Gemini to database.");
            return res.json({ answer });
        } else {
            console.warn("Gemini returned no content for question:", question);
            return res.status(500).json({ answer: "No response from AI model. Please try a different question." });
        }
    } catch (error) {
        console.error("🧠 AI API Error (Gemini):", error.message);

        if (error.response) {
            console.error("Gemini API full error response (status, data):", error.response.status, error.response.data);
            if (error.response.status === 429) {
                return res.status(429).json({ answer: "⚠️ Gemini API rate limit hit. Try again after some time." });
            }
            return res.status(error.response.status).json({
                answer: `Error from AI service: ${error.response.data.error?.message || error.message}`
            });
        }
        return res.status(500).json({ answer: "Something went wrong with AI request. Please try again." });
    }
});



export default router;


/*
http://localhost:3000/api/course/new
Key	Value
title	React for Beginners
description	Learn React from scratch
category	Programming
createdBy	12345
duration	30 hours
price	1000
file	[Image file]

http://localhost:3000/api/course/6815e87b0fa21cf7e0d0102c
Key	Value	Type
title	Intro to ML	Text
description	Basics of machine learning	Text
file	(select a video file)	File


http://localhost:3000/api/lecture/6815f31bc0ce86e1a1ccffcd
{
    "message": "Lecture Delete successfully"
}


http://localhost:3000/api/status
{
    "stats": {
        "totalCoures": 3,
        "totalLectures": 2,
        "totalUsers": 5
    }
}

*/