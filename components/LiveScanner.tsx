
import React, { useRef, useEffect, useState } from 'react';
import { analyzeExpiry } from '../services/geminiService';
import { ExpiryAnalysis } from '../types';
import { playScanSound, playAlertSound } from '../utils/soundUtils';

interface LiveScannerProps {
    onCapture: (results: ExpiryAnalysis[]) => void;
    onClose: (finalResults: ExpiryAnalysis[]) => void;
}

const LiveScanner: React.FC<LiveScannerProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [capturedCount, setCapturedCount] = useState(0);
    const [showPlusOne, setShowPlusOne] = useState(false);
    const [plusText, setPlusText] = useState('');
    const [seenProducts] = useState(new Set<string>());
    const [allCapturedResults, setAllCapturedResults] = useState<ExpiryAnalysis[]>([]);
    const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
            }
        };

        startCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Frame Capture Loop
    useEffect(() => {
        if (!isScanning) return;

        const interval = setInterval(async () => {
            // 不再阻塞，允許並發發送
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context && video.videoWidth > 0) {
                    // 降低解析度到 640px 以節省流量與提高速度
                    const scale = 640 / video.videoWidth;
                    canvas.width = 640;
                    canvas.height = video.videoHeight * scale;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const base64Image = canvas.toDataURL('image/jpeg', 0.5); // 降低品質

                    // 非阻塞異步調用 (Fire and forget concurrent process)
                    (async () => {
                        try {
                            setIsAnalyzingFrame(true);
                            const results = await analyzeExpiry(base64Image, 'radar');

                            if (results && results.length > 0) {
                                const newItems: ExpiryAnalysis[] = [];
                                results.forEach(res => {
                                    const uniqueKey = `${res.productName}-${res.expiryDate || res.storageDuration}`;
                                    if (!seenProducts.has(uniqueKey) && (res.expiryDate || res.storageDuration)) {
                                        seenProducts.add(uniqueKey);
                                        newItems.push(res);
                                    }
                                });

                                if (newItems.length > 0) {
                                    playScanSound();
                                    if (newItems.some(item => item.isExpired)) playAlertSound();

                                    setCapturedCount(prev => prev + newItems.length);
                                    setPlusText(`+${newItems.length}`);
                                    setShowPlusOne(true);
                                    setTimeout(() => setShowPlusOne(false), 800);

                                    setAllCapturedResults(prev => [...prev, ...newItems]);
                                    onCapture(newItems);
                                }
                            }
                        } catch (err) {
                            console.warn("Radar scan skip:", err);
                        } finally {
                            // 這裡的狀態僅用於指示「目前後台有任務在跑」
                            setIsAnalyzingFrame(false);
                        }
                    })();
                }
            }
        }, 1300); // 縮短到 1.3 秒連發

        return () => clearInterval(interval);
    }, [isScanning, seenProducts, onCapture]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* 觀景窗 */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                />

                {/* 頂部控制與狀態列 (確保不會被底部手勢條擋住) */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
                    <div className="flex flex-col gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isAnalyzingFrame ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                            <span className="text-white text-[10px] font-black tracking-widest uppercase">
                                {isAnalyzingFrame ? 'AI 辨識中' : '雷達掃描中'}
                            </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/10 flex flex-col items-center">
                            <span className="text-white/60 text-[8px] font-bold uppercase tracking-tighter">已捕獲</span>
                            <span className="text-white text-xl font-black tabular-nums">{capturedCount}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setIsScanning(false);
                            onClose(allCapturedResults);
                        }}
                        className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white px-5 py-3 rounded-2xl shadow-xl transition-all flex items-center gap-2 font-black text-sm border border-white/20"
                    >
                        <i className="fas fa-check-circle"></i> 結束看報告
                    </button>
                </div>

                {/* 掃描線動畫 */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-move opacity-50"></div>
                </div>

                {/* +N 動效 */}
                {showPlusOne && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-emerald-400 text-7xl font-black animate-float-up-fade drop-shadow-[0_0_15px_rgba(52,211,153,0.9)]">
                            {plusText}
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* 底部導引提示 (非點擊區，避免手勢遮擋) */}
            <div className="bg-slate-900/90 backdrop-blur-sm px-6 py-6 flex flex-col items-center">
                <p className="text-slate-400 text-[11px] font-medium text-center">
                    將相機對準商品標籤自動捕捉。<br />完成後點擊右上角「結束」按鈕。
                </p>
            </div>

            <style>{`
        @keyframes scan-move {
          0% { transform: translateY(0vh); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan-move {
          animation: scan-move 3s linear infinite;
        }
        @keyframes float-up-fade {
          0% { transform: translateY(20px); opacity: 0; scale: 0.8; }
          20% { opacity: 1; scale: 1.2; }
          100% { transform: translateY(-100px); opacity: 0; scale: 1; }
        }
        .animate-float-up-fade {
          animation: float-up-fade 1s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default LiveScanner;
