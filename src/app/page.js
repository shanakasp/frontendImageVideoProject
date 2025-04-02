"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";

export default function MediaUploader() {
  const [selectedFiles, setSelectedFiles] = useState({
    image1: null,
    image2: null,
    video1: null,
    video2: null,
  });
  const [previews, setPreviews] = useState({
    image1: "",
    image2: "",
    video1: "",
    video2: "",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [currentType, setCurrentType] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const [isBrowserReady, setIsBrowserReady] = useState(false);

  // Set browser readiness after mount
  useEffect(() => {
    setIsBrowserReady(true);

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileChange = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [type]: file }));
      setPreviews((prev) => ({
        ...prev,
        [type]: URL.createObjectURL(file),
      }));
    }
  };

  const startCamera = async (type, isVideo = false) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: true,
        audio: isVideo,
      };

      streamRef.current = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        setCurrentType(type);

        if (isVideo) {
          setIsRecording(true);

          const mediaRecorder = new MediaRecorder(streamRef.current);
          const chunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const file = new File([blob], `recorded-video-${Date.now()}.webm`, {
              type: "video/webm",
            });
            setSelectedFiles((prev) => ({ ...prev, [type]: file }));
            setPreviews((prev) => ({
              ...prev,
              [type]: URL.createObjectURL(blob),
            }));
          };

          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Failed to access camera: " + error.message);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], `captured-image-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      setSelectedFiles((prev) => ({ ...prev, [currentType]: file }));
      setPreviews((prev) => ({
        ...prev,
        [currentType]: URL.createObjectURL(blob),
      }));

      // Stop camera after capture
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      videoRef.current.srcObject = null;
      setCurrentType(null);
    }, "image/jpeg");
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      // Stop camera after recording
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsRecording(false);
      setCurrentType(null);
    }
  };

  const uploadFile = async (type) => {
    const file = selectedFiles[type];
    if (!file) {
      alert(`No ${type} selected!`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    setIsUploading(true); // Show loading state
    setUploadProgress(0); // Reset progress

    try {
      const { data } = await axios.post(
        "https://backendsupabaseimagevideoproject.onrender.com/api/files/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setUploadProgress(progress); // Update progress state
            }
          },
        }
      );
      alert(`${type} uploaded successfully:`);
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false); // Hide loading state after upload
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Media Upload App</h1>
      {isUploading && (
        <div className="mt-4">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <span className="text-sm font-semibold">Uploading...</span>
              <span className="text-sm font-semibold">{uploadProgress}%</span>
            </div>
            <div className="flex mb-2 items-center justify-between">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image 1 */}
        <div className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Image 1</h2>
          <div className="flex space-x-2 mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange("image1", e)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => isBrowserReady && startCamera("image1")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open Camera
            </button>
            {currentType === "image1" && (
              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Capture
              </button>
            )}
          </div>

          {previews.image1 && (
            <div className="mb-4">
              <img
                src={previews.image1}
                alt="Preview"
                className="max-h-40 rounded-md mx-auto"
              />
            </div>
          )}

          <button
            onClick={() => uploadFile("image1")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Upload Image 1
          </button>
        </div>

        {/* Image 2 */}
        <div className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Image 2</h2>
          <div className="flex space-x-2 mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange("image2", e)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => isBrowserReady && startCamera("image2")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open Camera
            </button>
            {currentType === "image2" && (
              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Capture
              </button>
            )}
          </div>

          {previews.image2 && (
            <div className="mb-4">
              <img
                src={previews.image2}
                alt="Preview"
                className="max-h-40 rounded-md mx-auto"
              />
            </div>
          )}

          <button
            onClick={() => uploadFile("image2")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Upload Image 2
          </button>
        </div>

        {/* Video 1 */}
        <div className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Video 1</h2>
          <div className="flex space-x-2 mb-4">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange("video1", e)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => isBrowserReady && startCamera("video1", true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isRecording && currentType === "video1"
                ? "Recording..."
                : "Record Video"}
            </button>
            {isRecording && currentType === "video1" && (
              <button
                onClick={stopVideoRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Stop Recording
              </button>
            )}
          </div>

          {previews.video1 && (
            <div className="mb-4">
              <video
                src={previews.video1}
                controls
                className="max-h-40 w-full rounded-md"
              />
            </div>
          )}

          <button
            onClick={() => uploadFile("video1")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Upload Video 1
          </button>
        </div>

        {/* Video 2 */}
        <div className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Video 2</h2>
          <div className="flex space-x-2 mb-4">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange("video2", e)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => isBrowserReady && startCamera("video2", true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isRecording && currentType === "video2"
                ? "Recording..."
                : "Record Video"}
            </button>
            {isRecording && currentType === "video2" && (
              <button
                onClick={stopVideoRecording}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Stop Recording
              </button>
            )}
          </div>

          {previews.video2 && (
            <div className="mb-4">
              <video
                src={previews.video2}
                controls
                className="max-h-40 w-full rounded-md"
              />
            </div>
          )}

          <button
            onClick={() => uploadFile("video2")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Upload Video 2
          </button>
        </div>
      </div>

      {/* Camera Video Element */}
      <div className={`mt-8 ${currentType ? "block" : "hidden"}`}>
        <h3 className="text-lg font-medium mb-2">Camera Preview</h3>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-h-80 border rounded-lg"
        />
      </div>
    </div>
  );
}
