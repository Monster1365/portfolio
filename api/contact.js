// Vercel Serverless Function: POST /api/contact
// Sends contact form submissions to the site owner's inbox via Resend.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY      Resend API key
//   CONTACT_TO_EMAIL    Inbox that receives contact messages (never exposed to the browser)
// Optional:
//   CONTACT_FROM_EMAIL  Sender, e.g. "Portfolio <contact@your-domain.com>" (domain must be verified in Resend).
//                       Defaults to Resend's test sender, which can only deliver to your Resend account email.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 100, email: 254, message: 5000 };

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const readBody = (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
    console.error("Missing RESEND_API_KEY or CONTACT_TO_EMAIL environment variable");
    return res.status(500).json({ error: "Server is not configured" });
  }

  const body = readBody(req);

  // Honeypot: real users never fill this hidden field.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: "이름, 이메일, 메시지를 모두 입력해주세요." });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "올바른 이메일 주소를 입력해주세요." });
  }
  if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message) {
    return res.status(400).json({ error: "입력 내용이 너무 깁니다." });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>",
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `[Portfolio Contact] ${name.replace(/[\r\n]+/g, " ")}`,
        text: `이름: ${name}\n이메일: ${email}\n\n${message}`,
        html: `
          <h2>포트폴리오 사이트에서 새 연락이 도착했습니다</h2>
          <p><strong>이름:</strong> ${safeName}</p>
          <p><strong>이메일:</strong> ${safeEmail}</p>
          <hr />
          <p>${safeMessage}</p>
        `,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend API error:", response.status, detail);
      return res.status(502).json({ error: "메일 전송에 실패했습니다." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Contact handler error:", error);
    return res.status(500).json({ error: "메일 전송 중 오류가 발생했습니다." });
  }
};
