import { getProduct } from "../sanity/getProductById";
import { readGuideline } from "./guideline";
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

function fromJson(text: any) {
      // \\n → real line breaks
      return text?.replace(/\\n/g, "\n") ?? "";
    }
export async function getFirstMessage() {
  const content = await readGuideline();
  const data = JSON.parse(content);
    return `
    ${fromJson(data.text3)}

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