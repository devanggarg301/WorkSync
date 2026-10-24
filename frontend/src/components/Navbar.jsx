import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {Bell,CheckCheck} from "lucide-react";

import Brand from "./Brand";
import api from "../api/client";

function formatNotificationDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationContent({ notification }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          {notification.title}
        </p>

        {!notification.readAt && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600"
            aria-label="Unread"
          />
        )}
      </div>

      <p className="mt-1 text-sm leading-5 text-slate-600">
        {notification.message}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {notification.actorId?.username && (
          <span>
            By {notification.actorId.username}
          </span>
        )}

        <time dateTime={notification.createdAt}>
          {formatNotificationDate(notification.createdAt)}
        </time>
      </div>
    </div>
  );
}

function Navbar({variant = "public",onLogout,loggingOut = false,}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isNotificationsOpen, setIsNotificationsOpen] =
    useState(false);

  const [notificationsLoading, setNotificationsLoading] =
    useState(true);

  const [notificationError, setNotificationError] =
    useState("");

  const loadNotifications = useCallback(
    async (silent = false) => {
      if (variant !== "dashboard") return;

      if (!silent) {
        setNotificationsLoading(true);
      }

      try {
        const response = await api.get("/notifications", {
          params: { limit: 20 },
        });

        setNotifications(
          response.data.notifications || []
        );

        setUnreadCount(response.data.unreadCount ?? 0);
        setNotificationError("");
      } catch (error) {
        setNotificationError(
          error.response?.data?.message ||
            "Unable to load notifications."
        );
      } finally {
        if (!silent) {
          setNotificationsLoading(false);
        }
      }
    },
    [variant]
  );

  useEffect(() => {
    if (variant !== "dashboard") return;

    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications(true);
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [variant, loadNotifications]);

  const markNotificationAsRead = async (notification) => {
  if (notification.readAt) return true;

  try {
    const response = await api.patch(
      `/notifications/${notification._id}/read`
    );

    const savedNotification = response.data.notification;

    const readAt =
      savedNotification?.readAt || new Date().toISOString();

    setNotifications((currentNotifications) =>
      currentNotifications.map((item) =>
        item._id === notification._id
          ? { ...item, readAt }
          : item
      )
    );
    setUnreadCount((currentCount) =>
      Math.max(0, currentCount - 1)
    );

    setNotificationError("");
    return true;
  } catch (error) {
    setNotificationError(
      error.response?.data?.message ||
        "Unable to mark notification as read."
    );

    return false;
  }
};

const handleNotificationClick = async (notification) => {
  setIsNotificationsOpen(false);

  await markNotificationAsRead(notification);
};

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      const readAt = new Date().toISOString();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt || readAt,
        }))
      );

      setUnreadCount(0);
      setNotificationError("");
    } catch (error) {
      setNotificationError(
        error.response?.data?.message ||
          "Unable to mark notifications as read."
      );
    }
  };

  return (
    <header className="relative z-40 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:px-12">
      <Brand />

      {variant === "dashboard" ? (
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative">
            <button
              type="button"
              aria-label={`Notifications, ${unreadCount} unread`}
              aria-expanded={isNotificationsOpen}
              onClick={() => {
                setIsNotificationsOpen((isOpen) => !isOpen);

                if (!isNotificationsOpen) {
                  void loadNotifications();
                }
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <section
                aria-label="Notifications"
                className="absolute right-0 top-full mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Notifications
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount} unread
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleMarkAllAsRead()}
                    disabled={unreadCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCheck size={15} />
                    Mark all read
                  </button>
                </div>

                {notificationError && (
                  <div
                    role="alert"
                    className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"
                  >
                    {notificationError}
                  </div>
                )}

                <div className="max-h-[min(28rem,65vh)] overflow-y-auto">
                  {notificationsLoading &&
                  notifications.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                      Loading notifications...
                    </p>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell
                        size={24}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        You're all caught up
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        New notifications will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((notification) => {
                        const destination =
                          notification.workspaceId &&
                          notification.projectId
                            ? `/workspaces/${notification.workspaceId}/projects/${notification.projectId}`
                            : null;

                        const content = (
                          <NotificationContent
                            notification={notification}
                          />
                        );

                        return (
                        <li
                          key={notification._id}
                          className={`flex items-stretch ${
                            !notification.readAt ? "bg-indigo-50/40" : ""
                          }`}
                        >
                          {/* Left side: click to open the project */}
                          {destination ? (
                            <Link
                            to={destination}
                            state={
                              notification.taskId
                                ? { openTaskId: notification.taskId }
                                : undefined
                            }
                            onClick={() =>
                              void handleNotificationClick(notification)
                            }
                            className="min-w-0 flex-1 transition hover:bg-slate-50"
                          >
                            {content}
                          </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void handleNotificationClick(notification)
                              }
                              className="min-w-0 flex-1 text-left transition hover:bg-slate-50"
                            >
                              {content}
                            </button>
                          )}

                          {/* Right side: click to mark as read */}
                          {!notification.readAt && (
                            <button
                              type="button"
                              title="Mark as read"
                              aria-label={`Mark "${notification.title}" as read`}
                              onClick={() =>
                                void markNotificationAsRead(notification)
                              }
                              className="m-2 inline-flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <CheckCheck size={17} />
                            </button>
                          )}
                        </li>
                      );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t border-slate-100 px-4 py-2">
                  <p className="text-center text-xs text-slate-400">
                    Showing the 20 most recent notifications
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Existing logout button */}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      ) : (
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Navbar;