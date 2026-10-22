const express = require("express");
const router = express.Router();
const ensureAuthenticated = require("../middleware/ensureAuthenticated");

const {listNotifications,getUnreadCount,markNotificationRead,markAllNotificationsRead,} = require("../controllers/notificationController");

router.get("/unread-count",ensureAuthenticated,getUnreadCount);

router.get("/",ensureAuthenticated,listNotifications);

router.patch("/read-all",ensureAuthenticated,markAllNotificationsRead);

router.patch("/:notificationId/read",ensureAuthenticated,markNotificationRead);

module.exports = router;