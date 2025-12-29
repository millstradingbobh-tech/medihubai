import fs from "fs";
import OpenAI from "openai";
import { OPENAI_API_KEY, OPENAI_VERSION } from './access';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath!);

export function convertWebmToWav(inputPath: string): Promise<string> {
  const outputPath = inputPath + ".wav";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("wav")
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .save(outputPath);
  });
}

export async function voiceToText(req: any, res: any) {
    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded" });
    }

    const webmPath = req.file.path;
    const wavPath = await convertWebmToWav(webmPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "gpt-4o-transcribe"
    });

    fs.unlinkSync(webmPath);
    fs.unlinkSync(wavPath);

    return { text: transcription.text };
}
