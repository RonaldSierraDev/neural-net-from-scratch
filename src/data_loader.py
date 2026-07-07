import struct
import numpy as np

def read_labels(filepath):
    with open(filepath, 'rb') as f:
        magic, num_labels = struct.unpack('>II', f.read(8))
        labels = f.read()
    return labels



#deconstruct images into sets of numbers by each pixel
def read_images(filepath):
    with open(filepath, 'rb') as f:
        magic, count, rows, columns = struct.unpack('>IIII', f.read(16))
        images = np.frombuffer(f.read(), dtype=np.uint8)
        images = images.reshape(count, rows, columns)
    return images

if __name__ == '__main__':
    result = read_labels('../data/train-labels.idx1-ubyte')
    print(result[:10])
    result1 = read_images('../data/train-images.idx3-ubyte')
    print(result1.shape)