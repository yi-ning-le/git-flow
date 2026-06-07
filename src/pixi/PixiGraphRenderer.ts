import { Application, Container, Graphics, Text } from 'pixi.js'
import type {
  GraphRenderData,
  RenderBranch,
  RenderConnector,
  RenderEdge,
  RenderNode,
  RelationPreview,
} from './graphRenderData'
import { graphHighlightColors } from './graphRenderData'

const arrowLength = 13
const arrowWidth = 9
const guideAccentColor = 0x167c80

export class PixiGraphRenderer {
  private app: Application | null = null
  private readonly branchLayer = new Container()
  private readonly branchGraphics = new Graphics()
  private readonly branchTextLayer = new Container()
  private readonly edgeLayer = new Container()
  private readonly edgeGraphics = new Graphics()
  private readonly nodeLayer = new Container()
  private readonly nodeGraphics = new Graphics()
  private readonly connectorLayer = new Container()
  private readonly connectorGraphics = new Graphics()
  private height = 0
  private width = 0

  async init(host: HTMLDivElement, width: number, height: number) {
    const app = new Application()

    await app.init({
      antialias: true,
      autoDensity: true,
      autoStart: false,
      backgroundAlpha: 0,
      height,
      preference: 'webgl',
      resolution: window.devicePixelRatio || 1,
      width,
    })

    this.app = app
    this.width = width
    this.height = height
    this.branchLayer.eventMode = 'none'
    this.edgeLayer.eventMode = 'none'
    this.nodeLayer.eventMode = 'none'
    this.connectorLayer.eventMode = 'none'
    app.stage.eventMode = 'none'
    app.stage.addChild(this.branchLayer)
    app.stage.addChild(this.edgeLayer)
    app.stage.addChild(this.nodeLayer)
    app.stage.addChild(this.connectorLayer)
    this.branchLayer.addChild(this.branchGraphics)
    this.branchLayer.addChild(this.branchTextLayer)
    this.edgeLayer.addChild(this.edgeGraphics)
    this.nodeLayer.addChild(this.nodeGraphics)
    this.connectorLayer.addChild(this.connectorGraphics)

    app.canvas.style.display = 'block'
    app.canvas.style.height = `${height}px`
    app.canvas.style.pointerEvents = 'auto'
    app.canvas.style.width = `${width}px`
    host.appendChild(app.canvas)
  }

  render(data: GraphRenderData) {
    if (!this.app) return

    if (data.width !== this.width || data.height !== this.height) {
      this.app.renderer.resize(data.width, data.height)
      this.app.canvas.style.width = `${data.width}px`
      this.app.canvas.style.height = `${data.height}px`
      this.width = data.width
      this.height = data.height
    }

    this.clearGraphics()

    this.drawBranches(data.branches)
    this.drawEdges(data.edges, data.relationPreview)
    this.drawNodes(data.nodes)
    this.drawConnectors(data.connectors)
    this.app.render()
  }

  destroy() {
    if (!this.app) return

    this.clearGraphics()
    this.app.destroy(true, {
      children: true,
      context: true,
      texture: true,
      textureSource: true,
    })
    this.app = null
  }

  private clearGraphics() {
    this.branchGraphics.clear()
    for (const child of this.branchTextLayer.removeChildren()) {
      child.destroy()
    }
    this.edgeGraphics.clear()
    this.nodeGraphics.clear()
    this.connectorGraphics.clear()
  }

  private drawBranches(branches: RenderBranch[]) {
    const graphics = this.branchGraphics

    for (const branch of branches) {
      const guideHeight = branch.guide.bottom - branch.guide.top
      const lineHeight = branch.line.bottom - branch.line.top
      const guideLeft = branch.x - branch.guide.width / 2

      graphics
        .roundRect(
          guideLeft,
          branch.guide.top,
          branch.guide.width,
          guideHeight,
          branch.guide.width / 2,
        )
        .fill({ alpha: 0.035, color: guideAccentColor })

      drawDashedLine(
        graphics,
        { x: guideLeft, y: branch.guide.top },
        { x: guideLeft, y: branch.guide.bottom },
        { alpha: 0.18, color: guideAccentColor, dashed: true, width: 1 },
      )
      drawDashedLine(
        graphics,
        { x: guideLeft + branch.guide.width, y: branch.guide.top },
        { x: guideLeft + branch.guide.width, y: branch.guide.bottom },
        { alpha: 0.18, color: guideAccentColor, dashed: true, width: 1 },
      )

      graphics
        .roundRect(
          branch.x - branch.line.width / 2,
          branch.line.top,
          branch.line.width,
          lineHeight,
          branch.line.width / 2,
        )
        .fill({ color: branch.color })

      graphics
        .roundRect(
          branch.x - branch.header.width / 2,
          branch.header.top,
          branch.header.width,
          branch.header.height,
          8,
        )
        .fill({ alpha: 0.8, color: 0xffffff })
        .stroke({ alpha: 1, color: branch.color, width: 1.5 })

      const label = new Text({
        anchor: 0.5,
        style: {
          align: 'center',
          fill: branch.color,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: 24,
          fontWeight: 'bold',
        },
        text: branch.label,
      })
      label.x = branch.x
      label.y = branch.header.top + branch.header.height / 2
      this.branchTextLayer.addChild(label)
    }
  }

  private drawEdges(edges: RenderEdge[], relationPreview: RelationPreview | null) {
    const graphics = this.edgeGraphics

    for (const edge of edges) {
      drawLineWithArrow(graphics, edge.from, edge.to, {
        alpha: edge.alpha,
        color: edge.color,
        dashed: edge.dashed,
        width: edge.width,
      })
    }

    if (relationPreview) {
      drawLineWithArrow(graphics, relationPreview.from, relationPreview.to, {
        alpha: 0.82,
        color: relationPreview.color,
        dashed: true,
        width: relationPreview.width,
      })
    }
  }

  private drawNodes(nodes: RenderNode[]) {
    const graphics = this.nodeGraphics

    for (const node of nodes) {
      const { x, y } = node.position

      if (node.kind === 'commit') {
        graphics.circle(x, y, node.radius).fill({ color: node.branchColor })
        graphics.circle(x, y, node.radius + 2).stroke({ alpha: 0.88, color: 0xffffff, width: 3 })
      } else {
        graphics
          .roundRect(x - node.width / 2, y - node.height / 2, node.width, node.height, node.radius)
          .fill({ color: node.fillColor })
          .stroke({ alpha: 0.82, color: node.branchColor, width: 1.5 })
      }

      if (node.selected) {
        drawRing(graphics, node, graphHighlightColors.selected, 4, 0.18)
      }

      if (node.dragging) {
        drawRing(graphics, node, graphHighlightColors.dragging, 3, 0.26)
      }
    }
  }

  private drawConnectors(connectors: RenderConnector[]) {
    const graphics = this.connectorGraphics

    for (const connector of connectors) {
      if (!connector.visible) continue

      const plusHalfLength = connector.radius * 0.38

      graphics
        .circle(connector.x, connector.y, connector.radius)
        .fill({ alpha: 0.96, color: 0xfffefa })
        .stroke({ alpha: 0.92, color: guideAccentColor, width: 1.5 })
      graphics
        .moveTo(connector.x - plusHalfLength, connector.y)
        .lineTo(connector.x + plusHalfLength, connector.y)
        .moveTo(connector.x, connector.y - plusHalfLength)
        .lineTo(connector.x, connector.y + plusHalfLength)
        .stroke({ alpha: 0.95, color: guideAccentColor, width: 2.2 })
    }
  }
}

type StrokeOptions = {
  alpha: number
  color: number
  dashed: boolean
  width: number
}

function drawLineWithArrow(
  graphics: Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: StrokeOptions,
) {
  if (options.dashed) {
    drawDashedLine(graphics, from, to, options)
  } else {
    graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
      alpha: options.alpha,
      color: options.color,
      width: options.width,
    })
  }

  drawArrowhead(graphics, from, to, options)
}

function drawDashedLine(
  graphics: Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: StrokeOptions,
) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)

  if (distance === 0) return

  const dash = 10
  const gap = 8
  const ux = dx / distance
  const uy = dy / distance

  for (let cursor = 0; cursor < distance; cursor += dash + gap) {
    const end = Math.min(cursor + dash, distance)

    graphics
      .moveTo(from.x + ux * cursor, from.y + uy * cursor)
      .lineTo(from.x + ux * end, from.y + uy * end)
      .stroke({
        alpha: options.alpha,
        color: options.color,
        width: options.width,
      })
  }
}

function drawArrowhead(
  graphics: Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: StrokeOptions,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const baseX = to.x - Math.cos(angle) * arrowLength
  const baseY = to.y - Math.sin(angle) * arrowLength
  const normalX = Math.cos(angle + Math.PI / 2)
  const normalY = Math.sin(angle + Math.PI / 2)

  graphics
    .moveTo(to.x, to.y)
    .lineTo(baseX + normalX * arrowWidth * 0.5, baseY + normalY * arrowWidth * 0.5)
    .lineTo(baseX - normalX * arrowWidth * 0.5, baseY - normalY * arrowWidth * 0.5)
    .closePath()
    .fill({ alpha: options.alpha, color: options.color })
}

function drawRing(
  graphics: Graphics,
  node: RenderNode,
  color: number,
  width: number,
  alpha: number,
) {
  if (node.kind === 'commit') {
    graphics
      .circle(node.position.x, node.position.y, node.radius + 8)
      .stroke({ alpha, color, width })
    return
  }

  graphics
    .roundRect(
      node.position.x - node.width / 2 - 4,
      node.position.y - node.height / 2 - 4,
      node.width + 8,
      node.height + 8,
      node.radius + 4,
    )
    .stroke({ alpha, color, width })
}
