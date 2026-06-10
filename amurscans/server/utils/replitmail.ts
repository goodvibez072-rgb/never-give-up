// SMTP email implementation — VPS-compatible replacement for Replit Mail connector
// Configure email by setting these variables in your .env file:
//   SMTP_HOST   — e.g. smtp.gmail.com or mail.your-domain.com
//   SMTP_PORT   — e.g. 587 (STARTTLS) or 465 (SSL)
//   SMTP_USER   — your email login
//   SMTP_PASS   — your email password or app-specific password
//   SMTP_FROM   — sender address, e.g. "AmourScans <noreply@amurscans.com>"
//   SMTP_SECURE — set to "true" for port 465 (SSL), leave blank for STARTTLS
//
// If SMTP is not configured the app still runs — emails are silently skipped
// and a warning is printed to the console.
import { z } from "zod";

export const zSmtpMessage = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe("Recipient email address(es)"),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .describe("CC recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
  attachments: z
    .array(
      z.object({
        filename: z.string().describe("File name"),
        content: z.string().describe("Base64 encoded content"),
        contentType: z.string().optional().describe("MIME type"),
        encoding: z
          .enum(["base64", "7bit", "quoted-printable", "binary"])
          .default("base64"),
      })
    )
    .optional()
    .describe("Email attachments"),
});

export type SmtpMessage = z.infer<typeof zSmtpMessage>;

export async function sendEmail(message: SmtpMessage): Promise<{
  accepted: string[];
  rejected: string[];
  pending?: string[];
  messageId: string;
  response: string;
}> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || "noreply@amurscans.com";
  const smtpSecure = process.env.SMTP_SECURE === "true";

  const recipients = Array.isArray(message.to) ? message.to : [message.to];

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[email] ⚠️  SMTP not configured — email not sent to:", recipients.join(", "));
    console.warn("[email] To enable emails set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
    return {
      accepted: recipients,
      rejected: [],
      messageId: `skipped-${Date.now()}@amurscans.com`,
      response: "Skipped (SMTP not configured)",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
      cc: message.cc
        ? Array.isArray(message.cc)
          ? message.cc.join(", ")
          : message.cc
        : undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : recipients;
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    return {
      accepted,
      rejected,
      messageId: info.messageId || `sent-${Date.now()}@amurscans.com`,
      response: info.response || "250 OK",
    };
  } catch (error) {
    console.error("[email] ❌ SMTP send failed:", error);
    throw error;
  }
}
