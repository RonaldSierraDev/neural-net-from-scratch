import numpy as np
import data_loader


def init_params():
    rng = np.random.default_rng()
    # He initialization: scale by sqrt(2/fan_in), suited for ReLU layers
    W1 = rng.standard_normal((128, 784)) * np.sqrt(2 / 784)
    b1 = np.zeros(128)
    W2 = rng.standard_normal((10, 128)) * np.sqrt(2 / 128)
    b2 = np.zeros(10)
    return W1, b1, W2, b2


def relu(z):
    return np.maximum(0, z)


def relu_derivative(z):
    return (z > 0).astype(z.dtype)


def softmax(logits):
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    exp_scores = np.exp(shifted)
    return exp_scores / np.sum(exp_scores, axis=1, keepdims=True)


def forward(X, W1, b1, W2, b2):
    Z1 = X @ W1.T + b1
    A1 = relu(Z1)
    Z2 = A1 @ W2.T + b2
    probs = softmax(Z2)
    return Z1, A1, probs


def cross_entropy_loss(probs, labels):
    batch_size = probs.shape[0]
    correct_probs = probs[np.arange(batch_size), labels]
    return -np.mean(np.log(correct_probs + 1e-12))


def backward(X, labels, Z1, A1, probs, W2):
    batch_size = X.shape[0]
    one_hot = np.zeros_like(probs)
    one_hot[np.arange(batch_size), labels] = 1

    dZ2 = (probs - one_hot) / batch_size
    dW2 = dZ2.T @ A1
    db2 = np.sum(dZ2, axis=0)

    dA1 = dZ2 @ W2
    dZ1 = dA1 * relu_derivative(Z1)
    dW1 = dZ1.T @ X
    db1 = np.sum(dZ1, axis=0)

    return dW1, db1, dW2, db2


def accuracy(probs, labels):
    predictions = np.argmax(probs, axis=1)
    return np.mean(predictions == labels)


def train(X, y, X_test, y_test, W1, b1, W2, b2, epochs=15, batch_size=64, lr=0.5):
    num_samples = X.shape[0]

    for epoch in range(epochs):
        permutation = np.random.permutation(num_samples)
        X_shuffled = X[permutation]
        y_shuffled = y[permutation]

        for start in range(0, num_samples, batch_size):
            end = start + batch_size
            X_batch = X_shuffled[start:end]
            y_batch = y_shuffled[start:end]

            Z1, A1, probs = forward(X_batch, W1, b1, W2, b2)
            dW1, db1, dW2, db2 = backward(X_batch, y_batch, Z1, A1, probs, W2)

            W1 -= lr * dW1
            b1 -= lr * db1
            W2 -= lr * dW2
            b2 -= lr * db2

        _, _, test_probs = forward(X_test, W1, b1, W2, b2)
        test_loss = cross_entropy_loss(test_probs, y_test)
        test_acc = accuracy(test_probs, y_test)
        print(f"epoch {epoch + 1:2d}/{epochs}  test_loss={test_loss:.4f}  test_accuracy={test_acc:.4f}")

    return W1, b1, W2, b2


def load_dataset(images_path, labels_path):
    images = data_loader.read_images(images_path)
    labels = data_loader.read_labels(labels_path)
    X = images.reshape(images.shape[0], -1) / 255.0
    y = np.frombuffer(labels, dtype=np.uint8).astype(np.int64)
    return X, y

def save_model(path, W1, b1, W2, b2):
    np.savez(path, W1=W1, b1=b1, W2=W2, b2=b2)

def load_model(path):
    data = np.load(path)
    return data['W1'], data['b1'], data['W2'], data['b2']

if __name__ == '__main__':
    X_train, y_train = load_dataset('../data/train-images.idx3-ubyte', '../data/train-labels.idx1-ubyte')
    X_test, y_test = load_dataset('../data/t10k-images.idx3-ubyte', '../data/t10k-labels.idx1-ubyte')

    W1, b1, W2, b2 = init_params()
    W1, b1, W2, b2 = train(X_train, y_train, X_test, y_test, W1, b1, W2, b2)

    _, _, final_probs = forward(X_test, W1, b1, W2, b2)
    print("final test accuracy:", accuracy(final_probs, y_test))

    save_model("../training_results/model.npz", W1, b1, W2, b2)