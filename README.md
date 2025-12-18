<div align="center">
<img width="1200" height="475" alt="食安速查官 PRO" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 食安速查官 AI Pro (v1.1.0 AR)

### Designed by 德

</div>

專為極速辨識食品有效日期而設計的 AI 工具。支援 **AR 連續攝影**、多商品偵測、以及民國年/日式/西洋年格式自動轉換。

## 🚀 核心特色 (v1.1.0)

- **AR 連續攝影雷達 (最強功能)**：開啟後不需按快門，掃過貨架自動捕捉並發出「嗶」聲，畫面上即時顯示 **+N** 捕獲動效。
- **極速 Flash 模式**：採用 Gemini 2.0 Flash，單張辨識僅需 1-3 秒。
- **多商品辨識**：單張照片可同時偵測多個商品的日期標籤。
- **相對期限提醒**：自動偵測「保存期限：12個月」等非明確日期標示並彈出警示。
- **音效與警示**：辨識成功有「嗶」聲，過期商品有專屬警報音。

## 🛠️ 本地開發

**準備工作：** Node.js

1. **安裝依賴**:

   ```bash
   npm install
   ```

2. **設定 API Key**:
   在 `.env.local` 檔案中設定 `GEMINI_API_KEY` (或在 Cloudflare 設置環境變數)。
3. **啟動專案**:

   ```bash
   npm run dev
   ```

## ☁️ 部署至 Cloudflare Pages

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `GEMINI_API_KEY` (必填)

---
*Designed with ❤️ by 德*
