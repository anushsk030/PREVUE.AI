"use client"

import { useState } from "react"
import styles from "./ForgotPasswordForm.module.css"

export default function ForgotPasswordForm({ onSuccess, onBack }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      // TODO: Replace with real backend call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setMessage(
        "If that email exists, we've sent a password reset link. Check your inbox."
      )
      setEmail("")

      // Go back to login after showing message
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1400)
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className={styles.formTitle}>Reset Password</h2>
      <p className={styles.formSubtitle}>
        Enter the email associated with your account and we’ll send a reset link.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Email</label>
          <input
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && <p className={styles.successMsg}>{message}</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      <button className={styles.backBtn} onClick={onBack}>
        Back to Login
      </button>
    </div>
  )
}
