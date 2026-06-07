import { memo } from 'react'
import type { PointerEvent } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Position, WorkflowNode } from '../../types'
import { connectorHandleMetrics, getNodeVisualMetrics } from '../../visualMetrics'
import type { ConnectorSide, NodeHoverEvent } from './types'
import { getConnectorXOffset } from './utils'

type RelationHandleProps = {
  node: WorkflowNode
  onPointerDown: (
    nodeId: string,
    side: ConnectorSide,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onPointerEnter: (nodeId: string, side: ConnectorSide) => void
  onPointerLeave: (nodeId: string, event: NodeHoverEvent) => void
  position: Position
  side: ConnectorSide
}

function RelationHandleComponent({
  node,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  position,
  side,
}: RelationHandleProps) {
  const metrics = getNodeVisualMetrics(node.kind, node.label)
  const horizontalOffset = getConnectorXOffset(metrics.width, side)

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          aria-label={`拖动连接 ${node.label.replaceAll('\n', ' ')}`}
          className="absolute z-[6] flex -translate-x-1/2 -translate-y-1/2 cursor-crosshair items-center justify-center rounded-full border border-accent bg-surface text-base font-extrabold leading-none text-accent shadow-[0_0_0_4px_rgba(22,124,128,0.12)] transition-transform hover:scale-110"
          data-connector-node-id={node.id}
          onMouseEnter={() => onPointerEnter(node.id, side)}
          onMouseLeave={(event) => onPointerLeave(node.id, event)}
          onPointerDown={(event) => onPointerDown(node.id, side, event)}
          onPointerEnter={() => onPointerEnter(node.id, side)}
          onPointerLeave={(event) => onPointerLeave(node.id, event)}
          style={{
            height: connectorHandleMetrics.size,
            left: position.x + horizontalOffset,
            top: position.y,
            width: connectorHandleMetrics.size,
          }}
          type="button"
        >
          +
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="max-w-64 rounded-workbench border border-border bg-surface px-3 py-2 text-sm leading-snug text-text shadow-workbench"
          sideOffset={8}
        >
          拖到另一个节点上，新增一条节点关系。
          <Tooltip.Arrow className="fill-surface" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export const RelationHandle = memo(RelationHandleComponent)
