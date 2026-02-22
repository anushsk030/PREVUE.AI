"use client"

import { useState } from "react"
import axios from "axios"
import InterviewFlow from "./InterviewFlow"
import styles from "./InterviewSetup.module.css"

const ROLES = ["Software Developer", "Frontend Developer", "Backend Developer", "Data Analyst", "Full Stack Developer", "DevOps Engineer"]
const MODES = ["Technical", "HR"]
const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"

export default function InterviewSetup({ onBack }) {
  const [role, setRole] = useState("")
  const [resumeContext, setResumeContext] = useState("")
  const [mode, setMode] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [resumeFileName, setResumeFileName] = useState("")
  const [isResumeProcessing, setIsResumeProcessing] = useState(false)
  const [resumeError, setResumeError] = useState("")
  const [startInterview, setStartInterview] = useState(false)
  const [fullscreenError, setFullscreenError] = useState("")

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setResumeError("")
    setResumeFileName(file.name)
    setIsResumeProcessing(true)

    const formData = new FormData()
    formData.append("resume", file)

    try {
      const res = await axios.post(`${API_BASE}/api/questions/extract-role-from-resume`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      })

      const extractedRole = res.data?.role || ""
      const extractedResumeContext = res.data?.resumeContext || ""

      if (extractedResumeContext) {
        setResumeContext(extractedResumeContext)
      }

      if (extractedRole) {
        setRole(extractedRole)
      } else {
        setResumeError("Could not infer role from resume. Please select a role manually.")
      }
    } catch (err) {
      const message = err?.response?.data?.error || "Resume processing failed. Please select a role manually."
      setResumeError(message)
    } finally {
      setIsResumeProcessing(false)
    }
  }

  const handleStart = async () => {
    if ((role || resumeContext) && mode && difficulty) {
      try {
        // Request fullscreen
        const elem = document.documentElement
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen()
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen()
        }
        setStartInterview(true)
      } catch (error) {
        setFullscreenError("Please allow fullscreen mode to start the interview")
      }
    }
  }

  if (startInterview) {
    return (
      <InterviewFlow
        role={role || "Resume-Based Interview"}
        mode={mode}
        difficulty={difficulty}
        resumeContext={resumeContext}
        onBack={onBack}
      />
    )
  }

  return (
    <div className={styles.container}>

      <div className={styles.card}>
        <button onClick={onBack} className={styles.backBtn}> <i className="fa-solid fa-arrow-left"></i> </button>

        <h2>Configure Your Interview</h2>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Upload Resume (Optional)</label>
          <div className={styles.resumeUploadRow}>
            <label className={styles.uploadBtn} htmlFor="resume-upload">
              {isResumeProcessing ? "Analyzing Resume..." : "Upload Resume"}
            </label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className={styles.fileInput}
              onChange={handleResumeUpload}
              disabled={isResumeProcessing}
            />
            <span className={styles.fileName}>{resumeFileName || "No file selected"}</span>
          </div>
          {resumeError && <p className={styles.inlineError}>{resumeError}</p>}
          {resumeContext && resumeFileName && !resumeError && (
            <p className={styles.resumeSuccess}>
              Resume uploaded. Interview questions will be based on your resume{role ? ` (${role})` : ""}.
            </p>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Role</label>
          <div className={styles.options}>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`${styles.option} ${role === r ? styles.selected : ""}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Mode</label>
          <div className={styles.options}>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`${styles.option} ${mode === m ? styles.selected : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Select Difficulty</label>
          <div className={styles.options}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`${styles.option} ${difficulty === d ? styles.selected : ""}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {fullscreenError && (
          <div className={styles.errorMessage}>
            {fullscreenError}
          </div>
        )}

        <button onClick={handleStart} disabled={(!(role || resumeContext) || !mode || !difficulty || isResumeProcessing)} className={styles.startBtn}>
          Start Interview
        </button>
      </div>
    </div>
  )
}
