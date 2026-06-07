import type { MouseEvent, PointerEvent } from 'react'
import type { Position } from '../../types'

export type RelationDrag = {
  anchor: Position
  fromId: string
  preview: Position
  pointerId: number
  side: ConnectorSide
  targetId: string | null
}

export type ConnectorSide = 'left' | 'right'

export type HoveredConnector = {
  nodeId: string
  side: ConnectorSide
}

export type NodeHoverEvent = MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>

export type CanvasHit =
  | { type: 'branch'; branchId: string }
  | { type: 'connector'; nodeId: string; side: ConnectorSide }
  | { type: 'edge'; edgeId: string }
  | { type: 'empty' }
  | { type: 'node'; nodeId: string }
