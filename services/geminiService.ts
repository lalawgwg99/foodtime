
import { GoogleGenAI, Type } from "@google/genai";
import { ExpiryAnalysis } from "../types";

/**
 * 分析食品包裝日期
 * 降階至 gemini-2.0-flash-exp 以提供超低延遲的辨識體驗
 * 並支持快速 (Fast) 與 深度 (Deep) 模式切換
 */
export const analyzeExpiry = async (base64Image: string, mode: 'fast' | 'deep' = 'fast'): Promise<ExpiryAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Flash 2.0 提供毫秒級響應，適合批量掃描
  const modelName = mode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const prompt = `
    你是一位極速食品標籤掃描助手，精通台灣、日本、美國等各國日期格式。
    
    【核心任務】
    1. 【過濾】若非食品包裝，將 isFoodProduct 設為 false。
    2. 【辨識】精準抓取「製造日期(MFG)」與「有效日期(EXP)」。
       - 支援台灣民國年 (113 -> 2024)。
       - 支援日本和曆 (R06 -> 2024)。
       - 處理 YY/MM/DD 或 MM/DD/YY 的模糊性。
    3. 【轉換】統一輸出西元 YYYY-MM-DD。
    4. 【搜尋與思考】${mode === 'deep' ? '請使用搜尋與深度思考來解決模糊日期。' : '請基於視覺直覺快速判斷。'}

    輸出語系：繁體中文。請確保 JSON 格式精確。
  `;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        isFoodProduct: { type: Type.BOOLEAN, description: "是否為食品或相關商品包裝" },
        productName: { type: Type.STRING, description: "辨識出的產品名稱" },
        origin: { type: Type.STRING, description: "產地或可能的製造國" },
        manufactureDate: { type: Type.STRING, description: "西元格式製造日期 (YYYY-MM-DD)" },
        expiryDate: { type: Type.STRING, description: "西元格式有效日期 (YYYY-MM-DD)" },
        isExpired: { type: Type.BOOLEAN, description: "是否已過期" },
        daysRemaining: { type: Type.NUMBER, description: "剩餘天數" },
        rawTextFound: { type: Type.STRING, description: "包裝上看到的原始日期字串" },
        confidence: { type: Type.STRING, enum: ["high", "medium", "low"], description: "信心度" },
        summary: { type: Type.STRING, description: "辨識邏輯總結" },
        dateAmbiguityWarning: { type: Type.STRING, description: "針對日期格式模糊的警告說明" }
      },
      required: ["isFoodProduct"]
    }
  };

  // 只有在深層模式下才開啟思考與搜尋，以追求極速
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

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text) as ExpiryAnalysis;

    if (!result.isFoodProduct) {
      throw new Error("這似乎不是食品包裝。");
    }

    // 只有 Deep 模式才有 Grounding Sources
    if (mode === 'deep') {
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        result.groundingSources = chunks
          .filter(chunk => chunk.web)
          .map(chunk => ({
            title: chunk.web?.title || '標記參考',
            uri: chunk.web?.uri || ''
          }));
      }
    }

    return result;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "日期解析失敗。");
  }
};
