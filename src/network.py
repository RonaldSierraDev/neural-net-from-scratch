import numpy as np

weights = np.random.randn(10, 784)

biases = np.zeros(10)
image_variable = 0;
output = np.dot(weights * """input_vector""") + biases