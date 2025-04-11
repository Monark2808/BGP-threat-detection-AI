import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'; // Import here

// Socket connection to Flask backend
const socket = io("http://localhost:5051", {
  transports: ["websocket"],
});

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [file, setFile] = useState(null);
  const [filter, setFilter] = useState("All");
  const [darkMode, setDarkMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Loading state for file upload
  const { transcript, resetTranscript } = useSpeechRecognition(); // Hook for speech recognition

  useEffect(() => {
    socket.on("alert", (data) => {
      setAlerts((prev) => [...prev, data]); // Add new alert to the alerts array
    });

    return () => socket.off("alert"); // Clean up the socket connection on component unmount
  }, []);

  const handleVoiceCommand = () => {
    console.log("Transcript: ", transcript); // Debugging line to check the transcript
    if (transcript.includes("upload")) {
      handleUpload();
    } else if (transcript.includes("download")) {
      handleDownload();
    } else if (transcript.includes("self-heal")) {
      triggerSelfHeal();
    }
    resetTranscript(); // Reset transcript after each command
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("â— Please choose a file first.");
    setIsUploading(true);  // Set loading state
    const formData = new FormData();
    formData.append("file", file);
    await fetch("http://localhost:5051/upload", {
      method: "POST",
      body: formData,
    });
    alert("âœ… File uploaded!");
    setIsUploading(false);  // Reset loading state after upload
  };

  const handleDownload = async () => {
    const response = await fetch("http://localhost:5051/download/sample");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_file";
    link.click();
  };

  const triggerSelfHeal = async () => {
    try {
      const response = await fetch("http://localhost:5051/trigger-heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: "192.168.1.0/24",
          next_hop: "10.0.0.1",
        }),
      });
      const data = await response.json();
      alert("ðŸ› ï¸ " + data.message);
    } catch (err) {
      console.error(err);
      alert("âŒ Failed to trigger self-healing");
    }
  };

  const filteredAlerts = filter === "All" ? alerts : alerts.filter(a => a.anomaly_type === filter);
  const uniqueTypes = ["All", ...new Set(alerts.map(a => a.anomaly_type))];

  const exportCSV = () => {
    const csv = Papa.unparse(filteredAlerts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'BGP_Alerts.csv');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("BGP Alerts Report", 14, 16);
    const rows = filteredAlerts.map(a => [a.timestamp, a.anomaly_type, a.confidence_score]);
    doc.autoTable({
      head: [["Timestamp", "Type", "Confidence"]],
      body: rows,
    });
    doc.save("BGP_Alerts.pdf");
  };

  return (
    <div className={`container mt-5 ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`} style={{ borderRadius: '12px', padding: '30px' }}>
      <h2 className="text-center mb-4 fw-bold">
        ðŸŒ BGP Threat Detection Dashboard
      </h2>

      <div className="d-flex justify-content-center align-items-center mb-4 gap-3 flex-wrap">
        <input type="file" className="form-control w-auto" onChange={handleFileChange} />
        <button className="btn btn-primary" onClick={handleUpload} disabled={isUploading}>
          {isUploading ? "Uploading..." : "ðŸ“¤ Upload"}
        </button>
        <button className="btn btn-success" onClick={handleDownload}>â¬‡ï¸ Download Sample</button>
        <button className="btn btn-danger" onClick={triggerSelfHeal}>ðŸ› ï¸ Self-Heal</button>
        <button className="btn btn-secondary" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "â˜€ï¸ Light Mode" : "ðŸŒ™ Dark Mode"}
        </button>
        <button className="btn btn-info" onClick={handleVoiceCommand}>
          ðŸŽ¤ Use Voice Command
        </button>
      </div>

      <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
        <select className="form-select w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {uniqueTypes.map((type, i) => <option key={i} value={type}>{type}</option>)}
        </select>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={exportCSV}>ðŸ“„ Export CSV</button>
          <button className="btn btn-outline-danger" onClick={exportPDF}>ðŸ§¾ Export PDF</button>
        </div>
      </div>

      {/* Debugging Section: Display Transcript */}
      <div className="mb-3">
        <h5>ðŸŽ¤ Current Voice Command</h5>
        <p>{transcript}</p>
      </div>

      <div className={`p-4 rounded shadow-sm mb-4 ${darkMode ? 'bg-secondary' : 'bg-white'}`}>
        <h5 className="mb-3">ðŸ“ˆ Confidence Over Time</h5>
        <LineChart width={800} height={300} data={filteredAlerts}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="confidence_score" stroke="#e74c3c" strokeWidth={2} />
        </LineChart>
      </div>

      <div className={`p-3 rounded shadow-sm ${darkMode ? 'bg-secondary' : 'bg-white'}`}>
        <h5 className="mb-3">ðŸ“‹ Alerts</h5>
        <table className="table table-striped table-bordered">
          <thead className={darkMode ? 'table-light' : 'table-dark'}>
            <tr>
              <th>â° Time</th>
              <th>âš ï¸ Type</th>
              <th>ðŸ“Š Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.length === 0 ? (
              <tr><td colSpan="3" className="text-center text-muted">No alerts yet</td></tr>
            ) : (
              filteredAlerts.map((a, i) => (
                <tr key={i}>
                  <td>{a.timestamp}</td>
                  <td>{a.anomaly_type}</td>
                  <td>{(a.confidence_score * 100).toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;