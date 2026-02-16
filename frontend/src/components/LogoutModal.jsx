"use client"

import styles from "./LogoutModal.module.css"

export default function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div
      className={styles.backdrop}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm logout"
      >
        <div className={styles.iconWrapper}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
            <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </div>

        <h3 className={styles.title}>Log Out?</h3>
        <p className={styles.message}>Are you sure you want to log out?</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            aria-label="Cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            aria-label="Confirm logout"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
