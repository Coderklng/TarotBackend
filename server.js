const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

// 1. Load Environment Variables FIRST
dotenv.config();

// 2. Database Connection
const connectDb = require("./config/db");
connectDb();

// 3. Import Routes & Middlewares
const orderRoutes = require("./routes/orderRoute");
const productRoutes = require("./routes/productRoute");
const authRoutes = require("./routes/authRoute");
const paymentRoutes = require("./routes/paymentRoute");
const mailerRoutes = require("./routes/mailerRoute");
const bookingRoutes = require("./routes/bookingRoute");
const { globalLimiter } = require("./middlewares/rateLimitter");
const agoraRoutes = require("./routes/agoraRoute");
const rewardRoutes  = require("./routes/rewardRoutes");
const app = express();

app.set('trust proxy', 1);
// 4. Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS Setup for Credentials/Cookies Support
app.use(
  cors({
     origin: '*', // or your frontend domain
     exposedHeaders: ['x-rtb-fingerprint-id', 'request-id']
  })
);

// Body Parser Error Handling Middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid or empty JSON body provided in request",
    });
  }
  next();
});

// 5. API Routes Mounting
app.use("/api/auth", globalLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transactions", paymentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/", mailerRoutes);
app.use('/api/agora',agoraRoutes);
app.use('/api/rewards', rewardRoutes);

// 6. Global Error Handling Middleware (Must be defined AFTER all routes)
app.use((err, req, res, next) => {
  console.error("🔥 CRASH ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 7. Server Initialization
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port: ${PORT}`);
});