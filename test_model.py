import pickle
import numpy as np

try:
    with open('cardio_random_forest.pkl', 'rb') as f:
        model = pickle.load(f)
    print("Model loaded successfully")
    print(f"Model type: {type(model)}")
    
    # Test prediction
    # features: [age, gender, height, weight, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active]
    # Example: 50 years, male(2), 170cm, 70kg, 120/80, normal(1), normal(1), 0, 0, 1
    test_features = np.array([[50, 2, 170, 70, 120, 80, 1, 1, 0, 0, 1]])
    prediction = model.predict(test_features)
    print(f"Test prediction: {prediction}")
except Exception as e:
    print(f"Error: {e}")
