const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const SUPPORT_EMAIL = "team@thehittinglog.com";
const FROM_EMAIL = "The Hitting Log Support <team@thehittinglog.com>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_SUBJECTS = new Set([
  "General Question",
  "Technical Issue",
  "Billing",
  "Feature Request",
  "Bug Report",
  "Other",
]);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRequestBody(req) {
  if (!req.body || typeof req.body !== "string") {
    return req.body || {};
  }

  try {
    return JSON.parse(req.body);
  } catch (error) {
    return {};
  }
}

function sendJson(res, statusCode, payload) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(statusCode).json(payload);
}

function buildTextEmail({ name, email, subject, message }) {
  return `Name: ${name}

Email: ${email}

Subject: ${subject}

Message:
${message}`;
}

function buildHtmlEmail({ name, email, subject, message }) {
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Support Request</title></head>
<body style="margin:0;padding:24px;background:#f3eadb;color:#07324f;font-family:Trebuchet MS,Segoe UI,Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid rgba(7,50,79,0.22);border-radius:20px;">
    <h1 style="margin:0 0 24px;font-size:26px;">New Support Request</h1>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p style="margin-bottom:8px;"><strong>Message:</strong></p>
    <div style="line-height:1.6;">${safeMessage}</div>
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { success: false, error: "Method not allowed." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error("Support email configuration error: RESEND_API_KEY is missing.");
    return sendJson(res, 500, { success: false, error: "Email service is not configured." });
  }

  const body = getRequestBody(req);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const submissionId = String(body.submissionId || "").trim();

  if (body.website) {
    return sendJson(res, 200, { success: true });
  }

  if (!name || !email || !subject || !message) {
    return sendJson(res, 400, { success: false, error: "All support fields are required." });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return sendJson(res, 400, { success: false, error: "A valid email address is required." });
  }

  if (!SUPPORT_SUBJECTS.has(subject)) {
    return sendJson(res, 400, { success: false, error: "A valid support subject is required." });
  }

  if (name.length > 120 || message.length > 5000) {
    return sendJson(res, 400, { success: false, error: "Support message is too long." });
  }

  const supportRequest = { name, email, subject, message };
  const idempotencyKey = /^[a-zA-Z0-9_-]{8,128}$/.test(submissionId)
    ? `support-${submissionId}`
    : "";

  try {
    const resendResponse = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: SUPPORT_EMAIL,
        reply_to: email,
        subject: `[Support] ${subject}`,
        html: buildHtmlEmail(supportRequest),
        text: buildTextEmail(supportRequest),
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Support email delivery failed:", resendResponse.status, resendError.slice(0, 500));
      return sendJson(res, 502, { success: false, error: "Unable to send support email." });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("Support email request failed:", error.message);
    return sendJson(res, 500, { success: false, error: "Unable to send support email." });
  }
};
