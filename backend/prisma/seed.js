require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../src/lib/prisma");
const { normalizeCompanyName } = require("../src/services/companyDuplicateService");

// Shared demo login for every seeded account below (job seekers and company
// owners alike). Seed data only — never used for the real admin account.
const DEMO_PASSWORD = "Password123!";

async function hashed() {
  return bcrypt.hash(DEMO_PASSWORD, 12);
}

async function upsertJobSeeker({ email, firstName, lastName, title, district, skills, bio }) {
  const password = await hashed();
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password, role: "JOB_SEEKER", isActive: true },
  });

  await prisma.jobSeekerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, firstName, lastName, title, district, skills, bio },
  });

  return user;
}

async function upsertCompanyOwner({
  email,
  companyId,
  name,
  industry,
  size,
  district,
  website,
  phone,
  description,
  isVerified,
  status,
  plan,
}) {
  const password = await hashed();
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password, role: "COMPANY", isActive: true },
  });

  const company = await prisma.company.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      id: companyId,
      userId: user.id,
      name,
      normalizedName: normalizeCompanyName(name),
      industry,
      size,
      district,
      website,
      phone,
      description,
      isVerified,
      status,
      plan,
    },
  });

  return { user, company };
}

async function upsertJob({ id, companyId, title, description, jobType, category, district, salaryMin, salaryMax, status, isFeatured }) {
  return prisma.job.upsert({
    where: { id },
    update: {},
    create: {
      id,
      companyId,
      title,
      description,
      jobType,
      category,
      district,
      salaryMin,
      salaryMax,
      openings: 1,
      status,
      isFeatured: Boolean(isFeatured),
    },
  });
}

async function upsertApplication({ jobId, userId, status, coverLetter }) {
  return prisma.application.upsert({
    where: { jobId_userId: { jobId, userId } },
    update: {},
    create: { jobId, userId, status, coverLetter },
  });
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // --- Job seekers ---------------------------------------------------
  const sita = await upsertJobSeeker({
    email: "sita.rai@example.com",
    firstName: "Sita",
    lastName: "Rai",
    title: "Frontend Developer",
    district: "Kathmandu",
    skills: ["React", "JavaScript", "CSS", "Tailwind"],
    bio: "Frontend developer with 3 years building customer-facing web apps.",
  });
  const bibek = await upsertJobSeeker({
    email: "bibek.shrestha@example.com",
    firstName: "Bibek",
    lastName: "Shrestha",
    title: "Backend Developer",
    district: "Lalitpur",
    skills: ["Node.js", "PostgreSQL", "Docker"],
    bio: "Backend engineer focused on API design and databases.",
  });
  const anish = await upsertJobSeeker({
    email: "anish.thapa@example.com",
    firstName: "Anish",
    lastName: "Thapa",
    title: "Graphic Designer",
    district: "Pokhara",
    skills: ["Figma", "Illustrator", "Branding"],
    bio: "Visual designer with a focus on brand identity.",
  });
  const priya = await upsertJobSeeker({
    email: "priya.karki@example.com",
    firstName: "Priya",
    lastName: "Karki",
    title: "Accountant",
    district: "Kathmandu",
    skills: ["Excel", "Tally", "Bookkeeping"],
    bio: "Detail-oriented accountant with SME experience.",
  });
  await upsertJobSeeker({
    email: "rajesh.gurung@example.com",
    firstName: "Rajesh",
    lastName: "Gurung",
    title: "Marketing Executive",
    district: "Chitwan",
    skills: ["SEO", "Social Media", "Content"],
    bio: "Marketing executive with a growth mindset.",
  });

  // --- Companies (span every verification tab) ------------------------
  const himalayanTech = await upsertCompanyOwner({
    email: "hr@himalayantech.com.np",
    companyId: "seed-company-himalayan-tech",
    name: "Himalayan Tech Pvt Ltd",
    industry: "Technology",
    size: "51-200",
    district: "Kathmandu",
    website: "https://himalayantech.com.np",
    phone: "014412345",
    description: "A Kathmandu-based product company building software for local businesses.",
    isVerified: true,
    status: "ACTIVE",
    plan: "GROWTH",
  });

  const ktmTraders = await upsertCompanyOwner({
    email: "hello@ktmtraders.com",
    companyId: "seed-company-ktm-traders",
    name: "Kathmandu Traders Co",
    industry: "Retail",
    size: "11-50",
    district: "Kathmandu",
    website: "https://ktmtraders.com",
    phone: "014498765",
    description: "Wholesale and retail trading company serving the Kathmandu valley.",
    isVerified: false,
    status: "ACTIVE",
    plan: "FREE",
  });

  const everestLogistics = await upsertCompanyOwner({
    email: "contact@everestlogistics.com",
    companyId: "seed-company-everest-logistics",
    name: "Everest Logistics",
    industry: "Logistics",
    size: "201-500",
    district: "Bhaktapur",
    website: "https://everestlogistics.com",
    phone: "016612233",
    description: "Freight and last-mile delivery across Nepal.",
    isVerified: false,
    status: "ACTIVE",
    plan: "STARTER",
  });

  const pokharaHospitality = await upsertCompanyOwner({
    email: "info@pokharahospitality.com",
    companyId: "seed-company-pokhara-hospitality",
    name: "Pokhara Hospitality Group",
    industry: "Hospitality",
    size: "11-50",
    district: "Pokhara",
    website: "https://pokharahospitality.com",
    phone: "061512345",
    description: "Hotels and resorts group operating around Fewa Lake.",
    isVerified: false,
    status: "SUSPENDED",
    plan: "FREE",
  });

  const himalayanTechnologies = await upsertCompanyOwner({
    email: "admin@himalayantechnologies.com",
    companyId: "seed-company-himalayan-technologies",
    name: "Himalayan Technologies Pvt. Ltd.",
    industry: "Technology",
    size: "1-10",
    district: "Kathmandu",
    website: "https://himalayantech.com.np",
    phone: "014412345",
    description: "Software services company.",
    isVerified: false,
    status: "PENDING",
    plan: "FREE",
  });

  // --- Verifications, one per tab: verified / pending / under_review /
  // rejected / duplicate ------------------------------------------------
  await prisma.companyVerification.upsert({
    where: { companyId: himalayanTech.company.id },
    update: {},
    create: {
      companyId: himalayanTech.company.id,
      panNumber: "301234567",
      registrationNumber: "REG-2019-00123",
      status: "VERIFIED",
      reviewNotes: "Documents verified against company registrar records.",
      reviewedById: admin?.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.companyVerification.upsert({
    where: { companyId: ktmTraders.company.id },
    update: {},
    create: {
      companyId: ktmTraders.company.id,
      panNumber: "301987654",
      registrationNumber: "REG-2021-00456",
      status: "PENDING",
    },
  });

  await prisma.companyVerification.upsert({
    where: { companyId: everestLogistics.company.id },
    update: {},
    create: {
      companyId: everestLogistics.company.id,
      panNumber: "301555666",
      registrationNumber: "REG-2020-00789",
      status: "UNDER_REVIEW",
    },
  });

  await prisma.companyVerification.upsert({
    where: { companyId: pokharaHospitality.company.id },
    update: {},
    create: {
      companyId: pokharaHospitality.company.id,
      panNumber: "301777888",
      registrationNumber: "REG-2018-00321",
      status: "REJECTED",
      reviewNotes: "Submitted registration certificate did not match the business name.",
      reviewedById: admin?.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.companyVerification.upsert({
    where: { companyId: himalayanTechnologies.company.id },
    update: {},
    create: {
      companyId: himalayanTechnologies.company.id,
      panNumber: "301234567",
      registrationNumber: "REG-2019-00123",
      status: "DUPLICATE",
      duplicateOfCompanyId: himalayanTech.company.id,
      reviewNotes: "Same PAN and registration number as Himalayan Tech Pvt Ltd.",
      reviewedById: admin?.id,
      reviewedAt: new Date(),
    },
  });

  // --- Jobs -------------------------------------------------------------
  const jobFrontend = await upsertJob({
    id: "seed-job-himalayan-frontend",
    companyId: himalayanTech.company.id,
    title: "Frontend Developer (React)",
    description: "Build and maintain customer-facing dashboards using React and Tailwind CSS.",
    jobType: "FULL_TIME",
    category: "Technology & IT",
    district: "Kathmandu",
    salaryMin: 60000,
    salaryMax: 90000,
    status: "ACTIVE",
    isFeatured: true,
  });

  const jobBackend = await upsertJob({
    id: "seed-job-himalayan-backend",
    companyId: himalayanTech.company.id,
    title: "Backend Engineer (Node.js)",
    description: "Design and ship REST APIs powering our core product.",
    jobType: "FULL_TIME",
    category: "Technology & IT",
    district: "Kathmandu",
    salaryMin: 65000,
    salaryMax: 95000,
    status: "ACTIVE",
  });

  await upsertJob({
    id: "seed-job-ktm-sales",
    companyId: ktmTraders.company.id,
    title: "Sales Executive",
    description: "Manage client relationships and drive wholesale sales in the Kathmandu valley.",
    jobType: "FULL_TIME",
    category: "Sales & Business Development",
    district: "Kathmandu",
    salaryMin: 30000,
    salaryMax: 45000,
    status: "ACTIVE",
  });

  await upsertJob({
    id: "seed-job-ktm-accountant",
    companyId: ktmTraders.company.id,
    title: "Junior Accountant",
    description: "Handle day-to-day bookkeeping and vendor payments.",
    jobType: "FULL_TIME",
    category: "Finance & Accounting",
    district: "Kathmandu",
    salaryMin: 28000,
    salaryMax: 38000,
    status: "DRAFT",
  });

  const jobLogistics = await upsertJob({
    id: "seed-job-everest-driver",
    companyId: everestLogistics.company.id,
    title: "Delivery Coordinator",
    description: "Coordinate last-mile delivery routes and driver schedules.",
    jobType: "FULL_TIME",
    category: "Operations",
    district: "Bhaktapur",
    salaryMin: 32000,
    salaryMax: 42000,
    status: "ACTIVE",
  });

  // --- Applications -------------------------------------------------------
  await upsertApplication({
    jobId: jobFrontend.id,
    userId: sita.id,
    status: "SHORTLISTED",
    coverLetter: "I've built several production React dashboards and would love to join Himalayan Tech.",
  });
  await upsertApplication({
    jobId: jobBackend.id,
    userId: bibek.id,
    status: "REVIEWING",
    coverLetter: "3 years of Node.js and PostgreSQL experience, excited about this role.",
  });
  await upsertApplication({
    jobId: jobLogistics.id,
    userId: priya.id,
    status: "PENDING",
    coverLetter: "Strong organizational skills, happy to relocate to Bhaktapur.",
  });
  await upsertApplication({
    jobId: jobFrontend.id,
    userId: anish.id,
    status: "REJECTED",
    coverLetter: "Design background but keen to move into frontend development.",
  });

  // --- Admin notifications (mirrors the real events above) --------------
  if (admin) {
    const adminNotifications = [
      {
        id: "seed-notif-admin-pending-ktm",
        title: "New verification submitted",
        message: "Kathmandu Traders Co submitted documents for verification.",
        readAt: null,
      },
      {
        id: "seed-notif-admin-duplicate",
        title: "Possible duplicate detected",
        message: "Himalayan Technologies Pvt. Ltd. closely matches an already-verified company.",
        readAt: null,
      },
      {
        id: "seed-notif-admin-rejected",
        title: "Verification rejected",
        message: "Pokhara Hospitality Group's registration certificate did not match its business name.",
        readAt: new Date(),
      },
    ];

    for (const n of adminNotifications) {
      await prisma.notification.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          userId: admin.id,
          type: "ADMIN_VERIFICATION",
          title: n.title,
          message: n.message,
          readAt: n.readAt,
        },
      });
    }
  }

  console.log("Seed complete: 5 job seekers, 5 companies, 5 jobs, 4 applications.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
