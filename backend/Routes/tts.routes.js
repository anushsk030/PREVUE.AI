import express from "express";
import fetch from "node-fetch";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = process.env.GEMINI_TTS_VOICE || "Puck";
const DEFAULT_STYLE_PROMPT =
  process.env.GEMINI_TTS_STYLE_PROMPT ||
  "Speak in a professional tone suitable for formal interviews. Use measured pacing, clear articulation, and composed delivery. Maintain a formal, authoritative, and approachable demeanor.";

function parsePcmConfig(mimeType = "") {
  const normalized = String(mimeType).toLowerCase();
  const isL16 = normalized.startsWith("audio/l16");
  const isPcm = normalized.includes("pcm");

  if (!isL16 && !isPcm) {
    return null;
  }

  const sampleRateMatch = normalized.match(/rate=(\d+)/i);
  const channelsMatch = normalized.match(/channels=(\d+)/i);

  return {
    sampleRate: sampleRateMatch ? Number(sampleRateMatch[1]) : 24000,
    channels: channelsMatch ? Number(channelsMatch[1]) : 1,
    bitsPerSample: 16,
  };
}

function pcmToWav(pcmBuffer, { sampleRate, channels, bitsPerSample }) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function extractAudioPart(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    const inlineData = part?.inlineData || part?.inline_data;
    const base64Audio = inlineData?.data;
    if (!base64Audio) continue;

    return {
      audioBase64: base64Audio,
      mimeType: inlineData?.mimeType || inlineData?.mime_type || "audio/wav",
    };
  }

  return null;
}

async function requestGeminiTTS({ apiKey, voiceName, text, stylePrompt, useStyle }) {
  const spokenRequest = useStyle
    ? `Read ONLY the text inside <speak> tags. ${stylePrompt}\n\n<speak>${text}</speak>`
    : text;

  return fetch(
    `${GEMINI_API_BASE}/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: spokenRequest }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      }),
    }
  );
}

router.post("/synthesize", authenticateToken, async (req, res) => {
  try {
    const { text = "", voiceName = DEFAULT_VOICE, stylePrompt = DEFAULT_STYLE_PROMPT } = req.body || {};

    if (!text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    let response = await requestGeminiTTS({
      apiKey,
      voiceName,
      text,
      stylePrompt,
      useStyle: true,
    });

    let data = await response.json();

    if (!response.ok || data?.error) {
      response = await requestGeminiTTS({
        apiKey,
        voiceName,
        text,
        stylePrompt,
        useStyle: false,
      });
      data = await response.json();
    }

    if (!response.ok || data?.error) {
      const message = data?.error?.message || "Gemini TTS request failed";
      console.error("Gemini TTS upstream error:", message);
      return res.status(502).json({ error: message });
    }

    const audioPart = extractAudioPart(data);
    if (!audioPart?.audioBase64) {
      return res.status(502).json({ error: "Gemini TTS returned no audio" });
    }

    const rawAudioBuffer = Buffer.from(audioPart.audioBase64, "base64");
    const pcmConfig = parsePcmConfig(audioPart.mimeType);
    const outputBuffer = pcmConfig
      ? pcmToWav(rawAudioBuffer, pcmConfig)
      : rawAudioBuffer;
    const outputMimeType = pcmConfig ? "audio/wav" : audioPart.mimeType;

    res.setHeader("Content-Type", outputMimeType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-TTS-Provider", "gemini");
    res.setHeader("X-TTS-Model", GEMINI_TTS_MODEL);
    res.setHeader("X-TTS-Audio-Format", outputMimeType);
    res.setHeader("X-TTS-Voice", voiceName);
    return res.send(outputBuffer);
  } catch (error) {
    console.error("Gemini TTS error:", error);
    return res.status(500).json({ error: "Failed to synthesize speech" });
  }
});

export default router;