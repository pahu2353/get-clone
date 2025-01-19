'use client'

import { useState } from 'react'
import { Menu, Mic, Send } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ChatInterface() {
  const [isListening, setIsListening] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex items-center justify-between p-4 bg-white shadow-sm">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4">
              <a href="#" className="text-lg font-medium">Home</a>
              <a href="#" className="text-lg font-medium">Chat History</a>
              <a href="#" className="text-lg font-medium">Settings</a>
            </nav>
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
  )
}

