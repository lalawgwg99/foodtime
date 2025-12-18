
import { GoogleGenAI, Type } from "@google/genai";
import { ExpiryAnalysis } from "../types";

/**
 * 分析食品包裝日期
 * 支援單張照片識別多個商品，並偵測相對保存期限
 */
export const analyzeExpiry = async (base64Image: string, mode: 'fast' | 'deep' = 'fast'): Promise<ExpiryAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const modelName = mode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp';

  const prompt = `
    你是一位極速食品標籤掃描助手。這張圖片可能包含【一個或多個】食品包裝。
    
    【核心任務】
    1. 【多商品偵測】：識別圖片中出現的所有獨立食品及其日期標籤。
    2. 【日期抓取】：提取「製造日期(MFG)」與「有效日期(EXP)」。支援民國年、和曆、西洋年。
    3. 【相對期限偵測】：如果包裝上只有「保存期限：X個月/天」而沒有印具體的「有效日期」，請務必抓取該資訊並填入 storageDuration。
    4. 【提示邏輯】：若 expiryDate 為空但有 storageDuration，請在 dateAmbiguityWarning 提醒用戶需要手動根據製造日期推算。
    
    【格式規範】：
    - 統一輸出西元 YYYY-MM-DD。
    - 若非食品，請跳過。

    輸出語系：繁體中文。請返回一個 JSON 陣列 [{}, {}]。
  `;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          isFoodProduct: { type: Type.BOOLEAN, description: "是否為食品" },
          productName: { type: Type.STRING, description: "產品名稱" },
          origin: { type: Type.STRING, description: "產地" },
          manufactureDate: { type: Type.STRING, description: "製造日期 (YYYY-MM-DD)" },
          expiryDate: { type: Type.STRING, description: "有效日期 (YYYY-MM-DD)" },
          storageDuration: { type: Type.STRING, description: "保存期限 (如: 12個月)" },
          isExpired: { type: Type.BOOLEAN, description: "是否已過期" },
          rawTextFound: { type: Type.STRING, description: "原始日期文字" },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          summary: { type: Type.STRING, description: "辨識邏輯" },
          dateAmbiguityWarning: { type: Type.STRING, description: "警告或提醒" }
        },
        required: ["isFoodProduct"]
      }
    }
  };

  if (mode === 'deep') {
    config.thinkingConfig = { thinkingBudget: 32768 };
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config
    });

    const text = response.text?.trim() || "[]";
    const results = JSON.parse(text) as ExpiryAnalysis[];

    return results.filter(r => r.isFoodProduct);
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("日期解析失敗。");
  }
};
