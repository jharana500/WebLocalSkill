const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { sendError, sendSuccess } = require("../utils/response");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function register(req, res) {
  try {
    const { email, password, role, firstName, lastName, name, companyName } =
      req.body;

    if (!email || !password || !role) {
      return sendError(res, 400, "Email, password, and role are required");
    }

    const normalizedRole = role
      .toUpperCase()
      .replace("-", "_")
      .replace(" ", "_");
    const normalizedEmail = email.trim().toLowerCase();
    const fullName = (name || `${firstName || ""} ${lastName || ""}`).trim();
    const [derivedFirstName, ...derivedLastParts] = fullName
      .split(/\s+/)
      .filter(Boolean);
    const safeFirstName = firstName || derivedFirstName || "";
    const safeLastName = lastName || derivedLastParts.join(" ") || "";
    if (!["JOB_SEEKER", "COMPANY"].includes(normalizedRole)) {
      return sendError(res, 400, "Invalid role. Must be job_seeker or company");
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return sendError(res, 409, "An account with this email already exists");
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        role: normalizedRole,
        ...(normalizedRole === "JOB_SEEKER" && {
          profile: {
            create: {
              firstName: safeFirstName,
              lastName: safeLastName,
              skills: [],
            },
          },
        }),
        ...(normalizedRole === "COMPANY" && {
          company: { create: { name: companyName || "" } },
        }),
      },
      select: { id: true, email: true, role: true },
    });

    const token = signToken(user.id);
    sendSuccess(
      res,
      "Account created successfully",
      { user: { ...user, role: user.role.toLowerCase() }, token },
      201,
    );
  } catch (error) {
    console.error("Register Error:", error);
    sendError(res, 500, "Internal server error during registration");
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error message to protect user privacy
    if (!user || !user.isActive) {
      return sendError(res, 401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return sendError(res, 401, "Invalid email or password");
    }

    const token = signToken(user.id);
    sendSuccess(res, "Logged in successfully", {
      user: { id: user.id, email: user.email, role: user.role.toLowerCase() },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    sendError(res, 500, "Internal server error during login");
  }
}

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            district: true,
            avatarUrl: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            status: true,
            plan: true,
          },
        },
      },
    });

    if (!user) return sendError(res, 404, "User not found");
    sendSuccess(res, "Current user loaded", {
      user: { ...user, role: user.role.toLowerCase() },
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    sendError(res, 500, "Internal server error");
  }
}

async function logout(req, res) {
  sendSuccess(res, "Logged out successfully");
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    await prisma.user.findUnique({ where: { email } });
    sendSuccess(
      res,
      "If an account exists with this email, a reset link has been sent",
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    sendError(res, 500, "Internal server error");
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return sendError(res, 400, "Token and password are required");
    }
    sendError(res, 501, "Password reset via email is not yet configured");
  } catch (error) {
    console.error("Reset Password Error:", error);
    sendError(res, 500, "Internal server error");
  }
}

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
