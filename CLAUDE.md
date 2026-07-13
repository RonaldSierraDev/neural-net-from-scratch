# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

A from-scratch neural network for MNIST digit classification, built using only Python and numpy — explicitly **no PyTorch, TensorFlow, or similar ML frameworks**. This is a learning project; keep implementations explicit and framework-free rather than reaching for higher-level abstractions.

## Running code

There is no build system, package manifest, or test suite yet — just plain scripts run directly:

```bash
cd src
python data_loader.py
python network.py
```

Only dependency is `numpy`.

## Data

MNIST data is expected at `../data/` (relative to `src/`), in the original IDX ubyte format downloaded from Kaggle (https://www.kaggle.com/datasets/hojjatk/mnist-dataset), e.g.:
- `data/train-images.idx3-ubyte`
- `data/train-labels.idx1-ubyte`

The `data/` directory is gitignored — it must be downloaded separately and is not present in the repo.

## Architecture

- `src/data_loader.py` — parses the raw IDX file format directly via `struct.unpack`, no external MNIST loader library:
  - `read_labels(filepath)`: skips the 8-byte header (`magic`, `num_labels`) and returns the remaining bytes as raw labels.
  - `read_images(filepath)`: skips the 16-byte header (`magic`, `count`, `rows`, `columns`), loads the rest into a `uint8` numpy array, and reshapes to `(count, rows, columns)` — i.e. an array of 28×28 pixel matrices.
- `src/network.py` — the network itself (currently a stub/work-in-progress). Weights are shaped `(10, 784)` and biases `(10,)`, i.e. a single dense layer mapping a flattened 28×28 image directly to 10 digit-class outputs. Forward/backward pass logic is not yet implemented.

Since this is an incremental learning project, expect `network.py` to be frequently incomplete or mid-refactor — check its current state before assuming standard forward/backward pass conventions are in place.
