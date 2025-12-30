import fs from "fs";
import { v4 as uuid } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
// @ts-ignore
import ffprobePath from "ffprobe-static";
import OpenAI from "openai";

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath.path);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class VoiceProcessor {
  private id = uuid();
  private tmpDir = "./uploads";

  private webmPath = `${this.tmpDir}/${this.id}.webm`;
  private wavPath = `${this.tmpDir}/${this.id}.wav`;

  private onTranscription: (text: string) => void;
  private onTranscriptionStart?: () => void;

  // ===== thresholds =====
  private minSizeBytes = 30_000;   // ~0.3s
  private minDurationSec = 0.4;    // real speech
  private maxDurationSec = 30;     // safety

  constructor(
    onTranscription: (text: string) => void,
    onTranscriptionStart?: () => void
  ) {
    this.onTranscription = onTranscription;
    this.onTranscriptionStart = onTranscriptionStart;
  }

  // =====================
  // Entry point
  // =====================
  async processWebmBuffer(buffer: Buffer) {
    fs.writeFileSync(this.webmPath, buffer);

    const stats = fs.statSync(this.webmPath);
    if (stats.size < this.minSizeBytes) {
      this.cleanup();
      return;
    }

    const duration = await this.getDurationSec(this.webmPath);
    if (
      duration < this.minDurationSec ||
      duration > this.maxDurationSec
    ) {
      this.cleanup();
      return;
    }

    await this.convertWebmToWav();

    if (this.onTranscriptionStart) {
      this.onTranscriptionStart();
    }

    const text = await this.transcribe();
    this.onTranscription(text);

    this.cleanup();
  }

  // =====================
  // Helpers
  // =====================
  private getDurationSec(path: string): Promise<number> {
    console.log(path)
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, meta) => {
        if (err) return reject(err);
        resolve(meta.format?.duration ?? 0);
      });
    });
  }

  private convertWebmToWav(): Promise<void> {
    return new Promise((resolve: any, reject) => {
      ffmpeg(this.webmPath)
        .toFormat("wav")
        .audioChannels(1)
        .audioFrequency(16000)
        .on("end", resolve)
        .on("error", reject)
        .save(this.wavPath);
    });
  }

  private async transcribe(): Promise<string> {
    const res = await openai.audio.transcriptions.create({
      file: fs.createReadStream(this.wavPath),
      model: "gpt-4o-transcribe",
      language: "en",
    });
    return res.text;
  }

  private cleanup() {
    try {
      if (fs.existsSync(this.webmPath)) fs.unlinkSync(this.webmPath);
      if (fs.existsSync(this.wavPath)) fs.unlinkSync(this.wavPath);
    } catch {}
  }
}
