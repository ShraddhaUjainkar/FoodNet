"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, X, AlertCircle } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackToFile: () => void;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Stop current video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera stream
  const startCamera = async (mode: "environment" | "user") => {
    setIsInitializing(true);
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera access is not supported by your browser. Please upload an image file instead.",
        );
      }

      // Check if multiple video devices exist for camera switch button
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Enumerate error is non-fatal
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMsg = "Unable to access your camera.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMsg =
          "Camera permission was denied. Please allow camera access in your browser or upload a file.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMsg =
          "No camera was found on this device. Please upload a file from your device.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopStream();
    onCapture(dataUrl);
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211817]/30 px-4 backdrop-blur-[6px] animate-in fade-in duration-200">
      {/* Glass Card Container matching FoodNet theme */}
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[20px] border border-[#FFE0D8] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,248,246,0.97)_48%,rgba(255,236,230,0.95)_100%)] p-6 md:p-7 shadow-[0_24px_80px_rgba(255,75,63,0.18),0_18px_54px_rgba(15,23,42,0.16)] flex flex-col items-center animate-in zoom-in-[0.97] duration-200">
        {/* Top Header */}
        <div className="w-full flex items-start gap-4 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFE9E4] text-[#FF3B30] shadow-[0_8px_20px_rgba(255,75,63,0.16)]">
            <Camera size={18} strokeWidth={2.3} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[18px] font-bold leading-tight text-[#171717]">
              Snap Food Label Photo
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[#5F6368]">
              Position ingredients statement clearly within the frame
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1F2937] hover:bg-black/[0.06] transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Viewfinder Video Container */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black shadow-inner border border-[#FFDCD4] flex items-center justify-center">
          {cameraError ? (
            <div className="w-full h-full p-6 text-center flex flex-col items-center justify-center gap-3 bg-[#FFF8F6]">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#FF3B30] flex items-center justify-center border border-red-100 shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-zinc-700 leading-relaxed max-w-xs">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onFallbackToFile();
                }}
                className="mt-1 px-4 py-2 bg-[#FF3B30] hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/15 cursor-pointer active:scale-95"
              >
                Upload File Instead
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Framing Overlay */}
              <div className="absolute inset-5 border-2 border-white/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]">
                {/* Corner Accents */}
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-[#FF3B30] -mt-1 -ml-1 rounded-tl-sm shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
                  <div className="w-5 h-5 border-t-2 border-r-2 border-[#FF3B30] -mt-1 -mr-1 rounded-tr-sm shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
                </div>
                <div className="text-center">
                  <span className="bg-white/90 backdrop-blur-md text-zinc-800 text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-md border border-white/60">
                    Align ingredients label within frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-[#FF3B30] -mb-1 -ml-1 rounded-bl-sm shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
                  <div className="w-5 h-5 border-b-2 border-r-2 border-[#FF3B30] -mb-1 -mr-1 rounded-br-sm shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
                </div>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-[#FFF8F6]/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-8 h-8 border-3 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-zinc-700">
                      Starting camera...
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls Footer in White Theme */}
        {!cameraError && (
          <div className="w-full pt-3 flex items-center justify-between px-2">
            {/* Fallback to File Upload */}
            <button
              type="button"
              onClick={() => {
                handleClose();
                onFallbackToFile();
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 underline transition-colors cursor-pointer py-2"
            >
              Upload file instead
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              disabled={isInitializing}
              onClick={handleCapture}
              className="relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-gradient-to-r from-[#FF3B30] to-[#FF6A00] transition-all transform hover:scale-105 active:scale-90 shadow-[0_8px_24px_rgba(255,75,63,0.35)] cursor-pointer disabled:opacity-50"
              aria-label="Take Photo"
            >
              <div className="w-12 h-12 rounded-full border-2 border-black/10 bg-white" />
            </button>

            {/* Switch Camera Button (if available) */}
            {hasMultipleCameras ? (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#FFDCD4] text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4 text-[#FF3B30]" />
                <span>Flip</span>
              </button>
            ) : (
              <div className="w-20" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
