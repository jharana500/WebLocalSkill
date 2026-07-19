const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const ctrl = require("../controllers/application.controller");

router.get(
  "/company",
  authenticate,
  requireRole("company", "employer"),
  ctrl.getCompanyApplications,
);
router.get(
  "/me",
  authenticate,
  requireRole("job_seeker"),
  ctrl.getMyApplications,
);
router.post("/", authenticate, requireRole("job_seeker"), ctrl.applyToJob);
router.get("/:id", authenticate, ctrl.getApplicationById);
router.patch(
  "/:id/withdraw",
  authenticate,
  requireRole("job_seeker"),
  ctrl.withdrawApplication,
);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("company", "employer"),
  ctrl.updateApplicationStatus,
);

module.exports = router;
