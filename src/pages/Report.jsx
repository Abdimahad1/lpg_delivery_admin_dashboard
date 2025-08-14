import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaFileAlt,
  FaCalendarAlt,
  FaDownload,
  FaFilter,
  FaUsers,
  FaShoppingCart,
  FaBox,
  FaMoneyBillWave
} from 'react-icons/fa';
import { DateRangePicker } from 'react-date-range';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import '../styles/Report.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const Report = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    users: [],
    products: [],
    orders: [],
    payments: [],
    stats: {}
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const reportRef = useRef();

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { startDate, endDate } = dateRange[0];

      // Fetch all data in parallel
      const [usersRes, productsRes, ordersRes, paymentsRes, statsRes] = await Promise.all([
        axios.get(`${baseURL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/products/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/tasks/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/api/payment/admin-all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseURL}/admin/report`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        })
      ]);

      setReportData({
        users: usersRes.data.users || [],
        products: productsRes.data.data || [],
        orders: ordersRes.data.data || [],
        payments: paymentsRes.data.transactions || [],
        stats: statsRes.data || {}
      });
      setError('');
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const generatePDF = async () => {
    const { value: confirm } = await Swal.fire({
      title: 'Generate Full Report',
      text: 'This will generate a comprehensive PDF report with all data tables.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4c51bf',
      cancelButtonColor: '#e53e3e',
      confirmButtonText: 'Generate Report'
    });

    if (!confirm) return;

    try {
      Swal.fire({
        title: 'Preparing Report...',
        html: 'Please wait while we generate your comprehensive report.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Add cover page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Add metadata
      pdf.setProperties({
        title: `Comprehensive Report - ${formatDate(dateRange[0].startDate)} to ${formatDate(dateRange[0].endDate)}`,
        subject: 'System Data Report',
        author: 'Admin Dashboard'
      });

      pdf.save(`system_report_${new Date().toISOString().slice(0, 10)}.pdf`);

      Swal.fire(
        'Report Generated!',
        'Your comprehensive report has been downloaded.',
        'success'
      );
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      Swal.fire(
        'Error!',
        'Failed to generate the report. Please try again.',
        'error'
      );
    }
  };

  const renderUserTable = () => (
    <div className="report-table-section">
      <h3 className="table-title">
        <FaUsers className="table-icon" /> Users Report
      </h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {reportData.users.map((user, index) => (
            <tr key={user._id}>
              <td>{index + 1}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <span className={`status-badge ${user.status?.toLowerCase() || 'active'}`}>
                  {user.status || 'Active'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderProductTable = () => (
    <div className="report-table-section">
      <h3 className="table-title">
        <FaBox className="table-icon" /> Products Inventory
      </h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Image</th>
            <th>Name</th>
            <th>Description</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {reportData.products.map((product, index) => (
            <tr key={product._id}>
              <td>{index + 1}</td>
              <td>
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="product-thumbnail"
                />
              </td>
              <td>{product.name}</td>
              <td className="truncate">{product.description || '—'}</td>
              <td>{formatCurrency(product.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOrderTable = () => (
    <div className="report-table-section">
      <h3 className="table-title">
        <FaShoppingCart className="table-icon" /> Orders & Deliveries
      </h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Address</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {reportData.orders.map((order, index) => (
            <tr key={order._id}>
              <td>{index + 1}</td>
              <td>{order.product}</td>
              <td>{order.address}</td>
              <td>
                <span className={`status-badge ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>
              <td>{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPaymentTable = () => (
    <div className="report-table-section">
      <h3 className="table-title">
        <FaMoneyBillWave className="table-icon" /> Payment Records
      </h3>
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Invoice ID</th>
            <th>Product</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {reportData.payments.map((payment, index) => (
            <tr key={payment._id}>
              <td>{index + 1}</td>
              <td>
                {payment.userId?.name || 'Unknown'}
                <div className="subtext">{payment.userId?.email}</div>
              </td>
              <td>{payment.invoiceId}</td>
              <td>{payment.productTitle}</td>
              <td>{formatCurrency(payment.amount)}</td>
              <td>
                <span className={`status-badge ${payment.status}`}>
                  {payment.status}
                </span>
              </td>
              <td>{formatDate(payment.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderStatsSummary = () => (
    <div className="stats-summary">
      <div className="stat-card">
        <h4>Total Users</h4>
        <p>{reportData.users.length}</p>
      </div>
      <div className="stat-card">
        <h4>Total Products</h4>
        <p>{reportData.products.length}</p>
      </div>
      <div className="stat-card">
        <h4>Total Orders</h4>
        <p>{reportData.orders.length}</p>
      </div>
      <div className="stat-card">
        <h4>Total Revenue</h4>
        <p>{formatCurrency(reportData.stats.totalRevenue || 0)}</p>
      </div>
    </div>
  );

  return (
    <div className="report-container">
      <div className="report-header">
        <h1 className="report-title">
          <FaFileAlt className="title-icon" /> System Report
        </h1>

        <div className="report-controls">
          <button
            className="date-filter-button"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <FaCalendarAlt /> {formatDate(dateRange[0].startDate)} - {formatDate(dateRange[0].endDate)}
            <FaFilter className="filter-icon" />
          </button>

          <button onClick={generatePDF} className="export-button">
            <FaDownload /> Export Full Report
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="date-range-picker-container">
          <DateRangePicker
            onChange={item => setDateRange([item.selection])}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            months={2}
            ranges={dateRange}
            direction="horizontal"
          />
          <button
            className="apply-date-button"
            onClick={() => {
              setShowDatePicker(false);
              fetchReportData();
            }}
          >
            Apply Date Range
          </button>
        </div>
      )}

      {loading ? (
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Generating report...</p>
        </div>
      ) : error ? (
        <div className="report-error">
          <p>{error}</p>
          <button onClick={fetchReportData}>Retry</button>
        </div>
      ) : (
        <div className="report-content" ref={reportRef}>
          <div className="report-header-section">
            <h2>System Comprehensive Report</h2>
            <p className="date-range-display">
              {formatDate(dateRange[0].startDate)} - {formatDate(dateRange[0].endDate)}
            </p>
          </div>

          {renderStatsSummary()}
          {renderUserTable()}
          {renderProductTable()}
          {renderOrderTable()}
          {renderPaymentTable()}
        </div>
      )}
    </div>
  );
};

export default Report;