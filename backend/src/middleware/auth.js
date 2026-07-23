const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { sendError } = require("../utils/response");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Authentication required");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 401, "User not found or deactivated");
    }

    req.user = user;
    next();
  } catch {
    return sendError(res, 401, "Session expired. Please log in again.");
  }
}

module.exports = { authenticate };
