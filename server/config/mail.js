import nodemailer from 'nodemailer';

// If SMTP is not configured, the email is printed in the server terminal (handy for development).
export async function sendMail({ to, subject, text }) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
}