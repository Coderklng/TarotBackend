const rateLimiter = require("express-rate-limit");

const globalLimiter = rateLimiter({
    windowMs : 15*60*1000,
    max : 100,
    message:{
      status:429,
      message: "Too many requests from this IP, please try again after 15 minutes.",
    },
    standardHeaders:true,
    legacyHeaders:false
});


const authLimiter = rateLimiter({
     windowMs : 15 * 60 * 1000,
     max : 100,
     message : {
        status : 429,
        message: "Too many authentication attempts, please try again after 15 minutes.", 
    },
     standardHeaders:true,
     legacyHeaders:false
});


module.exports = {
    globalLimiter,
    authLimiter
};