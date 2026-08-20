const express = require('express');
const ReviewRouter = express.Router();
const Reviews = require('../models/Review');
const { protect } = require("../middlewares/authMiddleware");

// 1. New Review Add Karna (Protected)
ReviewRouter.post('/add', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Auth middleware se logged-in user ki ID mil jayegi
    const userId = req.user._id;

    const newReview = new Reviews({ 
      userId, 
      rating, 
      comment 
    });
    
    await newReview.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Review added successfully!" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Saare Reviews fetch karna ya user ke hisaab se (Optional)
ReviewRouter.get('/all', async (req, res) => {
  try {
    const reviews = await Reviews.find({})
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      reviews 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = ReviewRouter;