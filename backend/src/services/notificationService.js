const prisma = require("../lib/prisma");

// Returns a Prisma.notification.create() args object rather than awaiting
// directly, so callers can include it inside prisma.$transaction([...]).
function buildNotification({ userId, type, title, message, data }) {
  return prisma.notification.create({
    data: { userId, type, title, message, data: data || undefined },
  });
}

async function createNotification(params) {
  return buildNotification(params);
}

module.exports = { buildNotification, createNotification };
