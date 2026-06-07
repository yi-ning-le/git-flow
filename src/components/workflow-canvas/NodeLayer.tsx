import { memo } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Branch, NodeContextRequest, Position, WorkflowNode } from '../../types'
import { getNodeVisualMetrics } from '../../visualMetrics'
import { nodeKindClass } from '../../workflowData'
import { cn, getNearestBranch } from '../../workflowUtils'
import type { NodeHoverEvent, RelationDrag } from './types'

const nodeTextClass = {
  commit: 'text-transparent',
  gate: 'text-[#0e4c8a]',
  hotfix: 'text-[#a33a16]',
  tag: 'text-[#08705f]',
}

type NodeLayerProps = {
  activeDragId: string | null
  activeRelationDrag: RelationDrag | null
  branches: Branch[]
  nodes: WorkflowNode[]
  onNodeContextRequest: (request: NodeContextRequest) => void
  onNodePointerDown: (nodeId: string, event: PointerEvent<HTMLButtonElement>) => void
  onNodePointerEnter: (nodeId: string, event: NodeHoverEvent) => void
  onNodePointerLeave: (nodeId: string, event: NodeHoverEvent) => void
  onNodePointerMove: (nodeId: string, event: NodeHoverEvent) => void
  onSelectNode: (nodeId: string) => void
  positions: Record<string, Position>
  selectedNodeId: string
  useDomInteractions: boolean
  useDomVisuals: boolean
}

function NodeLayerComponent({
  activeDragId,
  activeRelationDrag,
  branches,
  nodes,
  onNodeContextRequest,
  onNodePointerDown,
  onNodePointerEnter,
  onNodePointerLeave,
  onNodePointerMove,
  onSelectNode,
  positions,
  selectedNodeId,
  useDomInteractions,
  useDomVisuals,
}: NodeLayerProps) {
  return (
    <>
      {nodes.map((node) => {
        const position = positions[node.id]
        if (!position) return null

        const isSelected = selectedNodeId === node.id
        const isRelationTarget = activeRelationDrag?.targetId === node.id
        const isRelationCandidate = Boolean(
          activeRelationDrag && activeRelationDrag.fromId !== node.id,
        )
        const metrics = getNodeVisualMetrics(node.kind, node.label)
        const nearestBranch = getNearestBranch(position.x, branches)
        return (
          <Tooltip.Root key={node.id}>
            <Tooltip.Trigger asChild>
              <button
                aria-label={`拖动 ${node.label.replaceAll('\n', ' ')}`}
                aria-pressed={isSelected}
                className={cn(
                  'absolute z-[3] inline-flex -translate-x-1/2 -translate-y-1/2 cursor-grab select-none items-center justify-center whitespace-pre-line rounded-workbench border-[1.5px] border-transparent bg-transparent p-0 text-center font-[850] active:cursor-grabbing',
                  nodeTextClass[node.kind],
                  isRelationCandidate && 'ring-2 ring-accent/25',
                  isRelationTarget && 'ring-4 ring-accent ring-offset-2 ring-offset-surface',
                  useDomVisuals && nodeKindClass[node.kind],
                  useDomVisuals && isSelected && 'shadow-[0_0_0_4px_rgba(22,124,128,0.16)]',
                  !useDomInteractions && 'pointer-events-none',
                  activeDragId === node.id && 'z-[5] cursor-grabbing',
                )}
                data-node-id={node.id}
                onClick={useDomInteractions ? () => onSelectNode(node.id) : undefined}
                onContextMenu={
                  useDomInteractions
                    ? (event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onSelectNode(node.id)
                        onNodeContextRequest({
                          mode: 'edit',
                          nodeId: node.id,
                        })
                      }
                    : undefined
                }
                onMouseEnter={
                  useDomInteractions ? (event) => onNodePointerEnter(node.id, event) : undefined
                }
                onMouseLeave={
                  useDomInteractions ? (event) => onNodePointerLeave(node.id, event) : undefined
                }
                onMouseMove={
                  useDomInteractions ? (event) => onNodePointerMove(node.id, event) : undefined
                }
                onPointerDown={
                  useDomInteractions ? (event) => onNodePointerDown(node.id, event) : undefined
                }
                onPointerEnter={
                  useDomInteractions ? (event) => onNodePointerEnter(node.id, event) : undefined
                }
                onPointerLeave={
                  useDomInteractions ? (event) => onNodePointerLeave(node.id, event) : undefined
                }
                onPointerMove={
                  useDomInteractions ? (event) => onNodePointerMove(node.id, event) : undefined
                }
                style={
                  (useDomVisuals
                    ? {
                        borderColor: node.kind === 'commit' ? 'transparent' : nearestBranch.color,
                        left: position.x,
                        top: position.y,
                      }
                    : {
                        height: metrics.minHeight,
                        left: position.x,
                        top: position.y,
                        width: metrics.width,
                      }) as CSSProperties
                }
                type="button"
              >
                {node.kind === 'commit' ? (
                  useDomVisuals ? (
                    <span
                      className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                      style={{
                        backgroundColor: nearestBranch.color,
                        boxShadow: `0 0 0 1px ${nearestBranch.color}`,
                      }}
                    />
                  ) : null
                ) : (
                  <span className="pointer-events-none relative z-[1]">{node.label}</span>
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="max-w-64 rounded-workbench border border-border bg-surface px-3 py-2 text-sm leading-snug text-text shadow-workbench"
                sideOffset={8}
              >
                {node.description}
                <Tooltip.Arrow className="fill-surface" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        )
      })}
    </>
  )
}

export const NodeLayer = memo(NodeLayerComponent)
