import React from "react";
import { Video, VideoOff, AlertCircle } from "lucide-react";
import styles from "./CameraFeed.module.css";

export default function CameraFeed({
  videoRef,
  cameraOn,
  mediaError,
}) {
  return (
    <div className={styles.cameraCard}>
      <div className={styles.cameraHeader}>
        <Video /> Camera
      </div>

      <div className={styles.videoBox}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />

        {!cameraOn && (
          <div className={styles.overlay}>
            <VideoOff />
          </div>
        )}

        {mediaError && (
          <div className={styles.error}>
            <AlertCircle /> {mediaError}
          </div>
        )}
      </div>
    </div>
  );
}
