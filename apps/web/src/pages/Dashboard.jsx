import React from "react";

const Dashboard = () => {
  // Placeholder metrics - replace with real data from Firebase
  const metrics = {
    totalPatients: 42,
    availableChairs: 12,
    activeRequests: 3,
    completedTrips: 128,
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
          <strong>Total Patients</strong>
          <div style={{ fontSize: 24 }}>{metrics.totalPatients}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
          <strong>Available Chairs</strong>
          <div style={{ fontSize: 24 }}>{metrics.availableChairs}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
          <strong>Active Requests</strong>
          <div style={{ fontSize: 24 }}>{metrics.activeRequests}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
          <strong>Completed Trips</strong>
          <div style={{ fontSize: 24 }}>{metrics.completedTrips}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
