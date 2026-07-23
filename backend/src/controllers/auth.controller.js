const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { sendError, sendSuccess } = require("../utils/response");
const { isValidPassword, PASSWORD_REQUIREMENTS } = require("../utils/validation");
const { normalizeCompanyName } = require("../services/companyDuplicateService");

const PROFILE_SELECT = {
  profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
  company: {
    select: { id: true, name: true, logoUrl: true, isVerified: true, status: true, plan: true },
  },
};

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function buildUserPayload(user) {
  const fullName =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() ||
    user.company?.name ||
    user.email;

  return {
    id: user.id,
    fullName,
    email: user.email,
    role: user.role.toLowerCase(),
    avatarUrl: user.profile?.avatarUrl || user.company?.logoUrl || null,
    ...(user.company ? { company: user.company } : {}),
  };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function register(req, res) {
  try {
    const { email, password, role, firstName, lastName, name, companyName } =
      req.body;

    if (!email || !password || !role) {
      return sendError(res, 400, "Email, password, and role are required");
    }

    if (!isValidPassword(password)) {
      return sendError(res, 400, PASSWORD_REQUIREMENTS);
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
          company: {
            create: {
              name: companyName || "",
              normalizedName: normalizeCompanyName(companyName || ""),
            },
          },
        }),
      },
      select: { id: true, email: true, role: true, ...PROFILE_SELECT },
    });

    const token = signToken(user.id);
    sendSuccess(
      res,
      "Account created successfully",
      { user: buildUserPayload(user), token },
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
      select: { id: true, email: true, role: true, password: true, isActive: true, ...PROFILE_SELECT },
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
    sendSuccess(res, "Login successful", {
      user: buildUserPayload(user),
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
      select: { id: true, email: true, role: true, isActive: true, ...PROFILE_SELECT },
    });

    if (!user) return sendError(res, 404, "User not found");
    sendSuccess(res, "Current user fetched successfully", {
      user: buildUserPayload(user),
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
    const neutralMessage =
      "If an account exists for this email, reset instructions have been sent.";

    if (!email) {
      return sendError(res, 400, "Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);

      await prisma.passwordReset.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      if (process.env.NODE_ENV !== "production") {
        const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
        console.log(`[dev] Password reset link for ${normalizedEmail}: ${resetUrl}`);
      }

      // TODO: send the raw token via the project's email service once configured.
    }

    sendSuccess(res, neutralMessage);
  } catch (error) {
    console.error("Forgot Password Error:", error);
    sendError(res, 500, "Internal server error");
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password, confirmPassword } = req.body;
    const invalidTokenMessage = "The reset link is invalid or has expired.";

    if (!token || !password) {
      return sendError(res, 400, "Token and password are required");
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return sendError(res, 400, "Passwords do not match");
    }
    if (!isValidPassword(password)) {
      return sendError(res, 400, PASSWORD_REQUIREMENTS);
    }

    const tokenHash = hashResetToken(token);
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt < new Date()
    ) {
      return sendError(res, 400, invalidTokenMessage);
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashed },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    sendSuccess(res, "Password reset successfully. Please log in.");
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
