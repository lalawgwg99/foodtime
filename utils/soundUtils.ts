
/**
 * 使用瀏覽器內建 Web Audio API 合成音效
 * 避免依賴外部音頻檔案，確保在任何環境都能正常運作
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
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
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
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
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.15);
        });
    } catch (e) {
        console.warn("Audio play failed:", e);
    }
};
