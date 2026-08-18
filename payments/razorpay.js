const Razorpay = require("razorpay");
const crypto = require("crypto");
const Transaction = require("../models/Payment");
const Order = require("../models/Order");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/////////////////////////////////
// 1. CREATE RAZORPAY ORDER
/////////////////////////////////
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, planName, planId } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    // 1. Database me Pending Status ke sath Naya Order banao
    const newOrder = await Order.create({
      user: req.user._id, // Auth middleware se user ID
      totalAmount: amount,
      isPaid: false,
      planDetails: {
        planId,
        planName,
      },
    });

    // 2. Razorpay Order options
    const options = {
      amount: Math.round(amount * 100), // Paise me convert
      currency: "INR",
      receipt: `receipt_${newOrder._id}`,
    };

    // 3. Razorpay Server par order create karo
    const razorpayOrder = await razorpay.orders.create(options);

    // 4. Response me dono IDs bhej do
    res.status(200).json({
      success: true,
      orderId: newOrder._id, // DB Order ID
      razorpayOrderId: razorpayOrder.id, // Razorpay Order ID
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 2. VERIFY RAZORPAY PAYMENT
/////////////////////////////////
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      orderId, // Mongoose Order ID
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment Genuine: DB Order Status update karo
      const order = await Order.findById(orderId);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: razorpay_payment_id,
          status: "success",
          update_time: Date.now().toString(),
        };
        await order.save();
      }

      // Transaction Collection Entry
      const transaction = await Transaction.create({
        user: req.user._id,
        order: orderId,
        paymentGateway: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        amount: order ? order.totalAmount : 0,
        currency: "INR",
        status: "success",
      });

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        transaction,
      });
    } else {
      // Verification Failed
      await Transaction.create({
        user: req.user._id,
        order: orderId,
        paymentGateway: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "failed",
        errorDetails: {
          code: "SIGNATURE_MISMATCH",
          description: "Payment verification failed",
        },
      });

      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};