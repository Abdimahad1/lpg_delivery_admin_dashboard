import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaFileAlt,
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaCalendarAlt,
  FaDownload,
  FaFilter,
  FaUsers,
  FaShoppingCart
} from 'react-icons/fa';
import { DateRangePicker } from 'react-date-range';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Swal from 'sweetalert2';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import '../styles/Report.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const Report = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { startDate, endDate } = dateRange[0];

      const response = await axios.get(`${baseURL}/admin/report`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });

      setReportData(response.data);
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleExportPDF = async () => {
    const { value: confirm } = await Swal.fire({
      title: 'Download Report',
      text: 'Are you sure you want to download this report as PDF?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4c51bf',
      cancelButtonColor: '#e53e3e',
      confirmButtonText: 'Yes, download it!'
    });

    if (confirm) {
      try {
        const token = localStorage.getItem('token');
        const { startDate, endDate } = dateRange[0];
        
        // First generate the PDF
        const generateResponse = await axios.post(
          `${baseURL}/admin/generate-report-pdf`,
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Then download the generated PDF
        const downloadResponse = await axios.get(
          `${baseURL}/admin/download-report-pdf`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
            params: {
              filename: generateResponse.data.filename
            }
          }
        );

        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        Swal.fire(
          'Downloaded!',
          'Your report has been downloaded as PDF.',
          'success'
        );
      } catch (err) {
        console.error('Failed to export report:', err);
        Swal.fire(
          'Error!',
          err.response?.data?.message || 'Failed to download the report. Please try again.',
          'error'
        );
      }
    }
  };

  const renderSummaryTab = () => {
    const revenueData = [
      { name: 'Previous', value: reportData?.totalRevenue * (1 - (reportData?.revenueChange || 0) / 100) },
      { name: 'Current', value: reportData?.totalRevenue }
    ];

    const orderUserData = [
      { name: 'Orders', value: reportData?.totalOrders || 0 },
      { name: 'New Users', value: reportData?.newUsers || 0 }
    ];

    const pieColors = ['#6366f1', '#10b981'];

    return (
      <div className="report-summary">
        <div className="report-highlights">
          <div className="highlight-card">
            <div className="highlight-icon revenue">
              <FaChartLine />
            </div>
            <div className="highlight-content">
              <h3>Total Revenue</h3>
              <p>${reportData?.totalRevenue?.toFixed(2) || '0.00'}</p>
              <span className="highlight-change">
                {reportData?.revenueChange >= 0 ? '↑' : '↓'}
                {Math.abs(reportData?.revenueChange || 0)}% from last period
              </span>
            </div>
          </div>

          <div className="highlight-card">
            <div className="highlight-icon orders">
              <FaShoppingCart />
            </div>
            <div className="highlight-content">
              <h3>Total Orders</h3>
              <p>{reportData?.totalOrders || 0}</p>
              <span className="highlight-change">
                {reportData?.orderChange >= 0 ? '↑' : '↓'}
                {Math.abs(reportData?.orderChange || 0)}% from last period
              </span>
            </div>
          </div>

          <div className="highlight-card">
            <div className="highlight-icon users">
              <FaUsers />
            </div>
            <div className="highlight-content">
              <h3>New Users</h3>
              <p>{reportData?.newUsers || 0}</p>
              <span className="highlight-change">
                {reportData?.userChange >= 0 ? '↑' : '↓'}
                {Math.abs(reportData?.userChange || 0)}% from last period
              </span>
            </div>
          </div>
        </div>

        <div className="report-charts">
          <div className="chart-container">
            <h3>Revenue Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Order vs New Users</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderUserData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {orderUserData.map((_, index) => (
                    <Cell key={index} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h1 className="report-title">
          <FaFileAlt className="title-icon" /> Analytics Report
        </h1>

        <div className="report-controls">
          <button
            className="date-filter-button"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <FaCalendarAlt /> {formatDate(dateRange[0].startDate)} - {formatDate(dateRange[0].endDate)}
            <FaFilter className="filter-icon" />
          </button>

          <button onClick={handleExportPDF} className="export-button">
            <FaDownload /> PDF
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
            Apply
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
        renderSummaryTab()
      )}
    </div>
  );
};

export default Report;