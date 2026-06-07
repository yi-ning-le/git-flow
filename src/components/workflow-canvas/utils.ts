import type { Position, WorkflowNode } from '../../types'
import { getNodeVisualMetrics } from '../../visualMetrics'
import type { ConnectorSide, NodeHoverEvent } from './types'

export function isConnectorElementForNode(target: EventTarget | null, nodeId: string) {
  return (
    target instanceof Element && Boolean(target.closest(`[data-connector-node-id="${nodeId}"]`))
  )
}

export function isNodeElementForConnector(target: EventTarget | null, nodeId: string) {
  return target instanceof Element && Boolean(target.closest(`[data-node-id="${nodeId}"]`))
}

export function getConnectorSide(event: NodeHoverEvent): ConnectorSide {
  const currentTarget = event.currentTarget as HTMLButtonElement | null
  if (!currentTarget) return 'right'

  const rect = currentTarget.getBoundingClientRect()
  return getConnectorSideFromRect(event.clientX, rect)
}

export function getConnectorSideFromRect(
  clientX: number,
  rect: Pick<DOMRect, 'left' | 'width'>,
): ConnectorSide {
  return clientX < rect.left + rect.width / 2 ? 'left' : 'right'
}

export function getConnectorXOffset(width: number, side: ConnectorSide) {
  return side === 'left' ? -width / 2 : width / 2
}

export function getRelationDropTargetId(
  nodes: WorkflowNode[],
  positions: Record<string, Position>,
  fromId: string,
  point: Position,
) {
  return (
    nodes.reduce<NodeHitTarget | null>((closest, node) => {
      if (node.id === fromId) return closest

      const position = positions[node.id]
      if (!position) return closest

      const distance = Math.hypot(position.x - point.x, position.y - point.y)
      if (!isPointInNodeHitArea(node, position, point)) return closest

      if (!closest || distance < closest.distance) {
        return { distance, id: node.id }
      }

      return closest
    }, null)?.id ?? null
  )
}

type NodeHitTarget = {
  distance: number
  id: string
}

const relationHitPadding = 20

function isPointInNodeHitArea(node: WorkflowNode, position: Position, point: Position) {
  const metrics = getNodeVisualMetrics(node.kind, node.label)
  const dx = Math.abs(point.x - position.x)
  const dy = Math.abs(point.y - position.y)

  if (node.kind === 'commit') {
    return Math.hypot(dx, dy) <= metrics.radius + relationHitPadding
  }

  return (
    dx <= metrics.width / 2 + relationHitPadding && dy <= metrics.minHeight / 2 + relationHitPadding
  )
}
