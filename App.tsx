
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeExpiry } from './services/geminiService';
import { AppState, ExpiryAnalysis, ScannedProduct } from './types';
import { getDynamicStatus } from './utils/dateUtils';
import { requestNotificationPermission, sendUrgentNotification } from './utils/notificationUtils';
import { compressImage } from './utils/imageUtils';

// Components
import ScannerHeader from './components/ScannerHeader';
import ResultCard from './components/ResultCard';
import LiveScanner from './components/LiveScanner'; // 新增
import { playScanSound, playAlertSound, unlockAudio } from './utils/soundUtils';

const STORAGE_KEY = 'taiwan_food_expiry_history_v2';
const NOTIFICATION_KEY = 'taiwan_food_notif_enabled';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const notif = localStorage.getItem(NOTIFICATION_KEY);
    return {
      batchResults: [],
      isAnalyzing: false,
      error: null,
      view: 'scanner',
      savedProducts: saved ? JSON.parse(saved) : [],
      notificationsEnabled: notif === 'true',
      liveScanResults: [] // 新增
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedProducts));
    localStorage.setItem(NOTIFICATION_KEY, state.notificationsEnabled.toString());
  }, [state.savedProducts, state.notificationsEnabled]);

  const handleNotificationToggle = async () => {
    if (!state.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) setState(prev => ({ ...prev, notificationsEnabled: true }));
    } else {
      setState(prev => ({ ...prev, notificationsEnabled: false }));
    }
  };

  const triggerNotifications = useMemo(() => {
    return () => {
      if (!state.notificationsEnabled || Notification.permission !== "granted") return;
      const urgentProducts = state.savedProducts.filter(p => {
        const status = getDynamicStatus(p.expiryDate);
        return status.type === 'expired' || status.type === 'soon';
      });
      if (urgentProducts.length > 0) {
        sendUrgentNotification(urgentProducts.length);
      }
    };
  }, [state.notificationsEnabled, state.savedProducts]);

  useEffect(() => {
    if (state.view === 'history') triggerNotifications();
  }, [state.view, triggerNotifications]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      batchResults: [],
      analysisProgress: `0 / ${fileArray.length}`
    }));

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const progress = `${i + 1} / ${fileArray.length}`;
      setState(prev => ({ ...prev, analysisProgress: progress }));

      try {
        const results = await new Promise<ExpiryAnalysis[] | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64 = reader.result as string;
              const compressedBase64 = await compressImage(base64);
              const analysisArray = await analyzeExpiry(compressedBase64, 'fast');
              resolve(analysisArray);
            } catch (err) {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

        if (results && results.length > 0) {
          // 播放掃描音效
          playScanSound();

          // 若偵測到過期商品，播放警示音
          if (results.some(r => r.isExpired)) {
            playAlertSound();
          }

          setState(prev => ({
            ...prev,
            batchResults: [...prev.batchResults, ...results]
          }));
        }
      } catch (err) {
        console.warn("File processing error:", err);
      }
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      error: prev.batchResults.length === 0 && fileArray.length > 0
        ? "未辨識到任何食品標籤。請確保拍攝的是商品的日期資訊區。"
        : null
    }));
  };

  const saveToHistory = (analysis: ExpiryAnalysis) => {
    const newProduct: ScannedProduct = { ...analysis, id: crypto.randomUUID(), scannedAt: Date.now() };
    setState(prev => ({
      ...prev,
      savedProducts: [newProduct, ...prev.savedProducts],
      batchResults: prev.batchResults.filter(r => r !== analysis)
    }));
  };

  const deleteFromHistory = (id: string) => {
    setState(prev => ({ ...prev, savedProducts: prev.savedProducts.filter(p => p.id !== id) }));
  };

  const updateProduct = (id: string, updates: Partial<ScannedProduct>) => {
    setState(prev => ({
      ...prev,
      savedProducts: prev.savedProducts.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24">
      <ScannerHeader
        view={state.view}
        savedCount={state.savedProducts.length}
        setView={(v) => setState(prev => ({ ...prev, view: v }))}
      />

      {state.view === 'live' && (
        <LiveScanner
          onCapture={(results) => {
            // 背景已處理音效與去重，此處僅更新狀態中累計的 liveScanResults
            setState(prev => ({ ...prev, liveScanResults: [...prev.liveScanResults, ...results] }));
          }}
          onClose={(finalResults) => {
            // 結束後，將結果轉為 batchResults 並切換回普通掃描視圖顯示報告
            setState(prev => ({
              ...prev,
              view: 'scanner',
              batchResults: finalResults,
              liveScanResults: []
            }));
          }}
        />
      )}

      <main className="w-full max-w-md px-4 flex-1">
        {state.view === 'scanner' ? (
          <div className="space-y-6">
            {state.error && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start gap-3">
                <i className="fas fa-info-circle text-amber-600 mt-1"></i>
                <p className="text-amber-800 text-sm font-bold leading-relaxed">{state.error}</p>
              </div>
            )}

            {!state.isAnalyzing && state.batchResults.length === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {/* 左邊：照片模式 */}
                  <div
                    onClick={() => {
                      unlockAudio();
                      fileInputRef.current?.click();
                    }}
                    className="aspect-square bg-white border-2 border-indigo-100 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm"
                  >
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform text-indigo-600 mb-3">
                      <i className="fas fa-camera text-xl"></i>
                    </div>
                    <span className="font-black text-indigo-700 text-sm">拍照/選圖</span>
                    <span className="text-[10px] text-slate-400 mt-1">單張、多圖</span>
                  </div>

                  {/* 右邊：雷達模式 */}
                  <div
                    onClick={() => {
                      unlockAudio();
                      setState(prev => ({ ...prev, view: 'live' }));
                    }}
                    className="aspect-square bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:brightness-110 transition-all group shadow-lg overflow-hidden relative"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform text-white mb-3 z-10">
                      <i className="fas fa-camera-rotate animate-pulse"></i>
                    </div>
                    <span className="font-black text-white text-sm z-10">AR 雷達掃描</span>
                    <span className="text-[10px] text-white/60 mt-1 z-10">連續辨識、嗶嗶記</span>
                    {/* 裝飾 */}
                    <div className="absolute right-[-10%] bottom-[-10%] w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center opacity-30">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest">DESIGNED BY 德</span>
                  <span className="text-[8px] font-mono font-bold text-slate-300">v1.1.0 AR PROTOTYPE</span>
                </div>

                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-4">
                  {/* 使用指南 */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 mb-3">
                      <i className="fas fa-magic text-indigo-500"></i> 極速使用指南
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">1</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          <span className="font-bold text-slate-700">加入主畫面</span>：在手機瀏覽器點選「分享」或「選單」，點擊<span className="text-indigo-600 font-black">「加入主畫面」</span>即可快速生成桌面圖示。
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">2</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          <span className="font-bold text-slate-700">多商品辨識</span>：即使一張照片拍到多個商品，AI 也能自動將它們拆分，不用一張一張分開拍。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 功能亮點 */}
                  <div className="grid grid-cols-2 gap-3 pb-8">
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100/50">
                      <i className="fas fa-bolt text-indigo-500 mb-2"></i>
                      <h4 className="text-[11px] font-black text-slate-800">閃電辨識</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Gemini 2.0 Flash 引擎，一秒抓取日期</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-100/50">
                      <i className="fas fa-layer-group text-emerald-500 mb-2"></i>
                      <h4 className="text-[11px] font-black text-slate-800">萬能相容</h4>
                      <p className="text-[9px] text-slate-400 mt-1">支援民國、日式、歐美等多國格式</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {state.isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative w-20 h-20 mb-8">
                  <div className="absolute inset-0 border-4 border-indigo-50 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-microchip text-indigo-600 animate-pulse"></i>
                  </div>
                </div>
                <p className="font-black text-slate-800 text-lg">AI 正在啟動深度思考模式...</p>
                <p className="text-xs text-indigo-600 mt-2 font-black bg-indigo-50 px-3 py-1 rounded-full animate-pulse">
                  辨識進度：{state.analysisProgress}
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium">切換至 Flash 模式，辨識速度已提升 10 倍</p>
              </div>
            )}

            {state.batchResults.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6 px-1">
                  <h2 className="font-black text-slate-800 text-xl tracking-tight">本次辨識結果</h2>
                  <button onClick={() => setState(prev => ({ ...prev, batchResults: [] }))} className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">取消</button>
                </div>
                {state.batchResults.map(res => (
                  <ResultCard key={res.productName + res.expiryDate} item={res} onSave={saveToHistory} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="font-black text-slate-800 text-xl tracking-tight">我的食安庫存</h2>
              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">提醒功能</span>
                <button onClick={handleNotificationToggle} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none ${state.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${state.notificationsEnabled ? 'translate-x-5.5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            {state.savedProducts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[40px] border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-barcode text-slate-200 text-3xl"></i>
                </div>
                <p className="text-slate-400 font-bold">目前沒有追蹤中的商品</p>
                <button onClick={() => setState(prev => ({ ...prev, view: 'scanner' }))} className="mt-4 text-indigo-600 font-black text-sm hover:underline">去拍一張照片吧！</button>
              </div>
            ) : (
              <div>
                {state.savedProducts.map(product => (
                  <ResultCard
                    key={product.id}
                    item={product}
                    isHistory={true}
                    onDelete={deleteFromHistory}
                    onUpdate={updateProduct}
                  />
                ))}
                <button onClick={() => { if (confirm('確定要徹底清除所有追蹤紀錄嗎？')) setState(prev => ({ ...prev, savedProducts: [] })) }} className="w-full mt-6 py-4 text-slate-300 hover:text-red-400 text-[10px] font-black tracking-[0.2em] transition-colors border-2 border-dashed border-slate-100 rounded-2xl">
                  PURGE ALL RECORDS
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-slate-100 flex justify-center z-50">
        <div className="w-full max-w-md">
          <button onClick={() => fileInputRef.current?.click()} disabled={state.isAnalyzing} className={`w-full ${state.isAnalyzing ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-2xl active:scale-[0.98]'} font-black py-4.5 rounded-[22px] flex items-center justify-center gap-3 transition-all h-16`}>
            {state.isAnalyzing ? (
              <div className="flex items-center gap-2">
                <i className="fas fa-circle-notch animate-spin"></i>
                <span className="text-sm tracking-widest uppercase">Analyzing...</span>
              </div>
            ) : (
              <>
                <i className="fas fa-camera-retro text-xl"></i>
                <span className="text-base tracking-tight">啟動深度日期辨識</span>
              </>
            )}
          </button>
          <div className="mt-3 text-center">
            <a
              href="https://github.com/lalawgwg99/foodtime/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black text-slate-300 hover:text-indigo-500 transition-colors tracking-widest uppercase flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-book-open"></i> View Documentation (README)
            </a>
          </div>
        </div>
      </footer>
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
    </div>
  );
};

export default App;
