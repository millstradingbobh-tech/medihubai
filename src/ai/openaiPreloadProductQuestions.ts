import { OpenAI } from "openai";
import { OPENAI_API_KEY, OPENAI_VERSION } from './access';
import { getProductById } from "../sanity/getProductById";
import { addMessage, buildOpenAIInput, getSession, setGenericRefund, setProductDetail, setProductPdf, getShippingPolicy } from "./chatSession";
import { createChatSession, saveChatMessage } from "../fireStore/chatSession";
import { db } from "../fireStore/init";
import { readGuideline } from "./guideline";
import { getProductBySku } from "../sanity/getProductBySku";

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

function fromJson(text: any) {
      // \\n → real line breaks
      return text?.replace(/\\n/g, "\n") ?? "";
    }

export async function generateQuestions(req: any, res: any): Promise<string[]> {
  let isSku = false;
  if (req.body.productSku && req.body.productId === '') {
    isSku = true;
  }

  let productResult;
  if (isSku) {
    const skuResult = await getProductBySku(req);
    const gidList = skuResult.result.product.store.gid.split('/');
    console.log(gidList[gidList.length - 1]);
    productResult = await getProductById({body: {
      productId: gidList[gidList.length - 1]
    }});
  } else {
    productResult = await getProductById(req);
  }

  const body = req.body;
  const product = productResult.result;

// console.log(product)
  setProductDetail(product);
  // getShippingPolicy(product);
  setGenericRefund();
  // await setProductPdf(product);

  const shortDesc = product?.store.descriptionHtml;
  const content = await readGuideline();
  const data = JSON.parse(content);

  const systemPrompt = `
${fromJson(data.text1)}

Product Details:
Title: ${product?.store?.title}
Description: ${removeHtmlTags(shortDesc)}

`;


  try {

    addMessage(req.body.sessionId, "system", systemPrompt);


    const vars = product?.variants;
    const productSku = vars[0].store.sku;

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

