import nodemailer from "nodemailer";

const isEmailEnabled = () => {
  const flag = process.env.EMAIL_ENABLED;
  if (!flag) return true;
  return flag.toLowerCase() !== "false";
};

const getTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

export interface OrderItemEmailLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderConfirmedEmailPayload {
  to: string;
  customerName?: string | null;
  orderId: string;
  address: string;
  totalAmount: number;
  items: OrderItemEmailLine[];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (amount: number) => amount.toFixed(2);

const buildOrderConfirmedEmail = (payload: OrderConfirmedEmailPayload) => {
  const greetingName = payload.customerName?.trim() ? payload.customerName.trim() : "Customer";
  const subject = `Your order is confirmed (#${payload.orderId.slice(0, 8)})`;

  const itemLinesText = payload.items
    .map((item) => `- ${item.name} x${item.quantity} @ $${formatMoney(item.unitPrice)}`)
    .join("\n");

  const text =
    `Hi ${greetingName},\n\n` +
    `Good news: your order has been confirmed.\n\n` +
    `Order: #${payload.orderId}\n` +
    `Shipping address: ${payload.address}\n\n` +
    `Items:\n${itemLinesText}\n\n` +
    `Total: $${formatMoney(payload.totalAmount)}\n\n` +
    `Thank you for shopping with MediStore.`;

  const itemRows = payload.items
    .map(
      (item) =>
        `<tr>` +
        `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name)}</td>` +
        `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>` +
        `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${formatMoney(item.unitPrice)}</td>` +
        `</tr>`
    )
    .join("");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#f8fafc; padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 20px;background:linear-gradient(135deg,#d1fae5,#ecfdf5);border-bottom:1px solid #e2e8f0;">
          <h1 style="margin:0;font-size:18px;color:#065f46;">Order Confirmed</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#064e3b;">Your MediStore order is now confirmed.</p>
        </div>
        <div style="padding:20px;">
          <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">Hi <strong>${escapeHtml(greetingName)}</strong>,</p>
          <p style="margin:0 0 14px;font-size:14px;color:#334155;">Good news: your order has been confirmed.</p>

          <div style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;margin-bottom:14px;">
            <div style="font-size:12px;color:#64748b;">Order ID</div>
            <div style="font-size:13px;color:#0f172a;font-weight:600;">#${escapeHtml(payload.orderId)}</div>
            <div style="height:10px;"></div>
            <div style="font-size:12px;color:#64748b;">Shipping Address</div>
            <div style="font-size:13px;color:#0f172a;">${escapeHtml(payload.address)}</div>
          </div>

          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#334155;">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#334155;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#334155;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:13px;color:#64748b;">Total</div>
            <div style="font-size:16px;color:#065f46;font-weight:800;">$${formatMoney(payload.totalAmount)}</div>
          </div>

          <p style="margin:18px 0 0;font-size:12px;color:#64748b;">Payment: Cash on Delivery</p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
};

const sendOrderConfirmedEmail = async (payload: OrderConfirmedEmailPayload) => {
  if (!isEmailEnabled()) return { skipped: true } as const;

  const from = process.env.SMTP_FROM;
  const transport = getTransport();

  if (!from || !transport) {
    return { skipped: true } as const;
  }

  const { subject, text, html } = buildOrderConfirmedEmail(payload);

  await transport.sendMail({
    from,
    to: payload.to,
    subject,
    text,
    html,
  });

  return { ok: true } as const;
};

export const emailService = {
  sendOrderConfirmedEmail,
};
