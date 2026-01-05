import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Loader2, MessageSquare } from "lucide-react";
import CameraFeed from "./CameraFeed";
import QuestionCard from "./QuestionCard";
import styles from "./InterviewFlow.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000";

// Configure axios to send credentials (cookies) with every request
axios.defaults.withCredentials = true;

const TOTAL_QUESTIONS = 6;

export default function InterviewFlow({
  role = "Frontend Developer",
  mode = "Technical",
  difficulty = "Medium",
  onBack,
}) {
  /* ================= STATE ================= */
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

  /* ================= REFS ================= */
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  /* ================= PAGE LOCK ================= */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  /* ================= FETCH QUESTION ================= */
  const fetchQuestion = async (qnNumber, lastQ = "", lastA = "", isInitial = false) => {
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
          questionNumber: qnNumber,
          lastQuestion: lastQ,
          lastAnswer: lastA,
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
    fetchQuestion(1, "", "", true);
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

  /* ================= NEXT (Updated for silent evaluation) ================= */
  const handleNext = () => {
    stopRecording();

    // Store answer for current question
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = answer;
      return copy;
    });

    // ================= FIRE-AND-FORGET SILENT EVALUATION =================
    axios.post(`${API_BASE}/api/questions/evaluate`, {
      question,
      answer: answer || "",
      questionNumber: index + 1
    }).catch(console.error);

    // ================= MOVE TO NEXT QUESTION =================
    if (index === TOTAL_QUESTIONS - 1) {
      // Interview complete
      setInterviewComplete(true);
      stopCamera();
      setGeneratingFeedback(true);

      // Simulate AI feedback (can be replaced with real evaluation aggregation)
      setTimeout(() => {
        const randomScore = Math.floor(Math.random() * (40 - 20 + 1)) + 20;
        setFeedback({
          score: randomScore,
          summary: "Thank you for participating in the interview.",
          details: "AI feedback engine coming soon.",
        });
        setGeneratingFeedback(false);
      }, 1200);
      return;
    }

    // Move to next question instantly
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswer("");
    fetchQuestion(nextIndex + 1, askedQuestions[index], answer, false);
  };

  const handleMicToggle = () => {
    if (listening) stopRecording();
    else startRecording();
  };

  const handleCameraToggle = () => {
    if (cameraOn) stopCamera();
    else startCamera();
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
      <div className={styles.container}>
        <div className={styles.feedbackCard}>
          {generatingFeedback ? (
            <>
              <Loader2 className={styles.spinner} />
              Analyzing…
            </>
          ) : (
            <>
              <h2>Score: {feedback.score}%</h2>
              <p>{feedback.summary}</p>
              <p className={styles.muted}>{feedback.details}</p>
              <button onClick={onBack}>Back</button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className={styles.container}>
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
          />
        </div>
      </div>
    </div>
  );
}
