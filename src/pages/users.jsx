// src/pages/Users.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaTrash, FaUserPlus, FaUserSlash } from "react-icons/fa";
import "../styles/users.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filters, setFilters] = useState({ role: "All", status: "All" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "Customer"
  });
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseURL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.users || [];
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      Swal.fire("Error", "Failed to load users", "error");
    }
  };

  const applyFilters = () => {
    let filtered = [...users];
    if (filters.role !== "All") {
      filtered = filtered.filter(u => u.role === filters.role);
    }
    if (filters.status !== "All") {
      filtered = filtered.filter(u => (u.status || "Active") === filters.status);
    }
    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (user) => {
    const isSuspended = user.status === "Suspended";
  
    const confirm = await Swal.fire({
      title: isSuspended ? "Reactivate User?" : "Suspend User?",
      text: isSuspended
        ? "This will reactivate the user account."
        : "This will suspend the user account.",
      icon: isSuspended ? "info" : "warning",
      showCancelButton: true,
      confirmButtonText: isSuspended ? "Yes, reactivate" : "Yes, suspend"
    });
  
    if (!confirm.isConfirmed) return;
  
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${baseURL}/admin/users/${user._id}`,
        { status: isSuspended ? "Active" : "Suspended" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire(
        isSuspended ? "Reactivated!" : "Suspended!",
        `User account has been ${isSuspended ? "re-activated" : "suspended"}.`,
        "success"
      );
      fetchUsers();
    } catch (err) {
      console.error("Status toggle error:", err);
      Swal.fire("Error", "Could not update user status", "error");
    }
  };
  

  const handleDelete = async (userId) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This action will permanently delete the user.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete"
    });

    if (!confirm.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire("Deleted!", "User has been removed.", "success");
      fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire("Error", "Could not delete user", "error");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${baseURL}/admin/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire("Success", "User created successfully", "success");
      setFormData({ name: "", email: "", phone: "", password: "", role: "Customer" });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      console.error("Create user error:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to create user", "error");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  return (
    <div className="users-container">
      <h1 className="users-title">Users Management</h1>

      <div className="filter-bar">
        <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="All">All Roles</option>
          <option value="Customer">Customer</option>
          <option value="Vendor">Vendor</option>
          <option value="DeliveryPerson">Delivery Person</option>
          <option value="Admin">Admin</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
        <button className="add-user-button" onClick={() => setShowForm(!showForm)}>
          <FaUserPlus /> {showForm ? "Cancel" : "Add New User"}
        </button>
      </div>

      {showForm && (
        <form className="create-user-form" onSubmit={handleCreateUser}>
          <input type="text" placeholder="Full Name" value={formData.name} required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <input type="email" placeholder="Email" value={formData.email} required onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <input type="text" placeholder="Phone" value={formData.phone} required onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <input type="password" placeholder="Password" value={formData.password} required onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
            <option value="Customer">Customer</option>
            <option value="Vendor">Vendor</option>
            <option value="DeliveryPerson">Delivery Person</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" className="submit-user-btn">Create</button>
        </form>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user._id}>
                  <td>{index + 1}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`status-badge ${user.status?.toLowerCase() || "active"}`}>
                      {user.status || "Active"}
                    </span>
                  </td>
                  <td>
                  <button
                    className={`btn-suspend ${user.status === "Suspended" ? "unsuspend" : ""}`}
                    onClick={() => handleToggleStatus(user)}
                  >
                    <FaUserSlash /> {user.status === "Suspended" ? "Unsuspend" : "Suspend"}
                  </button>


                    <button className="btn-delete" onClick={() => handleDelete(user._id)}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
