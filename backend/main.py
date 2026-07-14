import os
import sys
from pathlib import Path

#make src/network.py importable, since backend/ is a sibling of src/
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from network import forward, load_model

app = FastAPI()

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path (__file__).resolve().parent.parent / "training_results" / "model.npz"
W1, b1, W2, b2 = load_model(str(MODEL_PATH))

class PredictRequest(BaseModel):
    pixels: list[float ]

@app.post("/predict")
def predict(request: PredictRequest):
    X = np.array(request.pixels, dtype=np.float64).reshape(1, -1)
    Z1, A1, probs = forward(X, W1, b1, W2, b2)
    return {
        "hidden_activations": A1[0].tolist(),
        "probs": probs[0].tolist(),
        "prediction": int(np.argmax(probs[0])),
    }