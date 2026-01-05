import express from "express";
import fetch from "node-fetch";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import InterviewResult from "../models/interviewResult.js";

const router = express.Router();

// Protect all endpoints
router.use(authenticateToken);

/* ================= NEXT QUESTION ================= */
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

  // Build prompt for Gemini question generation
  const questionTopics = {
    1: "background, experience, or technical foundation",
    2: "specific skills, tools, or technologies",
    3: "real-world problem-solving or past projects",
    4: "challenges faced or how you handle difficulties",
    5: "teamwork, collaboration, or communication",
    6: "growth mindset, learning, or future goals"
  };

  let prompt = `
You are a human interviewer conducting a ${mode} interview for a ${role}.
Difficulty level: ${difficulty}.
This is question ${qNum} out of 6.

Conversation so far:
${historyText}

Focus for this question: ${questionTopics[qNum] || "general interview question"}
`;

  // Add follow-up if previous answer exists
  if (lastQuestion && lastAnswer && qNum >= 3) {
    prompt += `
Previous question:
"${lastQuestion}"

Candidate's answer:
"${lastAnswer}"

Ask a concise follow-up question based on the answer. Keep it specific and direct.
`;
  } else {
    prompt += `
Ask a straightforward, specific interview question for the role and difficulty level.
DO NOT repeat any topics from the conversation history above.
`;
  }

  prompt += `
Rules:
- Ask ONE question only
- Be direct and specific, not open-ended
- Max 30 words
- Avoid essay-type or vague questions
- Avoid repeating questions or topics from the conversation
- Use simple, clear language
- Examples: "What frameworks have you used?", "Describe your experience with X", "How would you handle Y?"
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

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

    const question =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Failed to generate question";

    return res.json({ question });
  } catch (err) {
    console.error("Flash question generation error:", err);
    return res.status(500).json({ error: "Failed to generate question" });
  }
});

/* ================= CREATE INTERVIEW SESSION ================= */
router.post("/create-interview", async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { role, mode, difficulty } = req.body || {};

  if (!role || !mode || !difficulty) {
    return res.status(400).json({ error: "Role, mode, and difficulty are required" });
  }

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviewResult = new InterviewResult({
      userId,
      role,
      mode,
      difficulty,
      questions: []
    });

    await interviewResult.save();
    return res.json({ interviewId: interviewResult._id });
  } catch (err) {
    console.error("Create interview error:", err);
    return res.status(500).json({ error: "Failed to create interview session" });
  }
});

/* ================= SILENT EVALUATION ================= */
router.post("/evaluate", async (req, res) => {
  const userId = req.user?._id || req.user?.id; // from authenticateToken
  const { question, answer, questionNumber, role, mode, difficulty, interviewId } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // Log warning if userId is missing (user needs to re-login)
  if (!userId) {
    console.warn("Warning: User ID not found in token. Evaluations won't be saved to database.");
  }

  // Allow empty answers (they'll get 0 score)

  // Respond immediately so frontend can move on
  res.status(200).json({ status: "received" });

  // Fire-and-forget async evaluation
  (async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY not configured");
        return;
      }

      // Step 1: Generate the ideal answer for the question
      const idealPrompt = `
You are an expert interviewer.
Provide the ideal answer for this question in concise form.

Question:
"${question}"

Respond in plain text.
`;
      const idealResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: idealPrompt }] }],
          }),
        }
      );
      const idealData = await idealResp.json();
      const idealAnswer =
        idealData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      // Step 2: Evaluate candidate's answer against ideal answer
      const evalPrompt = `
You are an expert interview evaluator.
Compare the candidate's answer with the ideal answer.

Question:
"${question}"

Ideal answer:
"${idealAnswer}"

Candidate's answer:
"${answer}"

Evaluate the answer on these criteria (each out of 10):
1. **Correctness**: How accurate is the answer?
2. **Depth**: How thorough and detailed is the explanation?
3. **Practical Experience**: Does it demonstrate real-world understanding?
4. **Structure**: Is the answer well-organized and clear?

Also provide overall feedback.

Respond in JSON format: 
{ 
  "correctness": <number>, 
  "depth": <number>, 
  "practicalExperience": <number>, 
  "structure": <number>,
  "feedback": "<text>" 
}
`;
      const evalResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
          }),
        }
      );
      const evalData = await evalResp.json();
      const resultText =
        evalData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      let result;
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = resultText;
        const jsonMatch = resultText?.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        }
        result = JSON.parse(jsonText);
      } catch {
        console.error("Failed to parse Gemini evaluation:", resultText);
        result = { 
          correctness: null, 
          depth: null, 
          practicalExperience: null, 
          structure: null, 
          feedback: resultText || "No feedback" 
        };
      }

      // Save to DB
      try {
        // Skip DB save if userId is not available
        if (!userId) {
          console.warn("Skipping database save - userId not found");
          return;
        }

        // Find the most recent interview for this user (created today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let interviewResult = await InterviewResult.findOne({
          userId,
          createdAt: { $gte: today }
        }).sort({ createdAt: -1 });

        if (!interviewResult) {
          // Create new interview result for today
          interviewResult = new InterviewResult({
            userId,
            role: role || "Unknown",
            mode: mode || "Unknown",
            difficulty: difficulty || "Medium",
            questions: []
          });
        }

        // Add or update question evaluation
        const questionIndex = interviewResult.questions.findIndex(
          q => q.questionNumber === questionNumber
        );

        const questionData = {
          questionNumber,
          question,
          answer: answer || "",
          idealAnswer,
          correctness: result.correctness || 0,
          depth: result.depth || 0,
          practicalExperience: result.practicalExperience || 0,
          structure: result.structure || 0,
          feedback: result.feedback || ""
        };

        if (questionIndex >= 0) {
          interviewResult.questions[questionIndex] = questionData;
        } else {
          interviewResult.questions.push(questionData);
        }

        await interviewResult.save();

        console.log(
          `Evaluation saved for user ${userId}, Interview ${interviewResult._id}, Q${questionNumber}:`,
          result
        );
      } catch (dbError) {
        console.error("Database save error:", dbError);
      }
    } catch (err) {
      console.error("Silent evaluation error:", err);
    }
  })();
});

/* ================= FINALIZE INTERVIEW & CALCULATE SCORES ================= */
router.post("/finalize-interview", async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { interviewId, eyeContact, confidence, engagement } = req.body || {};

  if (!interviewId) {
    return res.status(400).json({ error: "Interview ID is required" });
  }

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviewResult = await InterviewResult.findOne({
      _id: interviewId,
      userId
    });

    if (!interviewResult) {
      return res.status(404).json({ error: "Interview not found" });
    }

    // Calculate average scores from all questions
    const questions = interviewResult.questions;
    if (questions.length > 0) {
      const avgCorrectness = questions.reduce((sum, q) => sum + (q.correctness || 0), 0) / questions.length;
      const avgDepth = questions.reduce((sum, q) => sum + (q.depth || 0), 0) / questions.length;
      const avgPracticalExperience = questions.reduce((sum, q) => sum + (q.practicalExperience || 0), 0) / questions.length;
      const avgStructure = questions.reduce((sum, q) => sum + (q.structure || 0), 0) / questions.length;

      interviewResult.overallCorrectness = Math.round(avgCorrectness * 10) / 10;
      interviewResult.overallDepth = Math.round(avgDepth * 10) / 10;
      interviewResult.overallPracticalExperience = Math.round(avgPracticalExperience * 10) / 10;
      interviewResult.overallStructure = Math.round(avgStructure * 10) / 10;
    }

    // Set video analysis scores (these would come from video analysis in the future)
    interviewResult.eyeContact = eyeContact || 0;
    interviewResult.confidence = confidence || 0;
    interviewResult.engagement = engagement || 0;

    // Calculate total score (average of all 7 metrics)
    interviewResult.totalScore = Math.round(
      ((interviewResult.overallCorrectness +
        interviewResult.overallDepth +
        interviewResult.overallPracticalExperience +
        interviewResult.overallStructure +
        interviewResult.eyeContact +
        interviewResult.confidence +
        interviewResult.engagement) / 7) * 10
    ) / 10;

    await interviewResult.save();

    return res.json({
      success: true,
      results: {
        correctness: interviewResult.overallCorrectness,
        depth: interviewResult.overallDepth,
        practicalExperience: interviewResult.overallPracticalExperience,
        structure: interviewResult.overallStructure,
        eyeContact: interviewResult.eyeContact,
        confidence: interviewResult.confidence,
        engagement: interviewResult.engagement,
        totalScore: interviewResult.totalScore
      }
    });
  } catch (err) {
    console.error("Finalize interview error:", err);
    return res.status(500).json({ error: "Failed to finalize interview" });
  }
});

export default router;
