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
    <div className="w-full h-screen flex items-center justify-center">
      <iframe 
        className="w-full h-[600px] md:w-4/5 lg:w-3/4 rounded-lg shadow-lg" 
        src="https://stream.place/"
      ></iframe>
    </div>
  )
}

