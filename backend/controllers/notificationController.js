const mongoose = require("mongoose");
const {getUserNotifications,getUnreadNotificationCount,markNotificationAsRead,markAllNotificationsAsRead,} = require("../services/notificationService");

const listNotifications = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit,10);

    const limit = Number.isNaN(requestedLimit)? 20: Math.min(Math.max(requestedLimit, 1), 50);

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(req.user._id, limit),
      getUnreadNotificationCount(req.user._id),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("List notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount =
      await getUnreadNotificationCount(req.user._id);

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread count error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const markNotificationRead = async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.isValidObjectId(notificationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification ID",
    });
  }

  try {
    const notification = await markNotificationAsRead(
      notificationId,
      req.user._id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const modifiedCount =
      await markAllNotificationsAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {listNotifications,getUnreadCount,markNotificationRead,markAllNotificationsRead,};