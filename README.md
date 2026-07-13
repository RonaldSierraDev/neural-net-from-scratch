# neural-net-from-scratch

## Current status
A 2-layer MLP (784 -> 128 -> 10) trained on Mnist, implemented with only numpy:
- He-initialized weights, ReLU hidden layer, softmax output
- Manaually derived backpropagation (no autograd)
- Mini-batch SGD with shuffling
- Custom IDX/ubyte file parser (no external MNIST loader)
- Model checkpointing via np.savez

**Test accuracy: 98.08%** 
    cs src
    python network.py # trains and saves a checkpoint to ../training_results/model.npz
    python predict.py #loads the checkpoint and classifies a sample digit


***7/3/2026***



Today starts the first day of my learning journey into making my first ever neural network from scratch. No Pytorch, TensorFlow, or similar frameworks will be used. I plan to make this completely from just python and numpy.



7/4/2026

I downloaded an MNIST set from Kaggle, here's the [link](https://www.kaggle.com/datasets/hojjatk/mnist-dataset?resource=download)


