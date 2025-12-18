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

    console.log(message, assistantText)
    return {
        sessionId,
        answer: assistantText.content
    };
    
}


const getShippingCostDefinition = {
  name: "getShippingCost",
  description: "Fetch shipping cost for a product SKU and postcode",
  parameters: {
    type: "object",
    properties: {
      sku: {
        type: "string",
        description: "The product SKU identifier"
      },
      postcode: {
        type: "string",
        description: "The postcode to ship to"
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