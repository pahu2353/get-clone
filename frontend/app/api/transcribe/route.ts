import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { unlink } from "fs/promises";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Disable Next.js body parser
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
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const form = new formidable.IncomingForm({
    uploadDir: "/tmp", // Temporary directory for uploads
    keepExtensions: true, // Retain file extensions
  });

  try {
    const { files } = await new Promise<{ files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ files });
      });
    });

    const audioFile = files.audio as formidable.File; // Ensure this matches your FormData key
    const filePath = audioFile.filepath;

    // Use Whisper API to transcribe the file
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
