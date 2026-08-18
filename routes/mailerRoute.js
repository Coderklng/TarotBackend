const express = require("express");
const mailerRoutes = express.Router();
const sendEmail = require("../config/mailer");

mailerRoutes.post("/mail", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    // Validation Check
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: "Please provide 'to', 'subject', and 'text' or 'html' content.",
      });
    }

    // Call mailer function
    const info = await sendEmail(to, subject, text, html);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully!",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Route Error in /mail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
});

module.exports = mailerRoutes;