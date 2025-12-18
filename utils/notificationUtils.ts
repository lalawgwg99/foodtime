
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
        alert("此瀏覽器不支援通知功能");
        return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
        new Notification("通知服務已啟用", { body: "商品即將過期時會主動發送警報。" });
        return true;
    }
    return false;
};

export const sendUrgentNotification = (count: number) => {
    if (Notification.permission === "granted") {
        new Notification("食安即時警報", {
            body: `您有 ${count} 件商品狀態異常（過期或即將過期），請開啟清單查看。`,
        });
    }
};
