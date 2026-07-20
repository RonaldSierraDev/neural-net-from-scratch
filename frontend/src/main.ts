import './style.css'
import { canvasToInputVector } from './preprocess'
import { initNetworkGraph, animatePrediction, resetActivations } from './networkGraph'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Horizontal layout: [ drawing panel ] -> [ network graph (outputs live at
// its right edge) ]. The graph fills the rest of the viewport.
document.querySelector<HTMLElement>('#app')!.innerHTML = `
    <main id="layout">
        <section id="draw-panel">
            <canvas id="canvas" width="280" height="280"></canvas>
            <p id="draw-hint">Draw a digit here</p>
            <div id="draw-meta">
                <canvas id="preview" width="84" height="84"></canvas>
                <div>
                    <p id="result">Prediction: &mdash;</p>
                    <button id="clear" type="button">Clear</button>
                </div>
            </div>
        </section>
        <div id="graph"></div>
    </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!
const previewCanvas = document.querySelector<HTMLCanvasElement>('#preview')!
const previewCtx = previewCanvas.getContext('2d')!
const resultEl = document.querySelector<HTMLParagraphElement>('#result')!

initNetworkGraph(document.querySelector<HTMLElement>('#graph')!)

function clearCanvas() {
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    previewCtx.fillStyle = 'black'
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height)
    resultEl.textContent = 'Prediction: —'
    resetActivations()
}

clearCanvas()
ctx.strokeStyle = 'white'
ctx.lineWidth = 15
ctx.lineCap = 'round'
ctx.lineJoin = 'round'

document.querySelector<HTMLButtonElement>('#clear')!.addEventListener('click', clearCanvas)

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

function finishStroke() {
    if (!isDrawing) return
    isDrawing = false
    submitDrawing()
}

canvas.addEventListener('mouseup', finishStroke)
canvas.addEventListener('mouseleave', finishStroke)

function submitDrawing() {
    const pixels = canvasToInputVector(canvas)

    // Render the 28x28 input back out at 3x scale for eyeballing.
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

    resultEl.textContent = 'Prediction: ...'

    fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels: Array.from(pixels) }),
    })
        .then((res) => res.json())
        .then(async (data) => {
            await animatePrediction(data.hidden_activations, data.probs, data.prediction)
            resultEl.textContent = `Prediction: ${data.prediction} (${(data.probs[data.prediction] * 100).toFixed(1)}%)`
        })
        .catch(() => {
            resultEl.textContent = 'Prediction failed — backend unreachable'
        })
}