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

type Step = 'name' | 'description' | 'record' | 'processing' | 'success'

export function CloneDialog({ open, onOpenChange }: CloneDialogProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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
    formData.append('description', description)

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
              onClick={() => description && setStep('record')}
              disabled={!description}
            >
              Continue
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
