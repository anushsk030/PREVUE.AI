import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from "./utils/db.js";
import cookieParser from 'cookie-parser';

import authRoutes from "./Routes/authRoutes.js";
import questionRoutes from "./Routes/questionRoutes.js";
import pdfRoutes from "./Routes/pdfRoutes.js";
import sttRoutes from "./Routes/stt.routes.js";
import ttsRoutes from "./Routes/tts.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
const PORT = 3000
const corsOptions = {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'X-TTS-Provider', 'X-TTS-Model', 'X-TTS-Audio-Format', 'X-TTS-Voice'],
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/stt", sttRoutes)
app.use("/api/tts", ttsRoutes);

connectDB().then(() =>{
    app.listen(PORT, () => {
        console.log(`Listening to port ${PORT}`);
    })
});
