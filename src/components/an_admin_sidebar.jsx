import './an_admin_sidebar.css';
import { Link, useNavigate } from "react-router-dom";
import {
  FaHome, FaUser, FaCreditCard, FaTags, FaSignOutAlt, FaChartBar
} from 'react-icons/fa';
import { MdOutlineInventory } from 'react-icons/md';
import Swal from 'sweetalert2';

export default function AnAdminSidebarComponent() {
  const navigate = useNavigate();

  const handleLogoutClick = (e) => {
    e.preventDefault();

    Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to logout.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, logout',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        navigate('/admin-login');
      }
    });
  };

  return (
    <div className='admin-sidebar'>
      <h2>Admin</h2>
      <ul>
        <li>
          <Link to="/"><FaHome /> Dashboard</Link>
        </li>
        <li>
          <Link to="/users"><FaUser /> Users</Link>
        </li>
        <li>
          <Link to="/products"><FaTags /> Products</Link>
        </li>
        <li>
          <Link to="/orders"><MdOutlineInventory /> Orders & Deliveries</Link>
        </li>
        <li>
          <Link to="/payments"><FaCreditCard /> Payments</Link>
        </li>
        <li>
          <Link to="/report"><FaChartBar /> Reports</Link>
        </li>

        <li className="logout">
          <a href="#logout" onClick={handleLogoutClick}>
            <FaSignOutAlt /> Logout
          </a>
        </li>
      </ul>
    </div>
  );
}
