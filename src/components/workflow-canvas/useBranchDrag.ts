import { useCallback, useEffect, useRef, useState } from 'react'
import type { Branch, BranchDropChange, Position } from '../../types'
import { nodeBounds } from '../../workflowData'
import { clamp } from '../../workflowUtils'

export type BranchDragState = {
  branchId: string
  hasMoved: boolean
  lastX: number
  offsetX: number
  pointerId: number
  pointerStart: Position
  startX: number
}

type UseBranchDragInput = {
  branches: Branch[]
  dragRef: { current: BranchDragState | null }
  getCanvasPoint: (clientX: number, clientY: number) => Position | null
  onBranchDrop: (change: BranchDropChange) => void
  onDragEnd: () => void
  onDragStart: () => void
}

const branchDragThreshold = 4

export function useBranchDrag({
  branches,
  dragRef,
  getCanvasPoint,
  onBranchDrop,
  onDragEnd,
  onDragStart,
}: UseBranchDragInput) {
  const [activeBranchDragId, setActiveBranchDragId] = useState<string | null>(null)
  const [draftBranchX, setDraftBranchX] = useState<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const latestCancelBranchDragRef = useRef<() => void>(() => {})
  const latestFinishBranchDragRef = useRef<() => void>(() => {})
  const latestGetCanvasPointRef = useRef(getCanvasPoint)
  const latestMoveBranchDragRef = useRef<(point: Position) => void>(() => {})
  const listenerCleanupRef = useRef<(() => void) | null>(null)
  const pendingDraftXRef = useRef<number | null>(null)

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
        if (point) latestMoveBranchDragRef.current(point)
      }
      const onPointerUp = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestFinishBranchDragRef.current()
      }
      const onPointerCancel = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return

        latestCancelBranchDragRef.current()
      }
      const onBlur = () => latestCancelBranchDragRef.current()

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
      if (pendingDraftXRef.current !== null) {
        setDraftBranchX(pendingDraftXRef.current)
      }
    })
  }, [])

  const moveBranchDrag = useCallback(
    (point: Position) => {
      const drag = dragRef.current
      if (!drag) return

      if (!drag.hasMoved && Math.abs(point.x - drag.pointerStart.x) < branchDragThreshold) {
        return
      }

      const nextX = clamp(point.x - drag.offsetX, nodeBounds.minX, nodeBounds.maxX)
      drag.hasMoved = true
      drag.lastX = nextX
      pendingDraftXRef.current = nextX
      scheduleFrame()
    },
    [dragRef, scheduleFrame],
  )
  latestMoveBranchDragRef.current = moveBranchDrag

  const finishBranchDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return

    cancelScheduledFrame()
    cleanupWindowListeners()

    if (drag.hasMoved && drag.lastX !== drag.startX) {
      onBranchDrop({
        branchId: drag.branchId,
        startX: drag.startX,
        endX: drag.lastX,
      })
    }

    dragRef.current = null
    pendingDraftXRef.current = null
    setDraftBranchX(null)
    setActiveBranchDragId(null)
    onDragEnd()
  }, [cancelScheduledFrame, cleanupWindowListeners, dragRef, onBranchDrop, onDragEnd])
  latestFinishBranchDragRef.current = finishBranchDrag

  const cancelBranchDrag = useCallback(() => {
    if (!dragRef.current) return

    cancelScheduledFrame()
    cleanupWindowListeners()
    dragRef.current = null
    pendingDraftXRef.current = null
    setDraftBranchX(null)
    setActiveBranchDragId(null)
    onDragEnd()
  }, [cancelScheduledFrame, cleanupWindowListeners, dragRef, onDragEnd])
  latestCancelBranchDragRef.current = cancelBranchDrag

  useEffect(
    () => () => {
      cancelScheduledFrame()
      cleanupWindowListeners()
    },
    [cancelScheduledFrame, cleanupWindowListeners],
  )

  const startBranchDrag = useCallback(
    (branchId: string, pointerPosition: Position, pointerId: number) => {
      if (dragRef.current) return

      const branch = branches.find((currentBranch) => currentBranch.id === branchId)
      if (!branch) return

      onDragStart()

      const startX = clamp(branch.x, nodeBounds.minX, nodeBounds.maxX)
      dragRef.current = {
        branchId,
        hasMoved: false,
        lastX: startX,
        offsetX: pointerPosition.x - branch.x,
        pointerId,
        pointerStart: pointerPosition,
        startX,
      }
      pendingDraftXRef.current = startX
      setDraftBranchX(startX)
      setActiveBranchDragId(branchId)
      installWindowListeners(pointerId)
    },
    [branches, dragRef, installWindowListeners, onDragStart],
  )

  return {
    activeBranchDragId,
    draftBranchX,
    startBranchDrag,
  }
}
