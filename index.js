import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import Razorpay from "razorpay";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

export const instance = new Razorpay({
  key_id: process.env.Razorpay_Key,
  key_secret: process.env.Razorpay_Secret,
});

const app = express();

app.use(cors({
  origin: "https://lms-frontend-kdnp.onrender.com", // ✅ fixed
  // origin: "http://localhost:5174", // ✅ fixed
  credentials: true
}));



app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server is working");
});


app.use("/uploads", express.static("uploads"));


import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import router from "./routes/quizRoute.js";

// ✅ Using routes
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", adminRoutes);
app.use("/api", router);

// ✅ Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  connectDb();
});
