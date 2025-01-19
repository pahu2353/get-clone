'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SAMPLE_TEXT = `Prosecutors have opened a massive investigation into allegations of fixing games and illegal betting.
\nDifferent telescope designs perform differently and have different strengths and weaknesses.
\nWe can continue to strengthen the education of good lawyers.
\nFeedback must be timely and accurate throughout the project.
\nHumans also judge distance by using the relative sizes of objects.
\nChurches should not encourage it or make it look harmless.
\nLearn about setting up wireless network configuration.
\nYou can eat them fresh, cooked or fermented.
\nIf this is true then those who tend to think creatively really are somehow different.
\nShe will likely jump for joy and want to skip straight to the honeymoon.
\nThe sugar syrup should create very fine strands of sugar that drape over the handles.
\nBut really in the grand scheme of things, this information is insignificant.
\nI let the positive overrule the negative.
\nHe wiped his brow with his forearm.
\nInstead of fixing it, they give it a nickname.
\nAbout half the people who are infected also lose weight.
\nThe second half of the book focuses on argument and essay writing.
\nWe have the means to help ourselves.
\nThe large items are put into containers for disposal.
\nHe loves to watch me drink this stuff,
\nit is an odd fashion choice.
\nFunding is always an issue after the fact.
\nLet us encourage each other.`

// Add new step type
type Step = 'name' | 'description' | 'video' | 'record' | 'processing' | 'success'

export function CloneDialog({ open, onOpenChange }: CloneDialogProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: 16/9,
            frameRate: { ideal: 30 }
          },
          audio: false 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    if (step === 'video') {
      initializeCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAudioBlob(blob)
        handleSubmitRecording(blob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStatus('recording')
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  // const stopRecording = () => {
  //   if (mediaRecorderRef.current && isRecording) {
  //     mediaRecorderRef.current.stop()
  //     setIsRecording(false)
  //     setStatus('processing')
  //   }
  // }

  const captureVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: 16/9,
          frameRate: { ideal: 30 }
        },
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/mp4; codecs="avc1.42E01E"',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for high quality
      });
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        setVideoBlob(blob);
        setIsSaving(true);
        
        try {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('video', blob, `${name}.mp4`);
          
          const response = await fetch('http://localhost:8000/save-video', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to save video');
          }
          
          // Move to next step after successful save
          setStep('record');
          
        } catch (err) {
          console.error('Error saving video:', err);
        } finally {
          setIsSaving(false);
        }
      };

      setIsRecording(true);
      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
        stopRecording();
      }, 5000);

      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setCountdown(5);
  };

  const handleSubmitRecording = async (blob: Blob) => {

    let newDescription = ""
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: description }, 
          ],
          description: "Please convert the following sentences from the first person (I/me) to the second person (you). For example: 'I am a very good tennis player. I love to swim.' should become 'You are a very good tennis player. You love to swim.'",
        }),
      });
    
      if (!response.ok) {
        throw new Error('Failed to edit description');
      }
    
      const data = await response.json();
      newDescription = data.content; 
      console.log('Updated Description:', newDescription);
    } catch (error) {
      console.error('Error uploading recording:', error);
      setStatus('idle');
    }
    

    const formData = new FormData()
    formData.append('file', blob, 'voice.mp3')
    formData.append('name', name)
    formData.append('description', newDescription)

    try {
      const response = await fetch('http://localhost:8000/clone', {
        method: 'POST',
        body: formData
      })


      if (!response.ok) {
        throw new Error('Failed to clone voice')
      }

      const data = await response.json()
      console.log('Voice created successfully:', data)
      setStep('success')
      setTimeout(() => {
        onOpenChange(false)
        setStep('name')
        setName('')
        setDescription('')
      }, 2000)
    } catch (error) {
      console.error('Error uploading recording:', error)
      setStatus('idle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Voice Clone</DialogTitle>
          <DialogDescription>
            {step === 'name' && "Enter the name for your voice clone"}
            {step === 'description' && "Enter a description for your voice clone"}
            {step === 'video' && "Please record a 5-second video clip of yourself"}
            {step === 'record' && "Please read the following passage aloud"}
            {step === 'processing' && "Processing your voice..."}
            {step === 'success' && "Voice clone created successfully!"}
          </DialogDescription>
        </DialogHeader>

        {step === 'name' && (
          <div className="space-y-4">
            <Input
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button 
              className="w-full" 
              onClick={() => name && setStep('description')}
              disabled={!name}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'description' && (
          <div className="space-y-4">
            <textarea
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                maxHeight: '300px',
                resize: 'vertical',
                padding: '8px',
                fontSize: '16px',
                lineHeight: '1.5',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Button
              className="w-full"
              onClick={() => description && setStep('video')}
              disabled={!description}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'video' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Record Video</h2>
            <p>Please record a 5-second video clip of yourself</p>
            
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                src={showPreview ? undefined : URL.createObjectURL(videoBlob)}
              />
              {isRecording && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full">
                  {countdown}s
                </div>
              )}
            </div>

            <Button
              onClick={isRecording ? stopRecording : captureVideo}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-6">
            <div
              className="bg-muted p-4 rounded-lg"
              style={{
                height: '400px',
                overflowY: 'scroll',
                overflowX: 'hidden',
                fontSize: '16px',
                color: 'black',
                lineHeight: '1.5',
              }}
            >
              {SAMPLE_TEXT}
            </div>
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="w-full"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
