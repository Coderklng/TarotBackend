// Stripe SDK ko Secret Key se initialize kar rahe hain
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Models Import
const Transaction = require("../models/Payment");
const Order = require("../models/Order");

/////////////////////////////////
// 1. CREATE STRIPE PAYMENT INTENT
/////////////////////////////////
// Endpoint: POST /api/transactions/stripe/create-payment-intent
// Access: Private (Logged-in User)
const createStripePaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Database se Order fetch kar rahe hain
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Stripe amount humesha lowest currency unit mein leta hai
    // e.g., INR ya USD mein cents/paise (1 INR = 100 Paise)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "inr", // Ya "usd" aapke project requirements ke hisab se
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Frontend (React/Flutter) ko client_secret bhej rahe hain payment complete karne ke liye
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 2. VERIFY / CONFIRM STRIPE PAYMENT
/////////////////////////////////
// Endpoint: POST /api/transactions/stripe/verify
// Access: Private (Logged-in User)
const verifyStripePayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    // Stripe server se PaymentIntent ka status fetch kar rahe hain
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check karo ki payment real mein success hui hai ya nahi
    if (paymentIntent.status === "succeeded") {
      // 1. Order table status update karo
      const order = await Order.findById(orderId);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          update_time: Date.now().toString(),
        };
        await order.save();
      }

      // 2. Transaction collection mein record save karo
      const transaction = await Transaction.create({
        user: req.user._id,
        order: orderId,
        paymentGateway: "stripe",
        paymentId: paymentIntent.id,
        amount: order ? order.totalAmount : paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: "success",
      });

      return res.status(200).json({
        success: true,
        message: "Stripe payment verified successfully",
        transaction,
      });
    } else {
      // Payment incomplete ya failed status
      await Transaction.create({
        user: req.user._id,
        order: orderId,
        paymentGateway: "stripe",
        paymentId: paymentIntentId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: "failed",
        errorDetails: {
          code: paymentIntent.status,
          description: "Stripe payment intent not succeeded",
        },
      });

      return res.status(400).json({
        success: false,
        message: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createStripePaymentIntent,
  verifyStripePayment,
};