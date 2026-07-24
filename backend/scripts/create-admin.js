require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../src/lib/prisma");
const { isValidPassword, PASSWORD_REQUIREMENTS } = require("../src/utils/validation");

const ADMIN_ROLE = "ADMIN";

async function main() {
  const name = (process.env.ADMIN_NAME || "").trim();
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const forceUpdate = String(process.env.ADMIN_PASSWORD_FORCE_UPDATE || "").toLowerCase() === "true";

  if (!name) {
    throw new Error("ADMIN_NAME is required in backend/.env");
  }
  if (!email) {
    throw new Error("ADMIN_EMAIL is required in backend/.env");
  }
  if (!password) {
    throw new Error("ADMIN_PASSWORD is required in backend/.env");
  }
  if (!isValidPassword(password)) {
    throw new Error(`ADMIN_PASSWORD is invalid: ${PASSWORD_REQUIREMENTS}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const data = { role: ADMIN_ROLE, isActive: true };
    if (forceUpdate) {
      data.password = await bcrypt.hash(password, 12);
    }

    await prisma.user.update({ where: { id: existing.id }, data });

    console.log(
      `Admin promoted: ${email} (role=${ADMIN_ROLE}, passwordUpdated=${forceUpdate})`,
    );
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const created = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: ADMIN_ROLE,
      isActive: true,
    },
  });

  console.log(`Admin created: ${created.email} (role=${ADMIN_ROLE})`);
}

main()
  .catch((error) => {
    console.error("Failed to create/promote admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
