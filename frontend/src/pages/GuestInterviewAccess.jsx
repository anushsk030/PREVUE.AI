import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import InterviewFlow from "../components/InterviewFlow";
import styles from "./GuestInterviewAccess.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000";

export default function GuestInterviewAccess() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(null);

  const handleStart = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/guest-access/${token}`,
        {
          name: name.trim(),
          email: email.trim(),
        },
        { withCredentials: true }
      );

      const scheduleData = response.data?.schedule;
      if (!scheduleData) {
        throw new Error("Interview configuration not found.");
      }

      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }

      setSchedule(scheduleData);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not start interview");
    } finally {
      setLoading(false);
    }
  };

  if (schedule) {
    return (
      <InterviewFlow
        role={schedule.role}
        mode={schedule.mode}
        difficulty={schedule.difficulty}
        resumeContext=""
        onBack={() => navigate("/")}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>Start Your Scheduled Interview</h2>
        <p className={styles.subtitle}>
          Enter your name and the scheduled email to continue.
        </p>

        <form onSubmit={handleStart} className={styles.form}>
          <label className={styles.label}>Full Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            disabled={loading}
          />

          <label className={styles.label}>Email</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Verifying..." : "Start Interview"}
          </button>
        </form>
      </div>
    </div>
  );
}
