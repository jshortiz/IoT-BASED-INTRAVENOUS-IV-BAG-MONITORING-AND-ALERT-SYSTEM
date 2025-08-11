import React from 'react';
import './css/Gauge.css'; // Create this new CSS file

const Gauge = ({ weight }) => {
  // Color calculation with smoother transitions
  const getColor = (weight) => {
    if (weight >= 201) return '#00e676'; // Modern green
    else if (weight >= 101) return '#ffd600'; // Vibrant yellow
    else return '#ff1744'; // Deep red
  };

  // Gauge parameters
  const minWeight = 0;
  const maxWeight = 1000;
  const percentage = Math.min((weight - minWeight) / (maxWeight - minWeight), 1);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - percentage);
  const rotationAngle = percentage * 180 - 90; // For needle rotation

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2c3e50" />
            <stop offset="100%" stopColor="#3498db" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#f0f0f0"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#shadow)"
        />

        {/* Colored Arc */}
        <circle
          className="gauge-arc"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getColor(weight)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
        />

        {/* Needle */}
        <polygon
          points="50,50 52,45 48,45"
          fill="#2c3e50"
          transform={`rotate(${rotationAngle} 50 50)`}
          className="needle"
        />

        {/* Center Circle */}
        <circle cx="50" cy="50" r="5" fill={getColor(weight)} className="center-dot" />
      </svg>
    </div>
  );
};

export default Gauge;
