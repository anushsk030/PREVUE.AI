import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import userModel from "../models/user.js";
import HrInterviewSchedule from "../models/hrInterviewSchedule.js";
import sendEmail from "../utils/sendEmail.js";
import upload from "../config/multerConfig.js";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/* =========================
   GUEST INTERVIEW ACCESS
========================= */
router.post("/guest-access/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, email } = req.body || {};

    const normalizedName = (name || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!token || !normalizedName || !normalizedEmail) {
      return res.status(400).json({ message: "Token, name, and email are required" });
    }

    const schedule = await HrInterviewSchedule.findOne({
      inviteToken: token,
      status: "scheduled",
    });

    if (!schedule) {
      return res.status(404).json({ message: "Invalid or expired interview link" });
    }

    if (schedule.candidateEmail?.toLowerCase() !== normalizedEmail) {
      return res.status(403).json({ message: "Email does not match scheduled candidate" });
    }

    const scheduledDate = new Date(schedule.scheduledAt);
    if (!Number.isNaN(scheduledDate.getTime())) {
      const expiryWindowMs = 24 * 60 * 60 * 1000;
      if (Date.now() > scheduledDate.getTime() + expiryWindowMs) {
        return res.status(410).json({ message: "This interview link has expired" });
      }
    }

    let user = await userModel.findOne({ email: normalizedEmail });
    if (!user) {
      const tempPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = await userModel.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
      });
    } else if (!user.name || user.name.trim().toLowerCase() === "user") {
      user.name = normalizedName;
      await user.save();
    }

    const jwtPayload = { _id: user._id, email: user.email };
    const accessToken = jwt.sign(jwtPayload, process.env.ACCESS_TOKEN_SECRET);

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    return res.status(200).json({
      message: "Access granted",
      schedule: {
        role: schedule.role,
        mode: schedule.mode,
        difficulty: schedule.difficulty,
        scheduledAt: schedule.scheduledAt,
        notes: schedule.notes,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.profileImage ? `http://localhost:3000${user.profileImage}` : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to verify interview access" });
  }
});

/* =========================
   SIGNUP
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    // Create token
    const token = jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.profileImage ? `http://localhost:3000${user.profileImage}` : null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Signup failed" });
  }
});

/* =========================
   SIGNIN
========================= */
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email or password is incorrect!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(404).json({ message: "Email or password is incorrect!" });

    const token = jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    res.status(200).json({
      message: "User signed in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.profileImage ? `http://localhost:3000${user.profileImage}` : null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Signin failed" });
  }
});

/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({ message: "User logged out successfully" });
});

/* =========================
   FORGOT PASSWORD
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      // Security: don't expose user existence
      return res.status(200).json({
        message: "Reset link sent if email exists",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    res.status(200).json({
      message: "Reset link sent if email exists",
    });
  } catch (err) {
    res.status(500).json({ message: "Forgot password failed" });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const token = req.params.token;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await userModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Reset password failed" });
  }
});

/* =========================
   GET USER PROFILE
========================= */
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password -resetPasswordToken -resetPasswordExpire");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/* =========================
   UPLOAD PROFILE IMAGE
========================= */
router.post("/upload-profile-image", authenticateToken, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await userModel.findById(req.user._id);
    
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, "..", user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save the new profile image path
    user.profileImage = `/uploads/profile-images/${req.file.filename}`;
    await user.save();

    res.status(200).json({ 
      message: "Profile image uploaded successfully",
      profileImage: user.profileImage
    });
  } catch (err) {
    // Delete uploaded file in case of error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

/* =========================
   DELETE PROFILE IMAGE
========================= */
router.delete("/delete-profile-image", authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profileImage) {
      return res.status(400).json({ message: "No profile image to delete" });
    }

    // Delete the image file
    const imagePath = path.join(__dirname, "..", user.profileImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Update user document
    user.profileImage = null;
    await user.save();

    res.status(200).json({ message: "Profile image deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete profile image" });
  }
});

export default router;
