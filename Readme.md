# Node.js + Express + MongoDB Backend API

Backend application setup and database design structure for scalable web applications. Built with Node.js, Express.js, and Mongoose.

---

## 📁 Project Architecture & Directory Structure

```text
my-backend/
├── config/             # Database connection setup (Single db.js file)
│   └── db.js
├── models/             # Mongoose schemas & data models
│   ├── User.js         # User accounts & authentication schema
│   ├── Product.js      # Products / Services schema
│   ├── Order.js        # Orders / Bookings schema
│   └── Transaction.js  # Payment & transaction records
├── controllers/        # Request handlers & business logic
│   ├── authController.js
│   ├── userController.js
│   └── paymentController.js
├── routes/             # Express API routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── paymentRoutes.js
├── middleware/         # Auth verification, error handling, rate limiting
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── payments/           # Third-party payment gateway setups (Razorpay/Stripe)
│   └── gateway.js
├── .env                # Environment variables (secrets, DB URI)
├── server.js           # Server entry point
└── README.md           # Project documentation
```

---

## 🗄️ Database Design (Mongoose Models)

### 1. Database Connection (`config/db.js`)
* Manages a single, persistent MongoDB connection across the entire application instance.
* Keeps connection logic completely decoupled from data schemas and controllers.

### 2. Primary Collections Structure

#### **A. Users Collection (`models/User.js`)**
* `name` (String, Required)
* `email` (String, Required, Unique)
* `password` (String, Required, Hashed)
* `role` (String, Enum: `['user', 'admin']`, Default: `'user'`)
* `createdAt` (Timestamp)

#### **B. Products / Services Collection (`models/Product.js`)**
* `title` (String, Required)
* `description` (String)
* `price` (Number, Required)
* `category` (String)
* `inStock` (Boolean, Default: `true`)
* `createdAt` (Timestamp)

#### **C. Orders Collection (`models/Order.js`)**
* `user` (ObjectId, Reference -> User)
* `items` (Array of Product ObjectIds & quantities)
* `totalAmount` (Number, Required)
* `status` (String, Enum: `['pending', 'completed', 'failed']`, Default: `'pending'`)
* `createdAt` (Timestamp)

#### **D. Transactions Collection (`models/Transaction.js`)**
* `order` (ObjectId, Reference -> Order)
* `paymentGateway` (String, e.g., Razorpay / Stripe)
* `paymentId` (String)
* `amount` (Number)
* `status` (String)
* `createdAt` (Timestamp)

---

## 🛠️ Step-by-Step Setup Guide

### 1. Environment Configuration (`.env`)
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/behen_website_db
JWT_SECRET=your_jwt_secret_key_here
```

### 2. Dependency Installation
```bash
npm install express mongoose dotenv cors jsonwebtoken bcryptjs
npm install --save-dev nodemon
```

### 3. Server Initialization
Run in development mode:
```bash
npm run dev
```

---

## 🚦 Recommended Next Steps
1. Verify MongoDB connection with `config/db.js`.
2. Define exact field requirements for `models/User.js` and custom domain schemas.
3. Build authentication routes (`/api/auth/register`, `/api/auth/login`).
4. Integrate Payment routes (`/api/payments`) and configure SDK credentials.