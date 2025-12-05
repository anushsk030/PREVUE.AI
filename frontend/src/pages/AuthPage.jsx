"use client"

import { useState, useContext } from "react"
import AuthContext from "../context/AuthContext"
import LoginForm from "../components/LoginForm"
import SignUpForm from "../components/SignUpForm"
import ForgotPasswordForm from "../components/ForgotPasswordForm"
import styles from "./AuthPage.module.css"

export default function AuthPage() {
  const [mode, setMode] = useState("login") 
  // mode values: "login" | "signup" | "forgot"

  const { handleLogin } = useContext(AuthContext)

  const handleAuthSuccess = (userData) => {
    handleLogin(userData)
  }

  return (
    <div className={styles.container}>
      
      {/* LEFT SIDE — IMAGE BOX */}
      <div className={styles.container1}>
        <div className={styles.imageBox}></div>
      </div>

      {/* RIGHT SIDE — AUTH CARD */}
      <div className={styles.container2}>
        <div className={styles.card}>
          
          {/* APP TITLE */}
          <div className={styles.header}>
            <h1 className={styles.title}>PREVUE.AI</h1>
          </div>

          {/* =============================
                SCREEN CONTENT
              ============================= */}
          {mode === "login" && (
            <LoginForm 
              onSuccess={handleAuthSuccess}
              onForgot={() => setMode("forgot")}   // <--- New forgot handler
            />
          )}

          {mode === "signup" && (
            <SignUpForm 
              onSuccess={handleAuthSuccess}
            />
          )}

          {mode === "forgot" && (
            <ForgotPasswordForm
              onSuccess={() => setMode("login")}   // return to login after reset
              onBack={() => setMode("login")}      // back button support
            />
          )}

          {/* =============================
                FOOTER TOGGLE TEXT 
              ============================= */}
          <div className={styles.toggle}>
            {mode === "login" && (
              <p>
                Don't have an account?{" "}
                <button 
                  onClick={() => setMode("signup")} 
                  className={styles.toggleBtn}
                >
                  Sign Up
                </button>
              </p>
            )}

            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button 
                  onClick={() => setMode("login")} 
                  className={styles.toggleBtn}
                >
                  Log In
                </button>
              </p>
            )}

            {mode === "forgot" && (
              <p>
                Remembered your password?{" "}
                <button 
                  onClick={() => setMode("login")} 
                  className={styles.toggleBtn}
                >
                  Log In
                </button>
              </p>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
