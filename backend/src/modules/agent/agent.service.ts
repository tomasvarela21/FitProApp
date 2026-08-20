import { GoogleGenAI, Content } from "@google/genai";
import { agentConfig } from "./agent.config";
import { SYSTEM_PROMPT } from "./agent.prompt";
import { conversationStore } from "./conversation-store";
import { functionDeclarations, executeTool, ToolContext } from "./agent.tools";

const MAX_TOOL_ITERATIONS = 10;

let ai: GoogleGenAI | null = null;

const getClient = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: agentConfig.GEMINI_API_KEY });
  }
  return ai;
};

const todayAR = () =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

/**
 * Corre un turno completo del agente: mensaje del trainer → loop de
 * function calling con Gemini → texto final para Telegram.
 */
export async function runAgentTurn(
  trainerUserId: string,
  chatId: string,
  trainerName: string,
  userText: string
): Promise<string> {
  const ctx: ToolContext = { trainerUserId, chatId };

  const history: Content[] = conversationStore.get(chatId).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const contextLine = `[Contexto: hoy es ${todayAR()}. Entrenador: ${trainerName}]`;
  const contents: Content[] = [
    ...history,
    { role: "user", parts: [{ text: `${contextLine}\n${userText}` }] },
  ];

  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await getClient().models.generateContent({
      model: agentConfig.AGENT_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations }],
      },
    });

    const calls = response.functionCalls;

    if (!calls || calls.length === 0) {
      finalText = response.text ?? "";
      break;
    }

    const modelContent = response.candidates?.[0]?.content;
    if (!modelContent) break;
    contents.push(modelContent);

    const responseParts = await Promise.all(
      calls.map(async (call) => ({
        functionResponse: {
          name: call.name ?? "",
          response: {
            result: await executeTool(
              ctx,
              call.name ?? "",
              (call.args ?? {}) as Record<string, unknown>
            ),
          },
        },
      }))
    );
    contents.push({ role: "user", parts: responseParts });
  }

  if (!finalText.trim()) {
    finalText =
      "No pude completar la consulta, probá reformularla o escribí /nueva para empezar de cero.";
  }

  conversationStore.append(chatId, { role: "user", text: userText });
  conversationStore.append(chatId, { role: "model", text: finalText });

  return finalText;
}
