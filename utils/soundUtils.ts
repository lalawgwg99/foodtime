
/**
 * 使用瀏覽器內建 Web Audio API 合成音效
 * 避免依賴外部音頻檔案，確保在任何環境都能正常運作
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // 確保 Context 是啟動狀態 (現代瀏覽器安全性要求)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

/**
 * 在使用者第一次互動時呼叫，解除瀏覽器音效鎖定
 */
export const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
};

/**
 * 播放掃描成功的短音 (Beep)
 */
export const playScanSound = () => {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 高音 A5

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01); // 提高音量到 0.4
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
        console.warn("Audio play failed:", e);
    }
};

/**
 * 播放偵測到過期的警示音 (Alert)
 */
export const playAlertSound = () => {
    try {
        const ctx = getAudioContext();

        // 雙音節警示
        [0, 0.2].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square'; // 方波較具有侵略性，適合警示
            osc.frequency.setValueAtTime(440, ctx.currentTime + delay); // 低音 A4

            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.01); // 提高音量到 0.3
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.2);
        });
    } catch (e) {
        console.warn("Audio play failed:", e);
    }
};
