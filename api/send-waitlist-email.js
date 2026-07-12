const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "The Hitting Log <hello@thehittinglog.com>";
const SITE_URL = "https://thehittinglog.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendJson(res, statusCode, payload) {
  res.setHeader("Content-Type", "application/json");
  res.status(statusCode).json(payload);
}

function buildHtmlEmail(firstName) {
  const safeFirstName = escapeHtml(firstName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to The Hitting Log Waitlist</title>
</head>
<body style="margin:0;padding:0;background:#f8f4ec;color:#1d3557;font-family:Trebuchet MS,Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f4ec;margin:0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid rgba(29,53,87,0.16);border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(29,53,87,0.10);">
          <tr>
            <td style="background:#1d3557;padding:30px 28px;text-align:center;">
              <div style="color:#f8f4ec;font-size:26px;line-height:1.1;font-weight:900;letter-spacing:0;">The Hitting Log</div>
              <div style="width:44px;height:3px;background:#a91f24;margin:16px auto 0;border-radius:999px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 28px 30px;">
              <h1 style="margin:0 0 18px;color:#1d3557;font-size:30px;line-height:1.08;font-weight:900;">Welcome to the waitlist, ${safeFirstName}.</h1>
              <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.65;">Thanks for joining The Hitting Log waitlist.</p>
              <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.65;">The Hitting Log is a player-first performance and development platform built to help hitters understand what is happening at the plate, not merely record traditional statistics.</p>
              <p style="margin:0 0 24px;color:#333333;font-size:16px;line-height:1.65;">You will be among the first to hear about early access, feature previews, and launch updates.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#1d3557;border-radius:999px;">
                    <a href="${SITE_URL}" style="display:inline-block;padding:14px 22px;color:#f8f4ec;text-decoration:none;font-size:15px;font-weight:900;">Visit The Hitting Log</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#333333;font-size:16px;line-height:1.6;">Riley Vaughan<br><span style="color:#1d3557;font-weight:900;">Founder, The Hitting Log</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTextEmail(firstName) {
  return `Hi ${firstName},

Thanks for joining The Hitting Log waitlist.

The Hitting Log is a player-first performance and development platform built to help hitters understand what is happening at the plate, not merely record traditional statistics.

You will be among the first to hear about early access, feature previews, and launch updates.

Visit The Hitting Log: ${SITE_URL}

Riley Vaughan
Founder, The Hitting Log`;
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { success: false, error: "Method not allowed." });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    sendJson(res, 500, { success: false, error: "Email service is not configured." });
    return;
  }

  const body = getRequestBody(req);
  const firstName = String(body.firstName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  if (!firstName || !email) {
    sendJson(res, 400, { success: false, error: "First name and email are required." });
    return;
  }

  if (!emailPattern.test(email)) {
    sendJson(res, 400, { success: false, error: "A valid email address is required." });
    return;
  }

  try {
    const resendResponse = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "Welcome to The Hitting Log Waitlist",
        html: buildHtmlEmail(firstName),
        text: buildTextEmail(firstName),
      }),
    });

    if (!resendResponse.ok) {
      sendJson(res, 502, { success: false, error: "Unable to send confirmation email." });
      return;
    }

    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 500, { success: false, error: "Unable to send confirmation email." });
  }
};
