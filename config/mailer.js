const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL, // Is Gmail ID se mail send hoga
    pass: process.env.SMTP_PASSWORD, 
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('🚀 SMTP Server is ready to send emails');
  }
});

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `"Kripalini Tarot" <${process.env.ADMIN_EMAIL}>`, // Fixed: Same variable as auth
      to, // 👈 Target Email (Dynamic)
      subject,
      text,
      ...(html && { html }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully to %s: %s', to, info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

module.exports = sendEmail;