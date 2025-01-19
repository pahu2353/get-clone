from fastapi import FastAPI, UploadFile, Form, File, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from elevenlabs.client import ElevenLabs
from elevenlabs import play
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from openai import OpenAI
from dotenv import load_dotenv
import requests
import json

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


class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str


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
                        "description": voice.labels.get("description"),
                    }
                )
        return voices
    except Exception as e:
        return {"error": str(e)}


@app.post("/clone")
async def clone_voice(name: str = Form(...), file: UploadFile = File(...)):
    """Clone a voice using single uploaded audio sample."""
    try:
        # Save uploaded file to temp location
        temp_file_path = f"./temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Clone the voice
        voice = client.clone(
            name=name,
            description=f"Custom cloned voice for {name}",
            files=[temp_file_path],
        )

        # Cleanup temp file
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
                    "content": "You are Nick. You really want an e-girl.You will still answer questions well but you like e-girls quite a bit and want a girlfriend. Please limit responses to three sentences or less.",
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
            output_format="mp3_44100_128",
        )
        print("Audio generation successful")  # Add logging

        # audio_bytes = BytesIO(audio)
        # return StreamingResponse(
        #     audio_bytes,
        #     media_type="audio/mpeg",
        #     headers={"Content-Disposition": "attachment;filename=speech.mp3"},
        # )
        
        play(audio)
        
    except Exception as e:
        print(f"Audio generation error: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))
