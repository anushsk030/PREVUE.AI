"use client"

import { useState, useContext } from "react"
import AuthContext from "../context/AuthContext"
import InterviewSetup from "../components/InterviewSetup"
import InterviewHistory from "../components/InterviewHistory"
import styles from "./Home.module.css"

export default function Home() {
  const { user, handleLogout } = useContext(AuthContext)
  const [currentPage, setCurrentPage] = useState("home")

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>PREVUE.AI</h1>
          <div className={styles.userInfo}>
            <span>Welcome, {user.name}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.navigation}>
          <button
            onClick={() => setCurrentPage("home")}
            className={`${styles.navBtn} ${currentPage === "home" ? styles.active : ""}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage("history")}
            className={`${styles.navBtn} ${currentPage === "history" ? styles.active : ""}`}
          >
            Interview History
          </button>
        </div>

        <div className={styles.content}>
          {currentPage === "home" && (
            <div className={styles.homeContent}>
              <h2>Ready to practice?</h2>
              <button onClick={() => setCurrentPage("interview")} className={styles.startBtn}>
                Start Interview
              </button>
            </div>
          )}

          {currentPage === "history" && <InterviewHistory />}

          {currentPage === "interview" && <InterviewSetup onBack={() => setCurrentPage("home")} />}
        </div>
      </main>
    </div>
  )
}
