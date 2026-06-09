import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PatientManagement from "./pages/PatientManagement";
import WheelchairManagement from "./pages/WheelchairManagement";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";

const App = () => {
  return (
    <div>
      <nav style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ marginRight: 10 }}>
          Dashboard
        </Link>
        <Link to="/patients" style={{ marginRight: 10 }}>
          Patients
        </Link>
        <Link to="/wheelchairs" style={{ marginRight: 10 }}>
          Wheelchairs
        </Link>
        <Link to="/reports" style={{ marginRight: 10 }}>
          Reports
        </Link>
        <Link to="/analytics" style={{ marginRight: 10 }}>
          Analytics
        </Link>
      </nav>

      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientManagement />} />
          <Route path="/wheelchairs" element={<WheelchairManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
