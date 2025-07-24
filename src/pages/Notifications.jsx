// src/pages/Notifications.jsx
import React, { useState, useEffect } from "react";
import "../styles/Notifications.css";
import { FaBell, FaExclamationCircle, FaCheckCircle, FaInfoCircle } from "react-icons/fa";

const mockNotifications = [
  {
    id: 1,
    title: "Payment Received",
    message: "You received $120 from Mohamed Ali.",
    type: "success",
    time: "2 mins ago",
  },
  {
    id: 2,
    title: "Low Inventory Warning",
    message: "Only 5 Gas Cylinders remaining.",
    type: "warning",
    time: "10 mins ago",
  },
  {
    id: 3,
    title: "Order Failed",
    message: "Transaction TXN-1021 was not successful.",
    type: "error",
    time: "30 mins ago",
  },
  {
    id: 4,
    title: "New User Registered",
    message: "Ayan Yusuf just signed up.",
    type: "info",
    time: "1 hour ago",
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setNotifications(mockNotifications); // Replace with API
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case "success": return <FaCheckCircle />;
      case "warning": return <FaExclamationCircle />;
      case "error": return <FaExclamationCircle />;
      case "info": return <FaInfoCircle />;
      default: return <FaBell />;
    }
  };

  return (
    <div className="notifications-container">
      <h1 className="notifications-title">Notifications</h1>

      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div key={notif.id} className={`notification-card ${notif.type}`}>
              <div className="notif-icon">{getIcon(notif.type)}</div>
              <div className="notif-content">
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
                <span className="notif-time">{notif.time}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="no-notifs">No notifications to show.</p>
        )}
      </div>
    </div>
  );
}
