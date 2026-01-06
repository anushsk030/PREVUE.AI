import React, { useEffect, useState, useRef } from "react";
import { Video, VideoOff, AlertCircle, UserX, Users } from "lucide-react";
import styles from "./CameraFeed.module.css";
import { FaceMesh } from "@mediapipe/face_mesh";

export default function CameraFeed({
  videoRef,
  cameraOn,
  mediaError,
}) {
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const faceMeshRef = useRef(null);

  useEffect(() => {
    let faceMesh;
    let animationFrameId;

    if (cameraOn) {
      // Initialize FaceMesh
      faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 2,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        const faceCount = results.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;
        
        if (faceCount === 0) {
          setNoFaceDetected(true);
          setMultipleFacesDetected(false);
        } else if (faceCount > 1) {
          setNoFaceDetected(false);
          setMultipleFacesDetected(true);
        } else {
          setNoFaceDetected(false);
          setMultipleFacesDetected(false);
        }
      });

      let isProcessing = false;
      const processVideo = async () => {
        if (!faceMesh) return;
        
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          videoRef.current.videoWidth > 0 &&
          !isProcessing
        ) {
          isProcessing = true;
          try {
            await faceMesh.send({ image: videoRef.current });
          } catch (err) {
            console.error("FaceMesh error:", err);
          }
          isProcessing = false;
        }
        animationFrameId = requestAnimationFrame(processVideo);
      };

      processVideo();
    } else {
      setNoFaceDetected(false);
      setMultipleFacesDetected(false);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (faceMesh) {
        faceMesh.close();
      }
    };
  }, [cameraOn, videoRef]);

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

        {cameraOn && noFaceDetected && (
          <div className={styles.faceWarningOverlay}>
            <div className={styles.faceWarningPopup}>
              <UserX size={32} />
              <h4>Face Not Detected</h4>
              <p>Please ensure your face is clearly visible and within the camera frame.</p>
            </div>
          </div>
        )}

        {cameraOn && multipleFacesDetected && (
          <div className={styles.faceWarningOverlay}>
            <div className={styles.faceWarningPopup}>
              <Users size={32} />
              <h4>Multiple Faces Detected</h4>
              <p>Please ensure you are the only person visible in the camera frame.</p>
            </div>
          </div>
        )}

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
