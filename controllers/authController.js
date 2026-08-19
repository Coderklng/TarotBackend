// Database User Model
const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

/////////////////////////////////
// 1. GENERATE TOKEN FUNCTION
/////////////////////////////////
// Secret key ko process.env.JWT_SECRET se sync kiya hai
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || process.env.SECRET_KEY, {
    expiresIn: "30d",
  });
};

/////////////////////////////////
// 2. REGISTER USER CONTROLLER
/////////////////////////////////
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please enter all fields",
        status: false,
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "User Already Exists",
        status: false,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "user",
    });

    if (user) {
      const token = generateToken(user._id);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: true,
        token,
        message: "Registration Successful",
      });
    } else {
      res.status(400).json({
        message: "Invalid User Data",
        status: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      status: false,
    });
  }
};

/////////////////////////////////
// 3. LOGIN USER CONTROLLER (CRASH FIXED HERE)
/////////////////////////////////
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. User Pehle DB me Khojo
    const user = await User.findOne({ email });

    // 2. SAFETY CHECK: Pehle check karo user exist karta hai ya nahi!
    // Uske baad hi bcrypt.compare trigger karo!
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user._id);

      const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      };

      return res.cookie("jwt", token, cookieOptions).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: true,
        token: token,
        role : user.role,
        message: "Logged in successfully",
      });
    } else {
      // Direct return karo agar user null hai YA password galat hai
      return res.status(401).json({
        message: "Invalid email or password",
        status: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      status: false,
    });
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