"use client"

import { useState, useEffect } from "react"
import styles from "./LoginForm.module.css"

const EMAIL_REGEX =
  // simple, practical email regex (not perfect but good for validation)
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginForm({ onSuccess, onForgot }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // validation state
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [formError, setFormError] = useState("")

  // Validate fields on change
  useEffect(() => {
    if (!email) {
      setEmailError("")
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address")
    } else {
      setEmailError("")
    }
  }, [email])

  useEffect(() => {
    if (!password) {
      setPasswordError("")
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters")
    } else {
      setPasswordError("")
    }
  }, [password])

  const isFormValid = () => {
    // Trigger validations if empty
    let valid = true
    if (!email) {
      setEmailError("Email is required")
      valid = false
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address")
      valid = false
    }

    if (!password) {
      setPasswordError("Password is required")
      valid = false
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      valid = false
    }

    return valid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    if (!isFormValid()) return

    setLoading(true)
    try {
      // simulate API call (replace with real API)
      await new Promise((res) => setTimeout(res, 700))

      // Mock localStorage check (replace with real auth)
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]")
      const user = storedUsers.find((u) => u.email === email && u.password === password)

      if (!user) {
        setFormError("Invalid email or password")
        return
      }

      // success callback
      onSuccess?.({
        id: user.id,
        name: user.name,
        email: user.email,
      })
    } catch (err) {
      setFormError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = (e) => {
    e?.preventDefault?.()
    if (typeof onForgot === "function") {
      onForgot(email) // pass current email to help prefill recovery flow
    } else {
      // graceful fallback: show a friendly browser alert
      alert("Forgot password clicked. Provide an onForgot(email) prop to handle this.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to your account</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={`${styles.input} ${emailError ? styles.inputError : ""}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          // placeholder="you@example.com"
          disabled={loading}
          autoComplete="email"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError && (
          <div id="email-error" className={styles.fieldError}>
            {emailError}
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // placeholder="Minimum 8 characters"
            disabled={loading}
            autoComplete="current-password"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={loading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {passwordError && (
          <div id="password-error" className={styles.fieldError}>
            {passwordError}
          </div>
        )}
      </div>

      <div className={styles.row}>
        <label className={styles.remember}>
          <input
            id="remember"
            type="checkbox"
            className={styles.checkbox}
            disabled={loading}
            aria-checked="false"
          />
          <span className={styles.rememberLabel}>Remember me</span>
        </label>

        <button
          type="button"
          className={styles.forgot}
          onClick={handleForgot}
          disabled={loading}
        >
          Forgot password?
        </button>
      </div>

      {formError && <div className={styles.error}>{formError}</div>}

      <button
        type="submit"
        className={styles.button}
        disabled={loading || !!emailError || !!passwordError || !email || !password}
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  )
}
