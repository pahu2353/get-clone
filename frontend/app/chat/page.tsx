'use client'

import { useState, useEffect } from 'react'
import { Menu, Mic, Send } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { CloneDialog } from "@/components/clone"

interface Voice {
  id: string;
  name: string;
  description: string | null;
}

export default function ChatInterface() {
  const [isListening, setIsListening] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCloneDialog, setShowCloneDialog] = useState(false)

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

  const Sidebar = () => (
    <nav className="flex flex-col gap-4">
      <Button
        className="w-full"
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
      <a href="#" className="text-lg font-medium">Settings</a>
    </nav>
  )

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
          <h1 className="text-xl font-bold">ChatGPT</h1>
          <div className="w-6" /> {/* Spacer for alignment */}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src="/placeholder.svg" alt="AI Assistant" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>

          <Button
            variant={isListening ? "destructive" : "default"}
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={() => setIsListening(!isListening)}
          >
            <Mic className="h-8 w-8" />
            <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
          </Button>

          <form className="flex w-full max-w-md items-center space-x-2">
            <Input type="text" placeholder="Type your message..." className="flex-1" />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </main>
      </div>
      <CloneDialog 
        open={showCloneDialog} 
        onOpenChange={setShowCloneDialog}
      />
    </div>
  )
}
