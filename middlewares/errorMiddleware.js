/////////////////////////////////
// 1. 404 NOT FOUND MIDDLEWARE
/////////////////////////////////
// Jab koi aisa URL hit hoga jo kisi route se match nahi karta (e.g. /api/unknown)
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Error ko agle Global Error Handler me pass kar rahe hain
};

/////////////////////////////////
// 2. GLOBAL ERROR HANDLER
/////////////////////////////////
// Express ka central error handler jo poori app ke throw hue errors ko catch karta hai
const errorHandler = (err, req, res, next) => {
  // Agar pehle se status code set hai toh wahi use karo, varna 500 (Internal Server Error)
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose Bad ObjectId Error (Jaise invalid ID format URL me bhej dena)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found (Invalid Database ID)";
  }

  // Mongoose Duplicate Key Error (Jaise same email se dobara register karna)
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  // Mongoose Validation Error (Jaise required fields missing hona)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    message: message,
    // Stack trace sirf development mode me dikhega, production me security ke liye hide rahega
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };