const Order = require("../models/Order");
const Product = require("../models/Product");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const sendEmail = require("../config/mailer");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

const sentEmailCache = new Map();

/////////////////////////////////
// HELPER: BUILD SESSION LINK
/////////////////////////////////
const generateSessionLink = (orderId, mode) => {
  const frontendUrl = process.env.FRONTEND_URL || "";
  let routePath = "/chats/user";
  
  if (mode === "video") {
    routePath = "/video";
  } else if (mode === "audio") {
    routePath = "/audio";
  }
  
  return `${frontendUrl}${routePath}?orderId=${orderId}&mode=${mode}`;
};

/////////////////////////////////
// HELPER: DISPATCH CONFIRMATION EMAILS
/////////////////////////////////
const sendBookingEmails = async (order, paymentRef) => {
  try {
    const userEmail = order.userEmail || (order.user ? order.user.email : null);
    const userName = order.user ? (order.user.name || order.user.username) : "Valued Client";
    const serviceName = order.serviceDetails?.planName || "Tarot Reading Session";

    if (!userEmail) {
      console.log("⚠️ No user email found for order:", order._id);
      return;
    }

    const cacheKey = `${order._id}-${userEmail.toLowerCase()}`;
    const now = Date.now();
    if (sentEmailCache.has(cacheKey)) {
      const lastSentTime = sentEmailCache.get(cacheKey);
      if (now - lastSentTime < 5 * 60 * 1000) {
        console.log(`⚠️ Duplicate email prevented for order ${order._id} to ${userEmail}`);
        return;
      }
    }
    sentEmailCache.set(cacheKey, now);

    const mode = order.sessionMode || "video";
    let modeText = "Live Chat";
    if (mode === "video") modeText = "Live Video Session";
    else if (mode === "audio") modeText = "Live Audio Session";

    const sessionLink = generateSessionLink(order._id, mode);
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();

    // 1. CLIENT EMAIL
    const clientSubject = `🔮 Your Tarot ${modeText} Link - ${serviceName}`;
    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #07040d; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #fbbf24; text-align: center;">🔮 Live Session Confirmed!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your booking for <strong>${serviceName}</strong> (${modeText}) is ready.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${sessionLink}" target="_blank" style="background: linear-gradient(to right, #f59e0b, #d97706); color: #000; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 10px; display: inline-block;">
            🔗 Join ${modeText}
          </a>
        </div>
        <p style="font-size: 12px; color: #a1a1aa; text-align: center;">
          Direct link: <a href="${sessionLink}" style="color: #fbbf24;">${sessionLink}</a>
        </p>
      </div>
    `;
    await sendEmail(userEmail, clientSubject, `Join Session: ${sessionLink}`, clientHtml);
    console.log(`✅ Client email successfully sent to: ${userEmail}`);

    // 2. ADMIN EMAIL
    if (adminEmail && userEmail.toLowerCase() !== adminEmail) {
      const adminCacheKey = `${order._id}-${adminEmail}`;
      if (!sentEmailCache.has(adminCacheKey) || (now - sentEmailCache.get(adminCacheKey) > 5 * 60 * 1000)) {
        sentEmailCache.set(adminCacheKey, now);
        
        const adminSubject = `🚨 New Booking Confirmed: ${userName} (${serviceName} - ${modeText})`;
        const adminHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 12px;">
            <h2 style="color: #4f46e5;">👑 Admin Control - Session Booking Alert</h2>
            <p><strong>Customer Name:</strong> ${userName}</p>
            <p><strong>Customer Email:</strong> ${userEmail}</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Mode Selected:</strong> ${modeText}</p>
            <p><strong>Payment Ref:</strong> ${paymentRef || "N/A"}</p>
            <hr />
            <div style="margin-top: 20px;">
              <a href="${sessionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                👑 Host / Monitor Live Session
              </a>
            </div>
          </div>
        `;
        await sendEmail(adminEmail, adminSubject, `Booking by ${userName}`, adminHtml);
        console.log(`✅ Admin alert email sent to: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error("⚠️ Error in sendBookingEmails helper:", err.message);
  }
};

/////////////////////////////////
// 1. CREATE NEW ORDER
/////////////////////////////////
const createOrder = async (req, res) => {
  try {
    const {
      orderType,
      orderItems,
      serviceDetails,
      shippingAddress,
      paymentMethod,
      totalAmount,
      amount,
      planName,
      planId,
      paymentGateway,
      mode,
      sessionMode,
    } = req.body;

    const finalAmount = totalAmount || amount;
    const finalPaymentMethod = paymentMethod || paymentGateway || "razorpay";
    const finalOrderType = orderType || "service";
    const finalSessionMode = mode || sessionMode || "video";

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const constructedServiceDetails = serviceDetails || {
      planId: planId || "basic",
      planName: planName || "Tarot Reading Session",
      durationInSeconds: serviceDetails?.durationInSeconds || 1800,
    };

    let finalOrderItems = orderItems || [
      {
        name: constructedServiceDetails.planName || "Tarot Reading Session",
        price: finalAmount,
        quantity: 1,
        planId: constructedServiceDetails.planId || "basic",
      },
    ];

    let razorpayOrderId = null;
    if (finalPaymentMethod === "razorpay") {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });
      razorpayOrderId = rzpOrder.id;
    }

    const order = new Order({
      user: req.user._id,
      orderType: finalOrderType,
      sessionMode: finalSessionMode,
      orderItems: finalOrderItems,
      serviceDetails: finalOrderType === "service" ? constructedServiceDetails : undefined,
      shippingAddress,
      paymentMethod: finalPaymentMethod,
      totalAmount: finalAmount,
      razorpayOrderId,
      isPaid: false,
    });

    const createdOrder = await order.save();

    return res.status(201).json({
      success: true,
      orderId: createdOrder._id,
      _id: createdOrder._id,
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      razorpayOrderId: razorpayOrderId,
      order: createdOrder,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 2. VERIFY RAZORPAY PAYMENT
/////////////////////////////////
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummy_secret")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findById(orderId || req.body.orderId).populate("user");
      
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const wasAlreadyPaid = order.isPaid;

      order.isPaid = true;
      order.paidAt = order.paidAt || Date.now();
      order.orderStatus = "active";
      order.paymentResult = {
        id: razorpay_payment_id,
        status: "success",
        update_time: Date.now(),
      };

      await order.save();

      if (!wasAlreadyPaid) {
        try {
          await sendBookingEmails(order, razorpay_payment_id);
        } catch (emailErr) {
          console.error("Email dispatch failed:", emailErr);
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: "Payment verified successfully",
        isPaid: true,
        orderId: order._id,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 3. UPDATE SESSION MODE & MANUAL EMAIL OVERRIDE
/////////////////////////////////
const updateSessionMode = async (req, res) => {
  try {
    const { orderId, order_id, mode, date, time, customerEmail, customerPhone } = req.body;
    const targetOrderId = orderId || order_id;

    if (!targetOrderId || !mode) {
      return res.status(400).json({ success: false, message: "Order ID and Mode are required" });
    }

    const order = await Order.findById(targetOrderId).populate("user");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.sessionMode = mode;
    if (date) order.bookingDate = date;
    if (time) order.bookingTime = time;
    
    if (customerEmail && customerEmail.trim() !== "") {
      order.userEmail = customerEmail.trim();
    }
    if (customerPhone && customerPhone.trim() !== "") {
      order.customerPhone = customerPhone.trim();
    }
    
    await order.save();

    const sessionLink = generateSessionLink(order._id, mode);

    try {
      await sendBookingEmails(order, order.paymentResult?.id || order.utrNumber || "Direct-Session-Setup");
    } catch (emailErr) {
      console.error("Email dispatch warning in updateSessionMode:", emailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Session mode updated & email dispatched successfully",
      sessionMode: order.sessionMode,
      sessionLink: sessionLink,
    });
  } catch (error) {
    console.error("Update Session Mode Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 4. SUBMIT MANUAL UTR
/////////////////////////////////
const submitUTR = async (req, res) => {
  try {
    const { orderId, utrNumber } = req.body;

    if (!utrNumber || utrNumber.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Valid UTR is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.utrNumber = utrNumber.trim();
    order.paymentStatus = "pending_verification";
    await order.save();

    return res.status(200).json({ success: true, message: "UTR submitted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 5. ADMIN APPROVE UTR
/////////////////////////////////
const verifyUTRByAdmin = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId).populate("user");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (status === "approved") {
      const wasAlreadyPaid = order.isPaid;
      order.isPaid = true;
      order.paymentStatus = "completed";
      order.orderStatus = "active";
      order.paidAt = order.paidAt || Date.now();
      await order.save();

      if (!wasAlreadyPaid) {
        try {
          await sendBookingEmails(order, `UTR-${order.utrNumber}`);
        } catch (emailErr) {
          console.error("Email dispatch warning:", emailErr);
        }
      }

      return res.status(200).json({ success: true, message: "Payment approved & email dispatched." });
    } else {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ success: false, message: "Payment rejected." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 6. START CHAT / CALL SESSION
/////////////////////////////////
const startChatSession = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.isPaid) {
      return res.status(402).json({ success: false, message: "Payment required!" });
    }

    return res.status(200).json({
      success: true,
      message: "Session active",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 7. GET MY ORDERS
/////////////////////////////////
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 8. GET ORDER BY ID
/////////////////////////////////
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 9. GET ALL ORDERS (ADMIN)
/////////////////////////////////
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id name email").sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/////////////////////////////////
// 10. UPDATE ORDER STATUS (ADMIN)
/////////////////////////////////
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.orderStatus = orderStatus || order.orderStatus;
    const updatedOrder = await order.save();
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  updateSessionMode,
  submitUTR,
  verifyUTRByAdmin,
  startChatSession,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};