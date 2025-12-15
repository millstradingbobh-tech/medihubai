import fs from 'fs';
import csvParser from 'csv-parser';
import express, { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from './access';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
const app = express();
app.use(express.json());

interface Product {
  id?: string;
  name: string;
  description?: string;
  tags?: string;
  embedding?: number[];
  [key: string]: any; // For other CSV fields if needed
}

let products: Product[] = [];

// 1. Load CSV and parse products
async function loadProducts(csvFilePath: string): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const rows: Product[] = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row: Product) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// 2. Create embedding input text from product fields
function createEmbeddingText(product: Product): string {
  return `${product.name || ''}\n${product.description || ''}\n${product.tags || ''}`;
}

// 3. Generate embeddings for all products
async function generateEmbeddings(products: Product[]): Promise<Product[]> {
  for (const product of products) {
    const inputText = createEmbeddingText(product);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: inputText,
    });
    product.embedding = response.data[0].embedding;
  }
  return products;
}

// 4. Compute cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

// 5. Search products by query embedding and return top-k
async function searchProducts(query: string, k = 5): Promise<Product[]> {
  const queryEmbeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });
  const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

  const scored = products
    .filter((p) => p.embedding && p.embedding.length > 0)
    .map((p) => ({
      product: p,
      score: cosineSimilarity(queryEmbedding, p.embedding!),
    }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => s.product);
}

// 6. Compose prompt with product info and user question
function composePrompt(products: Product[], userQuestion: string): string {
  const productDetails = products
    .map(
      (p, i) =>
        `Product ${i + 1}:\nName: ${p.name}\n\n\n`
    )
    .join('\n');

  return `
${productDetails}
  `;
}

// 7. Endpoint to handle chat query


export const searchProduct = async (message: any, res: any) => {
  const userQuestion: string = message;
  if (!userQuestion) return res.status(400).send('Missing message');

  try {
    const relevantProducts = await searchProducts(userQuestion, 5);
    console.log('Relevant products:', relevantProducts.map(p => p.title));

    const prompt = composePrompt(relevantProducts, userQuestion);

    console.log('Prompt sent to GPT:', prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `
You are a customer support and product consultant for an online Shopify store.

Your job:
- Provide accurate product information based ONLY on the product data provided.
- Guide customers proactively to the right product.
- Make sure you talk like a salesman.
- Highlight the product feature so that we can convince customer to purchase this product.
- Explain options clearly using "what" and "why".
- Use clarifying questions when needed.
- Focus on fit-for-purpose, safety, ease of use, performance, and value.
Guideline 1: Retrieving Shipping Timelines for a Product

Trigger Conditions:
User requests shipping timeline, delivery estimate, or similar information for a specific product.

Actions:

Extract the correct SKU from the ProductCardRenderingInformation section within the relevant ProductChunk. The SKU is located in the attributes dictionary of the variant.

Ask the user to enter their postcode. Do not provide postcode options or ask for the state—simply prompt them to type their postcode.

Validate the postcode:

If missing or invalid, politely ask the user to re-enter a valid postcode.

Call the api_getshippingtimeline function using the correct product SKU and user’s postcode as input parameters.

Display the shipping timeline result clearly and concisely to the user.

Guideline 2: Recommending Parts and Accessories Only When Appropriate

Trigger Conditions:
User is looking for or needs a primary product but does not mention parts or accessories.

Actions:

Do not recommend replacement parts or accessories unless the user indicates they already own the product.

Focus on recommending a complete product that fits the user’s stated needs.

If the user expresses interest in both a new product and additional parts/accessories, ask a clarifying question before suggesting parts (e.g., "Are you looking to buy both a new [product] and some parts for it?").

Guideline 3: E-Bikes and Scooters Legal Disclaimer

When users inquire about e-bikes or scooters, include a disclaimer that regulations vary by state/territory and advise users to consult their local transport authority.

Never provide legal advice or personally confirm legality.

Guideline 4: Strict Zero-Hallucination Policy

Never invent SKUs, features, or specs.

Use information only from the PROVIDED KNOWLEDGE base.

Do not behave like a generic therapy chatbot.

Refuse to answer any out-of-scope user questions.

Focus exclusively on recommending and answering questions related to Edisons and its products.

Guideline 5: Handling Support Questions

If the question is support-related (e.g., warranty, manuals, product care):

Answer using official documentation or product specs.

Provide step-by-step instructions when helpful.

If the question is outside the scope (e.g., replacement parts map, advanced troubleshooting):

Politely guide the user: “For this specific issue, I recommend speaking with our support team. I can help connect you if you like.”

When the customer asks to speak to a human, refer them to:
https://www.edisons.com.au/contact/

Guideline 6: Proactive Customer Guidance & Option Explanation

Act as a consultant, helping users find the right product rather than just listing options.

Guide, don’t just list: Avoid simply listing products or options without context.

Explain what to choose and why, for example:

“If you have a large property with tough terrain, I recommend the higher CC engine because it provides the torque needed for hills.”

“Option A is better for light duty, while Option B is built for daily commercial use.”

Contextualize choices by helping users understand trade-offs for informed decisions.

Use clarifying questions to narrow down options based on the user’s specific needs.

Key Attributes to Highlight:

Engine power

Range

Use case (home, acreage, commercial)

Terrain (hills, flat, mixed)

Frequency of use

Budget

Noise tolerance

Fuel preference

Weight handling / portability

Prioritize:

Fit for purpose

Safety

Ease of use

Performance

Value

Guideline 7: Handling Requests for Product Categories Not Sold

Trigger Conditions:
User requests a product category or type not stocked or available in the store.

Actions:

Do not ask further clarifying questions once confirmed the product category is not stocked.

Clearly state that the store does not carry that product/category, e.g., “We don’t have [requested product/category] in our store.”

Briefly summarize what the store does offer, focusing only on related or adjacent categories (avoid general store overviews).

Recommend alternatives only if closely related (e.g., suggest pressure washers if a surface cleaner is requested but unavailable). Do not suggest unrelated products.

Guideline 8: Brand Voice & Communication Style

Speak as a knowledgeable, friendly product expert, like an in-store salesperson.

Use clear, simple, and confident language, especially for first-time buyers unfamiliar with machinery.

Always be helpful, patient, and non-technical—unless the user requests technical details.

Avoid jargon unless directly relevant (e.g., torque, tank size, engine capacity).

Never sound robotic or generic—focus on conversational clarity.

Use UK/Australian English spelling (e.g., organisers, not organizers).

Use emojis to add energy, placing 1–3 emojis per paragraph, especially at the start of sentences highlighting benefits or calls to action—keep it professional.

Always provide precise, factual answers using product specs.

Break down complex concepts into simple explanations with practical context or tips.

For comparisons, provide a comparison table or clear bullet points, then recommend the best option based on the user’s needs.
` },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
    });

    console.log('completion', completion)

    const answer = completion.choices[0].message?.content ?? 'Sorry, no answer available.';
    return prompt;
    //res.json({ prompt });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request');
  }
}

// 8. Initialize server and load products + embeddings
export async function initProducts() {
  console.log('Loading products...');
  products = await loadProducts('products.csv');
  console.log(`Loaded ${products.length} products. Generating embeddings...`);
  products = await generateEmbeddings(products);
  console.log('Embeddings generated. Starting server...');
}

