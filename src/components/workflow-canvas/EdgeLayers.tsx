import { memo } from 'react'
import type { Edge, Position } from '../../types'
import type { RenderEdge } from '../../pixi/graphRenderData'
import { canvasSize, edgeClass, markerFill } from '../../workflowData'
import type { RelationDrag } from './types'

type EdgeHitLayerProps = {
  edges: RenderEdge[]
  onDeleteEdge: (edgeId: string) => void
}

function EdgeHitLayerComponent({ edges, onDeleteEdge }: EdgeHitLayerProps) {
  return (
    <svg
      aria-hidden={edges.length === 0 ? 'true' : undefined}
      className="pointer-events-none absolute inset-0 z-[2] overflow-visible"
      height={canvasSize.height}
      viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
      width={canvasSize.width}
    >
      {edges.map((edge) => (
        <line
          aria-label={`删除箭头 ${edge.id}`}
          className="pointer-events-auto cursor-context-menu stroke-transparent focus:outline-none focus-visible:stroke-accent/40"
          key={edge.id}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDeleteEdge(edge.id)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Backspace' && event.key !== 'Delete') return
            event.preventDefault()
            onDeleteEdge(edge.id)
          }}
          role="button"
          strokeWidth={18}
          tabIndex={0}
          x1={edge.from.x}
          x2={edge.to.x}
          y1={edge.from.y}
          y2={edge.to.y}
        />
      ))}
    </svg>
  )
}

type EdgeLayerProps = {
  edges: Edge[]
  positions: Record<string, Position>
  relationDrag: RelationDrag | null
}

function EdgeLayerComponent({ edges, positions, relationDrag }: EdgeLayerProps) {
  const validEdges = edges.filter((edge) => positions[edge.from] && positions[edge.to])

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      height={canvasSize.height}
      viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
      width={canvasSize.width}
    >
      <defs>
        {Object.entries(markerFill).map(([kind, fill]) => (
          <marker
            id={`arrow-${kind}`}
            key={kind}
            markerHeight="10"
            markerWidth="10"
            orient="auto"
            refX="8"
            refY="5"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={fill} />
          </marker>
        ))}
      </defs>
      {validEdges.map((edge) => {
        const from = positions[edge.from]
        const to = positions[edge.to]
        return (
          <line
            className={edgeClass[edge.kind]}
            key={edge.id}
            markerEnd={`url(#arrow-${edge.kind})`}
            x1={from.x}
            x2={to.x}
            y1={from.y}
            y2={to.y}
          />
        )
      })}
      {relationDrag && positions[relationDrag.fromId] ? (
        <line
          className="stroke-accent [stroke-width:3] [stroke-dasharray:6_6]"
          markerEnd="url(#arrow-merge)"
          x1={relationDrag.anchor.x}
          x2={relationDrag.preview.x}
          y1={relationDrag.anchor.y}
          y2={relationDrag.preview.y}
        />
      ) : null}
    </svg>
  )
}

export const EdgeHitLayer = memo(EdgeHitLayerComponent)
export const EdgeLayer = memo(EdgeLayerComponent)
