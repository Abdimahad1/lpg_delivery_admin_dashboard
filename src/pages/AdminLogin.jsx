import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faEye, faEyeSlash, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import '../styles/adminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const res = await axios.post(`${baseURL}/auth/login`, {
        email,
        password,
        role: 'Admin'
      });
  
      if (res.data.success && res.data.user.role === 'Admin') {
        localStorage.setItem('token', res.data.token);
        Swal.fire({
          icon: 'success',
          title: 'Login successful',
          text: 'Redirecting to admin dashboard...',
          timer: 1500,
          showConfirmButton: false
        });
        navigate('/admin/dashboard');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: 'Only Admin users can log in here!'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.response?.data?.message || 'Invalid credentials'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <FontAwesomeIcon icon={faUserShield} className="admin-icon" />
          <h2>Admin Portal</h2>
          <p>Enter your credentials to access the dashboard</p>
        </div>
        
        <form className="admin-login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <FontAwesomeIcon icon={faLock} className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              'Login to Dashboard'
            )}
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default AdminLogin;