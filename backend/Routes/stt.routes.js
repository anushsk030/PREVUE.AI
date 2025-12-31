import express from "express";
import multer from "multer";
import fs from "fs";
import speech from "@google-cloud/speech";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const client = new speech.SpeechClient({
  keyFilename: "keys/google-stt.json",
});

router.post(
  "/speech-to-text",
  authenticateToken,
  upload.single("file"), // ✅ frontend must send "file"
  async (req, res) => {
    let wavPath = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio uploaded" });
      }

      const webmPath = req.file.path;
      wavPath = `${webmPath}.wav`;

      /* ================= CONVERT WEBM → WAV ================= */
      await new Promise((resolve, reject) => {
        ffmpeg(webmPath)
          .audioChannels(1)
          .audioFrequency(16000)
          .audioCodec("pcm_s16le")
          .format("wav")
          .save(wavPath)
          .on("end", resolve)
          .on("error", reject);
      });

      const audioBuffer = fs.readFileSync(wavPath);

      /* ================= GOOGLE STT ================= */
      const request = {
        audio: {
          content: audioBuffer.toString("base64"),
        },
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          languageCode: "en-GB", // 🔁 change to "ml-IN" for Malayalam
          enableAutomaticPunctuation: true,
        },
      };

      const [response] = await client.recognize(request);

      /* ================= CLEANUP ================= */
      fs.unlinkSync(webmPath);
      fs.unlinkSync(wavPath);

      if (!response.results || !response.results.length) {
        return res.json({ text: "" });
      }

      const text = response.results
        .map(r => r.alternatives[0]?.transcript || "")
        .join(" ")
        .trim();

      res.json({ text });
    } catch (err) {
      console.error("STT Error:", err);

      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }

      res.status(500).json({ error: "Speech to text failed" });
    }
  }
);

export default router;
