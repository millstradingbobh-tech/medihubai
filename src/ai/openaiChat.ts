import { OPENAI_API_KEY } from './access';
import { addMessage, buildOpenAIInput, getFirstMessage, getSession, updateSystemMessage } from "./chatSession";


export async function chat(request: any) {
    const { sessionId, message } = request.body;

    if (!sessionId || !message) {
        return request.status(400).json({ error: "Missing sessionId or message" });
    }

    const firstMessage = getFirstMessage();

    updateSystemMessage(sessionId, firstMessage);
    addMessage(sessionId, "user", message);

    const input = buildOpenAIInput(getSession(sessionId));

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            input,
            max_output_tokens: null,
            truncation: "auto"
        }),
    });

    const resJson = await response.json();

    const assistantText =
        resJson.output_text ??
        resJson.output?.[0]?.content?.[0]?.text ??
        "";

    addMessage(sessionId, "assistant", assistantText);


    return {
        sessionId,
        answer: assistantText
    };
    
}
