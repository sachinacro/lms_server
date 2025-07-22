import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs/promises";
import { User } from "../models/User.js";
import cloudinary from "../middlewares/cloudinary.js";

const unlinkAsync = promisify(fs.unlink);

// ✅ Admin Profile

export const getAdminProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).json({ message: "Admin not found" });
  res.json({ user });
});

export const updateAdminProfile = TryCatch(async (req, res) => {
  const { name, email, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "Admin not found" });

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  await user.save();

  res.json({ message: "Profile updated successfully", user });
});

// ✅ Create Course — set createdBy automatically
export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, duration, price } = req.body;
  // const image = req.file;
  const image = req.file.path;
  const uploadResult = await cloudinary.uploader.upload(req.file.path, {
  folder: "courses",
});

  await Courses.create({
  title,
  description,
  category,
  createdBy: req.user._id,  // mongoose khud samaj lega ye ObjectId hai
  image: {
    url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
  },
  duration,
  price,
});


  res.status(201).json({ message: "Course Created Successfully" });
});

// ✅ Add Lectures (with ownership check)
export const addLectures = TryCatch(async (req, res) => {
  const { title, description } = req.body;
  const courseId = req.params.id;

  console.log("📦 Course ID:", courseId);
  console.log("📄 File info:", req.file);

  const course = await Courses.findById(courseId).populate("createdBy");
  if (!course) {
    console.error("❌ Course not found!");
    return res.status(404).json({ message: "No Course with this id" });
  }

  if (course.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed" });
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "courses",
      resource_type: "video", // ✅ Required for videos
    });

    console.log("📤 Upload Result:", JSON.stringify(uploadResult, null, 2));

    const lecture = await Lecture.create({
      title,
      description,
      video: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      },
      course: course._id,
    });

    course.lectures.push(lecture._id);
    await course.save();

    res.status(201).json({ message: "Lecture Added", lecture });
  } catch (err) {
    console.error("❌ Cloudinary Upload Error:", err);
    return res.status(500).json({ message: "Cloudinary Upload Failed" });
  }
});









// ✅ Update Course (with ownership check)
export const updateCourse = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, duration, price } = req.body;

  const course = await Courses.findById(id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  if (course.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to update this course" });
  }

  course.title = title || course.title;
  course.description = description || course.description;
  course.category = category || course.category;
  course.duration = duration || course.duration;
  course.price = price || course.price;

  if (req.file) {
    course.image = req.file.path;
  }

  await course.save();
  res.json({ message: "Course updated successfully" });
});

// ✅ Update Lecture (with ownership check on course)
export const updateLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) return res.status(404).json({ message: "Lecture not found" });

  const course = await Courses.findById(lecture.course);
  if (course.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to update lecture for this course" });
  }

  const { title, description } = req.body;
  lecture.title = title || lecture.title;
  lecture.description = description || lecture.description;

  if (req.file) {
    lecture.video = req.file.path; // ✅ Correct
  }

  await lecture.save();
  res.json({ message: "Lecture updated successfully" });
});


// ✅ Delete Lecture (with ownership check)
// import { v2 as cloudinary } from "cloudinary";

export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture)
    return res.status(404).json({ message: "Lecture not found" });

  const course = await Courses.findById(lecture.course);
  if (!course)
    return res.status(404).json({ message: "Parent course not found" });

  if (!course.createdBy || course.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to delete lecture for this course" });
  }

  try {
    if (lecture.video?.public_id) {
      await cloudinary.uploader.destroy(lecture.video.public_id, {
        resource_type: "video",
      });
    }
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});
// ✅ Delete Course (with lecture deletion)
export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  if (course.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to delete this course" });
  }

  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      if (lecture.video?.public_id) {
        await cloudinary.uploader.destroy(lecture.video.public_id, {
          resource_type: "video",
        });
      }
    })
  );

  if (course.image?.public_id) {
    await cloudinary.uploader.destroy(course.image.public_id);
  }

  await Lecture.deleteMany({ course: course._id });
  await course.deleteOne();

  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({ message: "Course Deleted" });
});


// ✅ Stats for SuperAdmin (optional)
export const getAllStats = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  const lectures = await Lecture.find();
  const users = await User.find();

  const stats = {
    totalCourses: courses.length,
    totalLectures: lectures.length,
    totalUsers: users.length,
  };

  res.json({ stats, courses, lectures, users });
});

// ✅ Get All User (excluding self)
export const getAllUser = TryCatch(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
  res.json({ users });
});

// ✅ Update Role (only SuperAdmin)
export const updateRole = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin") {
    return res.status(403).json({ message: "This endpoint is assigned to superadmin only" });
  }

  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.role = role;
  await user.save();

  res.status(200).json({ message: `Role updated to ${role}` });
});