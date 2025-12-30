import express from "express"
import multer from "multer"
import fs from "fs"
import speech from "@google-cloud/speech"
import { authenticateToken } from "../Middlewares/authMiddleware.js"

const router = express.Router()
const upload = multer({ dest: "uploads/" })

const client = new speech.SpeechClient({
  keyFilename: "keys/google-stt.json",
})

router.post("/speech-to-text", authenticateToken, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded" })
    }

    const filePath = req.file.path
    const audioBuffer = fs.readFileSync(filePath)

    const request = {
      audio: {
        content: audioBuffer.toString("base64"),
      },
      config: {
        encoding: "WEBM_OPUS", // works with browser recording
        sampleRateHertz: 48000,
        languageCode: "en-US",
      },
    }

    const [response] = await client.recognize(request)

    fs.unlinkSync(filePath)

    const text = response.results
      .map(r => r.alternatives[0].transcript)
      .join(" ")

    res.json({ text })
  } catch (err) {
    console.error("STT Error:", err)
    res.status(500).json({ error: "Speech to text failed" })
  }
})

export default router
