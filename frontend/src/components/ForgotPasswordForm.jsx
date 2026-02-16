"use client";

import { useState } from "react";
import styles from "./ForgotPasswordForm.module.css";

export default function ForgotPasswordForm({ onSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Request failed");
      }

      setMessage(
        "If that email exists, we've sent a password reset link. Check your inbox."
      );
      setEmail("");

      // Optional: go back to login after success
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            disabled={loading}
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

      <button
        type="button"
        className={styles.backBtn}
        onClick={onBack}
        disabled={loading}
      >
        Back to Login
      </button>
    </div>
  );
}
