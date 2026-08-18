const express = require('express');
const ReviewRouter = express.Router();
const Reviews = require('../models/Review');
const {protect} = require("../middlewares/authMiddleware");

// New Review Add Karna
ReviewRouter.post('/add',protect, async (req, res) => {
  try {
    const { orderId, userId, astrologerId, rating, comment } = req.body;
    
    // Check agar pehle se review hai toh update karein ya error dein
    const newReview = new Reviews({ orderId, userId, astrologerId, rating, comment });
    await newReview.save();
    
    res.status(201).json({ success: true, message: "Review added successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Astrologer ke reviews fetch karna
ReviewRouter.get('/:astrologerId',protect, async (req, res) => {
  const reviews = await Reviews.find({ astrologerId: req.params.astrologerId });
  res.json(reviews);
});

module.exports = ReviewRouter;
