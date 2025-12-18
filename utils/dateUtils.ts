
export interface ExpiryStatus {
    label: string;
    color: 'red' | 'orange' | 'emerald' | 'slate';
    days: number | null;
    type: 'expired' | 'soon' | 'safe' | 'unknown';
}

export const getDynamicStatus = (expiryDateStr: string | null): ExpiryStatus => {
    if (!expiryDateStr) return { label: '未知', color: 'slate', days: null, type: 'unknown' };

    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: '已過期', color: 'red', days: diffDays, type: 'expired' };
    } else if (diffDays <= 7) {
        return { label: `即將過期 (${diffDays}天內)`, color: 'orange', days: diffDays, type: 'soon' };
    } else {
        return { label: `保存期限內 (${diffDays}天)`, color: 'emerald', days: diffDays, type: 'safe' };
    }
};

export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};
