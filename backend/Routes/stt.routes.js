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

/**
 * Use Gemini to clean/correct STT output
 * Fixes transcription errors, noise artifacts, and makes text coherent
 */
async function correctTextWithGemini(rawText) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return rawText; // fallback to raw text
    }

    const prompt = `Fix transcription errors in this technical interview answer. Correct misheard programming terms, grammar, and punctuation. Return ONLY the corrected sentence without any explanation, reasoning, or additional commentary.

Input: "${rawText}"

Corrected sentence:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
            topP: 0.8,
            topK: 40
          }
        }),
      }
    );

    if (!response.ok) {
      return rawText;
    }

    const data = await response.json();
    
    if (data.error) {
      return rawText;
    }

    const correctedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawText;
    
    // Extract only the first meaningful sentence, removing any explanations
    const cleanText = correctedText
      .split('\n')[0]  // Take first line only
      .replace(/^(Corrected sentence:|Corrected text:|Corrected:|Output:)/i, '')  // Remove common prefixes
      .trim()
      .replace(/^["']|["']$/g, '');  // Remove surrounding quotes if present
    
    return cleanText || rawText;
  } catch (err) {
    return rawText; // fallback to raw text on error
  }
}

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

      // ✨ Always correct text using Gemini for better accuracy
      const correctedText = text ? await correctTextWithGemini(text) : "";

      res.json({ 
        text: correctedText,
        rawText: text // include raw STT output for debugging
      });
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
