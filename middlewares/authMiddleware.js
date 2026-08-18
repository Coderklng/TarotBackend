// JWT tokens verify karne ke liye jsonwebtoken module import kar rahe hain
const jwt = require("jsonwebtoken");

// User model import kar rahe hain taaki token ki ID se user ka data fetch kar sakein
const User = require("../models/Users");

/////////////////////////////////
// 1. PROTECT ROUTE MIDDLEWARE
/////////////////////////////////
// Iska kaam yeh check karna hai ki user logged in hai aur uske paas valid JWT token hai

const protect = async (req, res, next) => {
  let token;

  // Pehle Cookie check karo, agar cookie na ho toh Bearer Header check karo
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};


/////////////////////////////////
// 2. ADMIN ROLE MIDDLEWARE
/////////////////////////////////
// Iska kaam yeh check karna hai ki logged-in user ke paas Admin permissions hain ya nahi
const admin = (req, res, next) => {
  // req.user hume upar wale 'protect' middleware se mil jata hai
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    // 403 Forbidden Error (Permission denied)
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };