import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { UserX, Users, Video, VideoOff } from "lucide-react";
import styles from "./CameraFeed.module.css";

const PROCESS_INTERVAL = 100; // 10 FPS
const SMOOTHING = 0.2;

export default function CameraFeed({
  videoRef,
  cameraOn,
  sessionActive,
  onSessionComplete,
}) {
  const faceMeshRef = useRef(null);
  const animationRef = useRef(null);
  const lastProcessTimeRef = useRef(0);

  const prevSessionRef = useRef(sessionActive);

  const [warning, setWarning] = useState(null);

  const analyticsRef = useRef({
    totalFrames: 0,
    faceDetectedFrames: 0,
    eyeContactFrames: 0,
    confidenceSum: 0,
    smoothedConfidence: 0,
    headMovementCount: 0,
    blinkCount: 0,
  });

  const prevMovementRef = useRef(null);
  const eyeClosedFramesRef = useRef(0);

  // =============================
  // IMPROVED ANALYSIS
  // =============================
  const analyzeBehavior = useCallback((landmarks) => {
    const noseTip = landmarks[1];
    const faceLeft = landmarks[234];
    const faceRight = landmarks[454];
    const chinBottom = landmarks[152];
    const foreheadCenter = landmarks[10];

    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];

    const faceWidth = Math.abs(faceRight.x - faceLeft.x);
    const faceHeight = Math.abs(chinBottom.y - foreheadCenter.y);

    const centerX = (faceLeft.x + faceRight.x) / 2;
    const centerY = (foreheadCenter.y + chinBottom.y) / 2;

    const dx = Math.abs(noseTip.x - centerX) / faceWidth;
    const dy = Math.abs(noseTip.y - centerY) / faceHeight;

    const movement = dx + dy;

    // Eye contact
    if (dx < 0.12 && dy < 0.12)
      analyticsRef.current.eyeContactFrames++;

    // Stable movement detection
    if (
      prevMovementRef.current &&
      Math.abs(prevMovementRef.current - movement) > 0.08
    ) {
      analyticsRef.current.headMovementCount++;
    }

    prevMovementRef.current = movement;

    // Blink detection
    const eyeOpen =
      (Math.abs(leftEyeTop.y - leftEyeBottom.y) +
        Math.abs(rightEyeTop.y - rightEyeBottom.y)) /
      2 /
      faceHeight;

    if (eyeOpen < 0.008) {
      eyeClosedFramesRef.current++;
    } else {
      if (eyeClosedFramesRef.current > 2)
        analyticsRef.current.blinkCount++;
      eyeClosedFramesRef.current = 0;
    }

    // Confidence
    const eyeScore = Math.min(100, eyeOpen * 9000);
    const positionScore = 100 - movement * 120;
    const rawConfidence =
      eyeScore * 0.4 + positionScore * 0.6;

    analyticsRef.current.smoothedConfidence =
      analyticsRef.current.smoothedConfidence *
        (1 - SMOOTHING) +
      rawConfidence * SMOOTHING;

    analyticsRef.current.confidenceSum +=
      analyticsRef.current.smoothedConfidence;

    analyticsRef.current.faceDetectedFrames++;
  }, []);

  // =============================
  // FaceMesh Setup
  // =============================
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults((results) => {
      const faceCount =
        results.multiFaceLandmarks?.length || 0;

      if (faceCount === 0) {
        setWarning("noFace");
      } else if (faceCount > 1) {
        setWarning("multipleFaces");
      } else {
        setWarning(null);
        if (sessionActive)
          analyzeBehavior(
            results.multiFaceLandmarks[0]
          );
      }

      if (sessionActive)
        analyticsRef.current.totalFrames++;
    });

    faceMeshRef.current = faceMesh;

    return () => faceMesh.close();
  }, [analyzeBehavior, sessionActive]);

  // =============================
  // Video Processing Loop
  // =============================
  useEffect(() => {
    if (!cameraOn) return;

    const processVideo = async () => {
      const now = Date.now();

      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        now - lastProcessTimeRef.current >
          PROCESS_INTERVAL
      ) {
        lastProcessTimeRef.current = now;

        await faceMeshRef.current?.send({
          image: videoRef.current,
        });
      }

      animationRef.current =
        requestAnimationFrame(processVideo);
    };

    processVideo();

    return () =>
      cancelAnimationFrame(animationRef.current);
  }, [cameraOn, videoRef]);

  // =============================
  // FINAL REPORT (TRUE → FALSE)
  // =============================
  useEffect(() => {
    const generateReport = () => {
      const data = analyticsRef.current;

      if (data.faceDetectedFrames === 0) {
        return;
      }

      const avgConfidence = Math.round(
        data.confidenceSum /
          data.faceDetectedFrames
      );

      const eyeContact = Math.round(
        (data.eyeContactFrames /
          data.faceDetectedFrames) *
          100
      );

      const stability = Math.round(
        100 -
        Math.min(
          100,
          (data.headMovementCount /
            data.faceDetectedFrames) *
            100
        )
      );

      const facePresence = Math.round(
        (data.faceDetectedFrames /
          data.totalFrames) *
          100
      );

      const blinkRate = Math.round(
        data.blinkCount /
          (data.faceDetectedFrames / 60)
      );

      const professionalism = Math.round(
        avgConfidence * 0.3 +
          eyeContact * 0.25 +
          stability * 0.2 +
          facePresence * 0.15 +
          (100 - blinkRate) * 0.1
      );

      if (onSessionComplete) {
        onSessionComplete({
          avgConfidence,
          eyeContact,
          stability,
          facePresence,
          blinkRate,
          professionalism,
        });
      }
    };

    if (
      prevSessionRef.current === true &&
      sessionActive === false
    ) {
      generateReport();
    }

    prevSessionRef.current = sessionActive;

    // Cleanup: Generate report on unmount if session was active
    return () => {
      if (prevSessionRef.current === true && analyticsRef.current.faceDetectedFrames > 0) {
        generateReport();
      }
    };
  }, [sessionActive, onSessionComplete]);

  return (
    <div className={styles.cameraCard}>
      <div className={styles.cameraHeader}>
        {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
        Camera
      </div>

      <div className={styles.videoBox}>
        <video ref={videoRef} autoPlay muted playsInline />

        {warning === "noFace" && (
          <div className={styles.faceWarningOverlay}>
            <div className={styles.faceWarningPopup}>
              <UserX size={28} />
              <h4>Face Not Detected</h4>
              <p>Please stay visible in the frame.</p>
            </div>
          </div>
        )}

        {warning === "multipleFaces" && (
          <div className={styles.faceWarningOverlay}>
            <div className={styles.faceWarningPopup}>
              <Users size={28} />
              <h4>Multiple Faces Detected</h4>
              <p>Only one person should appear.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
