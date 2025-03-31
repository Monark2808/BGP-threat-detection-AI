import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';

const socket = io("https://bgp-threat-detection-backend.onrender.com/", {
  transports: ["websocket"],
});

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    socket.on("alert", (data) => {
      setAlerts((prev) => [...prev, data]);
    });
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    await fetch("https://bgp-threat-detection-backend.onrender.com/upload", {
      method: "POST",
      body: formData,
    });
  };

  const handleDownload = async () => {
    const response = await fetch("https://bgp-threat-detection-backend.onrender.com/download/sample");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_file";
    link.click();
  };

  return (
    <div className="container mt-4">
      <h2>BGP Threat Detection Dashboard</h2>

      <div className="mb-3">
        <input type="file" onChange={handleFileChange} />
        <button className="btn btn-primary mx-2" onClick={handleUpload}>Upload File</button>
        <button className="btn btn-success" onClick={handleDownload}>Download Tool</button>
      </div>

      <LineChart width={800} height={300} data={alerts}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="confidence_score" stroke="#8884d8" />
      </LineChart>

      <table className="table table-striped mt-4">
        <thead>
          <tr><th>Time</th><th>Type</th><th>Confidence</th></tr>
        </thead>
        <tbody>
          {alerts.map((a, i) => (
            <tr key={i}>
              <td>{a.timestamp}</td>
              <td>{a.anomaly_type}</td>
              <td>{a.confidence_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;