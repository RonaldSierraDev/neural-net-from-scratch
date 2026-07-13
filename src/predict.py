import numpy as np
import data_loader
from network import forward, load_model

W1, b1, W2, b2 = load_model("../training_results/model.npz")

images = data_loader.read_images("../data/t10k-images.idx3-ubyte")
labels = data_loader.read_labels("../data/t10k-labels.idx1-ubyte")

idx = 0
X = images[idx].reshape(1, -1) / 255.0
_,_, probs = forward(X, W1, b1, W2, b2)
print("predicted:", np.argmax(probs), "actual:", labels[idx])

