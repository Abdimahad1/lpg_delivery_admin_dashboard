import React, { useEffect, useState } from 'react';
import { FaUsers, FaShoppingCart, FaMoneyBillWave, FaSync } from 'react-icons/fa';
import axios from 'axios';
import '../styles/Dashboard.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: null,
    totalOrders: null,
    totalPayments: null,
    isLoading: true,
    error: null
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      };

      const endpoints = [
        '/admin/total-users',
        '/admin/total-orders',
        '/admin/total-successful-payments',
        '/admin/recent-transactions'
      ];

      const responses = await Promise.all(
        endpoints.map(endpoint => 
          axios.get(`${baseURL}${endpoint}`, { headers })
            .then(res => {
              console.log(`${endpoint} response:`, res.data);
              return res.data;
            })
            .catch(err => {
              console.error(`${endpoint} error:`, err.response?.data || err.message);
              throw err;
            })
        )
      );

      setStats({
        totalUsers: responses[0].totalUsers ?? 0,
        totalOrders: responses[1].totalOrders ?? 0,
        totalPayments: responses[2].totalSuccessfulPayments ?? 0,
        isLoading: false,
        error: null
      });

      setRecentTransactions(responses[3].recentTransactions || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: err.response?.data?.message || 'Failed to load dashboard data'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setStats(prev => ({ ...prev, isLoading: true }));
    fetchDashboardData();
  };

  if (stats.isLoading) {
    return (
      <div className="dashboard-main-content">
        <p style={{ fontSize: '18px', textAlign: 'center', marginTop: '60px', color: '#6b7280' }}>
          Loading dashboard data...
        </p>
      </div>
    );
  }
  

  return (
    <div className="dashboard-main-content">
      <div className="dashboard-header">
        <h1 className="dashboard-main-title">Dashboard</h1>
        <button 
          onClick={handleRefresh}
          className="refresh-button"
          disabled={stats.isLoading}
        >
          <FaSync className={stats.isLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {stats.error && (
        <div className="dashboard-error-alert">
          {stats.error}
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      <div className="dashboard-section-container">
        <div className="section-header">
          <h2 className="dashboard-section-heading">System Overview</h2>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="dashboard-stats-container">
          <StatCard 
            icon={<FaUsers />}
            title="Total Users"
            value={stats.totalUsers}
            loading={stats.isLoading}
            variant="users"
          />
          <StatCard 
            icon={<FaShoppingCart />}
            title="Total Orders"
            value={stats.totalOrders}
            loading={stats.isLoading}
            variant="orders"
          />
          <StatCard 
            icon={<FaMoneyBillWave />}
            title="Total Payments"
            value={stats.totalPayments}
            loading={stats.isLoading}
            variant="payments"
          />
        </div>
      </div>

      <div className="dashboard-section-container">
        <h3 className="dashboard-section-heading">Recent Transactions</h3>
        <TransactionTable transactions={recentTransactions} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, loading, variant }) => (
  <div className={`dashboard-stat-card stat-card-${variant}`}>
    <div className="stat-card-icon">
      {React.cloneElement(icon, { className: `stat-icon-${variant}` })}
    </div>
    <div className="stat-card-content">
      <h3>{title}</h3>
      <p>{loading ? '...' : value}</p>
    </div>
  </div>
);

const TransactionTable = ({ transactions }) => (
  <table className="dashboard-transactions-table">
    <thead>
      <tr>
        <th>User</th>
        <th>Date</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {transactions.length === 0 ? (
        <tr><td colSpan="4">No transactions found</td></tr>
      ) : (
        transactions.map((txn) => (
          <tr key={txn._id}>
            <td>{txn.customerName || 'N/A'}</td>
            <td>{new Date(txn.timestamp).toLocaleDateString()}</td>
            <td>${txn.amount?.toFixed(2)}</td>
            <td className={`transaction-status transaction-status-${txn.status}`}>
              {txn.status}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

export default Dashboard;
