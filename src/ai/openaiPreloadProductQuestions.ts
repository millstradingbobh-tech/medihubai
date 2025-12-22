import { OpenAI } from "openai";
import { OPENAI_API_KEY, OPENAI_VERSION } from './access';
import { getProductById } from "../sanity/getProductById";
import { addMessage, buildOpenAIInput, getFirstMessage, getSession, setGenericRefund, setProductDetail, setProductPdf, getShippingPolicy } from "./chatSession";
import { createChatSession, saveChatMessage } from "../fireStore/chatSession";
import { db } from "../fireStore/init";

export const openai = new OpenAI({
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
  const productResult = await getProductById(req);
  const product = productResult.result;

// console.log(product)
  setProductDetail(product);
  // getShippingPolicy(product);
  setGenericRefund();
  // await setProductPdf(product);

  const shortDesc = product?.store.descriptionHtml;

  const systemPrompt = `
You are a customer support assistant for an online store.

Given a product, generate 3 concise and relevant customer questions users frequently ask about it.
Focus on product features, usage, and common concerns.
Ensure each question is fewer than 15 words.
Ensure each question highlights the key standout features of the product.
Ensure each question highlights the new features of the product.
Return the questions as a JSON array of strings ONLY.

Product Details:
Title: ${product?.store?.title}
Description: ${removeHtmlTags(shortDesc)}

Please generate 3 questions.
`;


  try {

    addMessage(req.body.sessionId, "system", systemPrompt);


    const vars = product?.variants;
    const productSku = vars[0].store.sku;

    // console.log(product?.title)


    await createChatSession(req.body.sessionId, {
      productSKU: productSku,
      productName: product?.store?.title,
      locationName: body.locationName
    });

    const messages: any = buildOpenAIInput(getSession(req.body.sessionId));
    
    const response = await openai.chat.completions.create({
      model: OPENAI_VERSION,
      messages,
      max_tokens: 512
    });

    const rawContent = response.choices[0]?.message?.content ?? "";
    // Attempt to parse JSON array from the response
    const questions = JSON.parse(rawContent.trim()
    .replace(/^```json\s*/, '')  // remove opening ```json
    .replace(/^```\s*/, '')       // or opening ```
    .replace(/```$/, ''));
    console.log(questions)

    await saveChatMessage(req.body.sessionId, "assistant", questions ?? '');

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

