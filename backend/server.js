require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const companyRoutes = require("./src/routes/company.routes");
const jobRoutes = require("./src/routes/job.routes");
const applicationRoutes = require("./src/routes/application.routes");
const resumeRoutes = require("./src/routes/resume.routes");
const billingRoutes = require("./src/routes/billing.routes");
const adminRoutes = require("./src/routes/admin.routes");
const { standardizeResponses, sendError } = require("./src/utils/response");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(standardizeResponses);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/companies", require("./src/routes/public.routes"));
app.use("/api/applications", applicationRoutes);
app.use("/api/saved-jobs", require("./src/routes/savedJobs.routes"));
app.use("/api/resumes", resumeRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    message: "LocalSkill backend is running",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  sendError(res, 404, "Route not found");
});

app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message =
    status >= 500 ? "Internal server error" : err.message || "Request failed";

  if (err.code === "P2002") {
    status = 409;
    message = "A record with this value already exists";
  } else if (err.code === "P2025") {
    status = 404;
    message = "Requested record was not found";
  } else if (err.name === "PrismaClientValidationError") {
    status = 400;
    message = "Invalid request data";
  }

  if (process.env.NODE_ENV !== "test") console.error(err);
  sendError(
    res,
    status,
    message,
    process.env.NODE_ENV === "development" && err.message ? [err.message] : [],
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
