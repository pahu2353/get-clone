'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, Mic, Send, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { CloneDialog } from "@/components/clone"
import { TypingAnimation } from '@/components/typing-animation'

interface Voice {
  id: string;
  name: string;
  description: string | null;
}

// Add interface for Message
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [isListening, setIsListening] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [transcription, setTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [chatResponse, setChatResponse] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [userMessage, setUserMessage] = useState('');
  // Add messages state
  const [messages, setMessages] = useState<Message[]>([])
  // Add new state for audio
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Add new state
  const [audioError, setAudioError] = useState<string>('')
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  // Add new state for continuous mode
  const [isContinuous, setIsContinuous] = useState(false)

  const currVoiceDescription = selectedVoice?.description || 'No description available';


  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('http://localhost:8000/voices')
        const data = await response.json()
        setVoices(data)
      } catch (error) {
        console.error('Error fetching voices:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVoices()
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/mp3' })
        await handleTranscription(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  // Update handleTranscription
  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')

    try {
      const transcribeResponse = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      })
      const transcribeData = await transcribeResponse.json()
      
      if (transcribeData.status === 'success') {
        const userMessage = { role: 'user' as const, content: transcribeData.text }
        setMessages(prev => [...prev, userMessage])
        


        const chatResponse = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            description: selectedVoice?.description || 'You are very friendly!'  // Added description
          })
        })
        
        const chatResult = await chatResponse.json()
        if (chatResponse.ok) {
          const assistantMessage = { role: 'assistant' as const, content: chatResult.content }
          setMessages(prev => [...prev, assistantMessage])
          setChatResponse(chatResult.content)

          setIsLoadingAudio(true)
          setAudioError('')
          
          const voiceResponse = await fetch('http://localhost:8000/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chatResult.content,
              voice_id: selectedVoice?.id || voices[0]?.id || 'default'
            })
          })

          if (voiceResponse.ok) {
            const audioBlob = await voiceResponse.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            if (audioRef.current) {
              audioRef.current.src = audioUrl
              await audioRef.current.play()
              setIsPlaying(true)
            }
          } else {
            setAudioError('Failed to generate audio')
          }
          setIsLoadingAudio(false)
        }
      }
    } catch (error) {
      setAudioError('Error processing request')
      setIsLoadingAudio(false)
    } finally {
      setIsTranscribing(false)
    }
}

  const Sidebar = () => (
    <nav className="flex flex-col gap-4">
      <Button
        className="w-full text-2xl"
        onClick={() => setShowCloneDialog(true)}
      >
        Create Voice Clone
      </Button>
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Available Voices</h2>
        {isLoading ? (
          <p>Loading voices...</p>
        ) : (
          voices.map((voice) => (
            <a 
              key={voice.id}
              href="#"
              onClick={() => setSelectedVoice(voice)} // Update selected voice
              className="block text-sm text-gray-600 hover:text-gray-900"
            >
              {voice.name}
              {voice.description && (
                <span className="block text-xs text-gray-400">{voice.description}</span>
              )}
            </a>
          ))
        )}
      </div>
    </nav>
  );

  // Update form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userMessage.trim()) return

    const newUserMessage = { role: 'user' as const, content: userMessage }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const chatResponse = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          //description: selectedVoice?.description || 'No description available',
        })
      })

      const chatResult = await chatResponse.json()
      console.log("wtf is going on")
      if (chatResponse.ok) {
        const assistantMessage = { role: 'assistant' as const, content: chatResult.content }
        setMessages(prev => [...prev, assistantMessage])
        setChatResponse(chatResult.content)

        // Always attempt voice generation
        setIsLoadingAudio(true)
        setAudioError('')
        console.log('Generating audio with voice:', selectedVoice?.id || 'default')
        
        const voiceResponse = await fetch('http://localhost:8000/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chatResult.content,
            voice_id: selectedVoice?.id || voices[0]?.id || 'default'
          })
        })
    
        if (voiceResponse.ok) {
          console.log('Audio response received')
          const audioBlob = await voiceResponse.blob()
          console.log('Audio blob size:', audioBlob.size)
          const audioUrl = URL.createObjectURL(audioBlob)
          if (audioRef.current) {
            audioRef.current.src = audioUrl
            await audioRef.current.play()
            setIsPlaying(true)
          }
        } else {
          console.error('Voice generation failed:', await voiceResponse.text())
          setAudioError('Failed to generate audio')
        }
        setIsLoadingAudio(false)
      }
    } catch (error) {
      console.error('Error:', error)
      setAudioError('Error processing request')
      setIsLoadingAudio(false)
    }
    setUserMessage('')
  }

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  // Update audio element to restart recording
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (isContinuous) {
          setIsLoadingAudio(false)
          startListening()
        }
      }
    }
  }, [isContinuous])

  // Update mic click handler
  const handleMicClick = () => {
    if (isListening) {
      stopListening()
      setIsContinuous(false)
    } else {
      startListening()
      setIsContinuous(true)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Permanent sidebar for large screens */}
      <div className="hidden md:flex w-[300px] p-4 flex-col bg-white border-r">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col bg-gray-100">
        <header className="flex items-center justify-between p-4 bg-white shadow-sm">
          {/* Show hamburger menu only on mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <Sidebar />
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold">Get Clone</h1>
          <div className="w-6" /> {/* Spacer for alignment */}
        </header>

    
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.slice(0, -1).map((message, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-100 ml-auto' 
                    : 'bg-white mr-auto'
                } max-w-[80%]`}
              >
                <p className="text-gray-600">{message.content}</p>
              </div>
            ))}
            
  

            {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="bg-white mr-auto p-4 rounded-lg max-w-[80%]">
                {isLoadingAudio ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Talking...</span>
                    <TypingAnimation />
                  </div>
                ) : (
                  <p className="text-gray-600">{messages[messages.length - 1].content}</p>
                )}
              </div>
            )}
          </div>

          

          <Avatar className="h-24 w-24">
            <AvatarImage src="/placeholder.svg" alt="AI Assistant" />
            <AvatarFallback>
              {selectedVoice ? selectedVoice.name : ''}
            </AvatarFallback>
          </Avatar>

    

          {transcription && (
            <div className="w-full max-w-md p-4 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-medium mb-2">You said:</h3>
                {isLoadingAudio && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                )}
              </div>
              <p className="text-gray-600">{transcription}</p>
            </div>
          )}

          <form 
            className="flex w-full max-w-md items-center space-x-2"
            onSubmit={handleSubmit}
          >
            <Input
              type="text"
              placeholder="Type your message..."
              className="flex-1"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
            <Button 
              type="button" 
              size="icon"
              variant={isListening ? "destructive" : "default"}
              onClick={isListening ? stopListening : startListening}
              disabled={isTranscribing}
            >
              <Mic className="h-4 w-4" />
              <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
            </Button>
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>

          

        </main>
        <audio 
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          hidden
        />
        <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
          <select 
            value={selectedVoice?.id || ''} 
            onChange={(e) => setSelectedVoice(voices.find(v => v.id === e.target.value) || null)}
            className="p-2 rounded border"
          >
            <option value="">Select voice</option>
            {voices.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>
        </div>
      </div>
      <CloneDialog 
        open={showCloneDialog} 
        onOpenChange={setShowCloneDialog}
      />
    </div>
  )
}
