import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }

});
export async function sendMail(
  to: string | string[],
  subject: string,
  html: string
) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}