import { useCallback, useEffect, useRef, useState } from 'react'
import type { Branch, NodeDropChange, Position } from '../../types'
import { canvasSize, nodeBounds } from '../../workflowData'
import { clamp, snapToBranchLine } from '../../workflowUtils'

export type NodeDragState = {
  hasMoved: boolean
  id: string
  offsetX: number
  pointerId: number
  offsetY: number
  pointerStart: Position
  start: Position
  last: Position
}

type UseNodeDragInput = {
  branches: Branch[]
  dragRef: { current: NodeDragState | null }
  getCanvasPoint: (clientX: number, clientY: number) => Position | null
  onDragEnd: () => void
  onDragStart: () => void
  onNodeDrop: (change: NodeDropChange) => void
  onSelectNode: (nodeId: string) => void
  positions: Record<string, Position>
}

const nodeDragThreshold = 4

export function useNodeDrag({
  branches,
  dragRef,
  getCanvasPoint,
  onDragEnd,
  onDragStart,
  onNodeDrop,
  onSelectNode,
  positions,
}: UseNodeDragInput) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [draftPosition, setDraftPosition] = useState<Position | null>(null)
  const frameRef = useRef<number | null>(null)
  const latestCancelNodeDragRef = useRef<() => void>(() => {})
  const latestFinishNodeDragRef = useRef<() => void>(() => {})
  const latestGetCanvasPointRef = useRef(getCanvasPoint)
  const latestMoveNodeDragRef = useRef<(point: Position) => void>(() => {})
  const listenerCleanupRef = useRef<(() => void) | null>(null)
  const pendingDraftRef = useRef<Position | null>(null)

  latestGetCanvasPointRef.current = getCanvasPoint

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
        if (point) latestMoveNodeDragRef.current(point)
      }
      const onPointerUp = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestFinishNodeDragRef.current()
      }
      const onPointerCancel = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestCancelNodeDragRef.current()
      }
      const onBlur = () => latestCancelNodeDragRef.current()

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
      if (pendingDraftRef.current) {
        setDraftPosition(pendingDraftRef.current)
      }
    })
  }, [])

  const moveNodeDrag = useCallback(
    (point: Position) => {
      const drag = dragRef.current
      if (!drag) return

      if (
        !drag.hasMoved &&
        Math.hypot(point.x - drag.pointerStart.x, point.y - drag.pointerStart.y) < nodeDragThreshold
      ) {
        return
      }

      const nextPosition = snapToBranchLine(
        {
          x: clamp(point.x - drag.offsetX, nodeBounds.minX, nodeBounds.maxX),
          y: point.y - drag.offsetY,
        },
        branches,
      )

      drag.hasMoved = true
      drag.last = nextPosition
      pendingDraftRef.current = nextPosition
      scheduleFrame()
    },
    [branches, scheduleFrame],
  )
  latestMoveNodeDragRef.current = moveNodeDrag

  const finishNodeDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return

    cancelScheduledFrame()
    cleanupWindowListeners()

    if (drag.hasMoved) {
      const finalPosition = snapToBranchLine(drag.last, branches)
      onNodeDrop({
        nodeId: drag.id,
        start: drag.start,
        end: finalPosition,
      })
    }

    dragRef.current = null
    pendingDraftRef.current = null
    setDraftPosition(null)
    setActiveDragId(null)
    onDragEnd()
  }, [branches, cancelScheduledFrame, cleanupWindowListeners, onDragEnd, onNodeDrop])
  latestFinishNodeDragRef.current = finishNodeDrag

  const cancelNodeDrag = useCallback(() => {
    if (!dragRef.current) return

    cancelScheduledFrame()
    cleanupWindowListeners()
    dragRef.current = null
    pendingDraftRef.current = null
    setDraftPosition(null)
    setActiveDragId(null)
    onDragEnd()
  }, [cancelScheduledFrame, cleanupWindowListeners, onDragEnd])
  latestCancelNodeDragRef.current = cancelNodeDrag

  useEffect(
    () => () => {
      cancelScheduledFrame()
      cleanupWindowListeners()
    },
    [cancelScheduledFrame, cleanupWindowListeners],
  )

  const startNodeDrag = useCallback(
    (nodeId: string, pointerPosition: Position, pointerId: number) => {
      if (dragRef.current) return

      const position = positions[nodeId]
      if (!position) return

      onSelectNode(nodeId)
      onDragStart()

      const snappedPosition = snapToBranchLine(
        {
          x: clamp(position.x, 0, canvasSize.width),
          y: position.y,
        },
        branches,
      )

      dragRef.current = {
        hasMoved: false,
        id: nodeId,
        offsetX: pointerPosition.x - position.x,
        offsetY: pointerPosition.y - position.y,
        pointerId,
        pointerStart: pointerPosition,
        start: snappedPosition,
        last: snappedPosition,
      }
      pendingDraftRef.current = snappedPosition
      setDraftPosition(snappedPosition)
      setActiveDragId(nodeId)
      installWindowListeners(pointerId)
    },
    [branches, installWindowListeners, onDragStart, onSelectNode, positions],
  )

  return {
    activeDragId,
    draftPosition,
    isNodeDraggingRef: dragRef,
    startNodeDrag,
  }
}
