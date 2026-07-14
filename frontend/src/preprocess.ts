export function canvasToInputVector(source: HTMLCanvasElement): Float32Array {
    // Downscale 280x280 -> 28x28 using an offscreen canvas. drawImage does
    // the resampling for us so we don't have to average pixels by hand.
    const small = document.createElement('canvas')
    small.width = 28
    small.height = 28
    const ctx = small.getContext('2d')!
    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, 28, 28)

    const { data } = ctx.getImageData(0, 0, 28, 28)
    const pixels = new Float32Array(28 * 28)

    for (let i = 0; i < pixels.length; i++) {
        // data is RGBA; since strokes are pure white on black, R/G/B are
        // identical, so just read the red channel.
        pixels[i] = data[i * 4] / 255
    }

    return pixels
}
