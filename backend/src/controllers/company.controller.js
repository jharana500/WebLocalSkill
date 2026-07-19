const prisma = require("../lib/prisma");
const { getFileUrl } = require("../middleware/upload");

async function getProfile(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
    include: { verification: true },
  });
  if (!company)
    return res.status(404).json({ message: "Company profile not found" });
  res.json({ company });
}

async function updateProfile(req, res) {
  const { name, industry, size, website, district, address, description } =
    req.body;
  const company = await prisma.company.upsert({
    where: { userId: req.user.id },
    update: { name, industry, size, website, district, address, description },
    create: { userId: req.user.id, name: name || "" },
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
      panDocumentUrl: panDocUrl,
      registrationCertUrl: regCertUrl,
      status: "PENDING",
    },
    create: {
      companyId: company.id,
      panNumber: req.body.panNumber,
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

async function getDashboardStats(req, res) {
  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const [activeJobs, totalApplications, shortlisted, hired] = await Promise.all(
    [
      prisma.job.count({ where: { companyId: company.id, isActive: true } }),
      prisma.application.count({ where: { job: { companyId: company.id } } }),
      prisma.application.count({
        where: { job: { companyId: company.id }, status: "SHORTLISTED" },
      }),
      prisma.application.count({
        where: { job: { companyId: company.id }, status: "HIRED" },
      }),
    ],
  );

  const recentApplicants = await prisma.application.findMany({
    where: { job: { companyId: company.id } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      job: { select: { title: true } },
      user: {
        select: {
          profile: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  const sevenWeeksAgo = new Date();
  sevenWeeksAgo.setDate(sevenWeeksAgo.getDate() - 49);

  const weeklyApplications = await prisma.application.findMany({
    where: {
      job: { companyId: company.id },
      createdAt: { gte: sevenWeeksAgo },
    },
    select: { createdAt: true, status: true },
  });

  const chartData = buildWeeklyChart(weeklyApplications);
  const funnelStages = [
    { label: "Applied", count: totalApplications, color: "#3b82f6" },
    {
      label: "Reviewing",
      count: await prisma.application.count({
        where: { job: { companyId: company.id }, status: "REVIEWING" },
      }),
      color: "#8b5cf6",
    },
    { label: "Shortlisted", count: shortlisted, color: "#f59e0b" },
    { label: "Hired", count: hired, color: "#10b981" },
  ];

  res.json({
    stats: { activeJobs, totalApplications, shortlisted, hired },
    chartData,
    funnelStages,
    recentApplicants,
  });
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

  res.json({
    appTrend,
    jobPerformance,
    funnel,
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
