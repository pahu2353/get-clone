from fastapi import FastAPI, UploadFile, Form, File, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from elevenlabs.client import ElevenLabs
from elevenlabs import play
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from openai import OpenAI
from dotenv import load_dotenv
import requests
import json
import base64

# Load environment variables at the start
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Initialize ElevenLabs client
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Initialize OpenAI client with explicit API key
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],  # Allow requests from your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Pydantic model for response serialization
class Voice(BaseModel):
    id: str
    name: str
    description: str | None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    description: str = ""


class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str
    name: str


@app.get("/voices", response_model=list[Voice])
async def get_voices():
    """Fetch and return all available voices where category is 'cloned'."""
    try:
        response = client.voices.get_all()
        voices = []
        for voice in response.voices:
            if voice.category == "cloned":
                voices.append(
                    {
                        "id": voice.voice_id,
                        "name": voice.name,
                        "description": voice.description,
                    }
                )
            
        return voices
    except Exception as e:
        return {"error": str(e)}


@app.post("/clone")
async def clone_voice(
    name: str = Form(...), 
    description: str = Form(...), 
    file: UploadFile = File(...)
):
    """Clone a voice using single uploaded audio sample."""
    try:
        temp_file_path = f"./temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        voice = client.clone(
            name=name,
            description=description,  # Use provided description
            files=[temp_file_path],
        )

        os.remove(temp_file_path)

        return {
            "id": voice.voice_id,
            "name": voice.name,
            "description": voice.description,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper API."""
    try:
        # Save uploaded file temporarily
        temp_file_path = f"./temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Transcribe using OpenAI
        with open(temp_file_path, "rb") as audio_file:
            transcription = openai_client.audio.transcriptions.create(
                model="whisper-1", file=audio_file
            )

        # Cleanup temp file
        os.remove(temp_file_path)

        return {"text": transcription.text, "status": "success"}

    except Exception as e:
        return {"error": str(e), "status": "error"}


# Add this new route
@app.post("/chat")
async def chat_completion(request: ChatRequest):
    """Generate text using ChatGPT given input messages."""
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": request.description
                    + "\nMake sure your message is two sentences or less, please!",
                }
            ]
            + [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ],
        )

        return {
            "content": completion.choices[0].message.content,
            "status": "success",
        }
    except Exception as e:
        return {"error": str(e), "status": "error"}


@app.post("/generate")
async def generate_speech(request: TextToSpeechRequest):
    """Generate speech from text using ElevenLabs API."""
    try:
        print(
            f"Generating speech for text: {request.text[:50]}..."
        )  # Add logging
        print(f"Using voice ID: {request.voice_id}")  # Add logging

        audio = client.generate(
            text=request.text,
            voice=request.voice_id,
            model="eleven_turbo_v2_5",
        )
        print("Audio generation successful")  # Add logging

        audio_path = "./temp_audio.mp3"
        try:
            audio_bytes = b''.join(audio) if hasattr(audio, '__iter__') else audio
            
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            
            print("Audio write successful")

            api_key = os.getenv("GOOEY_API_KEY")
            if not api_key:
                raise ValueError("GOOEY_API_KEY environment variable is not set.")

            # Use context managers for file handling
            files = {
                "input_face": open(f"{request.name}.mp4", "rb"),
                "input_audio": open("temp_audio.mp3", "rb"),
            }
                
            payload = {}

            response = requests.post(
                "https://api.gooey.ai/v2/Lipsync/form/",
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                data={"json": json.dumps(payload)},
            )

            # Debug response
            print("Response status code:", response.status_code)
            print("Response headers:", response.headers)
            print("Response content:", response.content)

            # Check for request success
            if not response.ok:
                print("Error in initial request:", response.content)
                response.raise_for_status()

            # Extract output directly if Location header is missing
            if "Location" not in response.headers:
                print("Processing completed synchronously.")
                response_data = response.json()
                if "output" in response_data:
                    print("Output video URL:", response_data["output"]["output_video"])
                else:
                    print("No output found in the response.")
            else:
                # Polling logic (not needed in this case but retained for completeness)
                status_url = response.headers["Location"]
                while True:
                    status_response = requests.get(
                        status_url, headers={"Authorization": f"Bearer {api_key}"}
                    )
                    if not status_response.ok:
                        print("Error polling status:", status_response.content)
                        status_response.raise_for_status()

                    result = status_response.json()
                    status = result.get("status")

                    if status == "completed":
                        print("Lipsync completed successfully:", result)
                        break
                    elif status == "failed":
                        print("Lipsync processing failed:", result)
                        break
                    else:
                        print("Current status:", status)
            
            return {
                "video_url": response_data["output"]["output_video"],
            }
                        
        except Exception as e:
            if os.path.exists(audio_path):
                os.remove(audio_path)
            raise ValueError(f"Request failed: {str(e)}")
        
    except Exception as e:
        print(f"Audio generation error: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-video")
async def save_video(
    name: str = Form(...),
    video: UploadFile = File(...)
):
    """Save video file to both backend and frontend public directories."""
    try:
        # Define paths
        backend_path = f"./{name}.mp4"
        frontend_path = f"../frontend/public/{name}.mp4"
        
        # Read video data
        video_data = await video.read()
        
        # Save to backend directory
        with open(backend_path, "wb") as f:
            f.write(video_data)
            
        # Save to frontend public directory
        os.makedirs(os.path.dirname(frontend_path), exist_ok=True)
        with open(frontend_path, "wb") as f:
            f.write(video_data)
            
        return {
            "status": "success",
            "message": f"Video saved as {name}.mp4",
            "backend_path": backend_path,
            "frontend_path": frontend_path
        }
        
    except Exception as e:
        # Cleanup on error
        for path in [backend_path, frontend_path]:
            if os.path.exists(path):
                os.remove(path)
        raise HTTPException(status_code=500, detail=str(e))