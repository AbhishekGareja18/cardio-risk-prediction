
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib

# Load data
df = pd.read_csv('cardio_train.csv')

# Convert age to years
df['age'] = df['age'] / 365

# Data cleaning
df = df[(df['ap_hi'] >= df['ap_lo']) & 
        (df['ap_hi'] < 250) & (df['ap_hi'] > 70) &
        (df['ap_lo'] < 140) & (df['ap_lo'] > 40)].copy()

# BMI calculation
df['bmi'] = df['weight'] / ((df['height'] / 100)**2)
df['bmi'] = df['bmi'].round(1)

# Feature selection (dropping id, height, weight, cardio)
X = df.drop(columns=['id', 'height', 'weight', 'cardio'])

# Create and fit scaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Save scaler
joblib.dump(scaler, 'scaler.pkl')
print("Scaler saved as scaler.pkl")
print("Features used:", X.columns.tolist())
