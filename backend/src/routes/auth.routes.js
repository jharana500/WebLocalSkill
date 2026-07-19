const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.getMe);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.post("/refresh", (req, res) => {
  res.status(501).json({ message: "Refresh token not implemented" });
});

module.exports = router;
