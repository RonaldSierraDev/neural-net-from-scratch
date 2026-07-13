import numpy as np
import data_loader


weights = np.random.randn(10, 784)

biases = np.zeros(10)

image_variable = data_loader.read_images('../data/train-images.idx3-ubyte');

first_number = image_variable[0]
first_number =  first_number.flatten()
first_number = first_number/255
output = np.dot(weights, first_number) + biases
