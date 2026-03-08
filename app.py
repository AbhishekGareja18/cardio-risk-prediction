from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)

try:
    model_path = os.path.join(os.path.dirname(__file__), 'cardio_random_forest.pkl')
    scaler_path = os.path.join(os.path.dirname(__file__), 'scaler.pkl')
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
except Exception as e:
    print(f"Error loading model/scaler: {e}")
    model = None
    scaler = None

try:
    # Dataset uses ',' as separator based on file analysis
    csv_path = os.path.join(os.path.dirname(__file__), 'cardio_train.csv')
    df_raw = pd.read_csv(csv_path)
    
    # Processed stats cache
    # Vectorized age bins
    ages = df_raw['age'] / 365
    age_counts = pd.cut(ages, bins=[30, 40, 50, 60, 70], labels=['30-40', '40-50', '50-60', '60-70']).value_counts().sort_index()
    
    GLOBAL_STATS = {
        'total_patients': int(len(df_raw)),
        'gender_dist': df_raw['gender'].value_counts().to_dict(),
        'avg_age': float(ages.mean()),
        'avg_bmi': float((df_raw['weight'] / ((df_raw['height'] / 100) ** 2)).mean()),
        'chol_dist': df_raw['cholesterol'].value_counts().sort_index().to_list(),
        'age_bins': {
            'labels': age_counts.index.tolist(),
            'data': age_counts.values.tolist()
        }
    }
except Exception as e:
    print(f"Error processing stats: {e}")
    GLOBAL_STATS = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stats')
def get_stats():
    return jsonify(GLOBAL_STATS)

@app.route('/api/performance')
def get_performance():
    # Accurate metrics extracted from the notebook outputs
    perf = {
        'accuracy': 0.7105, # Random Forest Test Accuracy
        'precision': 0.72,
        'recall': 0.69,
        'f1_score': 0.71,
        'comparison': {
            'labels': ['SVC', 'Logistic', 'Random Forest', 'KNN', 'Decision Tree'],
            'values': [0.7322, 0.7266, 0.7105, 0.6938, 0.6326]
        },
        'feature_importance': [
            {'feature': 'Systolic BP', 'value': 0.469},
            {'feature': 'Diastolic BP', 'value': 0.184},
            {'feature': 'Age', 'value': 0.150},
            {'feature': 'Cholesterol', 'value': 0.092},
            {'feature': 'BMI', 'value': 0.065}
        ]
    }
    return jsonify(perf)

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        height = float(data.get('height', 170))
        weight = float(data.get('weight', 70))
        bmi = weight / ((height/100) ** 2)
        
        # Features from Untitled.ipynb cell 52 importance list:
        # Order: age, gender, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active, bmi
        features = [
            float(data.get('age', 50)),
            int(data.get('gender', 1)),
            float(data.get('ap_hi', 120)),
            float(data.get('ap_lo', 80)),
            int(data.get('cholesterol', 1)),
            int(data.get('gluc', 1)),
            int(data.get('smoke', 0)),
            int(data.get('alco', 0)),
            int(data.get('active', 0)),
            float(bmi)
        ]
        
        if not model or not scaler:
            return jsonify({'error': 'Model or scaler not loaded'}), 500
            
        prediction_array = np.array([features])
        # IMPORTANT: Transformed features using the same scaler from training
        scaled_features = scaler.transform(prediction_array)
        
        prediction = model.predict(scaled_features)[0]
        probability = model.predict_proba(scaled_features)[0][1]
            
        return jsonify({
            'prediction': int(prediction),
            'probability': float(probability),
            'message': 'Stable' if prediction == 0 else 'High Risk'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
