import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";

const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    // Check for existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user
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
        }
    });
});

// Signin Route
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email or password is incorrect!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(404).json({ message: "Email or password is incorrect!" });

    user.lastSignIn = new Date();
    await user.save();

    const token = jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET);

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
    });

    res.status(200).json({ message: "User signed in successfully" });
});

// Logout Route
router.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
    res.status(200).json({ message: "User logged out successfully" });
});

export default router;
