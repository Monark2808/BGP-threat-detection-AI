from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import datetime
import joblib

# App Setup
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')  # No eventlet!

# Optional Model Load
MODEL_PATH = 'model/bgp_model.pkl'
model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None

# Upload Folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# File Upload or JSON Alert Input
@app.route('/upload', methods=['POST'])
def upload():
    if 'file' in request.files:
        file = request.files['file']
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], file.filename))
        return jsonify({'message': 'File uploaded successfully'})

    elif request.is_json:
        data = request.get_json()
        features = data.get('features')
        if model and features:
            prediction = model.predict([features])
            if prediction[0] == 1:
                alert = {
                    "timestamp": datetime.datetime.now().isoformat(),
                    "anomaly_type": "BGP Anomaly",
                    "confidence_score": 0.95,
                    "raw_data": str(features)
                }
                socketio.emit('alert', alert)
                print("🔔 Alert sent")
        return jsonify({'status': 'Processed'})

    return jsonify({'error': 'Invalid input'}), 400

# File Download Endpoint
@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# Run App (threading mode, not eventlet)
if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5050, debug=True)