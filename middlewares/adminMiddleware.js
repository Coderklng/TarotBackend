/////////////////////////////////
// ADMIN ROLE PROTECTION MIDDLEWARE
/////////////////////////////////
// Yeh middleware sirf unhi users ko aage jaane deta hai jinka role "admin" hai.
// Note: Yeh middleware HAMESHA 'protect' (authMiddleware) ke baad run hona chahiye.

const admin = (req, res, next) => {
  // 1. Check karo ki req.user exist karta hai (jo protect middleware attach karta hai)
  // 2. Check karo ki user ka role "admin" hai ya nahi
  if (req.user && req.user.role === "admin") {
    next(); // Permission granted -> Agle controller/middleware par jao
  } else {
    // 403 Forbidden: User authenticated toh hai par Admin nahi hai
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
    });
  }
};

module.exports = { admin };