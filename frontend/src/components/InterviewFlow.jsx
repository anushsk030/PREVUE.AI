import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Loader2, MessageSquare, Trophy, CheckCircle, Zap, Briefcase, Layout, ArrowRight, TrendingUp, AlertCircle, Eye, Lightbulb, Activity, Smile } from "lucide-react";
import CameraFeed from "./CameraFeed";
import QuestionCard from "./QuestionCard";
import styles from "./InterviewFlow.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000";

// Configure axios to send credentials (cookies) with every request
axios.defaults.withCredentials = true;

const TOTAL_QUESTIONS = 15;

export default function InterviewFlow({
  role = "Frontend Developer",
  mode = "Technical",
  difficulty = "Medium",
  resumeContext = "",
  onBack,
}) {
  /* ================= STATE ================= */
  const [interviewId, setInterviewId] = useState(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const [interviewComplete, setInterviewComplete] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);

  // Behavior Analysis Scores
  const [behaviorScores, setBehaviorScores] = useState({
    avgConfidence: 0,
    eyeContact: 0,
    stability: 0,
    facePresence: 0,
    blinkRate: 0,
    professionalism: 0
  });

  /* ================= REFS ================= */
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const interviewCreatedRef = useRef(false);
  const behaviorScoresRef = useRef({
    avgConfidence: 0,
    eyeContact: 0,
    stability: 0,
    facePresence: 0,
    blinkRate: 0,
    professionalism: 0
  });

  /* ================= PAGE LOCK ================= */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  /* ================= FULLSCREEN ENFORCEMENT ================= */
  useEffect(() => {
    let requestInProgress = false;

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      
      if (!isFullscreen && !interviewComplete && !requestInProgress) {
        setFullscreenWarning(true);
        requestInProgress = true;
        
        // Request fullscreen again with debouncing
        setTimeout(() => {
          const elem = document.documentElement;
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {}).finally(() => {
              requestInProgress = false;
            });
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
            requestInProgress = false;
          } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
            requestInProgress = false;
          } else {
            requestInProgress = false;
          }
        }, 100);
      } else if (isFullscreen) {
        setFullscreenWarning(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [interviewComplete]);

  /* ================= FETCH QUESTION ================= */
  const fetchQuestion = async (qnNumber, lastQ = "", lastA = "", isInitial = false, history = []) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setQuestionLoading(true);
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/questions/next-question`,
        {
          role,
          mode,
          difficulty,
          resumeContext,
          questionNumber: qnNumber,
          lastQuestion: lastQ,
          lastAnswer: lastA,
          history,
        },
        { withCredentials: true }
      );

      const q = res.data?.question || "";
      setQuestion(q);

      setAskedQuestions((prev) => {
        const copy = [...prev];
        copy[qnNumber - 1] = q;
        return copy;
      });

      speakQuestion(q);
    } catch {
      setQuestion("Failed to load question.");
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setQuestionLoading(false);
      }
    }
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    // Prevent double creation in React StrictMode
    if (interviewCreatedRef.current) return;
    interviewCreatedRef.current = true;

    const createInterview = async () => {
      try {
        const res = await axios.post(
          `${API_BASE}/api/questions/create-interview`,
          { role, mode, difficulty, resumeContext },
          { withCredentials: true }
        );
        setInterviewId(res.data?.interviewId);
      } catch (err) {
        console.error("Failed to create interview:", err);
      }
      fetchQuestion(1, "", "", true, []);
    };
    createInterview();
    // eslint-disable-next-line
  }, []);

  /* ================= TTS ================= */
  const speakQuestion = (text) => {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;

    utter.onstart = () => {
      if (listening) stopRecording();
    };

    window.speechSynthesis.speak(utter);
  };

  /* ================= STT ================= */
  const startRecording = async () => {
    if (listening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        await sendForSTT();
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setListening(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setListening(false);
  };

  const sendForSTT = async () => {
    if (!chunksRef.current.length) return;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    if (!blob.size) return;

    const form = new FormData();
    form.append("file", blob);

    try {
      const res = await axios.post(
        `${API_BASE}/api/stt/speech-to-text`,
        form,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.text?.trim()) {
        setAnswer((prev) =>
          prev ? `${prev} ${res.data.text}` : res.data.text
        );
        
        // Log STT comparison to console
        console.log("\n🎤 Speech-to-Text Result:");
        console.log("📝 Raw STT:", res.data.rawText || res.data.text);
        console.log("✅ Corrected:", res.data.text);
        console.log("─".repeat(50));
      }
    } catch (err) {
      console.error("STT failed:", err);
    }
  };

  /* ================= CAMERA ================= */
  const startCamera = async () => {
    if (cameraOn && streamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch {
      setMediaError("Camera permission denied");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  /* ================= SESSION COMPLETE HANDLER ================= */
  const handleSessionComplete = useCallback((scores) => {
    // Store behavior analysis scores from camera feed in both state and ref
    const behaviorData = {
      avgConfidence: scores.avgConfidence || 0,
      eyeContact: scores.eyeContact || 0,
      stability: scores.stability || 0,
      facePresence: scores.facePresence || 0,
      blinkRate: scores.blinkRate || 0,
      professionalism: scores.professionalism || 0
    };
    setBehaviorScores(behaviorData);
    behaviorScoresRef.current = behaviorData;
  }, []);

  /* ================= NEXT (Updated for silent evaluation) ================= */
  const handleNext = () => {
    stopRecording();

    // Store answer for current question
    const updatedAnswers = [...answers];
    updatedAnswers[index] = answer;
    setAnswers(updatedAnswers);

    // ================= FIRE-AND-FORGET SILENT EVALUATION =================
    axios.post(`${API_BASE}/api/questions/evaluate`, {
      question,
      answer: answer || "",
      questionNumber: index + 1,
      role,
      mode,
      difficulty,
      interviewId
    }).catch(console.error);

    // ================= MOVE TO NEXT QUESTION =================
    if (index === TOTAL_QUESTIONS - 1) {
      // Interview complete
      setInterviewComplete(true);
      stopCamera();
      setGeneratingFeedback(true);

      // Fetch actual results from database
      (async () => {
        try {
          // Give evaluation some time to complete
          await new Promise(resolve => setTimeout(resolve, 2000));

          const res = await axios.post(
            `${API_BASE}/api/questions/finalize-interview`,
            { 
              interviewId,
              eyeContact: behaviorScoresRef.current.eyeContact,
              confidence: behaviorScoresRef.current.avgConfidence,
              engagement: 0,
              professionalism: behaviorScoresRef.current.professionalism,
              stability: behaviorScoresRef.current.stability,
              facePresence: behaviorScoresRef.current.facePresence,
              blinkRate: behaviorScoresRef.current.blinkRate,
              avgConfidence: behaviorScoresRef.current.avgConfidence
            },
            { withCredentials: true }
          );

          const results = res.data?.results;
          const totalScore = results?.totalScore || 0;
          
          setFeedback({
            score: Math.round(totalScore * 10), // Convert to percentage (out of 100)
            summary: `Interview completed! Your overall performance score is ${totalScore}/10.`,
            details: `Correctness: ${results?.correctness || 0}/10 | Depth: ${results?.depth || 0}/10 | Structure: ${results?.structure || 0}/10`,
            results
          });
        } catch (err) {
          console.error("Failed to fetch results:", err);
          setFeedback({
            score: 0,
            summary: "Interview completed!",
            details: "Unable to load results at this time.",
          });
        } finally {
          setGeneratingFeedback(false);
        }
      })();
      return;
    }

    // Move to next question instantly
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswer("");

    const history = askedQuestions
      .slice(0, index + 1)
      .map((askedQuestion, i) => ({
        question: askedQuestion,
        answer: updatedAnswers[i] || "",
      }))
      .filter((item) => item.question);

    fetchQuestion(nextIndex + 1, askedQuestions[index], answer, false, history);
  };

  const handleMicToggle = () => {
    if (listening) stopRecording();
    else startRecording();
  };

  const handleCameraToggle = () => {
    if (cameraOn) stopCamera();
    else startCamera();
  };

  const handleReturnToDashboard = () => {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    
    // Navigate back to dashboard
    if (onBack) {
      onBack();
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        Preparing interview…
      </div>
    );
  }

  /* ================= FEEDBACK ================= */
  if (interviewComplete) {
    return (
      <div className={`${styles.container} ${styles.feedbackMode}`}>
        <div className={styles.feedbackCard}>
          {generatingFeedback ? (
            <div className={styles.analyzingState}>
              <Loader2 className={styles.spinner} />
              <h2>Analying Interview...</h2>
              <p>Generative AI is evaluating your responses against industry standards.</p>
            </div>
          ) : (
            <>
              <div className={styles.feedbackHeader}>
                <div className={styles.trophyIcon}>
                  <Trophy size={32} />
                </div>
                <div>
                  <h2>Interview Analysis</h2>
                  <p>Great job completing the {mode} session!</p>
                </div>
              </div>

              <div className={styles.scoreSection}>
                <div className={styles.mainScore}>
                  <div className={styles.scoreTextOverlay}>
                    <span className={styles.scoreValueText}>{feedback.score}%</span>
                    <span className={styles.scoreLabelText}>Total Score</span>
                  </div>
                  <svg viewBox="0 0 36 36" className={styles.circularChart}>
                    <path className={styles.circleBg}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path className={styles.circle}
                      strokeDasharray={`${feedback.score}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              </div>

              <div className={styles.metricsGrid}>
                {/* Verbal Analysis Header */}
                <div style={{gridColumn: '1 / -1', marginBottom: '8px'}}>
                  <h3 style={{fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0'}}>
                    Verbal Analysis
                  </h3>
                </div>

                {/* Correctness */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <div className={styles.iconBox} style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
                      <CheckCircle size={18} />
                    </div>
                    <span>Correctness</span>
                  </div>
                  <div className={styles.metricValue}>
                    {Math.round((feedback.results?.correctness || 0) * 10)}%
                  </div>
                  <div className={styles.metricBar}>
                    <div className={styles.metricFill} style={{width: `${(feedback.results?.correctness || 0) * 10}%`, backgroundColor: '#10b981'}}></div>
                  </div>
                </div>

                {/* Depth */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <div className={styles.iconBox} style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>
                      <Zap size={18} />
                    </div>
                    <span>Depth</span>
                  </div>
                  <div className={styles.metricValue}>
                    {Math.round((feedback.results?.depth || 0) * 10)}%
                  </div>
                  <div className={styles.metricBar}>
                    <div className={styles.metricFill} style={{width: `${(feedback.results?.depth || 0) * 10}%`, backgroundColor: '#3b82f6'}}></div>
                  </div>
                </div>

                {/* Structure */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <div className={styles.iconBox} style={{background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}>
                      <Layout size={18} />
                    </div>
                    <span>Structure</span>
                  </div>
                  <div className={styles.metricValue}>
                    {Math.round((feedback.results?.structure || 0) * 10)}%
                  </div>
                  <div className={styles.metricBar}>
                    <div className={styles.metricFill} style={{width: `${(feedback.results?.structure || 0) * 10}%`, backgroundColor: '#8b5cf6'}}></div>
                  </div>
                </div>
              </div>

              {/* Behavioral Analysis Section */}
              <div className={styles.metricsGrid}>
                {/* Behavioral Analysis Header */}
                <div style={{gridColumn: '1 / -1', marginBottom: '8px'}}>
                  <h3 style={{fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0'}}>
                    📊 Behavioral Analysis
                  </h3>
                </div>

                {/* Eye Contact */}
                  <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                      <div className={styles.iconBox} style={{background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1'}}>
                        <Eye size={18} />
                      </div>
                      <span>Eye Contact</span>
                    </div>
                    <div className={styles.metricValue}>
                      {Math.round(behaviorScores.eyeContact)}%
                    </div>
                    <div className={styles.metricBar}>
                      <div className={styles.metricFill} style={{width: `${behaviorScores.eyeContact}%`, backgroundColor: '#6366f1'}}></div>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                      <div className={styles.iconBox} style={{background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899'}}>
                        <Lightbulb size={18} />
                      </div>
                      <span>Confidence</span>
                    </div>
                    <div className={styles.metricValue}>
                      {Math.round(behaviorScores.avgConfidence)}%
                    </div>
                    <div className={styles.metricBar}>
                      <div className={styles.metricFill} style={{width: `${behaviorScores.avgConfidence}%`, backgroundColor: '#ec4899'}}></div>
                    </div>
                  </div>

                  {/* Stability */}
                  <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                      <div className={styles.iconBox} style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e'}}>
                        <Activity size={18} />
                      </div>
                      <span>Stability</span>
                    </div>
                    <div className={styles.metricValue}>
                      {Math.round(behaviorScores.stability)}%
                    </div>
                    <div className={styles.metricBar}>
                      <div className={styles.metricFill} style={{width: `${behaviorScores.stability}%`, backgroundColor: '#22c55e'}}></div>
                    </div>
                  </div>

                </div>

              {feedback.results?.feedbackSummary && (
                <div className={styles.qualitativeSection}>
                  <div className={styles.feedbackColumn}>
                    <div className={styles.columnHeader}>
                      <div className={styles.iconBox} style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
                        <TrendingUp size={18} />
                      </div>
                      <h3>Key Strengths</h3>
                    </div>
                    <ul className={styles.feedbackList}>
                      {feedback.results.feedbackSummary.pros?.map((pro, i) => (
                        <li key={i}>{pro}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.feedbackColumn}>
                    <div className={styles.columnHeader}>
                      <div className={styles.iconBox} style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>
                        <AlertCircle size={18} />
                      </div>
                      <h3>Areas for Improvement</h3>
                    </div>
                    <ul className={styles.feedbackList}>
                      {feedback.results.feedbackSummary.cons?.map((con, i) => (
                        <li key={i}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button onClick={handleReturnToDashboard} className={styles.finishButton}>
                Return to Dashboard <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className={styles.container}>
      {fullscreenWarning && (
        <div className={styles.fullscreenWarning}>
          <div className={styles.warningContent}>
            <AlertCircle size={48} color="#dc2626" />
            <h3>Fullscreen Required</h3>
            <p>You must remain in fullscreen mode during the interview</p>
            <button onClick={() => {
              setFullscreenWarning(false);
              const elem = document.documentElement;
              if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
              } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
              } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
              }
            }} className={styles.warningBtn}>
              Got it
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.interviewShell}>
        <header className={styles.header}>
          <h1>
            <MessageSquare /> {role} Interview
          </h1>
          <span>
            Question {index + 1} / {TOTAL_QUESTIONS}
          </span>
        </header>

        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${((index + 1) / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        <div className={styles.layout}>
          <QuestionCard
            question={question}
            questionNumber={index + 1}
            totalQuestions={TOTAL_QUESTIONS}
            answer={answer}
            onAnswerChange={setAnswer}
            onMicToggle={handleMicToggle}
            onCameraToggle={handleCameraToggle}
            onNext={handleNext}
            listening={listening}
            cameraOn={cameraOn}
            loading={questionLoading}
          />

          <CameraFeed
            videoRef={videoRef}
            cameraOn={cameraOn}
            mediaError={mediaError}
            sessionActive={!loading && !interviewComplete}
            onSessionComplete={handleSessionComplete}
          />
        </div>
      </div>
    </div>
  );
}
