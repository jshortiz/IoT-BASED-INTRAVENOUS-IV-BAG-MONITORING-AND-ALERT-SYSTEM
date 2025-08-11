import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaBed, FaChevronRight } from 'react-icons/fa';
import './css/Sidebar.css';

const Sidebar = ({ isOpen }) => {
  return (
    <div className={`sidebar ${isOpen ? 'visible' : 'hidden'}`}>
      <div className="logo-container">
        <img
          src="/iot-logo.png" // Image from public folder
          alt="Hospital Logo"
          className="logo-img"
        />
        <h1 className="hospital-name">JBriCare+</h1>
        <p className="hospital-slogan">Quality Healthcare</p>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/" className="nav-link">
              <FaHome className="nav-icon" />
              <span>Dashboard</span>
              <FaChevronRight className="nav-arrow" />
            </Link>
          </li>
          <li>
            <Link to="/room" className="nav-link">
              <FaBed className="nav-icon" />
              <span>Room Management</span>
              <FaChevronRight className="nav-arrow" />
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-line"></div>
        <p>&copy; 2025 JBriCare++</p>
        <p>All rights reserved</p>
      </div>
    </div>
  );
};

export default Sidebar;
