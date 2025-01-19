"use client"

import React, { useState, useRef, useEffect } from 'react';
import path from "path";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cloningMessage, setCloningMessage] = useState('');
  const [transcribedText, setTranscribedText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setCloningMessage('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/mp3' });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      stream.getTracks().forEach((track) => track.stop()); // Stop the microphone
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleCloneVoice = async () => {
    if (!audioBlob) {
      console.error("No audio blob available");
      return;
    }
    else{
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.mp3");
      try {

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
    
        const result = await response.json();
        if (response.ok) {
          setTranscribedText(result.text); // Update state with transcription text
        } else {
          console.error("Error during transcription:", result.error);
          setTranscribedText("Error during transcription.");
        }
      } catch (error) {
        console.error("Error during transcription:", error);
        setTranscribedText("Error during transcription.");
      }
    }
  
    
  };
  

  // Cleanup function
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      
      <button
        onClick={isRecording ? stopRecording : startRecording}
        id="mic"
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-8 h-8 text-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>

      {audioBlob && (
        <div>
          <p>Recording complete! Ready to clone.</p>
          <button 
            onClick={handleCloneVoice}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >Clone Voice</button>
          <p>{transcribedText}</p>
        </div>
      )}

      {cloningMessage && <p>{cloningMessage}</p>}

      {audioUrl && (
        <div>
          <audio ref={audioRef} src={audioUrl} />
          <button 
            onClick={playAudio}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Play Recording
          </button>
        </div>
      )}

    </div>
  );

}