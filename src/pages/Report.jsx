import React, { useState, useEffect, useRef } from 'react';
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
import { jsPDF } from 'jspdf';
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
  const reportRef = useRef();

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const generatePDF = async () => {
    const { value: confirm } = await Swal.fire({
      title: 'Generate Full Report',
      text: 'This will generate a professional PDF report with all data and charts.',
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
        html: 'Please wait while we generate your professional report.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture the entire report content
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        scrollY: -window.scrollY
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Add cover page with title and icon
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      // Add icon
      pdf.setFontSize(40);
      pdf.setTextColor(76, 81, 191);
      pdf.text('📊', pdfWidth / 2, 60, { align: 'center' });
      
      // Add title
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Analytics Report', pdfWidth / 2, 80, { align: 'center' });
      
      // Add date range
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      const dateRangeText = `${formatDate(dateRange[0].startDate)} - ${formatDate(dateRange[0].endDate)}`;
      pdf.text(dateRangeText, pdfWidth / 2, 90, { align: 'center' });
      
      // Add generated date
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdfWidth / 2, 100, { align: 'center' });
      
      // Add new page with content
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Add footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pdfWidth - 20, pdf.internal.pageSize.getHeight() - 10);
      }

      // Add metadata
      pdf.setProperties({
        title: `Analytics Report - ${dateRangeText}`,
        subject: 'Comprehensive analytics report',
        author: 'Admin Dashboard',
        creator: 'Analytics Dashboard'
      });

      // Save PDF
      pdf.save(`analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`);

      Swal.fire(
        'Report Generated!',
        'Your professional report has been downloaded.',
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
      <div className="report-summary" ref={reportRef}>
        <div className="report-header-section">
          <h2>Analytics Dashboard</h2>
          <p className="date-range-display">
            {formatDate(dateRange[0].startDate)} - {formatDate(dateRange[0].endDate)}
          </p>
        </div>

        <div className="report-highlights">
          <div className="highlight-card">
            <div className="highlight-icon revenue">
              <FaChartLine />
            </div>
            <div className="highlight-content">
              <h3>Total Revenue</h3>
              <p>{formatCurrency(reportData?.totalRevenue || 0)}</p>
              <span className={`highlight-change ${reportData?.revenueChange >= 0 ? 'positive' : 'negative'}`}>
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
              <span className={`highlight-change ${reportData?.orderChange >= 0 ? 'positive' : 'negative'}`}>
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
              <span className={`highlight-change ${reportData?.userChange >= 0 ? 'positive' : 'negative'}`}>
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
                <Tooltip formatter={(value) => formatCurrency(value)} />
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {orderUserData.map((_, index) => (
                    <Cell key={index} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
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

          <button onClick={generatePDF} className="export-button">
            <FaDownload /> Generate Full Report
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