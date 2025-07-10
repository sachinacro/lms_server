import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import qr from "qr-image";

export const generateCertificate = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const course = await Courses.findById(req.params.courseId);

    if (!user || !course) {
      return res.status(404).json({ message: "User or Course not found" });
    }

    if (!user.subscription.includes(course._id)) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const nameCapitalized = user.name
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const certificateId = `${user._id.toString().slice(-6)}-${course._id.toString().slice(-6)}`;
    const verifyUrl = `https://your-lms.com/verify-certificate/${user._id}/${course._id}`;
    const qrImg = qr.imageSync(verifyUrl, { type: "png" });

    const logoPath = path.resolve("controllers/assets/infobeans-logo.png");
    const signaturePath = path.resolve("controllers/assets/signature.jpg");
    const backgroundPath = path.resolve("controllers/assets/OIP.png");

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${course.title}-certificate.pdf`
    );

    doc.pipe(res);

    // Background
    if (fs.existsSync(backgroundPath)) {
      doc.image(backgroundPath, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
    }

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(3)
      .stroke("#0077b6");

    // Logo
    doc.image(logoPath, doc.page.width - 140, 30, { width: 100 });

    // Certificate ID
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("black")
      .text(`Certificate ID: ${certificateId}`, 40, 40);

    // Certificate Title
    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#023e8a")
      .text("Certificate of Completion", 0, 140, {
        align: "center",
        underline: true,
      });

    // Subtext
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor("black")
      .text("This certificate is proudly presented to", 0, 190, {
        align: "center",
      });

    // Name
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("crimson")
      .text(nameCapitalized, 0, 230, { align: "center" });

    // Course Label
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor("black")
      .text("For successfully completing the course:", 0, 270, {
        align: "center",
      });

    // Course Title
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("green")
      .text(course.title, 0, 305, { align: "center" });

    // Footer Content (Fixed Positions)
 const footerY = doc.page.height - 130;

// QR Code
doc.image(qrImg, 60, footerY - 20, { width: 60 });
doc
  .font("Helvetica")
  .fontSize(8)
  .fillColor("gray")
  .text("Scan to verify", 60, footerY + 45, {
    width: 60,
    align: "center",
  });

// Date
doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("black")
  .text(`Date: ${new Date().toDateString()}`, doc.page.width / 2 - 50, footerY + 10);

// Signature
doc.image(signaturePath, doc.page.width - 180, footerY - 30, { width: 100 });
doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("black")
  .text("Kanupriya Manchanda\nVP People", doc.page.width - 180, footerY + 45);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate certificate" });
  }
};

