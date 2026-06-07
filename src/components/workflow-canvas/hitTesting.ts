import type { Position } from '../../types'
import type {
  GraphRenderData,
  RenderBranch,
  RenderConnector,
  RenderEdge,
  RenderNode,
} from '../../pixi/graphRenderData'
import type { CanvasHit } from './types'

const edgeHitWidth = 10
const connectorHitPadding = 4

export type HitTestPhase = 'action' | 'hover'

export function hitTestCanvas(
  point: Position,
  data: GraphRenderData,
  phase: HitTestPhase = 'action',
): CanvasHit {
  const connector = hitTestConnector(point, data.connectors, phase)
  if (connector) return { type: 'connector', nodeId: connector.nodeId, side: connector.side }

  const node = hitTestNode(point, data.nodes)
  if (node) return { type: 'node', nodeId: node.id }

  const branch = hitTestBranch(point, data.branches)
  if (branch) return { type: 'branch', branchId: branch.id }

  const edge = hitTestEdge(point, data.edges)
  if (edge) return { type: 'edge', edgeId: edge.id }

  return { type: 'empty' }
}

export function hitTestBranch(point: Position, branches: RenderBranch[]) {
  return (
    branches.find((branch) => {
      const left = branch.x - branch.header.width / 2
      const right = branch.x + branch.header.width / 2
      const top = branch.header.top
      const bottom = branch.header.top + branch.header.height

      return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
    }) ?? null
  )
}

export function hitTestConnector(
  point: Position,
  connectors: RenderConnector[],
  phase: HitTestPhase = 'action',
) {
  return (
    connectors.reduce<ConnectorHit | null>((closest, connector) => {
      if (phase === 'action' && !connector.visible) return closest

      const distance = Math.hypot(point.x - connector.x, point.y - connector.y)
      if (distance > connector.radius + connectorHitPadding) return closest
      if (!closest || distance < closest.distance) return { connector, distance }
      return closest
    }, null)?.connector ?? null
  )
}

export function hitTestNode(point: Position, nodes: RenderNode[]) {
  return (
    nodes.reduce<NodeHit | null>((closest, node) => {
      const distance = Math.hypot(point.x - node.position.x, point.y - node.position.y)
      if (!isPointInsideNode(point, node)) return closest
      if (!closest || distance < closest.distance) return { distance, node }
      return closest
    }, null)?.node ?? null
  )
}

export function hitTestEdge(point: Position, edges: RenderEdge[]) {
  return (
    edges.reduce<EdgeHit | null>((closest, edge) => {
      const distance = pointToSegmentDistance(point, edge.from, edge.to)
      const threshold = Math.max(edgeHitWidth, edge.width + edgeHitWidth / 2)
      if (distance > threshold) return closest
      if (!closest || distance < closest.distance) return { distance, edge }
      return closest
    }, null)?.edge ?? null
  )
}

function isPointInsideNode(point: Position, node: RenderNode) {
  const dx = Math.abs(point.x - node.position.x)
  const dy = Math.abs(point.y - node.position.y)

  if (node.kind === 'commit') {
    return Math.hypot(dx, dy) <= node.radius
  }

  return dx <= node.width / 2 && dy <= node.height / 2
}

function pointToSegmentDistance(point: Position, from: Position, to: Position) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y)

  const projection = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))
  const closest = {
    x: from.x + t * dx,
    y: from.y + t * dy,
  }

  return Math.hypot(point.x - closest.x, point.y - closest.y)
}

type ConnectorHit = {
  connector: RenderConnector
  distance: number
}

type EdgeHit = {
  distance: number
  edge: RenderEdge
}

type NodeHit = {
  distance: number
  node: RenderNode
}
