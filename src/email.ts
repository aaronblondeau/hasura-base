import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.AUTH_SMTP_HOST,
  port: parseInt(process.env.AUTH_SMTP_PORT || '25'),
  secure: false,
  auth: {
    user: process.env.AUTH_SMTP_USER,
    pass: process.env.AUTH_SMTP_PASS
  }
})

export async function sendEmail (email: string, subject: string, textMessage: string, htmlMessage: string, replyEmail = '') {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_SENDER,
    to: email,
    subject: subject,
    text: textMessage,
    html: htmlMessage,
    replyTo: replyEmail || process.env.EMAIL_SENDER
  })

  console.log('~~ email sent: %s', info.messageId)
}
