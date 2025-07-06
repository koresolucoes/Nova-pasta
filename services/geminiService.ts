import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
  // A chave de API DEVE ser fornecida como uma variável de ambiente.
  if (!process.env.API_KEY) {
    throw new Error("A chave de API do Gemini (API_KEY) não está configurada no ambiente.");
  }
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (e) {
  console.error("Falha ao inicializar o cliente Gemini:", e);
  // ai permanece nulo
}


/**
 * Optimizes a given message using the Gemini API.
 * @param message The text message to optimize.
 * @returns A promise that resolves to the optimized message string.
 */
export async function optimizeMessageWithGemini(message: string): Promise<string> {
    if (!ai) {
        throw new Error("O serviço de IA não foi inicializado corretamente. Verifique a chave de API.");
    }

    try {
        const prompt = `
        Você é um especialista em copywriting e marketing para WhatsApp.
        Sua tarefa é otimizar a mensagem a seguir para ser mais clara, concisa, amigável e engajante.
        Mantenha a intenção original da mensagem.
        Adicione emojis apropriados para aumentar o apelo visual, mas sem exagerar.
        Retorne APENAS o texto otimizado, sem nenhuma explicação, introdução ou formatação extra.

        Mensagem original: "${message}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                temperature: 0.7,
                topP: 1,
                topK: 32,
                maxOutputTokens: 256,
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("A resposta da IA estava vazia.");
        }
        
        return text.trim();

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        throw new Error("Não foi possível otimizar a mensagem. Verifique a configuração da API ou tente novamente mais tarde.");
    }
}