import nodemailer from 'nodemailer';

export async function sendMail({ to, subject, text }) {
  // 1) Brevo over HTTPS: works on Render's free plan
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME || 'Smart Attendance', email: process.env.MAIL_FROM_EMAIL },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    return;
  }

  // 2) Plain SMTP: only works on your laptop (blocked on Render's free plan)
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return;
  }

  // 3) Nothing configured: print the email in the server logs
  console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
}