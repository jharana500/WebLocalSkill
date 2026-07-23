const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/notification.controller");

router.use(authenticate);

router.get("/", ctrl.getNotifications);
router.patch("/read-all", ctrl.markAllNotificationsRead);
router.patch("/:id/read", ctrl.markNotificationRead);
router.delete("/:id", ctrl.deleteNotification);

module.exports = router;
