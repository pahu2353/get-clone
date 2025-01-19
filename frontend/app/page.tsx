"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Video,
  Shield,
  Users,
  MessageSquare,
  MonitorUp,
  RepeatIcon as Record,
  Smile,
  MoreHorizontal,
  X,
  MoreVertical,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Menu, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { CloneDialog } from "@/components/clone";
import { TypingAnimation } from "@/components/typing-animation";

interface Voice {
  id: string;
  name: string;
  description: string | null;
}

// Add interface for Message
interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function VideoConference() {
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [chatResponse, setChatResponse] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [userMessage, setUserMessage] = useState("");
  // Add this with your other useState declarations
  const [videoUrl, setVideoUrl] = useState("../../backend/patrick.png");
  // Add messages state
  const [messages, setMessages] = useState<Message[]>([]);
  // Add new state for audio
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Add new state
  const [audioError, setAudioError] = useState<string>("");
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  // Add new state for continuous mode
  const [isContinuous, setIsContinuous] = useState(false);
  // Add new state/refs
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const originalVideoUrlRef = useRef<string>("");

  const currVoiceDescription =
    selectedVoice?.description || "No description available";

  // Fetch all the different voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("http://localhost:8000/voices");
        const data = await response.json();
        setVoices(data);
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoices();
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/mp3" });
        await handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  // Update handleTranscription
  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");

    try {
      const transcribeResponse = await fetch(
        "http://localhost:8000/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );
      const transcribeData = await transcribeResponse.json();

      if (transcribeData.status === "success") {
        const userMessage = {
          role: "user" as const,
          content: transcribeData.text,
        };
        setMessages((prev) => [...prev, userMessage]);

        const chatResponse = await fetch("http://localhost:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            description: selectedVoice?.description || "You are very friendly!", // Added description
          }),
        });

        const chatResult = await chatResponse.json();
        if (chatResponse.ok) {
          const assistantMessage = {
            role: "assistant" as const,
            content: chatResult.content,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setChatResponse(chatResult.content);

          setIsLoadingAudio(true);
          setAudioError("");

          const voiceResponse = await fetch("http://localhost:8000/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: chatResult.content,
              voice_id: selectedVoice?.id || voices[0]?.id || "default",
              name: selectedVoice?.name
            }),
          });

          if (voiceResponse.ok) {
            const responseData = await voiceResponse.json();
            
            // Update video URL with returned path
            if (responseData.video_url) {
              setVideoUrl(responseData.video_url);
            }
          
            // Handle audio...
            if (responseData.audio) {
              const audioBlob = new Blob(
                [Buffer.from(responseData.audio, 'base64')],
                { type: 'audio/mp3' }
              );
              const audioUrl = URL.createObjectURL(audioBlob);
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                await audioRef.current.play();
                setIsPlaying(true);
              }
            }
          } else {
            setAudioError("Failed to generate audio");
          }
          setIsLoadingAudio(false);
        }
      }
    } catch (error) {
      setAudioError("Error processing request");
      setIsLoadingAudio(false);
    } finally {
      setIsTranscribing(false);
    }
  };

  const Topbar = () => (
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
              onClick={() => setSelectedVoice(voice)} //</div> Update selected voice
              className="block text-sm text-gray-600 hover:text-gray-900"
            >
              {voice.name}
              {voice.description && (
                <span className="block text-xs text-gray-400">
                  {voice.description}
                </span>
              )}
            </a>
          ))
        )}
      </div>
    </nav>
  );

  // Update form submit handler
  const handleSubmit = async (e: React.FormEvent) => {



    e.preventDefault();
    if (!userMessage.trim()) return;

    const newUserMessage = { role: "user" as const, content: userMessage };
    setUserMessage('')
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const chatResponse = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          description: selectedVoice?.description || "No description available",
        }),
      });

      const chatResult = await chatResponse.json();
      console.log("wtf is going on");
      if (chatResponse.ok) {
        const assistantMessage = {
          role: "assistant" as const,
          content: chatResult.content,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setChatResponse(chatResult.content);

        // Always attempt voice generation
        setIsLoadingAudio(true);
        setAudioError("");
        console.log(
          "Generating audio with voice:",
          selectedVoice?.id || "default"
        );

        const voiceResponse = await fetch("http://localhost:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chatResult.content,
            voice_id: selectedVoice?.id || voices[0]?.id || "default",
          }),
        });

        if (voiceResponse.ok) {
          const responseData = await voiceResponse.json();
          
          // Handle video URL
          if (responseData.video_url) {
            setVideoUrl(responseData.video_url);
          } else {
            setVideoUrl("../../backend/patrick.png"); // Fallback to patrick.png
          }
        
          // Handle audio
          if (responseData.audio) {
            const audioBlob = new Blob(
              [Buffer.from(responseData.audio, 'base64')],
              { type: 'audio/mp3' }
            );
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              await audioRef.current.play();
              setIsPlaying(true);
            }
          }
        } else {
          console.error("Voice generation failed:", await voiceResponse.text());
          setAudioError("Failed to generate audio");
        }
        setIsLoadingAudio(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setAudioError("Error processing request");
      setIsLoadingAudio(false);
    }
    setUserMessage("");
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // Update audio element to restart recording
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (isContinuous) {
          setIsLoadingAudio(false);
          startListening();
        }
      };
    }
  }, [isContinuous]);

  // Update mic click handler
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setIsContinuous(false);
    } else {
      startListening();
      setIsContinuous(true);
    }
  };

  // Update generate handler
  const handleGenerate = async () => {
    try {
      const voiceResponse = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chatResult.content,
          voice_id: selectedVoice?.id || voices[0]?.id || "default",
        }),
      });

      if (voiceResponse.ok) {
        const responseData = await voiceResponse.json();
        
        if (responseData.video_url) {
          originalVideoUrlRef.current = videoUrl;
          setIsPlayingResponse(true);
          setVideoUrl(responseData.video_url);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    
    <div className="flex flex-col h-screen overflow-hidden bg-[#1a1a1a]">
      {/* Top participant bar */}
      <div className="bg-[#1a1a1a] p-4 border-b border-[#2b2b2b]">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#2b2b2b] flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <ScrollArea className="flex-grow">
            <div className="flex space-x-2">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  className={`relative flex-shrink-0 cursor-pointer transition-all duration-200 ease-in-out ${
                    selectedVoice?.id === voice.id
                      ? "scale-105"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedVoice(voice);
                    setVideoUrl(`/${voice.name}.mp4`);
                  }}
                >
                  <div className="relative w-[120px] aspect-video rounded-lg overflow-hidden bg-[#2b2b2b]">
                    <video
                      src={`/${voice.name}.mp4`}
                      className="object-cover w-full h-full"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    {selectedVoice?.id === voice.id && (
                      <div className="absolute inset-0 bg-blue-500/20" />
                    )}
                  </div>
                  <span className="absolute bottom-1 left-2 text-xs text-white font-medium">
                    {voice.name}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#2b2b2b] flex-shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
      
      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative bg-[#1a1a1a]">
        <video
          key={videoUrl} // Force reloading the video when the URL changes
          className="w-full h-full object-cover"
          src={videoUrl}
          autoPlay
          loop={!isPlayingResponse} // Prevent looping if it's the fetched video
          playsInline
          onEnded={() => {
            if (isPlayingResponse) {
              // Switch back to the original video
              setVideoUrl(originalVideoUrlRef.current);
              setIsPlayingResponse(false);
            }
          }}
          onLoadedMetadata={() => {
            if (isPlayingResponse) {
              // Handle short video case with a timeout
              const videoElement = document.querySelector('video');
              const duration = videoElement?.duration || 0;

              if (duration && duration < 1) {
                setTimeout(() => {
                  if (isPlayingResponse) {
                    setVideoUrl(originalVideoUrlRef.current);
                    setIsPlayingResponse(false);
                  }
                }, duration * 1000);
              }
            }
          }}
        />

        </div>

        {/* Right sidebar */}
        <Card className="w-[400px] border-none rounded-none bg-white flex flex-col">
          <main className="flex-1 flex flex-col items-center justify-between p-4">
           <div className="w-full max-w-md flex-1 overflow-y-auto space-y-4 mb-4 max-h-[60vh]">
             {messages.slice(0, -1).map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-100 ml-auto"
                      : "bg-white mr-auto"
                  } max-w-[80%]`}
                >
                  <p className="text-gray-600">{message.content}</p>
                </div>
              ))}

              {messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" && (
                  <div className="bg-white mr-auto p-4 rounded-lg max-w-[80%]">
                    {isLoadingAudio ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Thinking...</span>
                        <TypingAnimation />
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        {messages[messages.length - 1].content}
                      </p>
                    )}
                  </div>
                )}
            </div>

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
            <div className="mt-auto w-full">
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
                  <span className="sr-only">
                    {isListening ? "Stop listening" : "Start listening"}
                  </span>
                </Button>
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </div>
            
          </main>
        </Card>
      </div>

      {/* Bottom control bar */}
      <div className="bg-[#1a1a1a] border-t border-[#2b2b2b] p-4">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Mic className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Video className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Shield className="h-10 w-10" />
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Users className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <MessageSquare className="h-10 w-10" />
            </Button>
            <Button
              className="w-full text-2xl"
              onClick={() => setShowCloneDialog(true)}
            >
              Get Clone
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Record className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <Smile className="h-10 w-10" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#2b2b2b]"
            >
              <MoreHorizontal className="h-10 w-10" />
            </Button>
          </div>

          <Button variant="destructive" size="sm">
            Leave
          </Button>
          <CloneDialog 
        open={showCloneDialog} 
        onOpenChange={setShowCloneDialog}
      />
        </div>
      </div>
    </div>
  );
}

