
import { GoogleGenAI, Type } from "@google/genai";
import { ExpiryAnalysis } from "../types";

/**
 * 分析食品包裝日期
 * 支援單張照片識別多個商品，並偵測相對保存期限
 */
export const analyzeExpiry = async (base64Image: string, mode: 'fast' | 'deep' | 'radar' = 'fast'): Promise<ExpiryAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const isRadar = mode === 'radar';
  const modelName = mode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp';

  const prompt = isRadar
    ? `【極速雷達模式】掃描圖片中的「有效日期/EXP」。忽略其他文字。輸出繁體中文 JSON 陣列。包含 productName 與 expiryDate。`
    : `
    你是一位極速食品標籤掃描助手。這張圖片可能包含【一個或多個】食品包裝。
    1. 【多商品偵測】：識別圖片中所有獨立食品及其日期標籤。
    2. 【日期抓取】：提取「製造日期(MFG)」與「有效日期(EXP)」。支援民國年、和曆、西洋年。
    3. 【相對期限】：抓取「保存期限：X個月/天」填入 storageDuration。
    返回 JSON 陣列 [{}, {}]。輸出語系：繁體中文。
  `;

  // 根據模式縮減 Schema
  const properties: any = {
    isFoodProduct: { type: Type.BOOLEAN },
    productName: { type: Type.STRING },
    expiryDate: { type: Type.STRING }
  };

  if (!isRadar) {
    Object.assign(properties, {
      origin: { type: Type.STRING },
      manufactureDate: { type: Type.STRING },
      storageDuration: { type: Type.STRING },
      isExpired: { type: Type.BOOLEAN },
      rawTextFound: { type: Type.STRING },
      confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
      summary: { type: Type.STRING },
      dateAmbiguityWarning: { type: Type.STRING }
    });
  }

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties,
        required: ["isFoodProduct", "productName"]
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
