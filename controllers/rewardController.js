const User = require('../models/Users'); // Tumhara User model

// Wheel ke available prizes (Frontend se sync rakhna)
const REWARDS = [
  { id: 1, label: 'Free 1-Card Reading', type: 'free_reading' },
  { id: 2, label: '10% Off Coupon', type: 'discount_10' },
  { id: 3, label: 'Cosmic Energy (Try Again)', type: 'try_again' },
  { id: 4, label: 'Free Full Reading', type: 'free_full_reading' },
  { id: 5, label: '5% Off Coupon', type: 'discount_5' },
  { id: 6, label: 'Mystic Blessing', type: 'blessing' },
];

// @desc    Spin the wheel & deduct token
// @route   POST /api/rewards/spin
// @access  Private
const spinWheel = async (req, res) => {
  try {
    const userId = req.user._id; // protect middleware se milega

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Check tokens (agar user schema mein tokens field nahi hai toh default 0 maan lo)
    const currentTokens = user.tokens !== undefined ? user.tokens : 1;

    if (currentTokens <= 0) {
      return res.status(400).json({ 
        status: false, 
        message: "You don't have enough spin tokens! Book a reading to earn more." 
      });
    }

    // Deduct 1 token
    user.tokens = currentTokens - 1;
    await user.save();

    // Random reward select karo
    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    const wonPrize = REWARDS[randomIndex];

    // Optional: Tum jeete hue reward ko user ke history/coupons mein bhi save kar sakte ho

    return res.status(200).json({
      status: true,
      message: 'Spin successful!',
      prize: wonPrize,
      remainingTokens: user.tokens
    });

  } catch (error) {
    console.error("Spin Controller Error:", error);
    return res.status(500).json({ status: false, message: 'Server error during spin process' });
  }
};

module.exports = { spinWheel };