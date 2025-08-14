import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Payments.css"; // Your provided CSS

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://lgb-delivery-backend.onrender.com/api/payment/admin-all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setPayments(res.data.transactions || []);
      } catch (err) {
        console.error("❌ Error fetching payments:", err);
        setError("Failed to fetch payment records.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case "success":
        return "payment-status successful";
      case "pending":
        return "payment-status pending";
      case "failed":
      default:
        return "payment-status failed";
    }
  };

  return (
    <div className="payments-container">
      <h1 className="payments-title">All Payment Records</h1>

      {loading ? (
        <p>Loading payments...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : payments.length === 0 ? (
        <p>No payment records.</p>
      ) : (
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Invoice ID</th>
                <th>Product</th>
                <th>Amount ($)</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment._id}>
                  <td>{index + 1}</td>
                  <td>
                    {payment.userId?.name || "Unknown"} <br />
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {payment.userId?.email}
                    </span>
                  </td>
                  <td>{payment.invoiceId}</td>
                  <td>{payment.productTitle}</td>
                  <td>{payment.amount.toFixed(2)}</td>
                  <td>
                    <span className={getStatusClass(payment.status)}>
                      {payment.status}
                    </span>
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;
