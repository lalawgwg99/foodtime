
/**
 * 壓縮圖片大小以加快上傳速度
 * @param base64Str 原始 base64 字串
 * @param maxWidth 最大寬度
 * @param quality 壓縮品質 (0.1 - 1.0)
 */
export const compressImage = (base64Str: string, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (e) => reject(e);
    });
};
