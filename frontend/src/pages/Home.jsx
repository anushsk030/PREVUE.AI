"use client"

import { useState, useContext, useEffect } from "react"
import AuthContext from "../context/AuthContext"
import InterviewSetup from "../components/InterviewSetup.jsx"
import InterviewHistory from "../components/InterviewHistory"
import Dashboard from "../components/Dashboard"
import About from "../components/About"
import ProfileModal from "../components/ProfileModal"
import styles from "./Home.module.css"

export default function Home() {
  const { user: ctxUser, handleLogout, updateUser } = useContext(AuthContext) || {}

  // Local UI user state
  const [user, setUser] = useState(ctxUser ?? { name: "User", avatar: null })
  const [currentPage, setCurrentPage] = useState("home")
  const [profileOpen, setProfileOpen] = useState(false)

  // Sync context -> local UI user
  useEffect(() => {
    if (ctxUser) setUser(ctxUser)
  }, [ctxUser])

  const handleSaveProfile = async (newData) => {
    try {
      // If there's a new avatar file, upload it first
      if (newData.avatarFile) {
        const formData = new FormData()
        formData.append("profileImage", newData.avatarFile)

        const response = await fetch("http://localhost:3000/api/upload-profile-image", {
          method: "POST",
          credentials: "include",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          alert(errorData.message || "Failed to upload profile image")
          return
        }

        const data = await response.json()
        
        // Update with the server-returned image URL
        const updatedData = {
          name: newData.name,
          avatar: `http://localhost:3000${data.profileImage}`,
        }
        
        setUser((prev) => ({ ...prev, ...updatedData }))
        if (typeof updateUser === "function") {
          updateUser(updatedData)
        }
      } else {
        // No new file, just update the name
        setUser((prev) => ({ ...prev, name: newData.name }))
        if (typeof updateUser === "function") {
          updateUser({ name: newData.name })
        }
      }

      setProfileOpen(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile. Please try again.")
    }
  }

  return (
    <div className={styles.container}>

      {/* NAVBAR */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/images/prevue.svg" alt="P" className={styles.logoImg} />
            <h1 className={styles.logo}>REVUE.AI</h1>
          </div>

          <nav className={styles.navbarRight}>

            {/* HOME */}
            <button
              onClick={() => setCurrentPage("home")}
              className={`${styles.navItem} ${currentPage === "home" ? styles.active : ""}`}
            >
              Home
            </button>

            {/* DASHBOARD */}
            <button
              onClick={() => setCurrentPage("dashboard")}
              className={`${styles.navItem} ${currentPage === "dashboard" ? styles.active : ""}`}
            >
              Dashboard
            </button>

            {/* HISTORY */}
            <button
              onClick={() => setCurrentPage("history")}
              className={`${styles.navItem} ${currentPage === "history" ? styles.active : ""}`}
            >
              Interview History
            </button>

            {/* ABOUT */}
            <button
              onClick={() => setCurrentPage("about")}
              className={`${styles.navItem} ${currentPage === "about" ? styles.active : ""}`}
            >
              About Us
            </button>

            {/* AVATAR */}
            <button
              className={styles.avatarBtn}
              onClick={() => setProfileOpen(true)}
            >
              <img
                src={user?.avatar || "/images/placeholder-avatar.png"}
                alt="avatar"
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = "/placeholder-avatar.png"
                }}
              />
            </button>

            <button onClick={handleLogout} className={styles.logoutBtn}>
              Log Out
            </button>

          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className={styles.main}>
        <div className={styles.content}>

          {/* HOME PAGE */}
          {currentPage === "home" && (
            <section className={styles.hero}>
              <h2 className={styles.heroTitle}>Ace Your Next Interview</h2>
              <p className={styles.heroSubtitle}>
                Practice technical, HR and behavioral interviews with AI-powered evaluation.
              </p>

              <div className={styles.heroActions}>
                <button
                  onClick={() => setCurrentPage("interview")}
                  className={styles.getStartedBtn}
                >
                  Get Started
                </button>
              </div>

              {/* FEATURES */}
              <div className={styles.featuresRow}>
                <div className={styles.featureCard}>
                  <h4>Mock Tech Interviews</h4>
                  <p>Timed questions with score & feedback.</p>
                </div>
                <div className={styles.featureCard}>
                  <h4>Behavioral Practice</h4>
                  <p>Refine answers for HR rounds.</p>
                </div>
                <div className={styles.featureCard}>
                  <h4>Analytics</h4>
                  <p>Track progress over time.</p>
                </div>
              </div>
            </section>
          )}

          {/* DASHBOARD */}
          {currentPage === "dashboard" && <Dashboard />}

          {/* HISTORY */}
          {currentPage === "history" && <InterviewHistory />}

          {/* ABOUT */}
          {currentPage === "about" && <About onGetStarted={() => setCurrentPage("interview")} />}

          {/* INTERVIEW SETUP */}
          {currentPage === "interview" && (
            <InterviewSetup onBack={() => setCurrentPage("home")} />
          )}
        </div>
      </main>

      {profileOpen && (
        <ProfileModal
          key="profile-modal"
          initialName={user?.name ?? ""}
          initialAvatar={user?.avatar ?? null}
          onClose={() => setProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

    </div>
  )
}
