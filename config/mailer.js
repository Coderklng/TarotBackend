const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('🚀 Resend Email Service is ready');

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const data = await resend.emails.send({
      // 🔥 Yahan exact wahi email dalni hai jisse Resend ka account banaya hai
      from: 'Kripalini Tarot <tarotkripalini@gmail.com>',
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
