import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from "./utils/db.js";
import cookieParser from 'cookie-parser';

import authRoutes from "./Routes/authRoutes.js";
import questionRoutes from "./Routes/questionRoutes.js";


const app = express()
const PORT = 3000
const corsOptions = {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use("/api", authRoutes);
app.use("/api/questions", questionRoutes);

connectDB().then(() =>{
    app.listen(PORT, () => {
        console.log(`Listening to port ${PORT}`);
    })
});
