import express from "express";
import fetch from "node-fetch";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
const GEMINI_TTS_MODEL =
  process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = process.env.GEMINI_TTS_VOICE || "Puck";

// ─── WAV helpers ────────────────────────────────────────────────────────────

function parsePcmConfig(mimeType = "") {
  const normalized = String(mimeType).toLowerCase();
  if (!normalized.startsWith("audio/l16") && !normalized.includes("pcm")) {
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

function makeWavHeader({ sampleRate, channels, bitsPerSample, dataSize }) {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
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
  return header;
}

// ─── Streaming TTS request ───────────────────────────────────────────────────

/**
 * Calls the Gemini *streaming* generateContent endpoint and collects all
 * base64-encoded PCM/audio chunks from the newline-delimited JSON stream.
 *
 * Returns { audioBase64: Buffer, mimeType: string } or throws.
 */
async function streamGeminiTTS({ apiKey, voiceName, text }) {
  const url = `${GEMINI_API_BASE}/v1beta/models/${GEMINI_TTS_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Gemini TTS upstream error (${response.status}): ${errText}`);
  }

  // The SSE stream emits lines like:  data: {...json...}
  const rawText = await response.text();
  const pcmChunks = [];
  let detectedMimeType = "audio/wav";

  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    let parsed;
    try {
      parsed = JSON.parse(trimmed.slice(5).trim());
    } catch {
      continue;
    }

    // Surface any API-level error buried inside a chunk
    if (parsed?.error) {
      throw new Error(parsed.error?.message || "Gemini TTS stream error");
    }

    const parts = parsed?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      const inlineData = part?.inlineData || part?.inline_data;
      if (!inlineData?.data) continue;
      detectedMimeType =
        inlineData?.mimeType || inlineData?.mime_type || detectedMimeType;
      pcmChunks.push(Buffer.from(inlineData.data, "base64"));
    }
  }

  if (!pcmChunks.length) {
    throw new Error("Gemini TTS stream returned no audio data");
  }

  return {
    audioBuffer: Buffer.concat(pcmChunks),
    mimeType: detectedMimeType,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.post("/synthesize", authenticateToken, async (req, res) => {
  try {
    const { text = "", voiceName = DEFAULT_VOICE } = req.body || {};

    if (!text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const { audioBuffer, mimeType } = await streamGeminiTTS({
      apiKey,
      voiceName,
      text,
    });

    // Convert raw PCM/L16 → WAV so browsers can play it natively
    const pcmConfig = parsePcmConfig(mimeType);
    let outputBuffer, outputMimeType;
    if (pcmConfig) {
      const header = makeWavHeader({ ...pcmConfig, dataSize: audioBuffer.length });
      outputBuffer = Buffer.concat([header, audioBuffer]);
      outputMimeType = "audio/wav";
    } else {
      outputBuffer = audioBuffer;
      outputMimeType = mimeType;
    }

    res.setHeader("Content-Type", outputMimeType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-TTS-Provider", "gemini");
    res.setHeader("X-TTS-Model", GEMINI_TTS_MODEL);
    res.setHeader("X-TTS-Audio-Format", outputMimeType);
    res.setHeader("X-TTS-Voice", voiceName);
    return res.send(outputBuffer);
  } catch (error) {
    console.error("Gemini TTS error:", error?.message || error);
    return res.status(500).json({ error: "Failed to synthesize speech" });
  }
});

export default router;