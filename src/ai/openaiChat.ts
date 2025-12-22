import { saveChatMessage } from '../fireStore/chatSession';
import { OPENAI_API_KEY, OPENAI_VERSION } from './access';
import { addMessage, buildOpenAIInput, getFirstMessage, getSession, getShippingPolicy, shoudShowDelivery, updateSystemMessage } from "./chatSession";
import { getShippingCost } from './getShippingCost';
import { openai } from './openaiPreloadProductQuestions';


export async function chat(request: any) {
    const { sessionId, message, productId } = request.body;

    if (!sessionId || !message) {
        return request.status(400).json({ error: "Missing sessionId or message" });
    }

    let firstMessage = getFirstMessage();

    updateSystemMessage(sessionId, firstMessage);
    addMessage(sessionId, "user", message);

    await saveChatMessage(sessionId, "user", message ?? '');

    // if (shoudShowDelivery(sessionId)) {
        
    //     const postcode = extractPostcode(message) ?? '2000';
    //     const shippingPolicy = await getShippingPolicy(productId, postcode);
    //     firstMessage = 'Our shipping cost and methods are : ' + JSON.stringify(shippingPolicy || {}, null, 2) + ' and display the shipping timeline result to the user in a clear, concise manner.';
    //     updateSystemMessage(sessionId, firstMessage);

    // }

    const input: any = buildOpenAIInput(getSession(sessionId));

    const response = await openai.chat.completions.create({
        model: OPENAI_VERSION,
        messages: input,
        functions: [getShippingCostDefinition],
        function_call: "auto",
        max_tokens: 512
    });

    // const resJson = await response.json();

    let assistantText = response.choices[0].message;
    // console.log(resJson)

    if (assistantText.function_call?.name === "getShippingCost") {
        const args = JSON.parse(assistantText.function_call.arguments);

        // 3. Call the real shipping API
        const shippingData = await getShippingCost(args);
        console.log('shippingDatashippingData', shippingData)
        const finalResponse = await openai.chat.completions.create({
            model: OPENAI_VERSION,
            messages: [
                ...input,
                {
                    role: "function",
                    name: "getShippingCost",
                    content: JSON.stringify(shippingData),
                }
            ],
            max_tokens: 512
            });

        // const finalRes = await finalResponse.json();


        assistantText = finalResponse.choices[0].message;

    }

    addMessage(sessionId, "assistant", assistantText.content ?? '');

    await saveChatMessage(sessionId, "assistant", assistantText.content ?? '');

    // console.log(message, assistantText)
    return {
        sessionId,
        answer: assistantText.content
    };
    
}


const getShippingCostDefinition = {
  name: "getShippingCost",
  description: `Shipping cost intent detection rules:

• If a user message mentions delivery, deliver, delivering, shipping, ship, shipped, freight, or postage
  AND the message contains a 4-digit number that matches an Australian New South Wales postcode format,
  automatically treat the message as a request to calculate shipping cost.
• Never ask the user to reconfirm or verify a postcode that matches the valid 4-digit format.
• Only ask for clarification if:
  - The postcode is not 4 digits, OR
  - Multiple different 4-digit numbers appear in the same message, OR
  - The user explicitly says the postcode may be incorrect.

• A valid Australian postcode is exactly 4 digits and may appear anywhere in the message
  (for example: "deliver 2153", "shipping to 2153?", "2153 delivery cost").

• When both conditions are met (delivery-related wording + valid postcode),
  call getShippingCost without asking a follow-up question, unless required parameters are missing.

• If the user requests delivery or shipping cost but does not provide a postcode,
  prompt the user to supply their postcode before calling getShippingCost.`,
  parameters: {
    type: "object",
    properties: {
      sku: {
        type: "string",
        description: "The product SKU identifier"
      },
      postcode: {
        type: "string",
        description: "The postcode to ship or deliver to"
      },
      qty: {
        type: "integer",
        description: "Quantity of items",
        default: 1
      }
    },
    required: ["sku", "postcode"]
  }
};