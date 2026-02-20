import mongoose from "mongoose";

const interviewResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    role: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true
    },
    questions: [{
        questionNumber: Number,
        question: String,
        answer: String,
        idealAnswer: String,
        correctness: Number,
        depth: Number,
        structure: Number,
        feedback: String
    }],
    // Overall scores
    overallCorrectness: {
        type: Number,
        default: 0
    },
    overallDepth: {
        type: Number,
        default: 0
    },
    overallStructure: {
        type: Number,
        default: 0
    },
    eyeContact: {
        type: Number,
        default: 0
    },
    confidence: {
        type: Number,
        default: 0
    },
    engagement: {
        type: Number,
        default: 0
    },
    // Behavioral Analysis Scores
    professionalism: {
        type: Number,
        default: 0
    },
    stability: {
        type: Number,
        default: 0
    },
    facePresence: {
        type: Number,
        default: 0
    },
    blinkRate: {
        type: Number,
        default: 0
    },
    totalScore: {
        type: Number,
        default: 0
    },
    // AI Generated Feedback Summary
    feedbackSummary: {
        pros: [String],
        cons: [String],
        improvementPlan: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const InterviewResult = mongoose.model("InterviewResult", interviewResultSchema, "interviewResults");
export default InterviewResult;
