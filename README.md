# neural-net-from-scratch

A digit classifier built entirely from raw NumPy — no PyTorch, TensorFlow, or autograd — paired with a live browser demo where you draw a digit and watch the network react in real time.

## Features
- 2-layer MLP (784 → 128 → 10), He-initialized weights, ReLU hidden layer, softmax output
- Manually derived backpropagation and cross-entropy loss (no autograd)
- Mini-batch SGD with shuffling
- Custom IDX/ubyte file parser (no external MNIST loader)
- Model checkpointing via `np.savez`
- **Test accuracy: 98.08%**
- FastAPI backend serving the trained model, with a canvas-based frontend that visualizes hidden-layer activations and predictions live

## Architecture
```
src/          pure-NumPy training/inference engine (data_loader.py, network.py, predict.py)
backend/      FastAPI service exposing POST /predict, reuses src/network.py directly
frontend/     Vite + TypeScript canvas demo (draw a digit, see it classified live)
```
Canvas input is cropped to the drawn ink's bounding box and rescaled/centered MNIST-style before being sent to the model, matching the framing the network was trained on.

## Getting started

### Train the model
```
cd src
python network.py   # trains and saves a checkpoint to ../training_results/model.npz
python predict.py   # loads the checkpoint and classifies a sample digit
```

### Run the live demo (backend + frontend)
```
cd backend && .venv/bin/uvicorn main:app --reload --port 8000
cd frontend && npm run dev
```
Draw a digit at http://localhost:5173 and it POSTs to the backend for a live prediction.

## Deploying
Two env vars point the frontend and backend at each other; defaults are set for local dev.
- `backend`: `ALLOWED_ORIGINS` (comma-separated CORS origins, defaults to `http://localhost:5173`)
- `frontend`: `VITE_API_URL` in `frontend/.env` (defaults to `http://localhost:8000`)

When deploying, set `ALLOWED_ORIGINS` to your deployed frontend URL, and `VITE_API_URL` to your deployed backend URL before building.

## Project log
**7/3/2026** — Today starts the first day of my learning journey into making my first ever neural network from scratch. No PyTorch, TensorFlow, or similar frameworks will be used. I plan to make this completely from just Python and NumPy.

**7/4/2026** — I downloaded an MNIST set from Kaggle, here's the [link](https://www.kaggle.com/datasets/hojjatk/mnist-dataset?resource=download).
