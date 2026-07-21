// Structured bell-curve layout with idle "wobble" animation.
//
// Layout: neurons are placed in vertical columns. Each column's neuron count
// follows a gaussian envelope — 2-3 neurons in the outermost columns, ~18 in
// the center — with even vertical spacing and a half-step stagger between
// adjacent columns so the cloud packs like a lens. Fully deterministic.
//
// Wobble: every node drifts on a small per-node sine orbit around its fixed
// base position. Organic motion, but the layout can never collapse because
// base positions never change.

interface GraphNode {
    id: string
    layer: 'hidden' | 'output'
    index: number
    activation: number
    target: number
    baseX: number
    baseY: number
    x: number
    y: number
    wobbleAmp: number
    wobblePhaseX: number
    wobblePhaseY: number
    wobbleSpeed: number
    introDelay: number
    label?: string
}

interface PointLike {
    x: number
    y: number
}

interface Pulse {
    source: PointLike
    target: GraphNode
    startTime: number
    duration: number
    color: string
    onArrive: () => void
    arrived: boolean
}

const HIDDEN_COUNT = 128
const OUTPUT_COUNT = 10
const LAYOUT_SEED = 1337

// Bell-curve cloud shape — the main tuning knobs:
const COLUMN_COUNT = 13      // number of vertical columns in the cloud
const COLUMN_SPACING = 48    // px between columns (smaller = more compact)
const ROW_SPACING = 28       // px between neurons in a column (smaller = more compact)
const WOBBLE_AMP = 2.6       // px of idle drift; 0 disables wobble

// All nodes (hidden, output, input anchor) render at the same radius so the
// numbered output nodes don't read as visually "special" or larger.
const NODE_RADIUS = 9

const HIDDEN_COLOR = '0, 255, 65'
const OUTPUT_COLOR = '57, 255, 140'
const WINNER_COLOR = '255, 255, 255'
const EDGE_COLOR = '0, 255, 65'
const EDGE_WIDTH = 2
const EDGE_BASE_ALPHA = 0.05
const EDGE_ACTIVE_ALPHA = 0.3
const NODE_FILL = '2, 6, 3'

// Intro animation (on page load): nodes burst from the input point into
// their positions, sweeping left to right, while edges fade in.
const INTRO_NODE_DURATION = 900 // ms each node takes to fly into place
const INTRO_STAGGER = 600       // ms spread between leftmost and rightmost nodes
let introStart = 0

// Horizontal anchors (fractions of canvas width)
const INPUT_X = 0.11
const HIDDEN_CENTER_X = 0.45
const OUTPUT_X = 0.92

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let width = 0
let height = 0

let hiddenNodes: GraphNode[] = []
let outputNodes: GraphNode[] = []
let inputLinks: GraphNode[] = []
let inputOrigin: PointLike = { x: 0, y: 0 }

let pulses: Pulse[] = []
let winnerNode: GraphNode | null = null
let winnerStartTime = 0

// ---------------------------------------------------------------------------
// Seeded RNG so wobble phases (and therefore the whole look) are stable.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
    let a = seed
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function makeNode(
    rng: () => number,
    id: string,
    layer: 'hidden' | 'output',
    index: number,
    baseX: number,
    baseY: number,
    wobbleAmp: number,
    label?: string,
): GraphNode {
    return {
        id,
        layer,
        index,
        activation: 0,
        target: 0,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        wobbleAmp,
        wobblePhaseX: rng() * Math.PI * 2,
        wobblePhaseY: rng() * Math.PI * 2,
        wobbleSpeed: 0.6 + rng() * 0.7,
        introDelay: 0,
        label,
    }
}

// Split HIDDEN_COUNT across COLUMN_COUNT columns proportionally to a gaussian
// envelope, using largest-remainder rounding so the counts sum exactly.
function gaussianColumnCounts(): number[] {
    const half = (COLUMN_COUNT - 1) / 2
    const weights = Array.from({ length: COLUMN_COUNT }, (_, c) => {
        const z = (c - half) / (half / 2) // maps columns onto z in [-2, 2]
        return Math.exp(-0.5 * z * z)
    })
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    const raw = weights.map((w) => (w / totalWeight) * HIDDEN_COUNT)
    const counts = raw.map(Math.floor)
    let remaining = HIDDEN_COUNT - counts.reduce((a, b) => a + b, 0)
    const byFraction = raw
        .map((r, i) => ({ i, frac: r - Math.floor(r) }))
        .sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < remaining; k++) counts[byFraction[k % COLUMN_COUNT].i]++
    return counts
}

function layoutNodes() {
    const rng = mulberry32(LAYOUT_SEED)

    inputOrigin = { x: width * INPUT_X, y: height * 0.5 }

    // --- Hidden cloud: gaussian-height columns, centered vertically.
    const counts = gaussianColumnCounts()
    const maxCount = Math.max(...counts)
    // Shrink row spacing if the tallest column wouldn't fit the viewport.
    const rowSpacing = Math.min(ROW_SPACING, (height * 0.86) / Math.max(1, maxCount - 1))
    const colSpacing = Math.min(COLUMN_SPACING, (width * 0.56) / (COLUMN_COUNT - 1))
    const cloudLeft = width * HIDDEN_CENTER_X - ((COLUMN_COUNT - 1) * colSpacing) / 2
    const cy = height * 0.5

    hiddenNodes = []
    let idx = 0
    for (let c = 0; c < COLUMN_COUNT; c++) {
        const n = counts[c]
        const colX = cloudLeft + c * colSpacing
        // Half-step stagger on odd columns -> hexagonal, lens-like packing.
        const stagger = c % 2 === 1 ? rowSpacing / 2 : 0
        const colTop = cy - ((n - 1) * rowSpacing) / 2 + stagger
        for (let r = 0; r < n; r++) {
            hiddenNodes.push(
                makeNode(rng, `h${idx}`, 'hidden', idx, colX, colTop + r * rowSpacing, WOBBLE_AMP),
            )
            idx++
        }
    }

    // --- Output column: 0-9 evenly spaced, tiny wobble so they feel alive
    // without the labels ever colliding.
    const top = height * 0.06
    const bottom = height * 0.94
    const step = (bottom - top) / (OUTPUT_COUNT - 1)
    outputNodes = Array.from({ length: OUTPUT_COUNT }, (_, i) =>
        makeNode(rng, `o${i}`, 'output', i, width * OUTPUT_X, top + step * i, WOBBLE_AMP * 0.5, String(i)),
    )

    // Input fans into the left face of the bell (first few columns).
    const leftFace = counts[0] + counts[1] + counts[2]
    inputLinks = hiddenNodes.slice(0, leftFace)

    // Stagger the intro left-to-right: the further a node sits from the
    // input point, the later it launches.
    for (const node of [...hiddenNodes, ...outputNodes]) {
        const distFrac = (node.baseX - inputOrigin.x) / Math.max(1, width - inputOrigin.x)
        node.introDelay = distFrac * INTRO_STAGGER
    }
}

function resizeCanvas(container: HTMLElement) {
    const rect = container.getBoundingClientRect()
    width = Math.max(rect.width, 320)
    height = Math.max(rect.height, 300)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    layoutNodes()
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
// Black-filled node with a green outline; ring brightens/thickens with
// activation, plus a soft outer halo so active nodes still read as "lit".
function drawNodeCircle(x: number, y: number, radius: number, rgb: string, strength: number, lineWidth = 1.5) {
    if (strength > 0.02) {
        const glowRadius = radius + radius * 2.5 * strength
        const gradient = ctx.createRadialGradient(x, y, radius * 0.6, x, y, glowRadius)
        gradient.addColorStop(0, `rgba(${rgb}, ${0.3 + 0.35 * strength})`)
        gradient.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.fillStyle = `rgba(${NODE_FILL}, 0.95)`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = `rgba(${rgb}, ${0.6 + 0.4 * strength})`
    ctx.stroke()
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

// 0 while waiting, 0->1 while flying in, 1 forever after.
function introProgress(node: GraphNode, now: number): number {
    if (introStart === 0) return 1
    const t = (now - introStart - node.introDelay) / INTRO_NODE_DURATION
    return Math.min(1, Math.max(0, t))
}

function applyMotion(node: GraphNode, t: number, now: number) {
    const p = introProgress(node, now)
    const e = easeOutCubic(p)
    // Fly from the input point to the base position, then wobble in place.
    const bx = inputOrigin.x + (node.baseX - inputOrigin.x) * e
    const by = inputOrigin.y + (node.baseY - inputOrigin.y) * e
    const amp = node.wobbleAmp * e
    node.x = bx + Math.sin(t * node.wobbleSpeed + node.wobblePhaseX) * amp
    node.y = by + Math.sin(t * node.wobbleSpeed * 0.83 + node.wobblePhaseY) * amp
}

function render(now: number) {
    const t = now * 0.001

    for (const node of hiddenNodes) applyMotion(node, t, now)
    for (const node of outputNodes) applyMotion(node, t, now)

    // Global intro fade for edges (edges look messy while nodes are mid-flight,
    // so they trail slightly behind the node sweep).
    const introFade =
        introStart === 0
            ? 1
            : Math.min(1, Math.max(0, (now - introStart - 300) / (INTRO_STAGGER + INTRO_NODE_DURATION)))

    ctx.clearRect(0, 0, width, height)

    // All edges share one color, width, and opacity formula so the graph
    // reads as a single consistent wireframe regardless of which layer.
    ctx.lineWidth = EDGE_WIDTH
    ctx.strokeStyle = EDGE_COLOR

    // hidden -> output edges
    for (const h of hiddenNodes) {
        for (const o of outputNodes) {
            const glow = Math.max(h.activation, o.activation)
            ctx.strokeStyle = `rgba(${EDGE_COLOR}, ${(EDGE_BASE_ALPHA + glow * EDGE_ACTIVE_ALPHA) * introFade})`
            ctx.beginPath()
            ctx.moveTo(h.x, h.y)
            ctx.lineTo(o.x, o.y)
            ctx.stroke()
        }
    }

    // input -> hidden edges
    for (const node of inputLinks) {
        ctx.strokeStyle = `rgba(${EDGE_COLOR}, ${(EDGE_BASE_ALPHA + node.activation * EDGE_ACTIVE_ALPHA) * introFade})`
        ctx.beginPath()
        ctx.moveTo(inputOrigin.x, inputOrigin.y)
        ctx.lineTo(node.x, node.y)
        ctx.stroke()
    }

    // input anchor dot
    drawNodeCircle(inputOrigin.x, inputOrigin.y, NODE_RADIUS, HIDDEN_COLOR, 0.3)

    // pulses (targets are nodes, so pulses track the wobble automatically)
    pulses = pulses.filter((p) => {
        const progress = Math.min(1, (now - p.startTime) / p.duration)
        if (progress < 0) return true
        const x = p.source.x + (p.target.x - p.source.x) * progress
        const y = p.source.y + (p.target.y - p.source.y) * progress
        ctx.fillStyle = `rgba(${p.color}, 0.9)`
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fill()

        if (progress >= 1 && !p.arrived) {
            p.arrived = true
            p.onArrive()
            return false
        }
        return true
    })

    // hidden neurons
    for (const node of hiddenNodes) {
        node.activation += (node.target - node.activation) * 0.12
        ctx.globalAlpha = introProgress(node, now)
        drawNodeCircle(node.x, node.y, NODE_RADIUS, HIDDEN_COLOR, node.activation)
    }
    ctx.globalAlpha = 1

    // output neurons: circle with the digit centered inside
    for (const node of outputNodes) {
        node.activation += (node.target - node.activation) * 0.12
        ctx.globalAlpha = introProgress(node, now)
        drawNodeCircle(node.x, node.y, NODE_RADIUS, OUTPUT_COLOR, node.activation, 2)
        ctx.fillStyle = `rgba(186, 247, 201, ${0.7 + node.activation * 0.3})`
        ctx.font = "9px 'Press Start 2P', ui-monospace, monospace"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label!, node.x, node.y + 0.5)
    }
    ctx.globalAlpha = 1

    // winner ring
    if (winnerNode) {
        const wt = (now - winnerStartTime) / 900
        if (wt < 1) {
            const ringRadius = 16 + wt * 26
            ctx.strokeStyle = `rgba(${WINNER_COLOR}, ${1 - wt})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(winnerNode.x, winnerNode.y, ringRadius, 0, Math.PI * 2)
            ctx.stroke()
        } else {
            winnerNode = null
        }
    }

    requestAnimationFrame(render)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function initNetworkGraph(container: HTMLElement): void {
    canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('2d context unavailable')
    ctx = context
    container.appendChild(canvas)

    resizeCanvas(container)
    window.addEventListener('resize', () => resizeCanvas(container))

    introStart = performance.now()
    requestAnimationFrame(render)
}

// Replay the on-load burst animation at any time (e.g. wire it to a button).
export function replayIntro(): void {
    resetActivations()
    introStart = performance.now()
}

function spawnPulse(
    source: PointLike,
    target: GraphNode,
    startTime: number,
    duration: number,
    color: string,
    onArrive: () => void,
) {
    pulses.push({ source, target, startTime, duration, color, arrived: false, onArrive })
}

export function resetActivations(): void {
    for (const n of [...hiddenNodes, ...outputNodes]) n.target = 0
    pulses = []
    winnerNode = null
}

export function animatePrediction(
    hiddenActivations: number[],
    probs: number[],
    prediction: number,
): Promise<void> {
    winnerNode = null

    const maxHidden = Math.max(...hiddenActivations, 1e-6)
    const normHidden = hiddenActivations.map((a) => Math.min(1, a / maxHidden))

    return new Promise((resolve) => {
        const now = performance.now()

        // Stage 1: input -> hidden
        hiddenNodes.forEach((node, i) => {
            const startTime = now + Math.random() * 200
            spawnPulse(inputOrigin, node, startTime, 500 + Math.random() * 200, HIDDEN_COLOR, () => {
                node.target = normHidden[i]
            })
        })

        // Stage 2: strongest hidden neurons -> outputs
        const stage2Start = now + 800
        const rankedHidden = [...hiddenNodes]
            .sort((a, b) => normHidden[b.index] - normHidden[a.index])
            .slice(0, 12)

        outputNodes.forEach((node, j) => {
            rankedHidden.forEach((hNode) => {
                const startTime = stage2Start + Math.random() * 200
                spawnPulse(hNode, node, startTime, 500 + Math.random() * 200, OUTPUT_COLOR, () => {
                    node.target = probs[j]
                })
            })
        })

        // Stage 3: winner highlight
        const winnerTime = stage2Start + 900
        setTimeout(() => {
            winnerNode = outputNodes[prediction]
            winnerStartTime = performance.now()
            resolve()
        }, winnerTime - now)
    })
}