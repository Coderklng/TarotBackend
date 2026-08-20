// Database User Model
const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { admin } = require('../lib/firebaseAdmin');


require("dotenv").config();

/////////////////////////////////
// 1. GENERATE TOKEN FUNCTION
/////////////////////////////////
// Secret key ko process.env.JWT_SECRET se sync kiya hai
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/////////////////////////////////
// 2. REGISTER USER CONTROLLER
/////////////////////////////////
const registerUser = async (req, res) => {
  try {
    const { uid, name, email, role, password } = req.body;

    if (!uid || !name || !email) {
      return res.status(400).json({
        message: "Please enter all required fields",
        status: false,
      });
    }

    // Check if user already exists by email or firebase uid
    let user = await User.findOne({ email });

    if (user) {
      // User pehle se hai (Chahe Email/Password se ho ya Google se)
      // Toh error mat do, seedha token generate karke login karwa do!
      const token = generateToken(user._id);
      return res.status(200).json({
        _id: user._id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        status: true,
        token,
        message: "Login Successful (User already exists)",
      });
    }

    // Agar user nahi hai, toh naya create karo
    let hashedPassword = "";
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    user = await User.create({
      uid,
      name,
      email,
      password: hashedPassword, // Google login ke liye blank ho sakta hai
      role: role || "user",
    });

    const token = generateToken(user._id);
    return res.status(201).json({
      _id: user._id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: true,
      token,
      message: "Registration Successful",
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
      status: false,
    });
  }
};

/////////////////////////////////
// 3. LOGIN USER CONTROLLER (CRASH FIXED HERE)
/////////////////////////////////const { admin } = require('../lib/firebaseAdmin'); // Tumhara firebase admin import path check kar lena

const loginUser = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // 1. Agar Google se login hai (password nahi aayega)
    if (!password) {
      if (!email) {
        return res.status(400).json({ message: "Email is required", status: false });
      }

      let user = await User.findOne({ email });

      // Agar user pehle se nahi hai, toh create karo
      if (!user) {
        user = await User.create({
          name: name || "User",
          email: email,
          password: "", 
          role: "user"
        });
      }

      const token = generateToken(user._id);
      
      const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      };

      return res.cookie("jwt", token, cookieOptions).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        status: true,
        token: token,
        role: user.role,
        message: "Logged in successfully",
      });
    } 
    
    // 2. Traditional Email/Password Login
    else {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password", status: false });
      }
      
      const token = generateToken(user._id);
      // ... (Wahi cookie logic)
      return res.cookie("jwt", token, cookieOptions).json({ /* User data */ });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message, status: false });
  }
};

/////////////////////////////////
// 4. GET USER PROFILE
/////////////////////////////////
const getUserProfile = async (req, res) => {
  try {
    // req.user par safety check
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user missing" });
    }

    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 5. UPDATE USER PROFILE
/////////////////////////////////
/////////////////////////////////
// 5. UPDATE USER PROFILE (Dynamic Fields Added)
/////////////////////////////////
const updateUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.user._id);

    if (user) {
      // Dynamic mapping for all editable fields
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.dob = req.body.dob || user.dob;
      user.gender = req.body.gender || user.gender;
      user.occupation = req.body.occupation || user.occupation;
      user.bio = req.body.bio || user.bio;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.status(200).json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        dob: updatedUser.dob,
        gender: updatedUser.gender,
        occupation: updatedUser.occupation,
        bio: updatedUser.bio,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 6. DELETE USER
/////////////////////////////////
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.status(200).json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 7. LOGOUT USER
/////////////////////////////////
const logoutUser = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  logoutUser,
};