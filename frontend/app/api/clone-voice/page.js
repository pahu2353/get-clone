import { promises as fs } from 'fs';
import formidable from 'formidable';
import path from 'path';

// Mark route as server-side
export const dynamic = 'force-dynamic'

export const config = {
  api: {
    bodyParser: false, // Disable built-in body parser to handle FormData
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = './public/uploads'; // Directory to temporarily store files
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to process the file' });
    }

    const { voiceName } = fields;
    const audioFile = files.audio.filepath;

    try {
      // Convert the audio file to base64
      const audioBase64 = await fs.readFile(audioFile, { encoding: 'base64' });
      const audioData = `data:audio/wav;base64,${audioBase64}`;

      // Call the ElevenLabs API to clone the voice
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.ELEVENLABS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: voiceName,
          files: [audioData],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return res.status(200).json({ message: 'Voice cloned successfully', voiceId: result.voice_id });
      } else {
        return res.status(500).json({ message: 'Failed to clone voice', error: result });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error', error });
    } finally {
      // Clean up the temporary file
      await fs.unlink(audioFile);
    }
  });
}
