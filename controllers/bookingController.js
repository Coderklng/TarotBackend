const mongoose = require("mongoose");
const sendEmail = require("../config/mailer");
const Order = require("../models/Order");

const createBooking = async (req, res) => {
  try {
    const { 
      serviceName, 
      date = new Date().toLocaleDateString(), 
      time = "As per schedule", 
      notes = "",
      amount,
      paymentId,
      orderId,
      existingOrderId,
      paymentMethod,
      email,
      name,
      mode // Default fallback
    } = req.body;

    // Mode Sanitization
    const validModes = ["video", "audio", "chat"];
    const sanitizedMode = validModes.includes(mode?.toLowerCase()) ? mode.toLowerCase() : "video";

    const targetOrderId = orderId || existingOrderId;
    
    // Payment Method & Status Resolution
    const detectedPaymentMethod = paymentMethod 
      ? paymentMethod.toLowerCase() 
      : (notes?.includes("UTR") || paymentId?.toString().length === 12 ? "qr" : "razorpay");

    // User Details Extraction
    const userId = req.user ? (req.user._id || req.user.id) : (req.body.userId || null);
    
    const userEmail = (
      email || 
      req.body.userEmail || 
      req.user?.email
    )?.toLowerCase()?.trim();

    const userName = name || req.body.userName || (req.user ? (req.user.name || req.user.username) : 'Valued Client');

    if (!userEmail) {
      console.error('❌ Booking failed: User email missing in request body and token');
      return res.status(400).json({
        success: false,
        message: 'User email is required to process booking.'
      });
    }

    let newOrder = null;

    // 1. Existing Order Check & Update
    if (targetOrderId && mongoose.Types.ObjectId.isValid(targetOrderId)) {
      newOrder = await Order.findById(targetOrderId);
      if (newOrder) {
        newOrder.isPaid = true;
        newOrder.paidAt = new Date();
        newOrder.orderStatus = 'active';
        newOrder.paymentMethod = detectedPaymentMethod;
        newOrder.sessionMode = sanitizedMode; // Save mode to DB
        
        if (paymentId) {
          if (detectedPaymentMethod === "razorpay") {
            newOrder.razorpayOrderId = paymentId;
          } else {
            newOrder.paymentDetails = {
              ...(newOrder.paymentDetails || {}),
              utrNumber: paymentId,
              paymentGateway: "qr"
            };
          }
        }
        await newOrder.save();
      }
    }

    // 2. New Order Creation
    if (!newOrder) {
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Valid User ID is required to create a new order.'
        });
      }

      newOrder = await Order.create({
        user: userId,
        orderType: "service",
        paymentMethod: detectedPaymentMethod,
        totalAmount: amount || 0,
        isPaid: true,
        paidAt: new Date(),
        orderStatus: "active",
        sessionMode: sanitizedMode, // Save mode in DB schema
        razorpayOrderId: detectedPaymentMethod === "razorpay" ? (paymentId || "") : "",
        paymentDetails: detectedPaymentMethod === "qr" ? { utrNumber: paymentId, paymentGateway: "qr" } : {},
        serviceDetails: {
          planName: serviceName || "Tarot Reading Session",
          planId: "service-booking"
        }
      });
    }

    // 3. Dynamic Session URL Generator
    const frontendUrl = process.env.FRONTEND_URL || '';
    
    // Mode-based Direct Route
    let sessionPath = '/chats/user';
    if (sanitizedMode === 'video') sessionPath = '/video';
    if (sanitizedMode === 'audio') sessionPath = '/audio';

    const sessionLink = `${frontendUrl}${sessionPath}?orderId=${newOrder._id}&mode=${sanitizedMode}`;

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();

    console.log(`📩 Dispatching Emails -> Client: [${userEmail}] | Admin: [${adminEmail}] | Mode: [${sanitizedMode}]`);

    // EMAIL 1: CLIENT MAIL
    const clientSubject = `🔮 Your Tarot Session Link (${sanitizedMode.toUpperCase()}) - ${serviceName || 'Tarot Reading'}`;
    const clientText = `Hello ${userName},\n\nYour booking for ${serviceName || 'Tarot Reading'} is confirmed.\n\nJoin ${sanitizedMode.toUpperCase()} Session: ${sessionLink}`;
    
    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #07040d; color: #ffffff; border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.2);">
        <h2 style="color: #fbbf24; text-align: center;">🔮 Live Tarot Session Confirmed!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Thank you for booking with us. Your session link is active now:</p>
        
        <div style="background-color: rgba(147, 51, 234, 0.15); padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(168, 85, 247, 0.3);">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName || 'Tarot Reading'}</p>
          <p style="margin: 5px 0;"><strong>Session Mode:</strong> ${sanitizedMode.toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${detectedPaymentMethod.toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Payment Ref/UTR:</strong> ${paymentId || 'N/A'}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${sessionLink}" target="_blank" style="background: linear-gradient(to right, #f59e0b, #d97706); color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px; display: inline-block;">
            🚀 Join ${sanitizedMode.toUpperCase()} Session
          </a>
        </div>
      </div>
    `;

    try {
      await sendEmail(userEmail, clientSubject, clientText, clientHtml);
    } catch (mailErr) {
      console.error('⚠️ Client Email sending failed:', mailErr.message);
    }

    // EMAIL 2: ADMIN MAIL
    if (adminEmail && userEmail !== adminEmail) {
      const adminSubject = `🚨 New Booking Received: ${userName} (${sanitizedMode.toUpperCase()})`;
      const adminText = `Admin Alert!\n\nNew booking confirmed by ${userName} (${userEmail}).\nOrder ID: ${newOrder._id}\nMode: ${sanitizedMode}\nMonitor Link: ${sessionLink}`;
      
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #4f46e5; margin-top: 0;">👑 Admin Control - New Booking Alert</h2>
          <p>A new service session has been booked on the platform.</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          
          <h3 style="color: #334155;">Customer Overview:</h3>
          <ul>
            <li><strong>Name:</strong> ${userName}</li>
            <li><strong>Email:</strong> ${userEmail}</li>
            <li><strong>Order ID:</strong> ${newOrder._id}</li>
          </ul>

          <h3 style="color: #334155;">Booking Details:</h3>
          <ul>
            <li><strong>Service:</strong> ${serviceName || 'Tarot Reading'}</li>
            <li><strong>Requested Mode:</strong> ${sanitizedMode.toUpperCase()}</li>
            <li><strong>Scheduled Date:</strong> ${date}</li>
            <li><strong>Scheduled Time:</strong> ${time}</li>
            <li><strong>Payment Method:</strong> ${detectedPaymentMethod.toUpperCase()}</li>
            <li><strong>Payment Ref / UTR:</strong> ${paymentId || 'N/A'}</li>
          </ul>

          <div style="margin-top: 25px;">
            <a href="${sessionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
              👑 Host / Monitor Live Session
            </a>
          </div>
        </div>
      `;

      try {
        await sendEmail(adminEmail, adminSubject, adminText, adminHtml);
      } catch (adminMailErr) {
        console.error('⚠️ Admin Email sending failed:', adminMailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created and notification emails dispatched successfully!',
      orderId: newOrder._id,
      paymentMethod: detectedPaymentMethod,
      mode: sanitizedMode,
      sessionLink
    });

  } catch (error) {
    console.error('❌ Critical Error in createBooking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process booking',
      error: error.message
    });
  }
};

module.exports = { createBooking };