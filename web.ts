import dotenv from 'dotenv';
dotenv.config()

import express from "express";
import { apiInterceptor } from './src/utils/inteceptor';
// import { test } from './test';
import { getProductById } from './src/sanity/getProductById';
import { chat } from './src/ai/openaiChat';
import { initProducts, searchProduct } from './src/ai/openaiSearchProducts';
import { generateQuestions } from './src/ai/openaiPreloadProductQuestions';
import { getMagentoProductById } from './src/magento/getProductDetail';
import { getChatHistory } from './src/fireStore/getChatHistory';
import { getDeviceChat } from './src/fireStore/getDeviceChat';
import { readGuideline, saveGuideline } from './src/ai/guideline';
import fs from "fs/promises";
import { getProductBySku } from './src/sanity/getProductBySku';
import multer from "multer";
import cors from "cors";
import { voiceToText } from './src/ai/voiceToText';

const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });

const path = require('path');
// const cors = require('cors');


const app = express();
app.use(express.json());
app.use(apiInterceptor());
app.use(cors());
// initProducts();

app.get('/', (req, res) => {
    console.log(process.env)
    res.send('hello, world');
});

app.get('/product-ai-playground', (req, res) => {
  res.sendFile(path.join(__dirname, './src/ai/index.html'));
});

app.get('/guideline', (req, res) => {
  res.sendFile(path.join(__dirname, './src/ai/guideline.html'));
});

app.get('/voicetotext', (req, res) => {
  res.sendFile(path.join(__dirname, './src/ai/voicetotext.html'));
});

app.post("/api/sanity/getProductById", async (req, res) => {
    const product = await getProductById(req);
    res.json({ product });
});

app.post("/api/sanity/getProductBySku", async (req, res) => {
    const product = await getProductBySku(req);
    res.json({ product });
});

app.post("/api/openai/chat", async (req, res) => {
    res.json(await chat(req));
});

app.get("/api/openai/searchProduct", async (req, res) => {
    const message = req.query.message;
    res.send(await searchProduct(message, res));
});

app.post("/api/openai/generateProductQuestions", async (req, res) => {
    res.send(await generateQuestions(req, res));
});

app.post("/api/magento/product", async (req, res) => {
    res.json(await getMagentoProductById(req));
});

app.post('/chat/history', async (req: any, res) => {
  res.json(await getChatHistory(req.body.sessionId));
});

app.post('/chat/searchByLocation', async (req: any, res) => {
  res.json(await getDeviceChat(req.body.locationName));
});

app.post('/chat/saveguideline', async (req, res) => {
  try {
    const result = await saveGuideline(req, res);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/chat/guideline", async (_req, res) => {
  try {
    const content = await readGuideline();
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Failed to load guideline" });
  }
});

app.post("/chat/voicetotext", upload.single("audio"), async (req, res) => {
    try {
        res.json(await voiceToText(req, res));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Voice transcription failed" });
    }
});


app.listen(8080, "0.0.0.0");