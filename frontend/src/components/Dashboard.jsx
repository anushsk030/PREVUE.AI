import React, { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { TrendingUp, Award, Target, BarChart2, Activity, Calendar } from "lucide-react"
import styles from "./Dashboard.module.css"

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:3000"

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/questions/analytics`, {
        withCredentials: true
      })
      setAnalytics(res.data)
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your analytics...</p>
      </div>
    )
  }

  if (!analytics || analytics.totalInterviews === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>Dashboard</h2>
            <p>Track your interview performance and skill growth</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BarChart2 size={48} />
          </div>
          <h3>No Data Available</h3>
          <p>Complete interviews to see your analytics and skill progression.</p>
        </div>
      </div>
    )
  }

  // Prepare radar chart data for latest performance
  const latestSkills = analytics.skillTrends[analytics.skillTrends.length - 1]
  const radarData = latestSkills ? [
    { skill: 'Correctness', score: latestSkills.correctness },
    { skill: 'Depth', score: latestSkills.depth },
    { skill: 'Practical', score: latestSkills.practical },
    { skill: 'Structure', score: latestSkills.structure }
  ] : []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Dashboard</h2>
          <p>Track your interview performance and skill growth</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconContainer} style={{background: 'linear-gradient(135deg, #3b82f6, #2563eb)'}}>
            <Award size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Total Interviews</h3>
            <p className={styles.statValue}>{analytics.totalInterviews}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer} style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
            <Target size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Average Score</h3>
            <p className={styles.statValue}>{analytics.averageScore}%</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconContainer} style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Recent Score</h3>
            <p className={styles.statValue}>{analytics.recentScore}%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Skill Trends Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Activity size={20} />
            <h3>Skill Progression Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.skillTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="interview" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px'}}
              />
              <Legend />
              <Line type="monotone" dataKey="correctness" stroke="#10b981" strokeWidth={2} name="Correctness" />
              <Line type="monotone" dataKey="depth" stroke="#3b82f6" strokeWidth={2} name="Depth" />
              <Line type="monotone" dataKey="practical" stroke="#f59e0b" strokeWidth={2} name="Practical" />
              <Line type="monotone" dataKey="structure" stroke="#8b5cf6" strokeWidth={2} name="Structure" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Difficulty Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <BarChart2 size={20} />
            <h3>Performance by Difficulty</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.performanceByDifficulty}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="difficulty" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px'}}
              />
              <Bar dataKey="averageScore" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current Skills Radar Chart */}
      {radarData.length > 0 && (
        <div className={styles.radarSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <Target size={20} />
              <h3>Current Skill Assessment</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="skill" stroke="#64748b" />
                <PolarRadiusAxis stroke="#64748b" />
                <Radar name="Your Skills" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px'}}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <div className={styles.activityHeader}>
          <Calendar size={20} />
          <h3>Recent Activity</h3>
        </div>
        <div className={styles.activityList}>
          {analytics.recentInterviews.map((interview, idx) => (
            <div key={idx} className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <span className={styles.activityRole}>{interview.role}</span>
                <span className={styles.activityScore}>{interview.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
