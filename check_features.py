import pickle
import numpy as np

try:
    with open('cardio_random_forest.pkl', 'rb') as f:
        model = pickle.load(f)
    print("Model loaded successfully")
    
    # Try to get number of features
    if hasattr(model, 'n_features_in_'):
        print(f"Number of features expected: {model.n_features_in_}")
    elif hasattr(model, 'feature_importances_'):
        print(f"Number of features expected: {len(model.feature_importances_)}")
        
except Exception as e:
    print(f"Error: {e}")
