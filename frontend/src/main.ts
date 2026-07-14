import './style.css'
import { canvasToInputVector } from './preprocess'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'


document.querySelector<HTMLElement>('#app')!.innerHTML = `
    <h1>Draw a digit</h1>
    <canvas id="canvas" width="280" height="280"></canvas>
    <canvas id="preview" width="84" height="84" style="image-rendering: pixelated; border:1px solid gray;"></canvas>
    <p id="result">Prediction: </p>
`
const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!
const previewCanvas = document.querySelector<HTMLCanvasElement>('#preview')!
const previewCtx = previewCanvas.getContext('2d')!

ctx.fillStyle = 'black'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.strokeStyle = 'white'
ctx.lineWidth = 15
ctx.lineCap = 'round'

let isDrawing = false

canvas.addEventListener('mousedown', (event) => {
    isDrawing = true
    ctx.beginPath()
    ctx.moveTo(event.offsetX, event.offsetY)
})

canvas.addEventListener('mousemove', (event) => {
    if (!isDrawing) return
    ctx.lineTo(event.offsetX, event.offsetY)
    ctx.stroke()
})

canvas.addEventListener('mouseup', () => {
    isDrawing = false

    const pixels = canvasToInputVector(canvas)

    // draw the 28x28 array back out at 3x scale so you can eyeball it
    const imgData = previewCtx.createImageData(28, 28)
    for (let i = 0; i < pixels.length; i++) {
        const v = pixels[i] * 255
        imgData.data[i * 4] = v
        imgData.data[i * 4 + 1] = v
        imgData.data[i * 4 + 2] = v
        imgData.data[i * 4 + 3] = 255
    }
    previewCtx.putImageData(imgData, 0, 0)
    previewCtx.imageSmoothingEnabled = false
    previewCtx.drawImage(previewCanvas, 0, 0, 28, 28, 0, 0, 84, 84)

    const resultEl = document.querySelector<HTMLParagraphElement>('#result')!
    resultEl.textContent = 'Prediction: ...'

    fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels: Array.from(pixels) }),
    })
        .then((res) => res.json())
        .then((data) => {
            resultEl.textContent = `Prediction: ${data.prediction} (${(data.probs[data.prediction] * 100).toFixed(1)}%)`
        })
        .catch(() => {
            resultEl.textContent = 'Prediction: failed to reach backend'
        })
})