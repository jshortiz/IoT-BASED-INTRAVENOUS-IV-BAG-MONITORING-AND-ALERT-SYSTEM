// client/src/components/Room.jsx
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2'; // Import SweetAlert2
import Sidebar from './Sidebar';
import Gauge from './Gauge';
import './css/Dashboard.css'; // Using Dashboard styles for layout
import './css/Room.css';     // Room-specific styles

const Room = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingPatient, setEditingPatient] = useState(false);
  // Extend patientInfo with room, bed, and sex fields
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    address: '',
    sex: '',   // Pre-occupied with existing value if available
    age: '',
    room: '',
    bed: ''
  });
  const [patientData, setPatientData] = useState(null);
  const [lastAlertTime, setLastAlertTime] = useState(null);

  // Function to get status color based on weight.
  const getStatusColor = (weight) => {
    if (weight < 100) return 'red';
    if (weight < 200) return 'yellow';
    return 'green';
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Fetch weight data every 2 seconds
  useEffect(() => {
    const fetchData = () => {
      fetch('http://localhost:5000/weights')
        .then((response) => response.json())
        .then((data) => {
          setWeights(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching weight data:', error);
          setLoading(false);
        });
    };

    fetchData();
    const intervalId = setInterval(fetchData, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter weight data based on the selected room and get the latest reading
  const filteredWeights = selectedRoom
    ? weights.filter((record) => record.room === selectedRoom)
    : [];

  const latestReading =
    filteredWeights.length > 0
      ? filteredWeights.reduce((latest, record) =>
          new Date(record.timestamp) > new Date(latest.timestamp)
            ? record
            : latest
        )
      : null;

  // Fetch patient info when selectedRoom and latestReading are available.
  // Pre-populate form fields including room, bed, and sex.
  useEffect(() => {
    const fetchPatientData = async () => {
      if (selectedRoom && latestReading) {
        try {
          const response = await fetch(
            `http://localhost:5000/patient?room=${selectedRoom}&bed=${latestReading.bed}`
          );
          if (response.ok) {
            const data = await response.json();
            setPatientData(data);
            setPatientInfo((prev) => ({
              ...prev,
              room: data.room || selectedRoom,
              bed: data.bed || latestReading.bed,
              name: data.name || '',
              address: data.address || '',
              sex: data.sex || '',  // Pre-occupied sex field
              age: data.age || ''
            }));
          } else {
            setPatientData(null);
            setPatientInfo((prev) => ({
              ...prev,
              room: selectedRoom,
              bed: latestReading.bed
            }));
          }
        } catch (error) {
          console.error('Error fetching patient data:', error);
          setPatientData(null);
        }
      }
    };

    fetchPatientData();
  }, [selectedRoom, latestReading]);

  // Show critical alert using SweetAlert2 if weight is below threshold
  useEffect(() => {
    const criticalLevel = 100; // Adjust threshold as needed
    if (latestReading && latestReading.weight < criticalLevel) {
      const now = new Date();
      if (!lastAlertTime || now - lastAlertTime >= 10000) {
        setLastAlertTime(now);
        const alertAudio = new Audio('/alert.mp3');
        alertAudio.play().catch((err) =>
          console.error('Audio playback error:', err)
        );

        Swal.fire({
          title: 'Critical Alert!',
          text: `Weight is critically low: ${latestReading.weight}g.`,
          icon: 'error',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          timer: 10000,
          timerProgressBar: true
        }).then(() => {
          alertAudio.pause();
          alertAudio.currentTime = 0;
        });
      }
    }
  }, [latestReading, lastAlertTime]);

  const handleRoomClick = (roomId) => setSelectedRoom(roomId);
  const handleBack = () => {
    setSelectedRoom(null);
    setPatientData(null);
  };

  // Toggle the patient info form when the gauge is clicked
  const handleGaugeClick = () => {
    setEditingPatient(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Submit patient info (including custom room, bed, and sex) to the patients table
  const handlePatientSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      room: patientInfo.room,
      bed: patientInfo.bed,
      name: patientInfo.name,
      address: patientInfo.address,
      sex: patientInfo.sex,
      age: patientInfo.age,
    };

    try {
      const response = await fetch('http://localhost:5000/savePatient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log('Patient info saved successfully');
        setEditingPatient(false);
        const patientResponse = await fetch(
          `http://localhost:5000/patient?room=${payload.room}&bed=${payload.bed}`
        );
        if (patientResponse.ok) {
          const data = await patientResponse.json();
          setPatientData(data);
        }
      } else {
        console.error('Failed to save patient info');
      }
    } catch (error) {
      console.error('Error saving patient info:', error);
    }
  };

  return (
    <div className="app-container">
      <div className={`content-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="top-bar">
          <button className="hamburger-btn" onClick={toggleSidebar}>
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`}></span>
          </button>
          <h1 className="app-title">Room Dashboard</h1>
        </div>

        <Sidebar isOpen={sidebarOpen} />

        <main className="main-content">
          <div className="content-wrapper">
            {selectedRoom ? (
              <div className="room-detail-container">
                <button className="back-btn" onClick={handleBack}>
                  ← Back to Rooms
                </button>
                <h2 className="room-title">{selectedRoom.toUpperCase()}</h2>
                
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading real-time data...</p>
                  </div>
                ) : latestReading ? (
                  <div className="monitor-container">
                    <div className="gauge-card" onClick={handleGaugeClick}>
                      <div className="gauge-header">
                        <span className="bed-label">Bed {latestReading.bed}</span>
                        <span className="timestamp">
                          {new Date(latestReading.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <Gauge weight={latestReading.weight} />
                      <div className="weight-status">
                        <span
                          className="status-dot"
                          style={{ backgroundColor: getStatusColor(latestReading.weight) }}
                        ></span>
                        Current Weight: {latestReading.weight}g
                      </div>
                    </div>

                    <div className="patient-info-card">
                      {patientData ? (
                        <>
                          <h3>Patient Information</h3>
                          <div className="patient-details">
                            <div className="detail-item">
                              <span className="detail-label">Name:</span>
                              <span className="detail-value">{patientData.name}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Age:</span>
                              <span className="detail-value">{patientData.age}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Sex:</span>
                              <span className="detail-value">{patientData.sex}</span>
                            </div>
                            <div className="detail-item full-width">
                              <span className="detail-label">Address:</span>
                              <span className="detail-value">{patientData.address}</span>
                            </div>
                          </div>
                          <button 
                            className="edit-btn"
                            onClick={() => setEditingPatient(true)}
                          >
                            Edit Patient Info
                          </button>
                        </>
                      ) : (
                        <div className="no-patient">
                          <span className="icon">👤</span>
                          <p>No patient assigned</p>
                          <button 
                            className="assign-btn"
                            onClick={() => setEditingPatient(true)}
                          >
                            Assign Patient
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPatient && (
                      <div className="patient-form-overlay">
                        <form onSubmit={handlePatientSubmit} className="patient-form">
                          <h3>{patientData ? 'Edit' : 'New'} Patient Information</h3>
                          <div className="form-grid">
                            <div className="form-group">
                              <label>Full Name</label>
                              <input
                                type="text"
                                name="name"
                                value={patientInfo.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Age</label>
                              <input
                                type="number"
                                name="age"
                                value={patientInfo.age}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Sex</label>
                              <select
                                name="sex"
                                value={patientInfo.sex}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="form-group full-width">
                              <label>Address</label>
                              <input
                                type="text"
                                name="address"
                                value={patientInfo.address}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            {/* New fields for renaming room and bed */}
                            <div className="form-group">
                              <label>Room Name</label>
                              <input
                                type="text"
                                name="room"
                                value={patientInfo.room}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Bed Name</label>
                              <input
                                type="text"
                                name="bed"
                                value={patientInfo.bed}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button 
                              type="button" 
                              className="cancel-btn"
                              onClick={() => setEditingPatient(false)}
                            >
                              Cancel
                            </button>
                            <button type="submit" className="save-btn">
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-data">
                    <span className="icon">⚠️</span>
                    <p>No weight data available for {selectedRoom.toUpperCase()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="room-selection">
                <h2 className="section-title">Select a Room</h2>
                <div className="room-grid">
                  <div className="room-card" onClick={() => handleRoomClick('room1')}>
                    <div className="room-number">1</div>
                    <div className="room-info">
                      <h3>Room 1</h3>
                      <p>2 beds available</p>
                      <div className="status-indicator active"></div>
                    </div>
                  </div>
                  <div className="room-card" onClick={() => handleRoomClick('room2')}>
                    <div className="room-number">2</div>
                    <div className="room-info">
                      <h3>Room 2</h3>
                      <p>2 beds available</p>
                      <div className="status-indicator active"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Room;
