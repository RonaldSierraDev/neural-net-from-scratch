import './style.css'



document.querySelector<HTMLElement>('#app')!.innerHTML = `
    <h1>Draw a digit</h1>
    <canvas id="canvas" width="280" height="280"></canvas>
    <p id="result">Prediction: </p>
`
const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!

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
})