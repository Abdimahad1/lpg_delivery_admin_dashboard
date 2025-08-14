import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaFileAlt,
  FaCalendarAlt,
  FaDownload,
  FaFilter,
  FaUsers
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
  const [errMsg, setErrMsg] = useState('');
  const [summary, setSummary] = useState(null);

  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const reportRef = useRef(null);

  const headers = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const { startDate, endDate } = dateRange[0];

      const params = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      // Endpoints based on your other pages
      const urls = {
        report: `${baseURL}/admin/report`,
        users: `${baseURL}/admin/users`,
        orders: `${baseURL}/tasks/all`,
        payments: `${baseURL}/payment/admin-all`
      };

      const [repRes, usrRes, ordRes, payRes] = await Promise.all([
        axios.get(urls.report, { headers: headers(), params }),
        axios.get(urls.users, { headers: headers() }),
        axios.get(urls.orders, { headers: headers() }),
        axios.get(urls.payments, { headers: headers() })
      ]);

      setSummary(repRes.data || null);
      setUsers(usrRes.data?.users || []);
      setOrders(ordRes.data?.data || []);
      setPayments(payRes.data?.transactions || []);
    } catch (err) {
      console.error('Report fetch error:', err);
      setErrMsg(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const formatMoney = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const prettyDate = (d) =>
    d ? new Date(d).toLocaleString() : '—';

  const prettyDateOnly = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  // Derived data
  const customers = users.filter(u => u.role === 'Customer');
  const vendors = users.filter(u => u.role === 'Vendor');
  const deliveryPersons = users.filter(u => u.role === 'DeliveryPerson');

  // Customers & their orders (from Payments, since it has product/user info)
  const customerOrders = payments
    .filter(p => !!p.userId) // keep those with a user
    .map(p => ({
      id: p._id,
      customerName: p.userId?.name || p.userId?.email || 'Unknown',
      customerEmail: p.userId?.email || '—',
      product: p.productTitle || p.product?.title || '—',
      amount: p.amount,
      status: p.status,
      date: p.createdAt
    }));

  const generatePDF = async () => {
    const { value: confirm } = await Swal.fire({
      title: 'Generate Report (Tables Only)',
      text: 'A PDF with all tables will be created.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4c51bf',
      cancelButtonColor: '#e53e3e',
      confirmButtonText: 'Generate'
    });
    if (!confirm) return;

    try {
      Swal.fire({
        title: 'Preparing PDF...',
        html: 'Rendering tables for export.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const html2canvas = (await import('html2canvas')).default;

      // Snapshot the content
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // Cover page
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.setFontSize(26); pdf.setTextColor(35, 38, 47);
      pdf.text('Operations Report', pdfW / 2, 50, { align: 'center' });

      pdf.setFontSize(12); pdf.setTextColor(90, 90, 90);
      const dr = `${prettyDateOnly(dateRange[0].startDate)} – ${prettyDateOnly(dateRange[0].endDate)}`;
      pdf.text(`Date Range: ${dr}`, pdfW / 2, 65, { align: 'center' });
      pdf.text(`Generated: ${prettyDateOnly(new Date())}`, pdfW / 2, 73, { align: 'center' });

      // Add tables across multiple pages
      pdf.addPage();
      const imgProps = pdf.getImageProperties(imgData);
      const imgW = pdfW;
      const imgH = (imgProps.height * imgW) / imgProps.width;

      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pdfH;

      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pdfH;
      }

      // Footer page numbers
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pdfW - 20, pdfH - 8);
      }

      pdf.setProperties({
        title: `Operations Report - ${dr}`,
        subject: 'Admin dashboard tables',
        author: 'Admin Dashboard',
        creator: 'Admin Dashboard'
      });

      pdf.save(`operations_report_${new Date().toISOString().slice(0,10)}.pdf`);
      Swal.close();
      Swal.fire('Done!', 'Report downloaded.', 'success');
    } catch (e) {
      console.error('PDF generation error:', e);
      Swal.fire('Error', 'Could not generate PDF. Try again.', 'error');
    }
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h1 className="report-title">
          <FaFileAlt className="title-icon" /> Operations Report
        </h1>

        <div className="report-controls">
          <button
            className="date-filter-button"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <FaCalendarAlt />
            {`${prettyDateOnly(dateRange[0].startDate)} - ${prettyDateOnly(dateRange[0].endDate)}`}
            <FaFilter className="filter-icon" />
          </button>

          <button onClick={generatePDF} className="export-button">
            <FaDownload /> Download PDF
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
              fetchAll();
            }}
          >
            Apply
          </button>
        </div>
      )}

      {loading ? (
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Loading tables…</p>
        </div>
      ) : errMsg ? (
        <div className="report-error">
          <p>{errMsg}</p>
          <button onClick={fetchAll}>Retry</button>
        </div>
      ) : (
        <div className="report-content" ref={reportRef}>
          {/* Summary cards (no charts) */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="sc-top">
                <span className="sc-title">Total Revenue</span>
                <span className={`sc-chip ${Number(summary?.revenueChange) >= 0 ? 'pos' : 'neg'}`}>
                  {Number(summary?.revenueChange) >= 0 ? '↑' : '↓'}
                  {Math.abs(Number(summary?.revenueChange) || 0)}%
                </span>
              </div>
              <div className="sc-value">{formatMoney(summary?.totalRevenue || 0)}</div>
            </div>

            <div className="summary-card">
              <div className="sc-top">
                <span className="sc-title">Total Orders</span>
                <span className={`sc-chip ${Number(summary?.orderChange) >= 0 ? 'pos' : 'neg'}`}>
                  {Number(summary?.orderChange) >= 0 ? '↑' : '↓'}
                  {Math.abs(Number(summary?.orderChange) || 0)}%
                </span>
              </div>
              <div className="sc-value">{summary?.totalOrders ?? 0}</div>
            </div>

            <div className="summary-card">
              <div className="sc-top">
                <span className="sc-title">New Users</span>
                <span className={`sc-chip ${Number(summary?.userChange) >= 0 ? 'pos' : 'neg'}`}>
                  {Number(summary?.userChange) >= 0 ? '↑' : '↓'}
                  {Math.abs(Number(summary?.userChange) || 0)}%
                </span>
              </div>
              <div className="sc-value">{summary?.newUsers ?? 0}</div>
            </div>
          </div>

          {/* Users - All */}
          <Section title={`All Users (${users.length})`} icon={<FaUsers />}>
            <Table
              columns={['#', 'Name', 'Email', 'Role', 'Status', 'Created']}
              rows={users.map((u, i) => [
                i + 1,
                u.name || '—',
                u.email || '—',
                u.role || '—',
                <span className={`badge ${((u.status||'Active').toLowerCase())}`}>
                  {u.status || 'Active'}
                </span>,
                prettyDateOnly(u.createdAt)
              ])}
              emptyText="No users found."
            />
          </Section>

          {/* Customers */}
          <Section title={`Customers (${customers.length})`}>
            <Table
              columns={['#', 'Name', 'Email', 'Status', 'Joined']}
              rows={customers.map((u, i) => [
                i + 1,
                u.name || '—',
                u.email || '—',
                <span className={`badge ${((u.status||'Active').toLowerCase())}`}>
                  {u.status || 'Active'}
                </span>,
                prettyDateOnly(u.createdAt)
              ])}
              emptyText="No customers found."
            />
          </Section>

          {/* Vendors */}
          <Section title={`Vendors (${vendors.length})`}>
            <Table
              columns={['#', 'Name', 'Email', 'Status', 'Joined']}
              rows={vendors.map((u, i) => [
                i + 1,
                u.name || '—',
                u.email || '—',
                <span className={`badge ${((u.status||'Active').toLowerCase())}`}>
                  {u.status || 'Active'}
                </span>,
                prettyDateOnly(u.createdAt)
              ])}
              emptyText="No vendors found."
            />
          </Section>

          {/* Delivery Persons */}
          <Section title={`Delivery Persons (${deliveryPersons.length})`}>
            <Table
              columns={['#', 'Name', 'Email', 'Status', 'Joined']}
              rows={deliveryPersons.map((u, i) => [
                i + 1,
                u.name || '—',
                u.email || '—',
                <span className={`badge ${((u.status||'Active').toLowerCase())}`}>
                  {u.status || 'Active'}
                </span>,
                prettyDateOnly(u.createdAt)
              ])}
              emptyText="No delivery persons found."
            />
          </Section>

          {/* Customers & Their Orders (from payments) */}
          <Section title={`Customers & Purchases (${customerOrders.length})`}>
            <Table
              columns={['#', 'Customer', 'Email', 'Product', 'Amount', 'Status', 'Date']}
              rows={customerOrders.map((o, i) => [
                i + 1,
                o.customerName,
                o.customerEmail,
                o.product,
                formatMoney(o.amount),
                <span className={`badge ${o.status}`}>
                  {o.status}
                </span>,
                prettyDate(o.date)
              ])}
              emptyText="No purchases found."
            />
          </Section>

          {/* Payments */}
          <Section title={`Payments (${payments.length})`}>
            <Table
              columns={['#', 'User', 'Invoice ID', 'Product', 'Amount', 'Status', 'Date']}
              rows={payments.map((p, i) => [
                i + 1,
                <>
                  {p.userId?.name || 'Unknown'}
                  <div className="muted">{p.userId?.email}</div>
                </>,
                p.invoiceId || '—',
                p.productTitle || p.product?.title || '—',
                formatMoney(p.amount),
                <span className={`badge ${p.status}`}>{p.status}</span>,
                prettyDate(p.createdAt)
              ])}
              emptyText="No payment records."
            />
          </Section>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <section className="section-card">
    <div className="section-head">
      <h3 className="section-title">
        {icon ? <span className="section-icon">{icon}</span> : null}
        {title}
      </h3>
    </div>
    {children}
  </section>
);

const Table = ({ columns, rows, emptyText }) => (
  <div className="table-wrap">
    <table className="nice-table">
      <thead>
        <tr>
          {columns.map((c, idx) => <th key={idx}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="empty-td">{emptyText}</td>
          </tr>
        ) : rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Report;
