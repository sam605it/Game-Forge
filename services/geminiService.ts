
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { INITIAL_SYSTEM_INSTRUCTION } from "../constants";

export class GameForgeService {
  private ai: GoogleGenAI;
  private chat: Chat;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    this.chat = this.ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: INITIAL_SYSTEM_INSTRUCTION,
        temperature: 0.9, 
        topP: 0.95,
      },
    });
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendMessage(prompt: string, retryCount = 0): Promise<{ text: string; code: string | null }> {
    const MAX_RETRIES = 3;
    
    try {
      const response: GenerateContentResponse = await this.chat.sendMessage({ message: prompt });
      const text = response.text || "";
      
      let code: string | null = null;
      const markdownRegex = /```(?:html)?\s*([\s\S]*?)\s*```/gi;
      const matches = [...text.matchAll(markdownRegex)];
      
      if (matches.length > 0) {
        code = matches[matches.length - 1][1];
      } else if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        const htmlMatch = text.match(/([\s\S]*<!DOCTYPE html>[\s\S]*<\/html>)/i);
        code = htmlMatch ? htmlMatch[0] : null;
      }
      
      const cleanText = text.replace(/```(?:html)?[\s\S]*?```/gi, "").trim();
      
      return {
        text: cleanText || "Forging complete! Check the preview.",
        code,
      };
    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${retryCount + 1}):`, error);

      // Handle 429 Rate Limit Errors with Exponential Backoff
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota');
      if (isRateLimit && retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s...
        console.warn(`Quota exceeded. Retrying in ${waitTime}ms...`);
        await this.sleep(waitTime);
        return this.sendMessage(prompt, retryCount + 1);
      }

      throw error;
    }
  }
}
