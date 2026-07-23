const prisma = require("../lib/prisma");
const { getFileUrl } = require("../middleware/upload");
const { normalizeCompanyName } = require("../services/companyDuplicateService");

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const CURRENT_YEAR = new Date().getFullYear();
const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_TAGLINE_LENGTH = 150;

async function getProfile(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
    include: { verification: true },
  });
  if (!company)
    return res.status(404).json({ message: "Company profile not found" });
  res.json({ company });
}

function validateProfilePayload(body) {
  if (body.email && !EMAIL_PATTERN.test(body.email)) {
    return "Enter a valid careers email address";
  }
  if (body.website) {
    const value = String(body.website).trim();
    if (value && !/^https?:\/\/.+\..+/i.test(value) && !/^[\w-]+\.[a-z]{2,}/i.test(value)) {
      return "Enter a valid website URL";
    }
  }
  if (body.foundedYear !== undefined && body.foundedYear !== "" && body.foundedYear !== null) {
    const year = Number.parseInt(body.foundedYear, 10);
    if (!Number.isFinite(year) || year < 1800 || year > CURRENT_YEAR) {
      return `Founded year must be between 1800 and ${CURRENT_YEAR}`;
    }
  }
  if (body.description && String(body.description).length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be under ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  if (body.tagline && String(body.tagline).length > MAX_TAGLINE_LENGTH) {
    return `Tagline must be under ${MAX_TAGLINE_LENGTH} characters`;
  }
  return null;
}

async function updateProfile(req, res) {
  const {
    name, tagline, industry, size, foundedYear, email, phone, website,
    district, address, description,
  } = req.body;

  const validationError = validateProfilePayload(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError, errors: [] });
  }

  const normalizedName = name !== undefined ? normalizeCompanyName(name) : undefined;
  const parsedFoundedYear =
    foundedYear === undefined
      ? undefined
      : foundedYear === "" || foundedYear === null
        ? null
        : Number.parseInt(foundedYear, 10);

  const company = await prisma.company.upsert({
    where: { userId: req.user.id },
    update: {
      name, normalizedName, tagline, industry, size,
      foundedYear: parsedFoundedYear, email, phone, website, district, address, description,
    },
    create: {
      userId: req.user.id,
      name: name || "",
      normalizedName: normalizeCompanyName(name || ""),
      tagline, industry, size, foundedYear: parsedFoundedYear, email, phone, website, district, address, description,
    },
  });
  res.json({ company });
}

async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const logoUrl = getFileUrl(req, req.file.path);
  const company = await prisma.company.update({
    where: { userId: req.user.id },
    data: { logoUrl },
  });
  res.json({ logoUrl: company.logoUrl });
}

async function submitVerification(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const panDocUrl = req.files?.panDoc?.[0]
    ? getFileUrl(req, req.files.panDoc[0].path)
    : req.body.panDocumentUrl;
  const regCertUrl = req.files?.registrationCert?.[0]
    ? getFileUrl(req, req.files.registrationCert[0].path)
    : req.body.registrationCertUrl;

  const verification = await prisma.companyVerification.upsert({
    where: { companyId: company.id },
    update: {
      panNumber: req.body.panNumber,
      registrationNumber: req.body.registrationNumber,
      panDocumentUrl: panDocUrl,
      registrationCertUrl: regCertUrl,
      status: "PENDING",
      reviewNotes: null,
      reviewedById: null,
      reviewedAt: null,
      duplicateOfCompanyId: null,
    },
    create: {
      companyId: company.id,
      panNumber: req.body.panNumber,
      registrationNumber: req.body.registrationNumber,
      panDocumentUrl: panDocUrl,
      registrationCertUrl: regCertUrl,
    },
  });
  res.status(201).json({ verification });
}

async function getVerificationStatus(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });
  const verification = await prisma.companyVerification.findUnique({
    where: { companyId: company.id },
  });
  res.json({
    verification: verification || null,
    isVerified: company.isVerified,
  });
}

function calculateProfileCompletion(company) {
  const checks = [
    company.name,
    company.description,
    company.industry,
    company.email,
    company.phone,
    company.website,
    company.district,
    company.logoUrl,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function buildRecentActivity(recentApplications, recentJobs) {
  const events = [
    ...recentApplications.map((a) => ({
      type: "application_received",
      message: `New application for "${a.job?.title || "a job"}"`,
      time: a.createdAt,
    })),
    ...recentJobs.map((j) => ({
      type: j.status === "ACTIVE" ? "job_published" : "job_created",
      message: j.status === "ACTIVE" ? `Published "${j.title}"` : `Saved draft "${j.title}"`,
      time: j.createdAt,
    })),
  ];
  return events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
}

async function getDashboardStats(req, res, next) {
  try {
    const company = await prisma.company.findUnique({
      where: { userId: req.user.id },
      include: { verification: { select: { status: true } } },
    });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const [
      totalJobs, activeJobs, draftJobs, closedJobs,
      totalApplications, pendingApplications, shortlistedApplications,
      rejectedApplications, acceptedApplications, unreadNotifications,
    ] = await Promise.all([
      prisma.job.count({ where: { companyId: company.id } }),
      prisma.job.count({ where: { companyId: company.id, status: "ACTIVE" } }),
      prisma.job.count({ where: { companyId: company.id, status: "DRAFT" } }),
      prisma.job.count({ where: { companyId: company.id, status: "CLOSED" } }),
      prisma.application.count({ where: { job: { companyId: company.id } } }),
      prisma.application.count({ where: { job: { companyId: company.id }, status: "PENDING" } }),
      prisma.application.count({ where: { job: { companyId: company.id }, status: "SHORTLISTED" } }),
      prisma.application.count({ where: { job: { companyId: company.id }, status: "REJECTED" } }),
      prisma.application.count({ where: { job: { companyId: company.id }, status: "HIRED" } }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);

    const [recentApplications, recentJobs, reviewingCount] = await Promise.all([
      prisma.application.findMany({
        where: { job: { companyId: company.id } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          job: { select: { id: true, title: true } },
          user: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      }),
      prisma.job.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { applications: true } } },
      }),
      prisma.application.count({ where: { job: { companyId: company.id }, status: "REVIEWING" } }),
    ]);

    const sevenWeeksAgo = new Date();
    sevenWeeksAgo.setDate(sevenWeeksAgo.getDate() - 49);

    const weeklyApplications = await prisma.application.findMany({
      where: { job: { companyId: company.id }, createdAt: { gte: sevenWeeksAgo } },
      select: { createdAt: true, status: true },
    });

    const applicationsOverTime = buildWeeklyChart(weeklyApplications);

    const applicationStatusDistribution = [
      { status: "PENDING", count: pendingApplications },
      { status: "REVIEWING", count: reviewingCount },
      { status: "SHORTLISTED", count: shortlistedApplications },
      { status: "HIRED", count: acceptedApplications },
      { status: "REJECTED", count: rejectedApplications },
    ];

    const topJobs = await prisma.job.findMany({
      where: { companyId: company.id },
      orderBy: { applications: { _count: "desc" } },
      take: 5,
      include: { _count: { select: { applications: true } } },
    });
    const topPerformingJobs = topJobs.map((j) => ({
      id: j.id,
      title: j.title,
      applications: j._count.applications,
    }));

    const recentActivity = buildRecentActivity(recentApplications, recentJobs);

    res.json({
      success: true,
      message: "Company dashboard fetched successfully",
      data: {
        metrics: {
          totalJobs,
          activeJobs,
          draftJobs,
          closedJobs,
          totalApplications,
          pendingApplications,
          shortlistedApplications,
          rejectedApplications,
          acceptedApplications,
          interviewsScheduled: 0,
          unreadNotifications,
          profileCompletion: calculateProfileCompletion(company),
          verificationStatus: company.verification?.status || "PENDING",
        },
        recentApplications,
        recentJobs,
        applicationStatusDistribution,
        applicationsOverTime,
        topPerformingJobs,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
}

function buildWeeklyChart(applications) {
  const weeks = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const weekApps = applications.filter(
      (a) => a.createdAt >= start && a.createdAt <= end,
    );
    weeks.push({
      week: `W${7 - i}`,
      applications: weekApps.length,
      shortlisted: weekApps.filter((a) => a.status === "SHORTLISTED").length,
    });
  }
  return weeks;
}

async function getAnalytics(req, res) {
  const { range = "30d" } = req.query;
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "12m" ? 365 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const apps = await prisma.application.findMany({
    where: { job: { companyId: company.id }, createdAt: { gte: since } },
    select: { createdAt: true, status: true, jobId: true },
    orderBy: { createdAt: "asc" },
  });

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      title: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const total = apps.length;
  const shortlisted = apps.filter((a) => a.status === "SHORTLISTED").length;
  const hired = apps.filter((a) => a.status === "HIRED").length;
  const reviewing = apps.filter((a) => a.status === "REVIEWING").length;

  const appTrend = buildDailyTrend(apps, days > 30 ? "week" : "day");

  const jobPerformance = jobs.map((j) => ({
    title: j.title,
    applications: j._count.applications,
    shortlisted: apps.filter(
      (a) => a.jobId === j.id && a.status === "SHORTLISTED",
    ).length,
  }));

  const funnel = [
    { label: "Applied", count: total },
    { label: "Reviewing", count: reviewing },
    { label: "Shortlisted", count: shortlisted },
    { label: "Hired", count: hired },
  ];

  const [activeJobCount, draftJobCount, closedJobCount] = await Promise.all([
    prisma.job.count({ where: { companyId: company.id, status: "ACTIVE" } }),
    prisma.job.count({ where: { companyId: company.id, status: "DRAFT" } }),
    prisma.job.count({ where: { companyId: company.id, status: "CLOSED" } }),
  ]);

  const totalJobCount = activeJobCount + draftJobCount + closedJobCount;
  const averageApplicationsPerJob = totalJobCount > 0 ? Number((total / totalJobCount).toFixed(1)) : 0;
  const jobsByStatus = [
    { status: "ACTIVE", count: activeJobCount },
    { status: "DRAFT", count: draftJobCount },
    { status: "CLOSED", count: closedJobCount },
  ];

  res.json({
    appTrend,
    jobPerformance,
    funnel,
    jobsByStatus,
    averageApplicationsPerJob,
    summary: { total, shortlisted, hired },
  });
}

function buildDailyTrend(applications, unit) {
  const grouped = {};
  applications.forEach((a) => {
    const key =
      unit === "week"
        ? `W${getWeekNumber(a.createdAt)}`
        : a.createdAt.toISOString().slice(0, 10);
    grouped[key] = (grouped[key] || 0) + 1;
  });
  return Object.entries(grouped).map(([date, count]) => ({
    date,
    applications: count,
  }));
}

function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7);
}

async function getBillingHistory(req, res) {
  res.json({
    message: "Billing history fetched successfully",
    history: [],
  });
}

async function getSubscription(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
    select: { plan: true },
  });
  const plan = company?.plan || "FREE";
  res.json({
    message: "Subscription fetched successfully",
    subscription: {
      plan,
      status: "active",
      amount: 0,
      currency: "NPR",
      renewalDate: null,
    },
    plan,
  });
}

async function updateSubscription(req, res) {
  const { plan } = req.body;
  const validPlans = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"];
  if (!validPlans.includes(plan?.toUpperCase())) {
    return res.status(400).json({ message: "Invalid plan" });
  }
  const company = await prisma.company.update({
    where: { userId: req.user.id },
    data: { plan: plan.toUpperCase() },
  });
  res.json({
    message: "Subscription updated successfully",
    subscription: {
      plan: company.plan,
      status: "active",
      amount: 0,
      currency: "NPR",
      renewalDate: null,
    },
    plan: company.plan,
  });
}

module.exports = {
  getProfile,
  updateProfile,
  uploadLogo,
  submitVerification,
  getVerificationStatus,
  getDashboardStats,
  getAnalytics,
  getBillingHistory,
  getSubscription,
  updateSubscription,
};
