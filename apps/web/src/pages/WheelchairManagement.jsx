import React, { useState, useEffect } from "react";

// Simple hook to persist state in localStorage for demo purposes
const useLocalStorage = (key, initial) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }, [key, state]);

  return [state, setState];
};

const defaultWheelchairs = [
  { id: "WC001", status: "Available", battery: "80%", location: "Room 101" },
  {
    id: "WC002",
    status: "Charging",
    battery: "95%",
    location: "Charging Station A",
  },
  { id: "WC003", status: "Moving", battery: "60%", location: "Hallway B" },
];

const WheelchairManagement = () => {
  const [wheelchairs, setWheelchairs] = useLocalStorage(
    "wheelchairs",
    defaultWheelchairs,
  );
  const [form, setForm] = useState({
    id: "",
    status: "",
    battery: "",
    location: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // keep sample data if none exists
    if (!wheelchairs || wheelchairs.length === 0)
      setWheelchairs(defaultWheelchairs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () =>
    setForm({ id: "", status: "", battery: "", location: "" });

  const validate = (w) => w.id && w.status;

  const handleAdd = () => {
    if (!validate(form))
      return alert("Please provide at least an ID and status.");
    if (wheelchairs.find((w) => w.id === form.id))
      return alert("Wheelchair ID already exists.");
    setWheelchairs([...wheelchairs, { ...form }]);
    resetForm();
  };

  const startEdit = (id) => {
    const wc = wheelchairs.find((w) => w.id === id);
    if (!wc) return;
    setForm({ ...wc });
    setEditingId(id);
  };

  const handleUpdate = () => {
    if (!validate(form))
      return alert("Please provide at least an ID and status.");
    setWheelchairs(
      wheelchairs.map((w) => (w.id === editingId ? { ...form } : w)),
    );
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (!confirm(`Delete wheelchair ${id}?`)) return;
    setWheelchairs(wheelchairs.filter((w) => w.id !== id));
  };

  const handleMaintenance = (id) => {
    // demo: set status to 'Maintenance'
    setWheelchairs(
      wheelchairs.map((w) =>
        w.id === id ? { ...w, status: "Maintenance" } : w,
      ),
    );
    alert(`Wheelchair ${id} set to Maintenance`);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Wheelchair Management</h1>

      <section
        style={{
          marginBottom: 24,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 6,
        }}
      >
        <h2>{editingId ? "Edit Wheelchair" : "Add New Wheelchair"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ flex: "0 0 150px" }}
            placeholder="Wheelchair ID"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
            disabled={!!editingId}
          />
          <input
            placeholder="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <input
            placeholder="Battery"
            value={form.battery}
            onChange={(e) => setForm({ ...form, battery: e.target.value })}
          />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          {editingId ? (
            <>
              <button onClick={handleUpdate}>Update</button>
              <button
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button onClick={handleAdd}>Add</button>
          )}
        </div>
      </section>

      <section>
        <h2>Current Wheelchairs</h2>
        {wheelchairs.length === 0 ? (
          <p>No wheelchairs available.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  Battery
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  Location
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {wheelchairs.map((w) => (
                <tr key={w.id}>
                  <td style={{ padding: 8 }}>{w.id}</td>
                  <td style={{ padding: 8 }}>{w.status}</td>
                  <td style={{ padding: 8 }}>{w.battery}</td>
                  <td style={{ padding: 8 }}>{w.location}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => startEdit(w.id)}>Edit</button>
                    <button onClick={() => handleDelete(w.id)}>Delete</button>
                    <button onClick={() => handleMaintenance(w.id)}>
                      Maintenance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default WheelchairManagement;
