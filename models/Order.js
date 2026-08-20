const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String }, // 🔥 Added direct email for reliable dispatch
    orderType: { type: String, enum: ["product", "service"], default: "service" },
    orderItems: [
      {
        name: { type: String },
        price: { type: Number },
        quantity: { type: Number, default: 1 },
        planId: { type: String },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
      },
    ],
    // Session mode support: 'video', 'audio', ya 'chat'
    sessionMode: {
      type: String,
      enum: ["video", "audio", "chat"],
      default: "video",
    },
    serviceDetails: {
      planId: { type: String },
      planName: { type: String },
      durationInSeconds: { type: Number, default: 1800 }, // Default 30 mins
      sessionStartTime: { type: Date },
      sessionEndTime: { type: Date },
    },
    shippingAddress: { type: Object },
    paymentMethod: { type: String, required: true },
    // QR / UTR manual payment details ke liye
    paymentDetails: {
      utrNumber: { type: String },
      paymentGateway: { type: String },
    },
    totalAmount: { type: Number, required: true },
    razorpayOrderId: { type: String },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    orderStatus: { type: String, default: "pending" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Orders", orderSchema);
module.exports = Order;