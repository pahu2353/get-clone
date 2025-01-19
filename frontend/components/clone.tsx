'use client'

import { useState, useRef } from 'react'
import { Mic } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface CloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. 
This is a sample passage that helps us capture your voice characteristics. 
Please read it clearly and naturally.`

type Step = 'name' | 'record' | 'processing' | 'success'

export function CloneDialog({ open, onOpenChange }: CloneDialogProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatus('processing')
    }
  }

  const handleSubmitRecording = async (blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, 'voice.mp3')
    formData.append('name', name)

    try {
        const response = await fetch('http://localhost:8000/clone', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error('Failed to clone voice')
        }

        const data = await response.json()
        setStep('success')
        setTimeout(() => {
            onOpenChange(false)
            setStep('name')
            setName('')
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
              onClick={() => name && setStep('record')}
              disabled={!name}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
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