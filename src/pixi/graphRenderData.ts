import type { Branch, Edge, NodeKind, Position, WorkflowNode } from '../types'
import { canvasSize } from '../workflowData'
import { branchLaneMetrics, connectorHandleMetrics, getNodeVisualMetrics } from '../visualMetrics'
import { getNearestBranch } from '../workflowUtils'
import type { ConnectorSide, HoveredConnector } from '../components/workflow-canvas/types'
import {
  draggingRingColor,
  edgeColors,
  edgeWidths,
  nodeFillColors,
  nodeStrokeFallback,
  relationPreviewColor,
  selectedRingColor,
} from './colors'

export type RenderBranch = {
  color: number
  guide: {
    bottom: number
    top: number
    width: number
  }
  header: {
    height: number
    top: number
    width: number
  }
  id: Branch['id']
  label: string
  line: {
    bottom: number
    top: number
    width: number
  }
  x: number
}

export type RenderNode = {
  branchColor: number
  dragging: boolean
  fillColor: number
  height: number
  id: string
  kind: NodeKind
  label: string
  position: Position
  radius: number
  selected: boolean
  width: number
}

export type RenderEdge = {
  alpha: number
  color: number
  dashed: boolean
  from: Position
  id: string
  to: Position
  width: number
}

export type RenderConnector = {
  nodeId: string
  radius: number
  side: ConnectorSide
  visible: boolean
  x: number
  y: number
}

export type RelationPreview = {
  color: number
  from: Position
  to: Position
  width: number
}

export type GraphRenderData = {
  branches: RenderBranch[]
  connectors: RenderConnector[]
  edges: RenderEdge[]
  height: number
  nodes: RenderNode[]
  relationPreview: RelationPreview | null
  width: number
}

type RelationDrag = {
  anchor: Position
  fromId: string
  preview: Position
  side?: ConnectorSide
}

type BuildGraphRenderDataInput = {
  activeDragId: string | null
  branches: Branch[]
  edges: Edge[]
  hoveredConnector?: HoveredConnector | null
  nodes: WorkflowNode[]
  positions: Record<string, Position>
  relationDrag: RelationDrag | null
  selectedNodeId: string
}

function toPixiColor(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16)
}

export function buildGraphRenderData({
  activeDragId,
  branches,
  edges,
  hoveredConnector = null,
  nodes,
  positions,
  relationDrag,
  selectedNodeId,
}: BuildGraphRenderDataInput): GraphRenderData {
  const renderNodes = nodes.reduce<RenderNode[]>((result, node) => {
    const position = positions[node.id]
    if (!position) return result

    const nearestBranch = getNearestBranch(position.x, branches)
    const size = getNodeVisualMetrics(node.kind, node.label)

    result.push({
      branchColor: nearestBranch ? toPixiColor(nearestBranch.color) : nodeStrokeFallback,
      dragging: node.id === activeDragId,
      fillColor: nodeFillColors[node.kind],
      height: size.minHeight,
      id: node.id,
      kind: node.kind,
      label: node.label,
      position,
      radius: size.radius,
      selected: node.id === selectedNodeId,
      width: size.width,
    })

    return result
  }, [])

  const renderNodeById = new Map(renderNodes.map((node) => [node.id, node]))
  const renderConnectors = renderNodes.flatMap<RenderConnector>((node) => {
    const radius = connectorHandleMetrics.size / 2
    const sides: ConnectorSide[] = ['left', 'right']

    return sides.map((side) => ({
      nodeId: node.id,
      radius,
      side,
      visible:
        (hoveredConnector?.nodeId === node.id && hoveredConnector.side === side) ||
        Boolean(relationDrag && relationDrag.fromId === node.id && relationDrag.side === side),
      x: node.position.x + (side === 'left' ? -node.width / 2 : node.width / 2),
      y: node.position.y,
    }))
  })
  const renderEdges = edges.reduce<RenderEdge[]>((result, edge) => {
    const fromNode = renderNodeById.get(edge.from)
    const toNode = renderNodeById.get(edge.to)

    if (!fromNode || !toNode) return result

    result.push({
      alpha: 1,
      color: edgeColors[edge.kind],
      dashed: edge.kind === 'sync' || edge.kind === 'candidate',
      from: getNodeBoundaryPoint(fromNode, toNode.position),
      id: edge.id,
      to: getNodeBoundaryPoint(toNode, fromNode.position),
      width: edgeWidths[edge.kind],
    })

    return result
  }, [])

  return {
    branches: branches.map((branch) => ({
      color: toPixiColor(branch.color),
      guide: {
        bottom: canvasSize.height - branchLaneMetrics.bottom,
        top: branchLaneMetrics.lineTop,
        width: branchLaneMetrics.guideWidth,
      },
      header: {
        height: branchLaneMetrics.headerHeight,
        top: branchLaneMetrics.headerTop,
        width: branchLaneMetrics.headerWidth,
      },
      id: branch.id,
      label: branch.label,
      line: {
        bottom: canvasSize.height - branchLaneMetrics.bottom,
        top: branchLaneMetrics.lineTop,
        width: branchLaneMetrics.lineWidth,
      },
      x: branch.x,
    })),
    connectors: renderConnectors,
    edges: renderEdges,
    height: canvasSize.height,
    nodes: renderNodes,
    relationPreview:
      relationDrag && positions[relationDrag.fromId]
        ? {
            color: relationPreviewColor,
            from: relationDrag.anchor,
            to: relationDrag.preview,
            width: 3,
          }
        : null,
    width: canvasSize.width,
  }
}

export const graphHighlightColors = {
  dragging: draggingRingColor,
  selected: selectedRingColor,
}

function getNodeBoundaryPoint(node: RenderNode, toward: Position): Position {
  const dx = toward.x - node.position.x
  const dy = toward.y - node.position.y
  const distance = Math.hypot(dx, dy)

  if (distance === 0) return node.position

  if (node.kind === 'commit') {
    return {
      x: node.position.x + (dx / distance) * node.radius,
      y: node.position.y + (dy / distance) * node.radius,
    }
  }

  const halfWidth = node.width / 2
  const halfHeight = node.height / 2
  const scale = Math.min(
    Math.abs(dx) > 0 ? halfWidth / Math.abs(dx) : Number.POSITIVE_INFINITY,
    Math.abs(dy) > 0 ? halfHeight / Math.abs(dy) : Number.POSITIVE_INFINITY,
  )

  return {
    x: node.position.x + dx * scale,
    y: node.position.y + dy * scale,
  }
}
