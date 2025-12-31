import { saveChatMessage } from '../fireStore/chatSession';
import { OPENAI_API_KEY, OPENAI_VERSION } from './access';
import { addMessage, buildOpenAIInput, getFirstMessage, getSession, getShippingPolicy, shoudShowDelivery, updateSystemMessage } from "./chatSession";
import { getShippingCost } from './getShippingCost';
import { readGuideline } from './guideline';
import { openai } from './openaiPreloadProductQuestions';

function fromJson(text: any) {
      // \\n → real line breaks
      return text?.replace(/\\n/g, "\n") ?? "";
    }
export async function chat(request: any) {
    const { sessionId, message} = request.body;
    console.log(request)
    if (!sessionId || !message) {
        return request?.status(400).json({ error: "Missing sessionId or message" });
    }

    let firstMessage = await getFirstMessage();

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

    const content = await readGuideline();
    const data = JSON.parse(content);

    const getShippingCostDefinition = {
        name: "getShippingCost",
        description: fromJson(data.text2),
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


