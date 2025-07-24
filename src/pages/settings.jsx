// src/pages/Settings.jsx
import React, { useState } from "react";
import "../styles/Settings.css";

export default function Settings() {
  const [form, setForm] = useState({
    username: "admin_user",
    email: "admin@example.com",
    password: "",
    notifications: true,
    darkMode: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic here (API)
    console.log("Updated settings:", form);
    alert("Settings updated successfully!");
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">Account Settings</h1>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter your username"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </div>

        <div className="form-options">
          <label>
            <input
              type="checkbox"
              name="notifications"
              checked={form.notifications}
              onChange={handleChange}
            />
            Enable notifications
          </label>

          <label>
            <input
              type="checkbox"
              name="darkMode"
              checked={form.darkMode}
              onChange={handleChange}
            />
            Use dark mode
          </label>
        </div>

        <button type="submit" className="btn-save">Save Changes</button>
      </form>
    </div>
  );
}
