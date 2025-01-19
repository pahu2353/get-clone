import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { writeFile, unlink } from "fs/promises"; // Write and clean up files
import OpenAI from "openai";
import formidable from "formidable";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({
    uploadDir: "/tmp", // Directory for temporary file storage
    keepExtensions: true, // Keep file extensions
  });

  try {
    const { files } = await new Promise<{
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ files });
      });
    });

    const audioFile = files.audio as formidable.File;
    const filePath = audioFile.filepath;

    // Pass the audio file to OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    // Clean up temporary file
    await unlink(filePath);

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
}
