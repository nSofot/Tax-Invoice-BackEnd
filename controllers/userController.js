import User from "../models/user.js";
import OTP from "../models/otp.js";
import { sendSMS } from "../utils/sendSms.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

// Utility: Check if user is admin
export function isAdmin(req) {
  return req.user && req.user.role === "admin";
}

// Utility: Generate next User ID
async function generateUserId() {
  const lastUser = await User.find().sort({ createdAt: -1 }).limit(1);
  if (lastUser.length > 0) {
    const lastId = parseInt(lastUser[0].userId.replace("USR-", ""));
    return "USR-" + String(lastId + 1).padStart(4, "0");
  }
  return "USR-0001";
}

// ✅ Create User
export async function createUser(req, res) {
  try {
    const { email, firstname, lastname, mobile, password, role, isActive, image, dateOfBirth } = req.body;
    if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can add users." });
    if (!firstname?.trim() || !lastname?.trim() || !role || (!email?.trim() && !mobile?.trim())) {
      return res.status(400).json({ message: "First name, last name, role, and email or mobile are required." });
    }
    if (!['admin', 'manager', 'accountant', 'cashier', 'pumpman', 'user'].includes(role)) {
      return res.status(400).json({ message: "Invalid user role." });
    }

    const newUserId = await generateUserId();
    const initialPassword = password || randomBytes(32).toString("hex");
    const hashedPassword = bcrypt.hashSync(process.env.JWT_KEY + initialPassword, 10);

    const user = new User({
      userId: newUserId,
      email,
      firstname,
      lastname,
      mobile,
      password: hashedPassword,
      role,
      isActive,
      image,
      dateOfBirth
    });

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json({ message: "User added successfully", user: safeUser });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A user with that email or mobile already exists." });
    if (err.name === "ValidationError") return res.status(400).json({ message: "User data is invalid", error: err.message });
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
}

// ✅ Login User
export async function loginUsers(req, res) {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    // Find user by email OR mobile
    const user = await User.findOne({
      $or: [{ email: username }, { mobile: username }]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const valid = bcrypt.compareSync(
      process.env.JWT_KEY + password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        mobile: user.mobile,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        image: user.image,
        dateOfBirth: user.dateOfBirth
      },
      process.env.JWT_KEY,
      { expiresIn: "1d" }
    );

    // Send user data
    const userData = {
      userId: user.userId,
      name: user.firstname,
      role: user.role,
      email: user.email,
      image: user.image
    };

    return res.json({
      message: "Login successful",
      token,
      user: userData
    });

  } catch (err) {
    return res.status(500).json({
      message: "Login failed",
      error: err.message
    });
  }
}

// ✅ Delete User
export async function deleteUser(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ message: "You are not authorized to delete user" });
  if (req.params.userId === req.user.userId) return res.status(400).json({ message: "You cannot delete your own account." });

  try {
    const result = await User.deleteOne({ userId: req.params.userId });
    if (result.deletedCount === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
}

// ✅ Update User
export async function updateUser(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ message: "Unauthorized access" });

  try {
    const { userId } = req.params;
    const { email, firstname, lastname, mobile, password, role } = req.body;
    const updates = {};
    if (email !== undefined) updates.email = String(email).trim();
    if (firstname !== undefined) updates.firstname = String(firstname).trim();
    if (lastname !== undefined) updates.lastname = String(lastname).trim();
    if (mobile !== undefined) updates.mobile = String(mobile).trim();
    if (role !== undefined) updates.role = role;
    if (password) updates.password = bcrypt.hashSync(process.env.JWT_KEY + password, 10);
    if (updates.firstname === "" || updates.lastname === "") return res.status(400).json({ message: "First and last name cannot be empty." });
    if (role !== undefined && !['admin', 'manager', 'accountant', 'cashier', 'pumpman', 'user'].includes(role)) return res.status(400).json({ message: "Invalid user role." });
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Provide user fields to update." });
    const user = await User.findOneAndUpdate({ userId }, { $set: { ...updates, updatedAt: new Date() } }, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A user with that email or mobile already exists." });
    if (err.name === "ValidationError") return res.status(400).json({ message: "User data is invalid", error: err.message });
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
}

// ✅ Get All Users
export async function getUsers(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ message: "Unauthorized access" });

  try {
    const users = await User.find().select("-password").sort({ userId: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
}

// ✅ Get Authenticated User
export function getUser(req, res) {
  if (!req.user) return res.status(403).json({ message: "Unauthorized" });

  const { userId, email, firstname, lastname, role, image, dateOfBirth } = req.user;
  res.json({ userId, email, firstname, lastname, role, image, dateOfBirth });
}

// ✅ Google Login
export async function loginWithGoogle(req, res) {
  const token = req.body.accessToken;

  if (!token) {
    return res.status(400).json({ message: "Access token is required" });
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { email, given_name, family_name, picture } = response.data;

    let user = await User.findOne({ email });

    // Create user if not exists
    if (!user) {
      const newUserId = await generateUserId();

      user = new User({
        userId: newUserId,
        email,
        firstname: given_name,
        lastname: family_name,
        role: "user",
        isActive: true,
        image: picture,
        password: undefined,
        dateOfBirth: null,
        isGoogleUser: true,
      });

      await user.save();
    }

    // Prevent inactive users
    if (!user.isActive) {
      return res.status(403).json({
        message: "User account is inactive",
      });
    }

    const jwtToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        image: user.image,
      },
      process.env.JWT_KEY,
      { expiresIn: "1d" }
    );

    // user object for frontend
    const userData = {
      userId: user.userId,
      name: user.firstname,
      role: user.role,
      email: user.email,
      image: user.image,
    };

    res.json({
      message: "Login successful",
      token: jwtToken,
      user: userData,
    });

  } catch (err) {
    res.status(500).json({
      message: "Google login failed",
      error: err.message,
    });
  }
}

// ✅ Email Transporter
const transport = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Send OTP
// This function sends an OTP to the user's email and mobile number for password reset purposes.
export async function sendOTP(req, res) {
  const { email, mobile } = req.body;

  // ✅ Allow email OR mobile
  if (!email && !mobile) {
    return res.status(400).json({
      message: "Email or mobile number is required",
    });
  }

  try {
    let user;

    if (email) {
      user = await User.findOne({ email });
      if (!user)
        return res.status(404).json({ message: "User email not found" });
    } else {
      user = await User.findOne({ mobile });
      if (!user)
        return res.status(404).json({ message: "User mobile not found" });
    }

    // // console.log("User found for OTP:", user);

    // Clear old OTPs
    await OTP.deleteMany({
      $or: [{ email }, { mobile }],
    });

    const randomOTP = Math.floor(100000 + Math.random() * 900000);

    await OTP.create({
      email: email || null,
      mobile: mobile || null,
      otp: randomOTP,
    });

    if (email) {
      await transport.sendMail({
        from: `"Tax Invoice Utility" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset OTP - Tax Invoice Utility",
        html: `
          <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
            <div style="max-width:500px; margin:auto; background:white; padding:25px; border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,0.05);">
              
              <h2 style="color:#2563eb; margin-bottom:10px;">
                Tax Invoice Utility - Password Reset OTP
              </h2>

              <p style="font-size:15px; color:#333;">
                Hello,
              </p>

              <p style="font-size:15px; color:#333;">
                We received a request to reset your password. Use the OTP below to continue.
              </p>

              <div style="text-align:center; margin:25px 0;">
                <span style="
                  font-size:28px;
                  letter-spacing:6px;
                  font-weight:bold;
                  color:#111;
                  background:#f1f5f9;
                  padding:12px 20px;
                  border-radius:6px;
                  display:inline-block;
                ">
                  ${randomOTP}
                </span>
              </div>

              <p style="font-size:14px; color:#555;">
                This OTP will expire in <strong>10 minutes</strong>.
              </p>

              <p style="font-size:14px; color:#555;">
                If you did not request a password reset, please ignore this email.
              </p>

              <hr style="margin:25px 0; border:none; border-top:1px solid #eee;" />

              <p style="font-size:12px; color:#888; text-align:center;">
                © ${new Date().getFullYear()} Tax Invoice Utility. All rights reserved.
              </p>

            </div>
          </div>
        `,
      });
    }

    if (mobile && user?.mobile) {
        try {
            await sendSMS(
                user.mobile,
                `Tax Invoice Utility OTP: ${randomOTP}. Valid for 10 minutes.`
            );
        } catch (smsErr) {
            console.error("SMS failed:", smsErr);
        }
    }  

    // ✅ Single response
    return res.json({
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to send OTP",
      error: err.message,
    });
  }
}

// ✅ Reset Password
export async function resetPassword(req, res) {
  const { email, mobile, otp, newPassword } = req.body;

  try {
    const conditions1 = [];
    if (email) conditions1.push({ email });
    if (mobile) conditions1.push({ mobile });

    const otpDoc = await OTP.findOne({
        $or: conditions1
    });

    if (!otpDoc) return res.status(404).json({ message: "No OTP requests found" });
    if (String(otp) !== String(otpDoc.otp)) return res.status(403).json({ message: "Invalid OTP" });

    const conditions2 = [];
      if (email) conditions2.push({ email });
      if (mobile) conditions2.push({ mobile });

      await OTP.deleteMany({
          $or: conditions2
    });

    const hashedPassword = bcrypt.hashSync(process.env.JWT_KEY + newPassword, 10);
    const conditions3 = [];
      if (email) conditions3.push({ email });
      if (mobile) conditions3.push({ mobile });

      await User.updateOne(
          { $or: conditions3 },
          { password: hashedPassword }
    );

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
}
