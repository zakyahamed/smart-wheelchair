import React, { useState, useEffect } from "react";

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    // load patients from Firebase
    setPatients([
      { id: "P001", name: "Alice Smith", room: "101" },
      { id: "P002", name: "Bob Jones", room: "102" },
    ]);
  }, []);

  const handleAdd = () => {
    const id = `P${String(Math.floor(Math.random() * 900) + 100)}`;
    setPatients([...patients, { id, name: "New Patient", room: "TBD" }]);
  };

  const handleDelete = (id) => setPatients(patients.filter((p) => p.id !== id));

  return (
    <div>
      <h1>Patient Management</h1>
      <button onClick={handleAdd}>Add Patient</button>
      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            {p.id} - {p.name} (Room {p.room}){" "}
            <button onClick={() => handleDelete(p.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatientManagement;
