const Razorpay = require("razorpay");
const Stripe = require("stripe");
const crypto = require("crypto");
const Transaction = require("../models/Payment");
const Order = require("../models/Order");

// Safe Razorpay Instance Initialization
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

// Safe Stripe Instance Initialization
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "dummy_key");

/////////////////////////////////
// 1. CREATE PAYMENT ORDER / INTENT
/////////////////////////////////
const createPaymentOrder = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication failed. Please login again.",
      });
    }

    const { 
      amount, 
      planName, 
      planId, 
      paymentGateway, 
      orderType, 
      orderItems, 
      serviceDetails 
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    let gateway = (paymentGateway || "razorpay").toLowerCase().trim();

    if (gateway === "qr" || gateway === "upi" || gateway === "manual_upi") {
      gateway = "razorpay";
    }

    let finalOrderItems = [];
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      finalOrderItems = orderItems;
    } else {
      finalOrderItems = [
        {
          name: planName || serviceDetails?.planName || "Tarot Reading Session",
          price: amount,
          quantity: 1,
          planId: planId || serviceDetails?.planId || "basic",
        },
      ];
    }

    const finalServiceDetails = serviceDetails || {
      planId: planId || "basic",
      planName: planName || "Tarot Reading Session",
      durationInSeconds: 1800,
    };

    const newOrder = await Order.create({
      user: req.user._id,
      orderType: orderType || "service",
      orderItems: finalOrderItems,
      serviceDetails: finalServiceDetails,
      totalAmount: amount,
      paymentMethod: gateway,
      isPaid: false,
    });

    // CASE A: RAZORPAY GATEWAY
    if (gateway === "razorpay") {
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `receipt_${newOrder._id}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      return res.status(200).json({
        success: true,
        gateway: "razorpay",
        orderId: newOrder._id,
        _id: newOrder._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order: newOrder,
      });
    }

    // CASE B: STRIPE GATEWAY
    if (gateway === "stripe") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "inr",
        metadata: {
          orderId: newOrder._id.toString(),
          userId: req.user._id.toString(),
        },
      });

      return res.status(200).json({
        success: true,
        gateway: "stripe",
        orderId: newOrder._id,
        _id: newOrder._id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        order: newOrder,
      });
    }

    return res.status(400).json({ success: false, message: "Invalid payment gateway" });
  } catch (error) {
    console.error("Create Payment Order Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 2. VERIFY RAZORPAY PAYMENT
/////////////////////////////////
const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User authentication failed." });
    }

    const {
      orderId,
      order: legacyOrderKey,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const targetOrderId = orderId || legacyOrderKey;

    if (!targetOrderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required for verification.",
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required Razorpay parameters.",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummy_secret")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findById(targetOrderId);
      
      if (order) {
        // 💡 Session time calculation added
        const startTime = new Date();
        const duration = order.serviceDetails?.durationInSeconds || 1800;
        const endTime = new Date(startTime.getTime() + duration * 1000);

        order.isPaid = true;
        order.paidAt = startTime;
        order.orderStatus = "active";
        
        if (!order.serviceDetails) order.serviceDetails = {};
        order.serviceDetails.sessionStartTime = startTime;
        order.serviceDetails.sessionEndTime = endTime;

        order.paymentResult = {
          id: razorpay_payment_id,
          status: "success",
          update_time: Date.now().toString(),
        };
        await order.save();
      }

      const transaction = await Transaction.create({
        user: req.user._id,
        order: targetOrderId,
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
        message: "Razorpay payment verified successfully",
        transaction,
      });
    } else {
      await Transaction.create({
        user: req.user._id,
        order: targetOrderId,
        paymentGateway: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "failed",
        errorDetails: {
          code: "SIGNATURE_MISMATCH",
          description: "Razorpay verification failed",
        },
      });

      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Verify Razorpay Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 3. VERIFY STRIPE PAYMENT
/////////////////////////////////
const verifyStripePayment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User authentication failed." });
    }

    const { orderId, order: legacyOrderKey, paymentIntentId } = req.body;
    const targetOrderId = orderId || legacyOrderKey;

    if (!targetOrderId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and PaymentIntent ID are required.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      const order = await Order.findById(targetOrderId);
      if (order) {
        // 💡 Session time calculation added
        const startTime = new Date();
        const duration = order.serviceDetails?.durationInSeconds || 1800;
        const endTime = new Date(startTime.getTime() + duration * 1000);

        order.isPaid = true;
        order.paidAt = startTime;
        order.orderStatus = "active";

        if (!order.serviceDetails) order.serviceDetails = {};
        order.serviceDetails.sessionStartTime = startTime;
        order.serviceDetails.sessionEndTime = endTime;

        order.paymentResult = {
          id: paymentIntent.id,
          status: "succeeded",
          update_time: Date.now().toString(),
        };
        await order.save();
      }

      const transaction = await Transaction.create({
        user: req.user._id,
        order: targetOrderId,
        paymentGateway: "stripe",
        paymentId: paymentIntent.id,
        amount: order ? order.totalAmount : 0,
        currency: paymentIntent.currency.toUpperCase(),
        status: "success",
      });

      return res.status(200).json({
        success: true,
        message: "Stripe payment verified successfully",
        transaction,
      });
    } else {
      return res.status(400).json({ success: false, message: "Payment not completed yet" });
    }
  } catch (error) {
    console.error("Verify Stripe Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 4. CREATE MANUAL UPI ORDER (QR Code / Direct UTR)
/////////////////////////////////
const createManualUpiOrder = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "User authentication failed." });
    }

    const { amount, planName, planId, utrNumber } = req.body;

    if (!amount || !utrNumber) {
      return res.status(400).json({ success: false, message: "Amount and UTR number are required." });
    }

    const cleanUtr = utrNumber.toString().trim();
    if (cleanUtr.length !== 12 || !/^\d+$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        message: "Invalid UTR number. Must be a 12-digit numeric reference.",
      });
    }

    const existingTxn = await Transaction.findOne({ paymentId: cleanUtr });
    if (existingTxn) {
      return res.status(400).json({
        success: false,
        message: "This UTR number has already been submitted for another order.",
      });
    }

    const newOrder = await Order.create({
      user: req.user._id,
      orderType: "service",
      orderItems: [
        {
          name: planName || "Tarot Reading Session",
          price: amount,
          quantity: 1,
          planId: planId || "basic",
        },
      ],
      serviceDetails: {
        planId: planId || "basic",
        planName: planName || "Tarot Reading Session",
        durationInSeconds: 3600,
      },
      totalAmount: amount,
      paymentMethod: "upi_manual",
      isPaid: false,
      orderStatus: "pending_verification",
    });

    const transaction = await Transaction.create({
      user: req.user._id,
      order: newOrder._id,
      paymentGateway: "manual_upi",
      paymentId: cleanUtr,
      amount: amount,
      currency: "INR",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Payment submitted successfully. Pending admin approval.",
      orderId: newOrder._id,
      transaction,
    });
  } catch (error) {
    console.error("Create Manual UPI Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 5. APPROVE MANUAL PAYMENT (Admin Endpoint)
/////////////////////////////////
const approveManualPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const startTime = new Date();
    const duration = order.serviceDetails?.durationInSeconds || 3600;
    const endTime = new Date(startTime.getTime() + duration * 1000);

    order.isPaid = true;
    order.paidAt = startTime;
    order.orderStatus = "active"; // Updated to active
    
    if (!order.serviceDetails) order.serviceDetails = {};
    order.serviceDetails.sessionStartTime = startTime;
    order.serviceDetails.sessionEndTime = endTime;
    await order.save();

    await Transaction.findOneAndUpdate(
      { order: order._id },
      { status: "success" }
    );

    return res.status(200).json({
      success: true,
      message: "Order approved & chat session activated successfully.",
      order,
    });
  } catch (error) {
    console.error("Approve Payment Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 6. GET ALL TRANSACTIONS (Admin Dashboard)
/////////////////////////////////
const getAllPayments = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Get All Payments Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  verifyRazorpayPayment,
  verifyStripePayment,
  createManualUpiOrder,
  approveManualPayment,
  getAllPayments,
};