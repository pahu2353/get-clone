import fs from "fs";
import { unlink } from "fs/promises";
import formidable from "formidable";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const config = {
  api: {
    bodyParser: false, // Disable built-in body parser for file uploads
  },
};

export default async function handler(req, res) {
  console.log("API method:", req.method);

  console.log("API called"); // Log when the API is hit

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const form = new formidable.IncomingForm({
    uploadDir: "/tmp", // Temporary directory to store uploads
    keepExtensions: true,
  });

  try {
    console.log("Parsing form...");
    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Error parsing form:", err);
          reject(err);
        } else {
          console.log("Form parsed successfully:", files);
          resolve({ files });
        }
      });
    });

    const audioFile = files.audio;
    if (!audioFile || Array.isArray(audioFile)) {
      res.status(400).json({ error: "Invalid file upload" });
      return;
    }

    const filePath = audioFile.filepath;
    console.log("Audio file path:", filePath);

    // Use OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    console.log("Transcription result:", transcription);

    // Clean up the temporary file
    await unlink(filePath);

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}
