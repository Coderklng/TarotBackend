const { Resend } = require('resend');

// Resend ko API Key ke sath initialize kiya
const resend = new Resend(process.env.RESEND_API_KEY);

// Resend HTTP API use karta hai, isliye SMTP verify ki zaroorat nahi hai.
console.log('🚀 Resend Email Service is ready');

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const data = await resend.emails.send({
      // Free testing ke liye 'onboarding@resend.dev' use hota hai
      from: 'Kripalini Tarot <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: text,
      ...(html && { html }),
    });

    console.log('📧 Email sent successfully via Resend:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error.message);
    throw error;
  }
};

module.exports = sendEmail;