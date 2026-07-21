const INK_THRESHOLD = 20 // out of 255; ignores anti-aliasing noise on a blank canvas
const TARGET_SIZE = 20 // MNIST digits typically fill ~20 of 28px, centered with a ~4px border

function findInkBoundingBox(source: HTMLCanvasElement) {
    const ctx = source.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, source.width, source.height)

    let minX = source.width
    let minY = source.height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            // Strokes are pure white on black, so R/G/B are identical; read red.
            const v = data[(y * source.width + x) * 4]
            if (v > INK_THRESHOLD) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
            }
        }
    }

    if (maxX < minX || maxY < minY) return null
    return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export function canvasToInputVector(source: HTMLCanvasElement): Float32Array {
    const small = document.createElement('canvas')
    small.width = 28
    small.height = 28
    const ctx = small.getContext('2d')!
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, 28, 28)

    const box = findInkBoundingBox(source)
    if (box) {
        // MNIST-style centering: crop to the drawn ink, scale its longer side
        // to TARGET_SIZE, and center it in the 28x28 field. Drawing directly
        // onto a mostly-blank 280x280 canvas without this shrinks the digit
        // far below MNIST's usual fill ratio and confuses the model.
        const scale = TARGET_SIZE / Math.max(box.width, box.height)
        const destWidth = box.width * scale
        const destHeight = box.height * scale
        const destX = (28 - destWidth) / 2
        const destY = (28 - destHeight) / 2
        ctx.drawImage(source, box.minX, box.minY, box.width, box.height, destX, destY, destWidth, destHeight)
    } else {
        // Blank canvas — nothing to center, fall back to a plain downscale.
        ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, 28, 28)
    }

    const { data } = ctx.getImageData(0, 0, 28, 28)
    const pixels = new Float32Array(28 * 28)

    for (let i = 0; i < pixels.length; i++) {
        pixels[i] = data[i * 4] / 255
    }

    return pixels
}
