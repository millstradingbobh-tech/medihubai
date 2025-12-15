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

const path = require('path');
// const cors = require('cors');


const app = express();
app.use(express.json());
app.use(apiInterceptor());
// app.use(cors());
// initProducts();

app.get('/', (req, res) => {
    console.log(process.env)
    res.send('hello, world');
});

app.post("/api/sanity/getProductById", async (req, res) => {
    const product = await getProductById(req);
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

app.get('/magentoproductai', (req, res) => {
  res.sendFile(path.join(__dirname, './src/ai/index.html'));
});

app.post("/api/magento/product", async (req, res) => {
    res.json(await getMagentoProductById(req));
});


app.listen(8080, "0.0.0.0");