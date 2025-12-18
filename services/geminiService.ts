
import { GoogleGenAI, Type } from "@google/genai";
import { ExpiryAnalysis } from "../types";

/**
 * 分析食品包裝日期
 * 升級至 gemini-3-pro-preview 以應對複雜的國際日期格式與模糊比對需求
 */
export const analyzeExpiry = async (base64Image: string): Promise<ExpiryAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 使用 Pro 模型以處理複雜的邏輯推理、國際格式與模糊比對
  // 依照指令：複雜任務使用 Pro 並設置 thinkingBudget
  const modelName = 'gemini-3-pro-preview';
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const prompt = `
    你是一位享譽國際的食品標籤專家，精通全球各國（尤其是台灣、日本、美國、歐洲、東南亞）的日期標示規範。
    
    【核心任務】
    1. 【過濾非食品】首先檢查圖片內容。如果這不是食品包裝或有期限的商品（例如：它是收據、訂單、文件、風景、純雜物），請將 isFoodProduct 設為 false 並停止進一步分析。
    
    2. 【產地與格式分析】識別商品產地。根據產地慣例判斷日期格式：
       - 台灣：常見民國年 (如 113.10.20) 或 西元年。
       - 日本：常見 西元年 或 和曆 (如 R06.10.20)。
       - 美國：常用 MM/DD/YYYY (月/日/年)。
       - 歐洲/澳洲：常用 DD/MM/YYYY (日/月/年)。
       - 若日期僅為 6 位或 8 位數字 (如 250506)，請進行模糊比對與邏輯推理（考慮年份、月份合理性）。

    3. 【日期提取與轉換】
       - 尋找「製造日期」(MFG/PROD) 與「有效日期」(EXP/Best Before/Use By)。
       - 民國年轉換：民國 yyy + 1911 = 西元 YYYY。
       - 統一輸出西元格式：YYYY-MM-DD。

    4. 【模糊比對與搜尋】
       - 若日期格式不明（如 05/06/25），請使用 Google 搜尋該品牌或產地的日期標示習慣，並給出最可能的判斷。
       - 在 summary 中解釋你的推理過程。
       - 若存在多種合理解釋，請在 dateAmbiguityWarning 中說明並提出警示。

    5. 【狀態判斷】根據今天日期 (${todayStr}) 判斷是否過期。

    輸出語系：繁體中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        // 開啟思考模式以應對複雜的日期推理
        thinkingConfig: { thinkingBudget: 32768 },
        // 開啟搜尋以查證國際品牌標示習慣
        tools: [{ googleSearch: {} }],
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
            summary: { type: Type.STRING, description: "辨識邏輯總結（含格式判斷依據）" },
            dateAmbiguityWarning: { type: Type.STRING, description: "針對日期格式模糊的警告說明" }
          },
          required: ["isFoodProduct"]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text) as ExpiryAnalysis;

    if (!result.isFoodProduct) {
      throw new Error("這似乎不是食品包裝，系統已自動跳過。");
    }

    // 提取搜尋來源（若有）
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      result.groundingSources = chunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || '標籤標示參考',
          uri: chunk.web?.uri || ''
        }));
    }

    return result;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "日期解析失敗。請確認拍照角度清晰，且日期未被遮擋。");
  }
};
