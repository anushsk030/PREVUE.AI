"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import InterviewFlow from "./InterviewFlow"
import styles from "./InterviewSetup.module.css"
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [resumeFile, setResumeFile] = useState(null)
  const [resumePreviewUrl, setResumePreviewUrl] = useState("")
  const [isResumeProcessing, setIsResumeProcessing] = useState(false)
  const [resumeError, setResumeError] = useState("")
  const [startInterview, setStartInterview] = useState(false)
  const [fullscreenError, setFullscreenError] = useState("")

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setResumeError("")
    setResumeFileName(file.name)
    setResumeFile(file)
    setIsResumeProcessing(true)

    // Create preview URL for PDF files
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file)
      setResumePreviewUrl(url)
    } else {
      setResumePreviewUrl("")
    }

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

  const handleRemoveResume = () => {
    setResumeFile(null)
    setResumeFileName("")
    setResumePreviewUrl("")
    setResumeContext("")
    setResumeError("")
    if (resumePreviewUrl) {
      URL.revokeObjectURL(resumePreviewUrl)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resumePreviewUrl) {
        URL.revokeObjectURL(resumePreviewUrl)
      }
    }
  }, [resumePreviewUrl])

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

        <div className={styles.gridLayout}>
          {/* Left Column - Interview Configuration */}
          <div className={styles.leftColumn}>
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
          </div>

          {/* Right Column - Resume Upload & Preview */}
          <div className={styles.rightColumn}>
            <div className={styles.resumeSection}>
              <label className={styles.sectionLabel}>
                <Upload size={18} style={{marginRight: '8px', verticalAlign: 'middle'}} />
                Upload Resume (Optional)
              </label>
              
              {!resumeFile ? (
                <div className={styles.uploadArea}>
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className={styles.fileInput}
                    onChange={handleResumeUpload}
                    disabled={isResumeProcessing}
                  />
                  <label htmlFor="resume-upload" className={styles.uploadBox}>
                    <div className={styles.uploadIcon}>
                      <Upload size={40} strokeWidth={1.5} />
                    </div>
                    <p className={styles.uploadText}>
                      {isResumeProcessing ? "Analyzing Resume..." : "Click to upload or drag and drop"}
                    </p>
                    <p className={styles.uploadSubtext}>PDF or TXT (Max 10MB)</p>
                  </label>
                </div>
              ) : (
                <div className={styles.previewContainer}>
                  <div className={styles.previewHeader}>
                    <div className={styles.fileInfo}>
                      <FileText size={20} strokeWidth={2} />
                      <div className={styles.fileDetails}>
                        <p className={styles.previewFileName}>{resumeFileName}</p>
                        <p className={styles.fileSize}>{(resumeFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button onClick={handleRemoveResume} className={styles.removeBtn}>
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>

                  {resumeError && (
                    <div className={styles.statusBanner} style={{background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca'}}>
                      <AlertCircle size={16} />
                      <span>{resumeError}</span>
                    </div>
                  )}

                  {resumeContext && !resumeError && (
                    <div className={styles.statusBanner} style={{background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0'}}>
                      <CheckCircle size={16} />
                      <span>Resume analyzed successfully{role ? ` (${role})` : ""}</span>
                    </div>
                  )}

                  {resumePreviewUrl && (
                    <div className={styles.pdfPreview}>
                      <iframe 
                        src={resumePreviewUrl} 
                        className={styles.pdfFrame}
                        title="Resume Preview"
                      />
                    </div>
                  )}

                  {!resumePreviewUrl && resumeFile && (
                    <div className={styles.textPreview}>
                      <FileText size={48} strokeWidth={1} color="#94a3b8" />
                      <p className={styles.textPreviewLabel}>Text file uploaded</p>
                      <p className={styles.textPreviewDesc}>Preview not available for text files</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
