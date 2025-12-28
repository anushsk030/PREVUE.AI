import express from "express";
import fetch from "node-fetch";
// import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Protect endpoints if needed
// router.use(authenticateToken);

router.post("/next-question", async (req, res) => {
  const {
    role = "",
    mode = "",
    difficulty = "",
    questionNumber = 1,
    lastQuestion = "",
    lastAnswer = "",
    history = [], // optional previous questions
  } = req.body || {};

  const qNum = Math.max(1, Math.min(6, Number(questionNumber) || 1));

  // Build conversation history text
  const historyText =
    history.length > 0
      ? history
          .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
          .join("\n\n")
      : "No previous answers.";

  // Build prompt
  let prompt = `
You are a human interviewer conducting a ${mode} interview for a ${role}.
Difficulty level: ${difficulty}.
This is question number ${qNum} out of 6.

Conversation so far:
${historyText}
`;

  // Add follow-up if previous answer exists
  if (lastQuestion && lastAnswer && qNum >= 3) {
    prompt += `
Previous question:
"${lastQuestion}"

Candidate's answer:
"${lastAnswer}"

Ask a follow-up or deeper question based on the answer.
`;
  } else {
    prompt += `
Ask a relevant interview question for the role and difficulty.
`;
  }

  // Optional style rules
  prompt += `
Rules:
- Ask ONE question
- Keep it conversational
- Max 50 words
- Avoid generic phrasing
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    // REST call to Gemini Flash-lite using API key in URL
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    // Safely extract the question text
    const question =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Failed to generate question";

    return res.json({ question });
  } catch (err) {
    console.error("Flash question generation error:", err);
    return res.status(500).json({ error: "Failed to generate question" });
  }
});

export default router;
