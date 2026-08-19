const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse'); // 👈 Added for reading PDF text
const { admin, db, storage } = require('../lib/firebaseAdmin');

// Multer setup (Memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// 📁 File Upload, Text Extraction & Send Message Endpoint
router.post('/orders/:orderId/upload-file', upload.single('kundliFile'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const file = req.file;
    const { text, senderId } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // 🔮 1. Extract text if file is a PDF
    let extractedText = "";
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text || "";
      } catch (pdfErr) {
        console.error("⚠️ PDF Parse Error:", pdfErr);
        extractedText = "Could not extract text from PDF automatically.";
      }
    } else {
      extractedText = "Image uploaded. Text extraction pending or manual review required.";
    }

    // 2. Firebase Storage bucket reference
    const bucket = storage.bucket();
    const fileName = `kundli_files/${orderId}_${Date.now()}_${file.originalname}`;
    const fileRef = bucket.file(fileName);

    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', (error) => {
      console.error("❌ Storage Upload Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    });

    stream.on('finish', async () => {
      await fileRef.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // 3. Save message + File URL + Extracted Text in Firestore
      const messageData = {
        text: text ? `${text}\n[Attachment: ${file.originalname}]` : `[Attached File: ${file.originalname}]`,
        fileUrl: publicUrl,
        fileName: file.originalname,
        extractedKundliText: extractedText, // 👈 Yeh raha extracted text jo UI mein render hoga!
        senderId: senderId || 'user_client',
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db
        .collection('chats')
        .doc(orderId)
        .collection('messages')
        .add(messageData);

      return res.status(200).json({
        success: true,
        message: "File uploaded, text extracted, and saved successfully!",
        fileUrl: publicUrl,
        extractedKundliText: extractedText,
        messageId: docRef.id
      });
    });

    stream.end(file.buffer);

  } catch (err) {
    console.header("❌ Server Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;