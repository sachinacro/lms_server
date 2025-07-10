import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "LMS_Uploads", // 👈 Your desired folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
    resource_type: "auto", // optional
  },
});

export const upload = multer({ storage });
