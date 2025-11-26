export const smsTemplete = (
    asset: string,
    amount: number,   
    quantity: number,  
    orderId: string
): string => {
    const trimZeros = (s: string) => s.replace(/\.?0+$/, "");
    const fmtQty = trimZeros(quantity.toFixed(8));   
    const fmtAmt = trimZeros(amount.toFixed(2));     
    const shortId = orderId.slice(-6).toUpperCase(); 

    return `Order #${shortId} filled: ${fmtQty} ${asset} • Total ${fmtAmt}. Check Orders in app. If not you, secure your account.`;
};
