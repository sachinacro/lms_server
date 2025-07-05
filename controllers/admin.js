import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs/promises";
import { User } from "../models/User.js";

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
  const image = req.file;

  await Courses.create({
  title,
  description,
  category,
  createdBy: req.user._id,  // mongoose khud samaj lega ye ObjectId hai
  image: image?.path,
  duration,
  price,
});


  res.status(201).json({ message: "Course Created Successfully" });
});

// ✅ Add Lectures (with ownership check)
export const addLectures = TryCatch(async (req, res) => {
  const { title, description } = req.body;
  const file = req.file;

  const course = await Courses.findById(req.params.id).populate("createdBy");  // ✅ Populate karo

  if (!course)
    return res.status(404).json({ message: "No Course with this id" });

  // ✅ Compare _id safely
  if (!course.createdBy || course.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to add lecture to this course" });
  }

  const lecture = await Lecture.create({
    title,
    description,
    video: file?.path,
    course: course._id,
  });
  course.lectures.push(lecture._id);
  await course.save();

  res.status(201).json({ message: "Lecture Added", lecture });
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
    lecture.video = req.file.path;
  }

  await lecture.save();
  res.json({ message: "Lecture updated successfully" });
});

// ✅ Delete Lecture (with ownership check)
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
    if (lecture.video) {
      await fs.rm(lecture.video); // ✅ Using fs/promises
    }
  } catch (err) {
    console.error("Video delete error:", err.message);
  }

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});

// ✅ Delete Course (with ownership check)
export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  if (course.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You are not allowed to delete this course" });
  }

  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      await unlinkAsync(lecture.video);
    })
  );

  rm(course.image, () => {});

  await Lecture.deleteMany({ course: req.params.id });
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

// import TryCatch from "../middlewares/TryCatch.js";
// import { Courses } from "../models/Courses.js";
// import { Lecture } from "../models/Lecture.js";
// import { rm } from "fs";
// import { promisify } from "util";
// import fs from "fs";
// import { User } from "../models/User.js";

// export const getAdminProfile = TryCatch(async (req, res) => {
//   const user = await User.findById(req.user._id).select("-password");
//   if (!user) return res.status(404).json({ message: "Admin not found" });

//   res.json({ user });
// });

// export const updateAdminProfile = TryCatch(async (req, res) => {
//   const { name, email, phone } = req.body;

//   const user = await User.findById(req.user._id);
//   if (!user) return res.status(404).json({ message: "Admin not found" });

//   user.name = name || user.name;
//   user.email = email || user.email;
//   user.phone = phone || user.phone;

//   await user.save();

//   res.json({
//     message: "Profile updated successfully",
//     user,
//   });
// });

// export const createCourse = TryCatch(async (req, res) => {
//   const { title, description, category, duration, price } = req.body;
//   const image = req.file;

//   await Courses.create({
//     title,
//     description,
//     category,
//     createdBy: req.user._id,  // 🟢 Yaha pe current admin ka id aayega
//     image: image?.path,
//     duration,
//     price,
//   });

//   res.status(201).json({
//     message: "Course Created Successfully",
//   });
// });


// export const addLectures = TryCatch(async (req, res) => {
//   const course = await Courses.findById(req.params.id);

//   if (!course)
//     return res.status(404).json({
//       message: "No Course with this id",
//     });

//   const { title, description } = req.body;

//   const file = req.file;

//   const lecture = await Lecture.create({
//     title,
//     description,
//     video: file?.path,
//     course: course._id,
//   });

//   res.status(201).json({
//     message: "Lecture Added",
//     lecture,
//   });
// });

// export const updateCourse = TryCatch(async (req, res) => {
//   const { id } = req.params;
//   const { title, description, category, duration, price } = req.body;

//   const course = await Courses.findById(id);
//   if (!course) return res.status(404).json({ message: "Course not found" });

//   if (course.createdBy.toString() !== req.user._id.toString()) {
//     return res.status(403).json({ message: "You are not allowed to update this course" });
//   }

//   course.title = title || course.title;
//   course.description = description || course.description;
//   course.category = category || course.category;
//   course.duration = duration || course.duration;
//   course.price = price || course.price;

//   if (req.file) {
//     course.image = req.file.path;
//   }

//   await course.save();

//   res.json({ message: "Course updated successfully" });
// });

// export const updateLecture = TryCatch(async (req, res) => {
//   const { id } = req.params; // lecture ID
//   const { title, description } = req.body;

//   const lecture = await Lecture.findById(id);
//   if (!lecture) return res.status(404).json({ message: "Lecture not found" });

//   lecture.title = title || lecture.title;
//   lecture.description = description || lecture.description;

//   if (req.file) {
//     lecture.video = req.file.path;
//   }

//   await lecture.save();

//   res.json({ message: "Lecture updated successfully" });
// });

// // export const deleteLecture = TryCatch(async (req, res) => {
// //   const lecture = await Lecture.findById(req.params.id);

// //   rm(lecture.video, () => {
// //     console.log("Video deleted");
// //   });

// //   await lecture.deleteOne();

// //   res.json({ message: "Lecture Deleted" });
// // });


// export const deleteLecture = TryCatch(async (req, res) => {
//   const lecture = await Lecture.findById(req.params.id);

//   if (!lecture) {
//     return res.status(404).json({ message: "Lecture not found" });
//   }

//   try {
//     await fs.rm(lecture.video); // proper way to delete
//     console.log("Video file deleted");
//   } catch (err) {
//     console.error("Video delete error:", err.message);
//   }

//   await lecture.deleteOne();

//   res.json({ message: "Lecture Deleted" });
// });

// const unlinkAsync = promisify(fs.unlink);

// export const deleteCourse = TryCatch(async (req, res) => {
//   const course = await Courses.findById(req.params.id);

//   const lectures = await Lecture.find({ course: course._id });

//   await Promise.all(
//     lectures.map(async (lecture) => {
//       await unlinkAsync(lecture.video);
//       console.log("video deleted");
//     })
//   );

//   rm(course.image, () => {
//     console.log("image deleted");
//   });

//   await Lecture.find({ course: req.params.id }).deleteMany();

//   await course.deleteOne();

//   await User.updateMany({}, { $pull: { subscription: req.params.id } });

//   res.json({
//     message: "Course Deleted",
//   });
// });

// export const getAllStats = TryCatch(async (req, res) => {
//   const courses = await Courses.find();
//   const lectures = await Lecture.find();
//   const users = await User.find();

//   const stats = {
//     totalCourses: courses.length,
//     totalLectures: lectures.length,
//     totalUsers: users.length,
//   };
// //   Courses     // Capitalized model, not actual array
// // Lecture     // Model again, not data
// // User        // Model again


//   res.json({
//     stats,
//     courses,  // ✅ correct array of courses
//     lectures, // ✅ correct array of lectures
//     users     // ✅ correct array of users
//   });
// });


// export const getAllUser = TryCatch(async (req, res) => {
//   const users = await User.find({ _id: { $ne: req.user._id } }).select(
//     "-password"
//   );

//   res.json({ users });
// });

// export const updateRole = TryCatch(async (req, res) => {
//   // Superadmin check
//   if (req.user.mainrole !== "superadmin") {
//     return res.status(403).json({
//       message: "This endpoint is assigned to superadmin only",
//     });
//   }

//   const { role } = req.body;

//   // Role required
//   if (!role) {
//     return res.status(400).json({ message: "Role is required" });
//   }

//   const user = await User.findById(req.params.id);

//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   user.role = role;
//   await user.save();

//   res.status(200).json({
//     message: `Role updated to ${role}`,
//   });
// });
