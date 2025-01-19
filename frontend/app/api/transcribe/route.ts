'use server';
import fs from 'fs';
import OpenAI from 'openai';
import { writeFile, unlink } from 'fs/promises'; // Use unlink to clean up temporary files
import { join } from 'path';

const openai = new OpenAI();

export async function transcribeAudio(audioBlob : Blob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm'); // Append the Blob to the FormData

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const { text } = await response.json();
    return text;
  } catch (error) {
    console.error('Error during transcription:', error);
    return 'Error transcribing audio';
  }
}
