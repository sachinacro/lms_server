import express from "express";
import {
  fixOldCourses,
  forgotPassword,
  getCompletedCourses,
  googleLogin,
  loginUser,
  myProfile,
  register,
  resetPassword,
  verifyUser,
} from "../controllers/user.js";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { getDashboardInfo, updateProfile} from "../controllers/user.js"; // Add this in top imports



import { addProgress, getYourProgress } from "../controllers/course.js";

const router = express.Router();

router.post("/user/register", register);
router.post("/user/verify", verifyUser);
router.post("/user/login", loginUser);
router.get("/user/me", isAuth, myProfile);
router.post("/user/forgot", forgotPassword);
router.post("/user/reset", resetPassword);
router.post("/user/progress", isAuth, addProgress);
router.get("/user/progress", isAuth, getYourProgress);

router.get("/user/dashboard", isAuth, getDashboardInfo);
router.put("/user/update", isAuth, updateProfile);
router.post("/user/google-login", googleLogin);
router.get("/user/completed",isAuth,getCompletedCourses);
// In your routes file
router.get("/fix-courses", isAuth,isAdmin,fixOldCourses);



export default router;

/*http://localhost:5000/api/user/register
http://localhost:5000/api/user/verify
    "activationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Im5hbWUiOiJzYWluaSIsImVtYWlsIjoic2FjaGluc2FpbmkyMzExMTRAYWNyb3BvbGlzLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkU29mLlZTbDZnVHZTSFp1UUYwRjd6dVVMeHZhdFZCQURGak84aHNLdUxidzJuaWZIWWRJcC4ifSwib3RwIjozODc4NDUsImlhdCI6MTc0NjE5Nzg4NCwiZXhwIjoxNzQ2MTk4MTg0fQ.3VNOvIyvkbaGJcLuKUxN_3Gk5ftuKkZ69RtMAs9VVXI",
    "otp":387845

http://localhost:5000/api/user/login
||
copy => token apply into header
http://localhost:3000/api/user/me

http://localhost:3000/api/user/forgot
email : sachinsaini08883@gmail.com

http://localhost:3000/api/user/reset
email : sachinsaini08883@gmail.com
otp: 453532
newPassword: 12345
*/