import { useCallback, useEffect, useRef, useState } from 'react'
import type { Position, RelationDropChange, WorkflowNode } from '../../types'
import { getNodeVisualMetrics } from '../../visualMetrics'
import type { ConnectorSide, HoveredConnector, RelationDrag } from './types'
import { getConnectorXOffset, getRelationDropTargetId } from './utils'

type UseRelationDragInput = {
  displayPositions: Record<string, Position>
  getCanvasPoint: (clientX: number, clientY: number) => Position | null
  isNodeDraggingRef: { current: unknown }
  nodes: WorkflowNode[]
  onRelationDrop: (change: RelationDropChange) => void
  onSelectNode: (nodeId: string) => void
  relationDragRef: { current: RelationDrag | null }
  setHoveredConnector: (connector: HoveredConnector | null) => void
}

export function useRelationDrag({
  displayPositions,
  getCanvasPoint,
  isNodeDraggingRef,
  nodes,
  onRelationDrop,
  onSelectNode,
  relationDragRef,
  setHoveredConnector,
}: UseRelationDragInput) {
  const [relationDrag, setRelationDrag] = useState<RelationDrag | null>(null)
  const frameRef = useRef<number | null>(null)
  const latestCancelRelationDragRef = useRef<() => void>(() => {})
  const latestDisplayPositionsRef = useRef(displayPositions)
  const latestFinishRelationDragRef = useRef<() => void>(() => {})
  const latestGetCanvasPointRef = useRef(getCanvasPoint)
  const latestMoveRelationDragRef = useRef<(point: Position) => void>(() => {})
  const latestNodesRef = useRef(nodes)
  const listenerCleanupRef = useRef<(() => void) | null>(null)
  const pendingRelationRef = useRef<RelationDrag | null>(null)

  latestDisplayPositionsRef.current = displayPositions
  latestGetCanvasPointRef.current = getCanvasPoint
  latestNodesRef.current = nodes

  const cancelScheduledFrame = useCallback(() => {
    if (frameRef.current === null) return

    window.cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const cleanupWindowListeners = useCallback(() => {
    listenerCleanupRef.current?.()
    listenerCleanupRef.current = null
  }, [])

  const installWindowListeners = useCallback(
    (pointerId: number) => {
      cleanupWindowListeners()

      const onPointerMove = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        const point = latestGetCanvasPointRef.current(event.clientX, event.clientY)
        if (point) latestMoveRelationDragRef.current(point)
      }
      const onPointerUp = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestFinishRelationDragRef.current()
      }
      const onPointerCancel = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestCancelRelationDragRef.current()
      }
      const onBlur = () => latestCancelRelationDragRef.current()

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerCancel)
      window.addEventListener('blur', onBlur)

      listenerCleanupRef.current = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
        window.removeEventListener('blur', onBlur)
      }
    },
    [cleanupWindowListeners],
  )

  const scheduleFrame = useCallback(() => {
    if (frameRef.current !== null) return

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      if (pendingRelationRef.current) {
        setRelationDrag(pendingRelationRef.current)
      }
    })
  }, [])

  const moveRelationDrag = useCallback(
    (point: Position) => {
      const drag = relationDragRef.current
      if (!drag) return

      const nextDrag = {
        anchor: drag.anchor,
        fromId: drag.fromId,
        preview: point,
        pointerId: drag.pointerId,
        side: drag.side,
        targetId: getRelationDropTargetId(
          latestNodesRef.current,
          latestDisplayPositionsRef.current,
          drag.fromId,
          point,
        ),
      }
      relationDragRef.current = nextDrag
      pendingRelationRef.current = nextDrag
      scheduleFrame()
    },
    [scheduleFrame],
  )
  latestMoveRelationDragRef.current = moveRelationDrag

  const finishRelationDrag = useCallback(() => {
    const drag = relationDragRef.current
    if (!drag) return

    cancelScheduledFrame()
    cleanupWindowListeners()

    const targetId =
      drag.targetId ??
      getRelationDropTargetId(
        latestNodesRef.current,
        latestDisplayPositionsRef.current,
        drag.fromId,
        drag.preview,
      )

    if (targetId) {
      onRelationDrop({
        fromId: drag.fromId,
        toId: targetId,
      })
    }

    relationDragRef.current = null
    pendingRelationRef.current = null
    setHoveredConnector(null)
    setRelationDrag(null)
  }, [cancelScheduledFrame, cleanupWindowListeners, onRelationDrop, setHoveredConnector])
  latestFinishRelationDragRef.current = finishRelationDrag

  const cancelRelationDrag = useCallback(() => {
    if (!relationDragRef.current) return

    cancelScheduledFrame()
    cleanupWindowListeners()
    relationDragRef.current = null
    pendingRelationRef.current = null
    setHoveredConnector(null)
    setRelationDrag(null)
  }, [cancelScheduledFrame, cleanupWindowListeners, setHoveredConnector])
  latestCancelRelationDragRef.current = cancelRelationDrag

  useEffect(
    () => () => {
      cancelScheduledFrame()
      cleanupWindowListeners()
    },
    [cancelScheduledFrame, cleanupWindowListeners],
  )

  const startRelationDrag = useCallback(
    (nodeId: string, side: ConnectorSide, point: Position, pointerId: number) => {
      if (isNodeDraggingRef.current || relationDragRef.current) return

      const sourceNode = nodes.find((node) => node.id === nodeId)
      const sourcePosition = displayPositions[nodeId]
      if (!point || !sourceNode || !sourcePosition) return

      onSelectNode(nodeId)
      setHoveredConnector({ nodeId, side })

      const sourceMetrics = getNodeVisualMetrics(sourceNode.kind, sourceNode.label)
      const anchor = {
        x: sourcePosition.x + getConnectorXOffset(sourceMetrics.width, side),
        y: sourcePosition.y,
      }

      const nextDrag = {
        anchor,
        fromId: nodeId,
        preview: point,
        pointerId,
        side,
        targetId: null,
      }
      relationDragRef.current = nextDrag
      pendingRelationRef.current = nextDrag
      setRelationDrag(nextDrag)
      installWindowListeners(pointerId)
    },
    [
      displayPositions,
      installWindowListeners,
      isNodeDraggingRef,
      nodes,
      onSelectNode,
      setHoveredConnector,
    ],
  )

  return {
    isRelationDraggingRef: relationDragRef,
    relationDrag,
    startRelationDrag,
  }
}
