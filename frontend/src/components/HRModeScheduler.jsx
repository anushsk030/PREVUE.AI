import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./HRModeScheduler.module.css";

const ROLES = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Full Stack Developer",
  "DevOps Engineer",
];

const MODES = ["HR", "Technical"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000";

export default function HRModeScheduler() {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [role, setRole] = useState("Software Developer");
  const [mode, setMode] = useState("HR");
  const [difficulty, setDifficulty] = useState("Medium");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isValid = useMemo(() => {
    if (!candidateName.trim() || !candidateEmail.trim() || !scheduledAt) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(candidateEmail.trim());
  }, [candidateName, candidateEmail, scheduledAt]);

  const resetForm = () => {
    setCandidateName("");
    setCandidateEmail("");
    setRole("Software Developer");
    setMode("HR");
    setDifficulty("Medium");
    setScheduledAt("");
    setNotes("");
  };

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await axios.get(`${API_BASE}/api/questions/hr/scheduled-interviews`, {
        withCredentials: true,
      });
      setSchedules(res.data?.schedules || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!isValid) {
      setError("Please fill candidate details with a valid email and schedule time.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/api/questions/schedule-interview`,
        {
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          role,
          mode,
          difficulty,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes: notes.trim(),
        },
        { withCredentials: true }
      );

      setMessage("Interview scheduled successfully. Invitation email has been sent.");
      resetForm();
      fetchSchedules();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to schedule interview.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>HR MODE</h2>
        <p>Schedule interviews for candidates who do not yet have an account.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Candidate full name"
            />
          </div>

          <div className={styles.field}>
            <label>Candidate Email</label>
            <input
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              placeholder="candidate@example.com"
            />
          </div>

          <div className={styles.field}>
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Interview Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Notes (Optional)</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Interview instructions, round details, or joining notes"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <button type="submit" className={styles.submitBtn} disabled={!isValid || submitting}>
          {submitting ? "Scheduling..." : "Schedule Interview"}
        </button>
      </form>

      <section className={styles.resultsSection}>
        <h3>Scheduled Interviews & Results</h3>

        {loadingSchedules ? (
          <p className={styles.muted}>Loading scheduled interviews...</p>
        ) : schedules.length === 0 ? (
          <p className={styles.muted}>No interviews scheduled yet.</p>
        ) : (
          <div className={styles.scheduleList}>
            {schedules.map((item) => {
              const latest = item.latestResult;
              const scorePercent = latest?.totalScore ? Math.round(latest.totalScore * 10) : null;
              return (
                <article key={item._id} className={styles.scheduleCard}>
                  <div className={styles.cardTopRow}>
                    <div>
                      <p className={styles.candidateName}>{item.candidateName}</p>
                      <p className={styles.candidateEmail}>{item.candidateEmail}</p>
                    </div>
                    <span className={styles.modeBadge}>{item.mode}</span>
                  </div>

                  <div className={styles.metaGrid}>
                    <p><strong>Role:</strong> {item.role}</p>
                    <p><strong>Difficulty:</strong> {item.difficulty}</p>
                    <p><strong>Scheduled:</strong> {new Date(item.scheduledAt).toLocaleString()}</p>
                    <p><strong>Status:</strong> {latest ? "Completed" : "Awaiting completion"}</p>
                  </div>

                  {!latest ? (
                    <p className={styles.pendingText}>
                      {item.candidateUserLinked
                        ? "Candidate account found. Waiting for interview completion."
                        : "Candidate has not signed up with this email yet."}
                    </p>
                  ) : (
                    <div className={styles.resultBox}>
                      <p className={styles.scoreLine}>
                        <strong>Score:</strong> {scorePercent}%
                      </p>
                      <p>
                        <strong>Correctness:</strong> {latest.overallCorrectness || 0}/10 | <strong>Depth:</strong> {latest.overallDepth || 0}/10 | <strong>Structure:</strong> {latest.overallStructure || 0}/10
                      </p>
                      <p>
                        <strong>Confidence:</strong> {latest.confidence || 0}% | <strong>Eye Contact:</strong> {latest.eyeContact || 0}% | <strong>Stability:</strong> {latest.stability || 0}%
                      </p>

                      <div className={styles.feedbackColumns}>
                        <div>
                          <h4>Positives</h4>
                          <ul>
                            {(latest.feedbackSummary?.pros || []).length > 0 ? (
                              latest.feedbackSummary.pros.map((line, index) => <li key={index}>{line}</li>)
                            ) : (
                              <li>No positives summary available.</li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <h4>Negatives</h4>
                          <ul>
                            {(latest.feedbackSummary?.cons || []).length > 0 ? (
                              latest.feedbackSummary.cons.map((line, index) => <li key={index}>{line}</li>)
                            ) : (
                              <li>No negatives summary available.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {latest.feedbackSummary?.improvementPlan && (
                        <p className={styles.planLine}>
                          <strong>Improvement Plan:</strong> {latest.feedbackSummary.improvementPlan}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
