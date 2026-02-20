import express from "express";
import PDFDocument from "pdfkit";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import InterviewResult from "../models/interviewResult.js";
import userModel from "../models/user.js";

const router = express.Router();

// Protect all endpoints
router.use(authenticateToken);

/* ================= DOWNLOAD FEEDBACK REPORT PDF ================= */
router.get("/feedback-report/:interviewId", async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { interviewId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    // Fetch the interview result
    const interview = await InterviewResult.findOne({ _id: interviewId, userId });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    const user = await userModel.findById(userId).select("name email");
    const userName = user?.name?.trim() || "User";
    const userEmail = user?.email?.trim() || "";
    const safeUserName = userName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    
    // Format date for filename
    const reportDate = new Date(interview.createdAt);
    const dateForFilename = `${reportDate.getDate()}-${reportDate.toLocaleString('en-US', { month: 'short' })}-${reportDate.getFullYear()}`;
    const safeRole = interview.role.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${safeUserName}_${safeRole}_${dateForFilename}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // ========== HEADER ==========
    // Dark technical header
    doc.rect(0, 0, doc.page.width, 120).fill('#0F172A');
    
    // Accent line
    doc.rect(0, 120, doc.page.width, 4).fill('#3B82F6');

    // Brand title
    doc.fillColor('#F8FAFC')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('PREVUE.AI', 50, 25);

    doc.fillColor('#64748B')
       .fontSize(9)
       .font('Helvetica')
       .text('INTERVIEW PERFORMANCE REPORT', 50, 50);

    // Candidate info block (right side)
    doc.fillColor('#F8FAFC')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(userName.toUpperCase(), 300, 20, { align: 'right', width: 245 });

    doc.fillColor('#94A3B8')
       .fontSize(9)
       .font('Helvetica')
       .text(userEmail, 300, 38, { align: 'right', width: 245 });

    doc.fillColor('#94A3B8')
       .fontSize(9)
       .font('Helvetica')
       .text(`${interview.role} | ${interview.mode} | ${interview.difficulty}`, 300, 52, { align: 'right', width: 245 });

    const dateStr = new Date(interview.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    doc.text(dateStr, 300, 66, { align: 'right', width: 245 });

    // ========== OVERALL SCORE SECTION ==========
    let yPosition = 145;

    doc.fillColor('#0F172A')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('OVERALL SCORE', 50, yPosition);

    yPosition += 20;

    const totalScorePercentage = Math.round((interview.totalScore || 0) * 10);

    // Score display box
    doc.rect(50, yPosition, 120, 60).fill('#0F172A');
    
    doc.fillColor('#3B82F6')
       .fontSize(32)
       .font('Helvetica-Bold')
       .text(`${totalScorePercentage}%`, 55, yPosition + 12, { width: 110, align: 'center' });

    doc.fillColor('#64748B')
       .fontSize(8)
       .font('Helvetica')
       .text('PERFORMANCE', 55, yPosition + 46, { width: 110, align: 'center' });

    // ========== METRICS GRID ==========
    // Technical Scores (left column)
    doc.fillColor('#475569')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('TECHNICAL METRICS', 190, yPosition);

    const techScores = [
      { label: 'Correctness', value: interview.overallCorrectness || 0, isPercent: false },
      { label: 'Depth', value: interview.overallDepth || 0, isPercent: false },
      { label: 'Structure', value: interview.overallStructure || 0, isPercent: false }
    ];

    techScores.forEach((score, i) => {
      const scoreY = yPosition + 18 + (i * 14);
      const pct = score.isPercent ? Number(score.value) : Number(score.value) * 10;
      
      doc.fillColor('#1E293B')
         .fontSize(9)
         .font('Helvetica')
         .text(score.label, 190, scoreY);
      
      doc.fillColor('#0F172A')
         .font('Helvetica-Bold')
         .text(`${pct.toFixed(1)}%`, 280, scoreY);
    });

    // Behavioral Scores (right column)
    doc.fillColor('#475569')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('BEHAVIORAL METRICS', 380, yPosition);

    const behavioralScores = [
      { label: 'Confidence', value: interview.confidence || 0, isPercent: true },
      { label: 'Eye Contact', value: interview.eyeContact || 0, isPercent: true },
      { label: 'Stability', value: interview.stability || 0, isPercent: true }
    ];

    behavioralScores.forEach((score, i) => {
      const scoreY = yPosition + 18 + (i * 14);
      const pct = score.isPercent ? Number(score.value) : Number(score.value) * 10;
      
      doc.fillColor('#1E293B')
         .fontSize(9)
         .font('Helvetica')
         .text(score.label, 380, scoreY);
      
      doc.fillColor('#0F172A')
         .font('Helvetica-Bold')
         .text(`${pct.toFixed(1)}%`, 480, scoreY);
    });

    // ========== FEEDBACK SUMMARY SECTION ==========
    yPosition += 80;

    doc.moveTo(50, yPosition).lineTo(545, yPosition).lineWidth(0.5).stroke('#CBD5E1');
    yPosition += 15;

    doc.fillColor('#0F172A')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('PERFORMANCE ANALYSIS', 50, yPosition);

    yPosition += 20;

    const feedbackSummary = interview.feedbackSummary || {};
    const pros = Array.isArray(feedbackSummary.pros) ? feedbackSummary.pros : [];
    const cons = Array.isArray(feedbackSummary.cons) ? feedbackSummary.cons : [];
    const improvementPlan = feedbackSummary.improvementPlan || '';

    // Strengths column
    doc.rect(50, yPosition, 240, 18).fill('#0F172A');
    doc.fillColor('#10B981')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('[+] STRENGTHS', 58, yPosition + 5);

    let strengthY = yPosition + 24;
    if (pros.length > 0) {
      pros.forEach((pro) => {
        doc.fillColor('#334155')
           .fontSize(9)
           .font('Helvetica')
           .text(`- ${pro}`, 55, strengthY, { width: 230 });
        strengthY = doc.y + 4;
      });
    } else {
      doc.fillColor('#94A3B8')
         .fontSize(9)
         .font('Helvetica')
         .text('No strengths recorded', 55, strengthY);
      strengthY += 14;
    }

    // Weaknesses column
    doc.rect(305, yPosition, 240, 18).fill('#0F172A');
    doc.fillColor('#EF4444')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('[-] AREAS FOR IMPROVEMENT', 313, yPosition + 5);

    let weaknessY = yPosition + 24;
    if (cons.length > 0) {
      cons.forEach((con) => {
        doc.fillColor('#334155')
           .fontSize(9)
           .font('Helvetica')
           .text(`- ${con}`, 310, weaknessY, { width: 230 });
        weaknessY = doc.y + 4;
      });
    } else {
      doc.fillColor('#94A3B8')
         .fontSize(9)
         .font('Helvetica')
         .text('No areas recorded', 310, weaknessY);
      weaknessY += 14;
    }

    yPosition = Math.max(strengthY, weaknessY) + 10;

    // Improvement Plan
    if (improvementPlan) {
      doc.rect(50, yPosition, 495, 18).fill('#1E293B');
      doc.fillColor('#3B82F6')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('[>] RECOMMENDED ACTION PLAN', 58, yPosition + 5);

      yPosition += 24;

      doc.fillColor('#334155')
         .fontSize(9)
         .font('Helvetica')
         .text(improvementPlan, 55, yPosition, { width: 485 });

      yPosition = doc.y + 16;
    }

    // ========== QUESTIONS SECTION WITH SCORES ==========
    if (yPosition > doc.page.height - 140) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 30).fill('#0F172A');
      doc.fillColor('#F8FAFC')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PREVUE.AI - Interview Report', 50, 10);
      yPosition = 50;
    }

    doc.moveTo(50, yPosition).lineTo(545, yPosition).lineWidth(0.5).stroke('#CBD5E1');
    yPosition += 15;

    doc.fillColor('#0F172A')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('QUESTION ANALYSIS', 50, yPosition);

    yPosition += 20;

    const questions = Array.isArray(interview.questions) ? interview.questions : [];

    questions.forEach((item, index) => {
      if (yPosition > doc.page.height - 180) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 30).fill('#0F172A');
        doc.fillColor('#F8FAFC')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('PREVUE.AI - Question Analysis (continued)', 50, 10);
        yPosition = 50;
      }

      const questionNumber = item.questionNumber || index + 1;
      const questionText = item.question || 'N/A';
      const idealAnswerText = item.idealAnswer || 'N/A';
      const qCorrectness = item.correctness != null ? (item.correctness * 10).toFixed(0) : '-';
      const qDepth = item.depth != null ? (item.depth * 10).toFixed(0) : '-';
      const qStructure = item.structure != null ? (item.structure * 10).toFixed(0) : '-';

      // Question header bar
      doc.rect(50, yPosition, 495, 22).fill('#0F172A');

      // Question number
      doc.fillColor('#3B82F6')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`Q${questionNumber}`, 58, yPosition + 6);

      // Per-question scores on the right
      doc.fillColor('#64748B')
         .fontSize(8)
         .font('Helvetica')
         .text('COR', 380, yPosition + 4);
      doc.fillColor('#10B981')
         .font('Helvetica-Bold')
         .text(`${qCorrectness}%`, 380, yPosition + 13);

      doc.fillColor('#64748B')
         .font('Helvetica')
         .text('DEP', 420, yPosition + 4);
      doc.fillColor('#3B82F6')
         .font('Helvetica-Bold')
         .text(`${qDepth}%`, 420, yPosition + 13);

      doc.fillColor('#64748B')
         .font('Helvetica')
         .text('STR', 460, yPosition + 4);
      doc.fillColor('#8B5CF6')
         .font('Helvetica-Bold')
         .text(`${qStructure}%`, 460, yPosition + 13);

      // Status indicator
      const avgScore = ((Number(item.correctness || 0) + Number(item.depth || 0) + Number(item.structure || 0)) / 3) * 10;
      const statusColor = avgScore >= 70 ? '#10B981' : avgScore >= 50 ? '#F59E0B' : '#EF4444';
      doc.rect(510, yPosition + 4, 30, 14).fill(statusColor);
      doc.fillColor('#FFFFFF')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(avgScore >= 70 ? 'PASS' : avgScore >= 50 ? 'AVG' : 'LOW', 512, yPosition + 7);

      yPosition += 28;

      // Question text
      doc.fillColor('#0F172A')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(questionText, 55, yPosition, { width: 485 });

      yPosition = doc.y + 8;

      // Model answer section
      doc.rect(55, yPosition, 485, 1).fill('#E2E8F0');
      yPosition += 6;

      doc.fillColor('#64748B')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('MODEL ANSWER', 55, yPosition);

      yPosition += 12;

      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica')
         .text(idealAnswerText, 55, yPosition, { width: 485 });

      yPosition = doc.y + 20;
    });

    // ========== FOOTER ==========
    // Place footer at current position + some margin, no extra page
    yPosition = Math.max(yPosition + 10, doc.y + 20);

    doc.moveTo(50, yPosition).lineTo(545, yPosition).lineWidth(0.5).stroke('#CBD5E1');

    doc.fillColor('#94A3B8')
       .fontSize(8)
       .font('Helvetica')
       .text('Generated by PREVUE.AI | AI-Powered Interview Analytics', 50, yPosition + 10, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).json({ error: "Failed to generate feedback report" });
  }
});

export default router;
