import { getProduct } from "../sanity/getProductById";
import { ChatMessage, ChatRole } from "./type";
import { PDFParse } from 'pdf-parse';

const chatSessions = new Map<string, ChatMessage[]>();

export function getSession(sessionId: string): ChatMessage[] {
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, []);
  }
  return chatSessions.get(sessionId)!;
}

export function addMessage(
  sessionId: string,
  role: ChatRole,
  content: string
) {
  const session = getSession(sessionId);
  session.push({
    role,
    content,
    createdAt: Date.now(),
  });

  console.log(session)
}

export function updateSystemMessage(sessionId: string, newSystemMessage: string) {
  const session = chatSessions.get(sessionId);

  if (!session) {
    return;
  }

  const systemIndex = session.findIndex(m => m.role === "system");

  if (systemIndex !== -1) {
    session[systemIndex] = {
      role: "system",
      content: newSystemMessage,
      createdAt: Date.now(),
    };
  } else {
    // Should rarely happen, but safe fallback
    session.unshift({
      role: "system",
      content: newSystemMessage,
      createdAt: Date.now(),
    });
  }
}

export function shoudShowDelivery(sessionId: string) {
  const session = chatSessions.get(sessionId);

  if (!session) {
    return;
  }

  const userSession = session.filter((item)=>{ return item.role === 'user'});
  console.log(userSession)
  if (userSession.length >= 2) {
    if (isValidAuPostcode(userSession[userSession.length - 1].content) && isShippingQuestion(userSession[userSession.length - 2].content)) {
      return true;
    }
  }
 
  return false;
}

function isShippingQuestion(message: string): boolean {
  return /shipping|delivery|postage|freight|cost to ship/i.test(message);
}


function isValidAuPostcode(postcode: string) {
  // Matches exactly 4 digits
  return /^\d{4}$/.test(postcode);
}

export function buildOpenAIInput(messages: ChatMessage[]) {
  return messages.map(m => ({
    role: m.role,
    name: m.name,
    content: m.content,
    createdAt: m.createdAt
  }));
}


export function getFirstMessage() {
    return `
    You are a customer support and product consultant for an online Shopify store.

    Your job:
    - Provide accurate product information based ONLY on the product data provided.
    - Guide customers proactively to the right product.
    - Explain options clearly using "what" and "why".
    - Talk like a salesman.
    - Try to highlight product features and try to convince customer to purchase.
    - Use clarifying questions when needed.
    - Focus on fit-for-purpose, safety, ease of use, performance, and value.

    ==============================
    PROACTIVE CUSTOMER GUIDANCE RULES
    ==============================

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

    ${JSON.stringify(productDetail || {}, null, 2)}

    This is refund policy: ${genericRefund}

    Product SKU is ${productSku}


    `
    ;

    // ,
    // {
    //     role: "user",
    //     content: body.message
    // }
    // ]
}

export function getPDFData() {
    return `Response data with content in https://www.datastreamserver.com/manuals/HELWLCEQPGK9A-manual.pdf
`
}

let productDetail = '';
let productSku = '';
export function setProductDetail(p: any) {

    const vars = p?.variants;

    productSku = vars[0].store.sku;
    productDetail = p;
}

let pdfInfo: string;
export async function setProductPdf(p: any) {
    const meta = p?.store.metafields;
    let pdfUrl = '';

    for (const metaItem of meta) {
      if (metaItem.key === 'manual') {
        pdfUrl = metaItem.value;
      }
    }

    const parser = new PDFParse({ url: pdfUrl });

    const pdfdata = await parser.getText();
    pdfInfo = pdfdata.text;
}

export async function getShippingPolicy(id: any, postcode: string) {

    const productResult = await getProduct(id);
    const p = productResult.result;
    const vars = p?.variants;

    const sku = vars[0].store.sku;

    const url =
  "https://api.millsbrands.com.au/api/v1/postage-calculator" +
  "?sku="+sku+"&zip=" + postcode + "&qty=1" +
  "&services=all";

    const response = await fetch(url);
    return await response.json();
}

let genericRefund: string;
export async function setGenericRefund() {
    genericRefund = `At Medihub, we are committed to providing a transparent and straightforward returns process that aligns with the Australian Consumer Law (ACL), ensuring your statutory rights are always protected. Your peace of mind is our priority, and we've designed our policy to make resolving any issues with your purchase as simple as possible.

To initiate any return or credit, please use our online returns form.

 

Understanding Our Returns Process
 

Standard Returns
If you encounter an issue with a product, you are entitled to a return in line with ACL requirements. In most cases, you will be responsible for returning the item unless otherwise required by law.

 

7-Day Money Back Guarantee (Sydney Metro Area)
As a special offer for our customers in the Sydney metropolitan area, we provide a 7-Day Money Back Guarantee. To be eligible, the claim must be submitted within seven days of receiving your item, and the item must still be in new condition, good working order and suitable for resale. It must also be ready for collection from the original delivery address.

 

Warranty Claims
Warranty returns are handled in accordance with the specific warranty conditions of your product. Our team will guide you through the next steps to start a warranty return.

 

Faulty Items
If you receive a faulty item, you may be asked to provide photos or videos to help us assess the issue quickly.

Once your claim is approved, our Customer Service team will issue you a Return Authorisation (RMA) number and provide detailed instructions. After authorisation, it is your responsibility to ensure the product is securely packaged to prevent any damage during transit. All faulty returns are thoroughly inspected by our service department within six business days of their arrival.

 

Change of Mind Returns
We accept returns for "change of mind" within 30 days of delivery. To qualify, the item must be in good working order and a condition suitable for resale, and it must be ready for collection. Please note that a 20% handling and cancellation fee will be applied, and any approved return will be issued as store credit, which will not include the original shipping costs`
}