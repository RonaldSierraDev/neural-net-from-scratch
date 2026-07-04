import struct

def read_labels(filepath):
    with open(filepath, 'rb') as f:
        magic, num_labels = struct.unpack('>II', f.read(8))
        labels = f.read()
    return labels


if __name__ == '__main__':
    result = read_labels('../data/train-labels.idx1-ubyte')
    print(result[:10])

