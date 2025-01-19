from fastapi import FastAPI, UploadFile, Form, File
from elevenlabs.client import ElevenLabs
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from openai import OpenAI


# Initialize FastAPI app
app = FastAPI()

# Initialize ElevenLabs client
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
