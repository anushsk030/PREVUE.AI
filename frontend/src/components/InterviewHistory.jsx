import React, { useState, useEffect, useContext } from "react"
import axios from "axios"
import { format } from "date-fns"
import { Trophy, Calendar, Target, TrendingUp, BarChart2, Briefcase } from "lucide-react"
import AuthContext from "../context/AuthContext"
import styles from "./InterviewHistory.module.css"

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:3000"

export default function InterviewHistory() {
  const { user } = useContext(AuthContext)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    recentScore: 0,
  })

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/questions/user-interviews`, {
        withCredentials: true
      })
      
      const data = res.data?.interviews || []
      setHistory(data)
      calculateStats(data)
    } catch (err) {
      console.error("Failed to fetch history:", err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    if (!data.length) return

    const scores = data.map(d => d.totalScore || 0)
    const totalInterviews = data.length
    const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / totalInterviews) * 10)
    const bestScore = Math.round(Math.max(...scores) * 10)
    const recentScore = Math.round(scores[0] * 10)

    setStats({
      totalInterviews,
      averageScore,
      bestScore,
      recentScore
    })
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981"
    if (score >= 60) return "#f59e0b"
    return "#ef4444"
  }

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your history...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Interview History</h2>
          <p className={styles.subtitle}>Track your progress and performance</p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconWrapper} style={{background: '#e0f2fe', color: '#0284c7'}}>
            <Briefcase size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Total Sessions</div>
            <div className={styles.statValue}>{stats.totalInterviews}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper} style={{background: '#dcfce7', color: '#16a34a'}}>
            <Target size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Avg. Score</div>
            <div className={styles.statValue}>{stats.averageScore}%</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper} style={{background: '#fef3c7', color: '#d97706'}}>
            <Trophy size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Best Score</div>
            <div className={styles.statValue}>{stats.bestScore}%</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper} style={{background: '#f3e8ff', color: '#9333ea'}}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>Recent Score</div>
            <div className={styles.statValue}>{stats.recentScore}%</div>
          </div>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Recent Sessions</h3>
      
      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BarChart2 size={48} />
          </div>
          <h3>No interviews yet</h3>
          <p>Complete your first interview to see your history.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Role & Mode</th>
                <th>Date</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((interview) => (
                <tr key={interview._id}>
                  <td>
                    <div className={styles.roleCell}>
                      <span className={styles.roleName}>{interview.role}</span>
                      <span className={styles.modeBadge}>{interview.mode}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.dateCell}>
                      <Calendar size={14} />
                      {format(new Date(interview.createdAt), "MMM d, yyyy")}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.difficultyBadge} ${styles[interview.difficulty.toLowerCase()]}`}>
                      {interview.difficulty}
                    </span>
                  </td>
                  <td>
                    <span className={styles.scoreText} style={{ color: getScoreColor(interview.totalScore * 10) }}>
                      {interview.totalScore * 10}%
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusCompleted}>Completed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
