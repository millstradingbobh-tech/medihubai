import { Request, Response } from "express";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs/promises";

export async function saveGuideline(req: Request, res: Response) {
  const data = req.body;
  const filePath = path.join(__dirname, "./guidelineStore.json");
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return { status: "ok" };
}

export async function readGuideline() {
    const filePath = path.join(__dirname, "./guidelineStore.json");
    const content = await fs.readFile(filePath, "utf-8");
    return content;
}