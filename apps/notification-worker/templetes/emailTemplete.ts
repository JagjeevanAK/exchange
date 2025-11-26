export const emailTemplate = (
    asset: string,
    amount: number,     
    quantity: number, 
    orderId: string
): { subject: string; text: string; html: string } => {
    const trimZeros = (s: string) => s.replace(/\.?0+$/, "");
    const fmtQty = trimZeros(quantity.toFixed(8));   
    const fmtAmt = trimZeros(amount.toFixed(2));     
    const shortId = orderId.slice(-8).toUpperCase(); 

    const subject = `Order Filled • ${fmtQty} ${asset} • Order ${shortId}`;

    const text = [
        `Your order has been filled.`,
        ``,
        `Order: ${shortId}`,
        `Asset: ${asset}`,
        `Quantity: ${fmtQty}`,
        `Total: ${fmtAmt}`,
        ``,
        `If you did not place this order, secure your account immediately.`,
    ].join("\n");

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Order Filled</title>
  </head>
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f5f7fa;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.06)">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #eef1f6">
          <h1 style="margin:0;font-size:18px;font-weight:600;color:#111827">Order Filled</h1>
          <p style="margin:6px 0 0;color:#6b7280;font-size:14px">Order <strong>#${shortId}</strong> has completed successfully.</p>
        </td>
      </tr>

      <tr>
        <td style="padding:18px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;color:#374151;font-size:14px;width:50%;"><strong>Asset</strong></td>
              <td style="padding:8px 0;color:#111827;font-size:14px;text-align:right">${asset}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#374151;font-size:14px;"><strong>Quantity</strong></td>
              <td style="padding:8px 0;color:#111827;font-size:14px;text-align:right">${fmtQty}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#374151;font-size:14px;"><strong>Total</strong></td>
              <td style="padding:8px 0;color:#111827;font-size:14px;text-align:right">${fmtAmt}</td>
            </tr>
          </table>

          <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.45">
            If you did not place this order, please secure your account immediately (change password, enable 2FA) and contact support.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:14px 24px;background:#fafafa;border-top:1px solid #eef1f6;color:#9ca3af;font-size:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>Order ID: <code style="background:transparent;border:none;color:#6b7280">${orderId}</code></div>
            <div>© ${new Date().getFullYear()} Your Exchange</div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { subject, text, html };
};
