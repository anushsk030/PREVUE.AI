import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Video,
  VideoOff,
  ChevronRight,
  AlertCircle,
  Loader2,
  Camera,
  MessageSquare,
  Mic,
  MicOff,
} from "lucide-react";
import styles from "./InterviewFlow.module.css";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:3000";
const TOTAL_QUESTIONS = 6;

export default function InterviewFlow({ role = "Frontend Developer", mode = "Technical", difficulty = "Medium", onBack }) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voice, setVoice] = useState(null);

  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [mediaOn, setMediaOn] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const [interviewComplete, setInterviewComplete] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const textareaRef = useRef(null);

  // Google STT refs
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const minTimePassedRef = useRef(false);

  /* ---------------- Lock page scroll ---------------- */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  /* ---------------- Load First Question ---------------- */
  useEffect(() => {
    const fetchFirst = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          `${API_BASE}/api/questions/next-question`,
          {
            role,
            mode,
            difficulty,
            questionNumber: 1,
            lastQuestion: "",
            lastAnswer: "",
          },
          { withCredentials: true }
        );
        const data = res.data;
        setCurrentQuestion(data.question || "");
        setAskedQuestions([data.question || ""]);
      } catch (e) {
        setCurrentQuestion("Failed to load question. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode, difficulty]);

  /* ---------------- Google STT Recording ---------------- */
  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(audioStream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      minTimePassedRef.current = false;

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = sendForSTT;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      recorder.start();
      setListening(true);

      // Minimum 3 seconds before silence detection
      setTimeout(() => {
        minTimePassedRef.current = true;
      }, 3000);

      const dataArray = new Uint8Array(analyser.fftSize);

      const checkSilence = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }

        const volume = sum / dataArray.length;

        if (minTimePassedRef.current && volume < 5) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(stopRecording, 1000);
          }
        } else {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (recorder.state === "recording") {
          requestAnimationFrame(checkSilence);
        }
      };

      checkSilence();

      // Hard stop at 60 seconds
      setTimeout(() => {
        if (recorder.state === "recording") stopRecording();
      }, 60000);
    } catch (err) {
      console.error("Recording error:", err);
      setListening(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      recorderRef.current.stream.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
      setListening(false);
    }
  };

  const sendForSTT = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    
    if (blob.size === 0) return;
    
    const form = new FormData();
    form.append("audio", blob);

    try {
      const res = await axios.post(`${API_BASE}/api/stt/speech-to-text`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.text) {
        setAnswer((prev) => (prev ? prev + " " + res.data.text : res.data.text).trim());
      }
    } catch (err) {
      console.error("STT error:", err.response?.data || err.message);
    }
  };

  /* ---------------- Auto-grow textarea ---------------- */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [answer]);

  /* ---------------- Speak question out loud ---------------- */
  const selectPreferredVoice = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices || voices.length === 0) return;
    const englishVoices = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    // Prefer premium/enhanced voices: Google UK/US Enhanced, Microsoft Natural, or Samantha
    const preferred =
      englishVoices.find((v) => /enhanced|natural|premium|samantha/i.test(v.name)) ||
      englishVoices.find((v) => /google.*uk|google.*us/i.test(v.name)) ||
      englishVoices.find((v) => /microsoft/i.test(v.name)) ||
      englishVoices.find((v) => /female|uk|us/i.test(v.name)) ||
      englishVoices[0] ||
      voices[0];
    setVoice(preferred || null);
  };

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    // Load voices immediately and also when the list updates
    const handleVoicesChanged = () => selectPreferredVoice();
    selectPreferredVoice();
    synth.onvoiceschanged = handleVoicesChanged;
    return () => {
      if (synth) synth.onvoiceschanged = null;
    };
  }, []);

  const speak = (text) => {
    if (!ttsEnabled || !text) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
      // Remove backticks before speaking
      const cleanText = String(text).replace(/`/g, "");
      const utter = new SpeechSynthesisUtterance(cleanText);
      if (voice) utter.voice = voice;
      utter.lang = (voice && voice.lang) || "en-US";
      utter.rate = 0.9; // slower and more conversational
      utter.pitch = 1.0; // neutral natural pitch
      utter.volume = 0.95; // slightly softer for warmth
      synth.speak(utter);
    } catch (_) {
      // Ignore TTS errors silently
    }
  };

  useEffect(() => {
    if (currentQuestion) {
      speak(currentQuestion);
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [currentQuestion, ttsEnabled]);

  /* ---------------- Reset per question ---------------- */
  useEffect(() => {
    stopRecording();
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    setAnswer("");
  }, [index]);

  /* ---------------- Camera helpers ---------------- */
  const startCamera = async () => {
    if (cameraOn) return;
    try {
      setMediaError("");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setMediaError("Camera permission denied");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  // Re-attach stream to video when UI re-mounts after loading
  useEffect(() => {
    if (!loading && cameraOn && videoRef.current && streamRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
      } catch (_) {
        // ignore re-attach errors
      }
    }
  }, [loading, cameraOn]);

  /* ---------------- Mic toggle (AUTO START CAMERA) ---------------- */
  const toggleMedia = async () => {
    if (!mediaOn) {
      await startCamera();
      await startRecording();
      setMediaOn(true);
    } else {
      stopRecording();
      stopCamera();
      setMediaOn(false);
    }
  };

  /* ---------------- Camera toggle (separate from mic) ---------------- */
  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  /* ---------------- Next / Finish ---------------- */
  const handleNext = async () => {
    // Save current answer
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = answer;
      return next;
    });

    // If last question, finish
    if (index >= TOTAL_QUESTIONS - 1) {
      setInterviewComplete(true);
      setGeneratingFeedback(true);
      stopRecording();
      stopCamera();
      // Simple mock feedback to keep existing UX
      setTimeout(() => {
        setFeedback({
          score: 80,
          summary: "Thanks for completing the interview.",
          details: "We will improve feedback generation soon.",
        });
        setGeneratingFeedback(false);
      }, 1200);
      return;
    }

    // Otherwise fetch next question from backend with context
    try {
      const lastQuestion = askedQuestions[index] || "";
      const lastAnswer = answers[index] || answer || "";
      const nextNumber = index + 2; // next questionNumber (1-based)
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/api/questions/next-question`,
        {
          role,
          mode,
          difficulty,
          questionNumber: nextNumber,
          lastQuestion,
          lastAnswer,
        },
        { withCredentials: true }
      );
      const data = res.data;
      const qText = data.question || "";
      setAskedQuestions((prev) => {
        const next = [...prev];
        next[index + 1] = qText;
        return next;
      });
      setCurrentQuestion(qText);
      setIndex((i) => i + 1);
    } catch (e) {
      setCurrentQuestion("Failed to load next question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        Preparing interview…
      </div>
    );
  }

  /* ---------------- Feedback ---------------- */
  if (interviewComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.feedbackCard}>
          {generatingFeedback ? (
            <>
              <Loader2 className={styles.spinner} />
              <p>Analyzing your interview…</p>
            </>
          ) : (
            <>
              <h2>Interview Score: {feedback.score}%</h2>
              <p>{feedback.summary}</p>
              <p className={styles.muted}>{feedback.details}</p>
              <button onClick={onBack} className={styles.primaryBtn}>
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const progress = ((index + 1) / TOTAL_QUESTIONS) * 100;
  const isLast = index === TOTAL_QUESTIONS - 1;

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.interviewShell}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <MessageSquare /> {role} Interview
          </h1>
          <span className={styles.counter}>
            Question {index + 1} / {TOTAL_QUESTIONS}
          </span>
        </header>

        <div className={styles.progressBar}>
          <div className={styles.progress} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.layout}>
          {/* Question */}
          <div className={styles.questionCard}>
            <h2 className={styles.questionText}>{currentQuestion}</h2>

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Type your answer or use the mic…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <div className={styles.actions}>
              <div className={styles.iconGroup}>
                <button
                  onClick={toggleMic}
                  className={`${styles.iconBtn} ${mediaOn ? styles.micActive : ""}`}
                  title="Toggle Microphone"
                >
                  {mediaOn ? <Mic /> : <MicOff />}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`${styles.iconBtn} ${cameraOn ? styles.cameraActive : ""}`}
                  title="Toggle Camera"
                >
                  {cameraOn ? <Video /> : <VideoOff />}
                </button>
              </div>

              <button onClick={handleNext} className={styles.nextBtn}>
                {isLast ? "Finish Interview" : "Next"}
                {!isLast && <ChevronRight />}
              </button>
            </div>
          </div>

          {/* Camera */}
          <div
            className={`${styles.cameraCard} ${
              cameraOn ? styles.cameraActive : ""
            }`}
          >
            <div className={styles.cameraHeader}>
              <Camera /> Camera
            </div>

            <div className={styles.videoBox}>
              <video ref={videoRef} autoPlay muted playsInline className={styles.video} />
              {!cameraOn && (
                <div className={styles.overlay}>
                  <VideoOff />
                  <p>Camera Disabled</p>
                </div>
              )}
              {mediaError && (
                <div className={styles.error}>
                  <AlertCircle /> {mediaError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
