const prisma = require("../lib/prisma");

const COMPANY_SUFFIXES = [
  "private limited",
  "pvt ltd",
  "pvt. ltd.",
  "pvt",
  "private",
  "limited",
  "ltd",
  "company",
  "co",
  "incorporated",
  "inc",
  "corporation",
  "corp",
];

// Generic industry/marketing words that are too common to count as a
// meaningful name match on their own (the brief explicitly forbids
// flagging duplicates on these alone).
const GENERIC_WORDS = new Set([
  "tech",
  "technology",
  "technologies",
  "solutions",
  "solution",
  "nepal",
  "services",
  "service",
  "group",
  "international",
  "global",
  "consulting",
  "digital",
  "systems",
  "enterprise",
  "enterprises",
]);

function normalizeCompanyName(name) {
  if (!name || typeof name !== "string") return "";

  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/[.,'"()&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of COMPANY_SUFFIXES) {
    const pattern = new RegExp(`\\b${suffix}\\b`, "g");
    normalized = normalized.replace(pattern, " ");
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function meaningfulTokens(normalizedName) {
  return normalizedName.split(" ").filter((token) => token && !GENERIC_WORDS.has(token));
}

// Plain Levenshtein distance — no dependency needed for a single function.
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

// 0..1 similarity ratio, computed only over meaningful (non-generic) tokens
// so two companies that only share words like "Tech"/"Nepal" never score high.
function nameSimilarity(normalizedA, normalizedB) {
  const tokensA = meaningfulTokens(normalizedA).join(" ");
  const tokensB = meaningfulTokens(normalizedB).join(" ");
  if (!tokensA || !tokensB) return 0;
  if (tokensA === tokensB) return 1;

  const distance = levenshteinDistance(tokensA, tokensB);
  const maxLen = Math.max(tokensA.length, tokensB.length);
  return maxLen === 0 ? 0 : 1 - distance / maxLen;
}

function extractDomain(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function emailDomain(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  return email.split("@")[1].toLowerCase();
}

function classifyRisk(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function compareCompanies(target, candidate) {
  let score = 0;
  const reasons = [];

  const targetReg = target.verification?.registrationNumber?.trim();
  const candidateReg = candidate.verification?.registrationNumber?.trim();
  if (targetReg && candidateReg && targetReg.toLowerCase() === candidateReg.toLowerCase()) {
    score += 50;
    reasons.push("Registration number matches");
  }

  const targetPan = target.verification?.panNumber?.trim();
  const candidatePan = candidate.verification?.panNumber?.trim();
  if (targetPan && candidatePan && targetPan.toLowerCase() === candidatePan.toLowerCase()) {
    score += 50;
    reasons.push("Tax/PAN number matches");
  }

  const targetName = target.normalizedName || normalizeCompanyName(target.name);
  const candidateName = candidate.normalizedName || normalizeCompanyName(candidate.name);
  const exactNameMatch = targetName && candidateName && targetName === candidateName;
  if (exactNameMatch) {
    score += 35;
    reasons.push("Normalized company name matches");
  }

  const targetDomain = extractDomain(target.website);
  const candidateDomain = extractDomain(candidate.website);
  if (targetDomain && candidateDomain && targetDomain === candidateDomain) {
    score += 30;
    reasons.push("Website domain matches");
  }

  if (target.phone && candidate.phone && target.phone.trim() === candidate.phone.trim()) {
    score += 25;
    reasons.push("Phone number matches");
  }

  const targetEmailDomain = emailDomain(target.user?.email);
  const candidateEmailDomain = emailDomain(candidate.user?.email);
  if (targetEmailDomain && candidateEmailDomain && targetEmailDomain === candidateEmailDomain) {
    score += 25;
    reasons.push("Owner email domain matches");
  }

  const similarity = exactNameMatch ? 1 : nameSimilarity(targetName, candidateName);
  const sameLocation =
    target.district && candidate.district && target.district.toLowerCase() === candidate.district.toLowerCase();

  if (!exactNameMatch && similarity >= 0.85) {
    score += 20;
    reasons.push("Company name is highly similar");
  } else if (!exactNameMatch && sameLocation && similarity >= 0.6) {
    score += 10;
    reasons.push("Similar name and same location");
  }

  return { score: Math.min(score, 100), reasons };
}

const COMPANY_MATCH_SELECT = {
  id: true,
  name: true,
  normalizedName: true,
  website: true,
  phone: true,
  district: true,
  createdAt: true,
  isVerified: true,
  user: { select: { email: true } },
  verification: { select: { status: true, panNumber: true, registrationNumber: true } },
};

async function analyzeDuplicateRisk(companyId) {
  const target = await prisma.company.findUnique({
    where: { id: companyId },
    select: COMPANY_MATCH_SELECT,
  });
  if (!target) return null;

  const candidates = await prisma.company.findMany({
    where: { id: { not: companyId } },
    select: COMPANY_MATCH_SELECT,
  });

  const matches = candidates
    .map((candidate) => {
      const { score, reasons } = compareCompanies(target, candidate);
      return { candidate, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ candidate, score, reasons }) => ({
      companyId: candidate.id,
      companyName: candidate.name,
      score,
      riskLevel: classifyRisk(score),
      reasons,
      details: toComparableFields(candidate),
    }));

  const riskScore = matches[0]?.score || 0;

  return {
    company: { id: target.id, name: target.name, details: toComparableFields(target) },
    riskLevel: classifyRisk(riskScore),
    riskScore,
    matches,
  };
}

// Fields the frontend's side-by-side duplicate comparison view needs —
// intentionally excludes the owner's email address itself, only its domain.
function toComparableFields(company) {
  return {
    name: company.name,
    normalizedName: company.normalizedName || normalizeCompanyName(company.name),
    registrationNumber: company.verification?.registrationNumber || null,
    panNumber: company.verification?.panNumber || null,
    website: company.website || null,
    websiteDomain: extractDomain(company.website),
    phone: company.phone || null,
    ownerEmailDomain: emailDomain(company.user?.email),
    district: company.district || null,
    createdAt: company.createdAt,
    verificationStatus: company.verification?.status || 'PENDING',
    isVerified: company.isVerified,
  };
}

module.exports = {
  normalizeCompanyName,
  nameSimilarity,
  levenshteinDistance,
  classifyRisk,
  analyzeDuplicateRisk,
};
