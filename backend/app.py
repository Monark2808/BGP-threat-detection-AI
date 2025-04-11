from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import datetime

# Initialize Flask app and enable CORS for both HTTP and SocketIO
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize SocketIO with app, allowing only the frontend to connect
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")  # Replace "*" with your frontend URL

# Set upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# File upload endpoint
@app.route('/upload', methods=['POST'])
def upload():
    if 'file' in request.files:
        file = request.files['file']
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], file.filename))

        # Read and process the file to extract meaningful data
        with open(os.path.join(app.config['UPLOAD_FOLDER'], file.filename), 'r') as f:
            content = f.read()

        # Example logic for dynamic anomaly detection
        if "HIGH_CONFIDENCE" in content:
            anomaly_type = "High Confidence Threat"
            confidence_score = 1.0  # 100% confidence
        else:
            anomaly_type = "General Threat"
            confidence_score = 0.75  # 75% confidence

        # Emit an alert with dynamic data
        socketio.emit('alert', {
            'timestamp': datetime.datetime.now().isoformat(),
            'anomaly_type': anomaly_type,
            'confidence_score': confidence_score
        })

        return jsonify({'message': 'File uploaded and processed successfully'}), 200
    return jsonify({'error': 'No file found'}), 400

# Self-heal endpoint (trigger self-healing logic)
@app.route('/trigger-heal', methods=['POST'])
def trigger_heal():
    # Extract data from request
    data = request.get_json()
    prefix = data.get('prefix')
    next_hop = data.get('next_hop')

    # Simulating self-healing process (this should be dynamic)
    if prefix and next_hop:
        # Simulate self-healing action
        socketio.emit('alert', {
            'timestamp': datetime.datetime.now().isoformat(),
            'anomaly_type': 'Self-Heal Triggered',
            'confidence_score': 1.0
        })
        return jsonify({'message': 'Self-heal triggered successfully'}), 200

    return jsonify({'error': 'Invalid data for self-healing'}), 400

# Run SocketIO with debug mode enabled
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5051, debug=True)
