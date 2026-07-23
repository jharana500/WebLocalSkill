const prisma = require("../lib/prisma");

// Returns a Prisma.adminAuditLog.create() args object rather than awaiting
// directly, so callers can include it inside prisma.$transaction([...]) —
// a status update should never persist without its audit trail.
function buildAuditLog({ adminId, action, entityType, entityId, oldValue, newValue, reason }) {
  return prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      oldValue: oldValue === undefined ? undefined : oldValue,
      newValue: newValue === undefined ? undefined : newValue,
      reason: reason || null,
    },
  });
}

module.exports = { buildAuditLog };
