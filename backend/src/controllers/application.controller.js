const prisma = require("../lib/prisma");
const { buildNotification } = require("../services/notificationService");

async function applyToJob(req, res) {
  const { jobId, coverLetter, resumeUrl } = req.body;
  if (!jobId) return res.status(400).json({ message: "Job ID is required" });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || !job.isActive)
    return res.status(404).json({ message: "Job not found or inactive" });
  if (job.deadline && job.deadline < new Date())
    return res
      .status(400)
      .json({ message: "The application deadline for this job has passed" });

  const existing = await prisma.application.findUnique({
    where: { jobId_userId: { jobId, userId: req.user.id } },
  });
  if (existing)
    return res
      .status(409)
      .json({ message: "You have already applied to this job" });

  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId: req.user.id },
  });
  const resolvedResumeUrl = resumeUrl || profile?.resumeUrl;

  const application = await prisma.application.create({
    data: {
      jobId,
      userId: req.user.id,
      coverLetter,
      resumeUrl: resolvedResumeUrl,
    },
    include: {
      job: { select: { title: true, company: { select: { name: true } } } },
    },
  });
  res.status(201).json({ application });
}

async function getMyApplications(req, res) {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { userId: req.user.id };
  if (status) where.status = status.toUpperCase();

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                isVerified: true,
                district: true,
              },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    applications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

async function getApplicationById(req, res) {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      job: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              isVerified: true,
              phone: false,
              website: true,
            },
          },
        },
      },
    },
  });
  if (!application)
    return res.status(404).json({ message: "Application not found" });

  const contactVisible =
    application.status === "SHORTLISTED" || application.status === "HIRED";

  res.json({ application, contactVisible });
}

async function withdrawApplication(req, res) {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!application)
    return res.status(404).json({ message: "Application not found" });
  if (application.status === "WITHDRAWN") {
    return res.status(400).json({ message: "Application already withdrawn" });
  }

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: { status: "WITHDRAWN" },
  });
  res.json({ application: updated });
}

async function getJobApplications(req, res) {
  const { jobId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: company.id },
  });
  if (!job) return res.status(404).json({ message: "Job not found" });

  const skip = (Number(page) - 1) * Number(limit);
  const where = { jobId };
  if (status) where.status = status.toUpperCase();

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                district: true,
                skills: true,
                resumeUrl: true,
                education: true,
                experience: true,
              },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    applications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

const ALLOWED_APPLICATION_TRANSITIONS = {
  PENDING: ["REVIEWING", "SHORTLISTED", "REJECTED"],
  REVIEWING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const APPLICATION_STATUS_NOTIFICATION = {
  REVIEWING: (jobTitle) => `Your application for "${jobTitle}" is now under review.`,
  SHORTLISTED: (jobTitle) => `You've been shortlisted for "${jobTitle}".`,
  REJECTED: (jobTitle) => `Your application for "${jobTitle}" was not selected this time.`,
  HIRED: (jobTitle) => `Congratulations! You've been selected for "${jobTitle}".`,
};

async function updateApplicationStatus(req, res) {
  const { status, notes } = req.body;
  const nextStatus = status?.toUpperCase();
  const validStatuses = ["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"];
  if (!validStatuses.includes(nextStatus)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const company = await prisma.company.findUnique({
    where: { userId: req.user.id },
  });
  if (!company) return res.status(404).json({ message: "Company not found" });

  const application = await prisma.application.findFirst({
    where: { id: req.params.id, job: { companyId: company.id } },
    include: { job: { select: { title: true } } },
  });
  if (!application)
    return res.status(404).json({ message: "Application not found" });

  const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] || [];
  if (!allowed.includes(nextStatus)) {
    return res.status(409).json({
      message: `Cannot move an application from ${application.status} to ${nextStatus}`,
    });
  }

  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id: req.params.id },
      data: { status: nextStatus, notes },
    }),
    buildNotification({
      userId: application.userId,
      type: "APPLICATION_STATUS",
      title: "Application update",
      message: APPLICATION_STATUS_NOTIFICATION[nextStatus](application.job.title),
      data: { applicationId: application.id, status: nextStatus },
    }),
  ]);
  res.json({ application: updated });
}

async function getCompanyApplications(req, res) {
  try {
    const rawPage = Number.parseInt(req.query.page, 10);
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limitNum =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const { status, search } = req.query;
    const currentUserId = req.user?.id || req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const emptyResponse = {
      applications: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
    };

    const company = await prisma.company.findUnique({
      where: { userId: currentUserId },
      select: { id: true },
    });

    if (!company) {
      return res.json({
        message: "Company applications fetched successfully",
        ...emptyResponse,
      });
    }

    const where = { job: { companyId: company.id } };
    if (status && status !== "all") where.status = String(status).toUpperCase();
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { user: { email: { contains: term, mode: "insensitive" } } },
        {
          user: {
            profile: { firstName: { contains: term, mode: "insensitive" } },
          },
        },
        {
          user: {
            profile: { lastName: { contains: term, mode: "insensitive" } },
          },
        },
        { job: { title: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  district: true,
                  skills: true,
                  resumeUrl: true,
                },
              },
              resume: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { id: true, name: true, logoUrl: true } },
            },
          },
        },
      }),
    ]);

    return res.json({
      message: "Company applications fetched successfully",
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("GET_COMPANY_APPLICATIONS_ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company applications",
      ...(process.env.NODE_ENV === "development"
        ? { errors: [error.message] }
        : { errors: [] }),
    });
  }
}

module.exports = {
  applyToJob,
  getMyApplications,
  getApplicationById,
  withdrawApplication,
  getJobApplications,
  updateApplicationStatus,
  getCompanyApplications,
};
