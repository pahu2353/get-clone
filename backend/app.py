from fastapi import FastAPI, UploadFile, Form, File
from elevenlabs.client import ElevenLabs
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os

# Initialize FastAPI app
app = FastAPI()

# Initialize ElevenLabs client
client = ElevenLabs(
    api_key="sk_3d4d7eaa45430f3d172e182584159c4993e4b74b1faabb22"
)  # Replace with your actual API key

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
