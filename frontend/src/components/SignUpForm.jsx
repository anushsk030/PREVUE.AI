"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import styles from "./SignUpForm.module.css"

export default function SignUpForm({ onSuccess }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Simple email regex
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i, [])

  // Password strength score 0..3
  const passwordStrength = useMemo(() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  // Real-time validation
  useEffect(() => {
    const errs = {}

    if (name && name.trim().length < 2) errs.name = "Enter at least 2 characters"
    if (email && !emailRegex.test(email)) errs.email = "Enter a valid email"
    if (password && password.length < 6)
      errs.password = "Password must be at least 6 characters"
    if (confirmPassword && password !== confirmPassword)
      errs.confirmPassword = "Passwords do not match"

    setFieldErrors(errs)
  }, [name, email, password, confirmPassword, emailRegex])

  const isFormValid =
    name.trim().length >= 2 &&
    emailRegex.test(email) &&
    password.length >= 6 &&
    password === confirmPassword

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFieldErrors({})
  }

  // CONNECTING TO BACKEND
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (!isFormValid) {
        setFieldErrors((prev) => ({
          ...prev,
          form: "Please fix the errors above before continuing.",
        }))
        throw new Error("Validation failed")
      }

      // 📌 Replace localStorage logic with REAL backend call
      const res = await axios.post("http://localhost:3000/api/signup", {
          name: name.trim(),
          email: email.trim(),
          password,
        },
        { withCredentials: true }
      )

      // If backend returns success
      setSuccessMessage(res.data?.message || "Account created successfully.")
      resetForm()

      // Pass user info back to parent
      onSuccess &&
        onSuccess({
          name: res.data?.user?.name,
          email: res.data?.user?.email,
          id: res.data?.user?.id,
          avatar: res.data?.user?.avatar,
        })
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Create an account</h2>
      </div>

      {/* Name */}
      <div className={styles.formRow}>
        <label htmlFor="name" className={styles.label}>
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${styles.input} ${fieldErrors.name ? styles.invalid : ""}`}
          placeholder="John Doe"
          disabled={loading}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <div id="name-error" className={styles.fieldError} role="alert">
            {fieldErrors.name}
          </div>
        )}
      </div>

      {/* Email */}
      <div className={styles.formRow}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${styles.input} ${fieldErrors.email ? styles.invalid : ""}`}
          placeholder="you@company.com"
          disabled={loading}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          autoComplete="email"
        />
        {fieldErrors.email && (
          <div id="email-error" className={styles.fieldError} role="alert">
            {fieldErrors.email}
          </div>
        )}
      </div>

      {/* Password */}
      <div className={styles.formRow}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>

        <div className={styles.passwordRow}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${styles.input} ${fieldErrors.password ? styles.invalid : ""}`}
            placeholder="Create a strong password"
            disabled={loading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? "password-error" : "password-strength-desc"
            }
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={loading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Password strength meter */}
        <div id="password-strength-desc" className={styles.strengthContainer}>
          <div className={styles.strengthTop}>
            <div className={styles.strengthLabelTop}>Strength</div>
            <div className={styles.strengthWord} aria-live="polite">
              {passwordStrength === 0 && <span className={styles.strengthTextMuted}>Empty</span>}
              {passwordStrength === 1 && <span className={styles.weak}>Weak</span>}
              {passwordStrength === 2 && <span className={styles.medium}>Medium</span>}
              {passwordStrength === 3 && <span className={styles.strong}>Strong</span>}
            </div>
          </div>

          <div className={styles.strengthBar} aria-hidden="true">
            <span
              className={styles.strengthLevel}
              style={{
                width: `${(passwordStrength / 3) * 100}%`,
                background:
                  passwordStrength === 0
                    ? "linear-gradient(90deg, #f3f4f6, #f3f4f6)"
                    : passwordStrength === 1
                    ? "linear-gradient(90deg,#ffd2d2,#ff9a9a)"
                    : passwordStrength === 2
                    ? "linear-gradient(90deg,#ffe8b5,#ffd36b)"
                    : "linear-gradient(90deg,#b3f5d2,#7be0a8)",
              }}
            />
          </div>

          <div className={styles.hintText} style={{ marginTop: 8 }}>
            Use 8+ characters for stronger passwords; include letters, symbols and numbers.
          </div>
        </div>

        {fieldErrors.password && (
          <div id="password-error" className={styles.fieldError} role="alert">
            {fieldErrors.password}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className={styles.formRow}>
        <label htmlFor="confirmPassword" className={styles.label}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`${styles.input} ${fieldErrors.confirmPassword ? styles.invalid : ""}`}
          placeholder="Repeat your password"
          disabled={loading}
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && (
          <div id="confirm-error" className={styles.fieldError} role="alert">
            {fieldErrors.confirmPassword}
          </div>
        )}
      </div>

      {/* Errors */}
      <div aria-live="polite" className={styles.ariaLive}>
        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.success}>{successMessage}</div>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={styles.button}
        disabled={!isFormValid || loading}
        aria-disabled={!isFormValid || loading}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <div className={styles.footerNote}>
        By creating an account you agree to our{" "}
        <a href="#" className={styles.link}>Terms</a> and{" "}
        <a href="#" className={styles.link}>Privacy Policy</a>.
      </div>
    </form>
  )
}
