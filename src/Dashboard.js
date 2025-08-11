// client/src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { FiUsers, FiHome, FiAlertTriangle } from "react-icons/fi";
import "./css/Dashboard.css";

// Import and register necessary Chart.js components (removed unused chart code)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [metrics, setMetrics] = useState({
    patients: 0,
    rooms: 0,
    avgWeight: 0
  });
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const CRITICAL_THRESHOLD = 100;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patientsRes, roomsRes] = await Promise.all([
          fetch("http://localhost:5000/patientCount"),
          fetch("http://localhost:5000/roomCount")
        ]);
        
        const patientsData = await patientsRes.json();
        const roomsData = await roomsRes.json();
        
        setMetrics(prev => ({
          ...prev,
          patients: patientsData.count,
          rooms: roomsData.count
        }));
      } catch (err) {
        setError("Failed to load initial data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Removed weightHistory and chart data fetching

  // Instead, only fetch alert data based on weight from /weights
  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        const res = await fetch("http://localhost:5000/weights");
        const data = await res.json();
        
        const alerts = data.filter(r => r.weight < CRITICAL_THRESHOLD);
        const recentAlert = alerts.length > 0
          ? alerts.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b)
          : null;

        setAlertData(recentAlert);
      } catch (err) {
        setError("Failed to load weight alert data");
        console.error(err);
      }
    };

    fetchAlertData();
    const interval = setInterval(fetchAlertData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className={`content-container ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="top-bar">
          <button 
            className="hamburger-btn" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`}></span>
          </button>
          <h1 className="app-title">JBriCare+ Dashboard</h1>
        </div>

        <Sidebar isOpen={sidebarOpen} />

        <main className="main-content">
          <div className="content-wrapper">
            <h2>Welcome to JBriCare+ Dashboard</h2>
            
            <div className="dashboard-card">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <div className="metric-container">
                  <div className="metric-card patients">
                    <FiUsers className="metric-icon" />
                    <div className="metric-value">{metrics.patients}</div>
                    <div className="metric-label">Active Patients</div>
                  </div>
                  
                  <div className="metric-card rooms">
                    <FiHome className="metric-icon" />
                    <div className="metric-value">{metrics.rooms}</div>
                    <div className="metric-label">Monitored Rooms</div>
                  </div>
                  
                  <div className={`metric-card alerts ${alertData ? 'active' : ''}`}>
                    <FiAlertTriangle className="metric-icon" />
                    <div className="metric-value">
                      {alertData ? '!' : '0'}
                    </div>
                    <div className="metric-label">
                      {alertData 
                        ? `Alert in Room ${alertData.room}, Bed ${alertData.bed}`
                        : 'Active Alerts'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
