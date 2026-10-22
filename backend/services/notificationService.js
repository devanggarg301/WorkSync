const Notification = require("../models/Notification");

const createNotification = async (notificationData) => {
  return Notification.create(notificationData);
};

const getUserNotifications = async (userId, limit = 20) => {
  return Notification.find({
    recipientId: userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "actorId",
      select: "username avatarUrl",
    });
};

const getUnreadNotificationCount = async (userId) => {
  return Notification.countDocuments({
    recipientId: userId,
    readAt: null,
  });
};

const markNotificationAsRead = async (
  notificationId,
  userId
) => {
  const updatedNotification =
    await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: userId,
        readAt: null,
      },
      {
        $set: {
          readAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

  if (updatedNotification) {
    return updatedNotification;
  }
  return Notification.findOne({
    _id: notificationId,
    recipientId: userId,
  });
};

const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    {
      recipientId: userId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

module.exports = {createNotification,getUserNotifications,getUnreadNotificationCount,markNotificationAsRead,markAllNotificationsAsRead};