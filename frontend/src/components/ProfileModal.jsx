"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import styles from "./ProfileModal.module.css"

/**
 * Props:
 * - initialName: string
 * - initialAvatar: string (url) or null
 * - onClose: () => void
 * - onSave: (payload) => void  // payload: { name, avatarFile? } or { name, avatar } if no file
 */
export default function ProfileModal({ initialName = "", initialAvatar = null, onClose, onSave }) {
  const [name, setName] = useState(initialName ?? "")
  const [avatarPreview, setAvatarPreview] = useState(initialAvatar ?? "/placeholder-avatar.png")
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileError, setFileError] = useState("")
  const fileRef = useRef(null)
  const lastBlobRef = useRef(null)

  // Sync props -> local state (only when prop actually changes)
  useEffect(() => {
    setName((prev) => (initialName ?? prev) === prev ? prev : (initialName ?? ""))
  }, [initialName])

  useEffect(() => {
    // avoid empty src (that causes flicker)
    setAvatarPreview(initialAvatar || "/placeholder-avatar.png")
    // Cleanup selectedFile when parent avatar changes (user logged in/out, etc.)
    setSelectedFile(null)
    // revoke any existing blob (defensive)
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
  }, [initialAvatar])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (lastBlobRef.current) {
        URL.revokeObjectURL(lastBlobRef.current)
        lastBlobRef.current = null
      }
    }
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setFileError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image size must be less than 5MB')
      return
    }

    setFileError('')

    // revoke previous blob url if any
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }

    const blobUrl = URL.createObjectURL(file)
    lastBlobRef.current = blobUrl

    setAvatarPreview(blobUrl)
    setSelectedFile(file)
  }, [])

  const handleRemove = useCallback(() => {
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
    setSelectedFile(null)
    setAvatarPreview("/placeholder-avatar.png")
    setFileError('')
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      return
    }
    setIsLoading(true)
    try {
      // If a new file was chosen, provide it; otherwise pass the current preview URL
      const payload = selectedFile ? { name: name.trim(), avatarFile: selectedFile } : { name: name.trim(), avatar: avatarPreview }
      await onSave(payload)
    } finally {
      setIsLoading(false)
    }
  }, [name, selectedFile, avatarPreview, onSave])

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Edit Profile</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <img
              src={avatarPreview}
              alt="Profile preview"
              className={styles.avatarPreview}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = "/images/placeholder-avatar.png"
              }}
            />
            {selectedFile && <div className={styles.avatarBadge}>New</div>}
          </div>

          <div className={styles.avatarControls}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={isLoading}
            />

            <button
              type="button"
              className={styles.fileBtn}
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
            >
              <span className={styles.uploadIcon}>📷</span>
              Change Photo
            </button>

            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemove}
              disabled={isLoading}
            >
              Remove
            </button>
            
            <p className={styles.fileHint}>Max 5MB • JPG, PNG, GIF, WebP</p>
          </div>
        </div>

        {fileError && (
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            {fileError}
          </div>
        )}

        <label className={styles.label}>
          Display Name
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={60}
            autoFocus
            disabled={isLoading}
          />
          <span className={styles.charCount}>{name.length}/60</span>
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            aria-label="Cancel"
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`${styles.saveBtn} ${isLoading ? styles.loading : ''}`}
            onClick={handleSave}
            aria-label="Save profile"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
