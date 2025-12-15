import { OpenAI } from "openai";
import { OPENAI_API_KEY } from './access';
import { getMagentoProductById as getProduct } from "../magento/getProductDetail";
import { addMessage, buildOpenAIInput, getFirstMessage, getSession, setProductDetail } from "./chatSession";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
interface Product {
  title: string;
  description: string;
  category: string;
  tags?: string[];
  // add other relevant fields as needed
}
function removeHtmlTags(str: string) {
  return str.replace(/<\/?[^>]+(>|$)/g, "");
}

export async function generateQuestions(req: any, res: any): Promise<string[]> {

  const body = req.body;
  const productResult = await getProduct(req);
  const product = productResult;

  setProductDetail(product);

  const shortDesc = product?.custom_attributes?.find((item)=>{ return item.attribute_code === 'short_description'})?.value ?? '';
  const systemPrompt = `
You are a customer support assistant for an online store.

Given a product, generate 3 concise and relevant customer questions users frequently ask about it.
Focus on product features, usage, and common concerns.
Ensure each question is fewer than 15 words.
Ensure each question highlights the key standout features of the product.
Ensure each question highlights the new features of the product.
Return the questions as a JSON array of strings ONLY.

Product Details:
Title: ${product?.name}
Description: ${removeHtmlTags(shortDesc)}

Please generate 3 questions.
`;


  try {

    addMessage(req.body.sessionId, "system", systemPrompt);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: buildOpenAIInput(getSession(req.body.sessionId)),
      max_tokens: null,
    });

    const rawContent = response.choices[0]?.message?.content ?? "";
    // Attempt to parse JSON array from the response
    const questions = JSON.parse(rawContent.trim()
    .replace(/^```json\s*/, '')  // remove opening ```json
    .replace(/^```\s*/, '')       // or opening ```
    .replace(/```$/, ''));
    console.log(questions)

    if (Array.isArray(questions) && questions.every(q => typeof q === "string")) {
      return questions;
    } else {
      // If parsed content isn't valid, fallback to splitting by new lines
      return rawContent.split("\n").map(q => q.trim()).filter(Boolean);
    }
  } catch (error) {
    console.error("Error parsing questions from GPT response:", error);
    return [];
  }
}

