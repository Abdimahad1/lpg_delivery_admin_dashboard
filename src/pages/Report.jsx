import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { DateRangePicker } from "react-date-range";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import {
  FaCalendarAlt,
  FaDownload,
  FaFilter,
  FaFileAlt,
  FaUsers,
  FaUserTie,
  FaTruck,
  FaCashRegister,
  FaShoppingBag,
} from "react-icons/fa";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/ReportV3.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export default function Report() {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);

  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  // This invisible container holds ONLY the tables we want in the PDF
  const pdfRootRef = useRef(null);

  const headers = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const prettyDateOnly = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "—";

  const prettyDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");

  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

  // Fetch data
  const fetchAll = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const { startDate, endDate } = dateRange[0];

      const params = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      const urls = {
        report: `${baseURL}/admin/report`,
        users: `${baseURL}/admin/users`,
        orders: `${baseURL}/tasks/all`,
        payments: `${baseURL}/payment/admin-all`,
      };

      const [repRes, usrRes, ordRes, payRes] = await Promise.all([
        axios.get(urls.report, { headers: headers(), params }),
        axios.get(urls.users, { headers: headers() }),
        axios.get(urls.orders, { headers: headers() }),
        axios.get(urls.payments, { headers: headers() }),
      ]);

      setSummary(repRes.data || null);
      setUsers(usrRes.data?.users || []);
      setOrders(ordRes.data?.data || []);
      setPayments(payRes.data?.transactions || []);
    } catch (e) {
      console.error("report fetch error", e);
      setErrMsg(e?.response?.data?.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Derived splits
  const customers = useMemo(() => users.filter((u) => u.role === "Customer"), [users]);
  const vendors = useMemo(() => users.filter((u) => u.role === "Vendor"), [users]);
  const deliveryPersons = useMemo(
    () => users.filter((u) => u.role === "DeliveryPerson"),
    [users]
  );

  // Customers & their purchases derived from payments (has product + customer)
  const customerOrders = useMemo(
    () =>
      payments
        .filter((p) => !!p.userId)
        .map((p) => ({
          id: p._id,
          customerName: p.userId?.name || p.userId?.email || "Unknown",
          customerEmail: p.userId?.email || "—",
          product: p.productTitle || p.product?.title || "—",
          amount: p.amount,
          status: p.status,
          date: p.createdAt,
        })),
    [payments]
  );

  // UI charts (fake trend built from totals for a visual only)
  const revenueTrend = useMemo(() => {
    const total = Number(summary?.totalRevenue || 0);
    const change = Number(summary?.revenueChange || 0);
    const prev = Math.max(0, total / (1 + change / 100));
    return [
      { name: "Prev", value: prev * 0.6 },
      { name: "Prev+", value: prev * 0.8 },
      { name: "Now", value: total * 0.9 },
      { name: "Now+", value: total },
    ];
  }, [summary]);

  const pieData = useMemo(() => {
    return [
      { name: "Orders", value: Number(summary?.totalOrders || 0) },
      { name: "New Users", value: Number(summary?.newUsers || 0) },
    ];
  }, [summary]);

  const pieColors = ["#6366f1", "#10b981"];

  // PDF generation
  const generatePDF = async () => {
    const { value: ok } = await Swal.fire({
      title: "Download Report",
      text: "The PDF will include detailed tables only.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Download",
    });
    if (!ok) return;

    try {
      Swal.fire({
        title: "Preparing…",
        html: "Composing your report.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Make sure the PDF root is visible for capture (it’s positioned off-screen but displayed)
      const pdfNode = pdfRootRef.current;
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(pdfNode, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
      });

      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // PAGE 1: COVER (avoid empty first page by drawing directly on the default page)
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pdfW, pdfH, "F");
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(22);
      pdf.text("Operations Report", pdfW / 2, 50, { align: "center" });

      const dr = `${prettyDateOnly(dateRange[0].startDate)} – ${prettyDateOnly(
        dateRange[0].endDate
      )}`;
      pdf.setFontSize(12);
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Date Range: ${dr}`, pdfW / 2, 63, { align: "center" });
      pdf.text(
        `Generated: ${prettyDateOnly(new Date())}`,
        pdfW / 2,
        71,
        { align: "center" }
      );

      // Subsequent pages: slice the tall tables image across pages
      const props = pdf.getImageProperties(img);
      const imgW = pdfW;
      const imgH = (props.height * imgW) / props.width;

      let yPos = 0;
      let remaining = imgH;
      // Start on a NEW page for content (cover already used)
      pdf.addPage();
      while (remaining > 0) {
        const sliceHeight = Math.min(imgH - Math.abs(yPos), pdfH);
        pdf.addImage(img, "PNG", 0, yPos, imgW, imgH);
        remaining -= pdfH;
        yPos -= pdfH;
        if (remaining > 0) pdf.addPage();
      }

      // Footer page numbers (for all pages)
      const count = pdf.getNumberOfPages();
      for (let i = 1; i <= count; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Page ${i} of ${count}`, pdfW - 20, pdfH - 8);
      }

      pdf.setProperties({
        title: `Operations Report - ${dr}`,
        subject: "Tables export",
        author: "Admin Dashboard",
        creator: "Admin Dashboard",
      });

      pdf.save(`operations_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      Swal.close();
      Swal.fire("Done!", "PDF downloaded.", "success");
    } catch (e) {
      console.error("pdf error", e);
      Swal.fire("Error", "Could not export. Try again.", "error");
    }
  };

  return (
    <div className="rp3-container">
      {/* Header */}
      <header className="rp3-header">
        <h1 className="rp3-title">
          <FaFileAlt /> Analytics Overview
        </h1>
        <div className="rp3-actions">
          <button
            className="rp3-btn rp3-btn-light"
            onClick={() => setShowDatePicker((s) => !s)}
          >
            <FaCalendarAlt />
            {prettyDateOnly(dateRange[0].startDate)} – {prettyDateOnly(dateRange[0].endDate)}
            <FaFilter className="rp3-btn-tail" />
          </button>

          <button className="rp3-btn rp3-btn-dark" onClick={generatePDF}>
            <FaDownload /> Download Report
          </button>
        </div>
      </header>

      {/* Date range picker */}
      {showDatePicker && (
        <div className="rp3-daterange">
          <DateRangePicker
            onChange={(item) => setDateRange([item.selection])}
            showSelectionPreview
            moveRangeOnFirstSelection={false}
            months={2}
            ranges={dateRange}
            direction="horizontal"
          />
          <div className="rp3-daterange-foot">
            <button
              className="rp3-btn rp3-btn-dark"
              onClick={() => {
                setShowDatePicker(false);
                fetchAll();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading ? (
        <div className="rp3-loading">
          <div className="rp3-spinner" />
          <p>Loading your overview…</p>
        </div>
      ) : errMsg ? (
        <div className="rp3-error">
          <p>{errMsg}</p>
          <button className="rp3-btn rp3-btn-dark" onClick={fetchAll}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <section className="rp3-cards">
            <SumCard
              color="violet"
              title="Total Revenue"
              value={money(summary?.totalRevenue || 0)}
              chip={Number(summary?.revenueChange) || 0}
              icon={<FaCashRegister />}
            />
            <SumCard
              color="emerald"
              title="Total Orders"
              value={summary?.totalOrders ?? 0}
              chip={Number(summary?.orderChange) || 0}
              icon={<FaShoppingBag />}
            />
            <SumCard
              color="indigo"
              title="New Users"
              value={summary?.newUsers ?? 0}
              chip={Number(summary?.userChange) || 0}
              icon={<FaUsers />}
            />
          </section>

          {/* Small Charts (visual only) */}
          <section className="rp3-charts">
            <div className="rp3-chart-card">
              <div className="rp3-chart-title">Revenue Pulse</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#gradRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rp3-chart-card">
              <div className="rp3-chart-title">Orders vs New Users</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {/* Hidden-offscreen PDF content (TABLES ONLY) */}
      <div className="rp3-pdf-root" ref={pdfRootRef} aria-hidden>
        <PDFSection title={`All Users (${users.length})`} icon={<FaUsers />}>
          <PDFTable
            columns={["#", "Name", "Email", "Role", "Status", "Joined"]}
            rows={users.map((u, i) => [
              i + 1,
              u.name || "—",
              u.email || "—",
              u.role || "—",
              (u.status || "Active"),
              prettyDateOnly(u.createdAt),
            ])}
          />
        </PDFSection>

        <PDFSection title={`Customers (${customers.length})`} icon={<FaUsers />}>
          <PDFTable
            columns={["#", "Name", "Email", "Status", "Joined"]}
            rows={customers.map((u, i) => [
              i + 1,
              u.name || "—",
              u.email || "—",
              (u.status || "Active"),
              prettyDateOnly(u.createdAt),
            ])}
          />
        </PDFSection>

        <PDFSection title={`Vendors (${vendors.length})`} icon={<FaUserTie />}>
          <PDFTable
            columns={["#", "Name", "Email", "Status", "Joined"]}
            rows={vendors.map((u, i) => [
              i + 1,
              u.name || "—",
              u.email || "—",
              (u.status || "Active"),
              prettyDateOnly(u.createdAt),
            ])}
          />
        </PDFSection>

        <PDFSection title={`Delivery Persons (${deliveryPersons.length})`} icon={<FaTruck />}>
          <PDFTable
            columns={["#", "Name", "Email", "Status", "Joined"]}
            rows={deliveryPersons.map((u, i) => [
              i + 1,
              u.name || "—",
              u.email || "—",
              (u.status || "Active"),
              prettyDateOnly(u.createdAt),
            ])}
          />
        </PDFSection>

        <PDFSection title={`Customers & Purchases (${customerOrders.length})`} icon={<FaShoppingBag />}>
          <PDFTable
            columns={["#", "Customer", "Email", "Product", "Amount", "Status", "Date"]}
            rows={customerOrders.map((o, i) => [
              i + 1,
              o.customerName,
              o.customerEmail,
              o.product,
              money(o.amount),
              o.status,
              prettyDateTime(o.date),
            ])}
          />
        </PDFSection>

        <PDFSection title={`Payments (${payments.length})`} icon={<FaCashRegister />}>
          <PDFTable
            columns={["#", "User", "Invoice ID", "Product", "Amount", "Status", "Date"]}
            rows={payments.map((p, i) => [
              i + 1,
              `${p.userId?.name || "Unknown"} (${p.userId?.email || "—"})`,
              p.invoiceId || "—",
              p.productTitle || p.product?.title || "—",
              money(p.amount),
              p.status,
              prettyDateTime(p.createdAt),
            ])}
          />
        </PDFSection>
      </div>
    </div>
  );
}

/* ===== Smaller UI bits ===== */

function SumCard({ color = "indigo", title, value, chip, icon }) {
  return (
    <div className={`rp3-card rp3-card-${color}`}>
      <div className="rp3-card-icon">{icon}</div>
      <div className="rp3-card-main">
        <div className="rp3-card-title">{title}</div>
        <div className="rp3-card-value">{value}</div>
      </div>
      <div className={`rp3-chip ${chip >= 0 ? "pos" : "neg"}`}>
        {chip >= 0 ? "↑" : "↓"} {Math.abs(chip)}%
      </div>
    </div>
  );
}

function PDFSection({ title, icon, children }) {
  return (
    <section className="rp3-pdf-section">
      <div className="rp3-pdf-head">
        <div className="rp3-pdf-title">
          <span className="rp3-pdf-ico">{icon}</span>
          {title}
        </div>
      </div>
      {children}
    </section>
  );
}

function PDFTable({ columns, rows }) {
  return (
    <div className="rp3-pdf-table-wrap">
      <table className="rp3-pdf-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="rp3-pdf-empty">No data</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
