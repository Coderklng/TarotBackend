const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Kis user ne transaction kiya hai
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Kis order ke liye payment hui hai
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Payment Gateway Details
    paymentGateway: {
      type: String,
      required: true,
      enum: ["razorpay", "stripe", "cod"],
    },

    // Gateway specific payment tracking IDs
    paymentId: {
      type: String, // Razorpay payment_id ya Stripe intent_id
      required: function () {
        return this.paymentGateway !== "cod";
      },
    },

    orderId: {
      type: String, // Razorpay order_id ya Stripe session_id
    },

    signature: {
      type: String, // Razorpay verification signature
    },

    // Payment Info
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },

    // Error details agar payment fail hoti hai
    errorDetails: {
      code: { type: String },
      description: { type: String },
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);