import * as Tooltip from '@radix-ui/react-tooltip'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RefObject } from 'react'
import {
  branches,
  initialEdges,
  initialPositions,
  initialWorkflowNodes,
  nodeBounds,
} from '../workflowData'
import { WorkflowCanvas } from './WorkflowCanvas'

const pixiState = vi.hoisted(() => ({
  available: true,
}))

vi.mock('./PixiGraphLayer', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    PixiGraphLayer: ({
      data,
      fallback,
      onContextMenu,
      onAvailabilityChange,
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerMove,
    }: {
      data: {
        connectors?: Array<{ nodeId: string; side: string; visible: boolean }>
      }
      fallback: React.ReactNode
      onContextMenu?: React.MouseEventHandler<HTMLDivElement>
      onAvailabilityChange?: (available: boolean) => void
      onPointerCancel?: React.PointerEventHandler<HTMLDivElement>
      onPointerDown?: React.PointerEventHandler<HTMLDivElement>
      onPointerLeave?: React.PointerEventHandler<HTMLDivElement>
      onPointerMove?: React.PointerEventHandler<HTMLDivElement>
    }) => {
      React.useEffect(() => {
        onAvailabilityChange?.(pixiState.available)
      }, [onAvailabilityChange])

      if (!pixiState.available) {
        return (
          <>
            <div data-testid="pixi-fallback" />
            {fallback}
          </>
        )
      }

      return (
        <div
          data-testid="pixi-layer"
          onContextMenu={onContextMenu}
          onPointerCancel={onPointerCancel}
          onPointerDown={onPointerDown}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
        >
          {data.connectors?.map((connector) => (
            <span
              data-node-id={connector.nodeId}
              data-side={connector.side}
              data-testid={`connector-${connector.nodeId}-${connector.side}`}
              data-visible={String(connector.visible)}
              key={`${connector.nodeId}-${connector.side}`}
            />
          ))}
        </div>
      )
    },
  }
})

function renderCanvas() {
  const props = {
    branches,
    canvasRef: createRef<HTMLDivElement>(),
    edges: initialEdges,
    nodes: initialWorkflowNodes,
    onBranchDrop: vi.fn(),
    onDeleteEdge: vi.fn(),
    onNodeContextRequest: vi.fn(),
    onNodeDrop: vi.fn(),
    onRelationDrop: vi.fn(),
    onSelectNode: vi.fn(),
    positions: initialPositions,
    selectedNodeId: 'ci',
  }

  render(
    <Tooltip.Provider>
      <WorkflowCanvas {...props} />
    </Tooltip.Provider>,
  )
  setCanvasRect(props.canvasRef)

  return props
}

function setCanvasRect(canvasRef: RefObject<HTMLDivElement | null>) {
  if (!canvasRef.current) throw new Error('missing canvas ref')

  Object.defineProperty(canvasRef.current, 'scrollLeft', { configurable: true, value: 0 })
  Object.defineProperty(canvasRef.current, 'scrollTop', { configurable: true, value: 0 })
  canvasRef.current.getBoundingClientRect = () =>
    ({
      bottom: 1000,
      height: 980,
      left: 10,
      right: 1130,
      top: 20,
      width: 1120,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }) as DOMRect
}

function clientPoint(point: { x: number; y: number }) {
  return {
    clientX: point.x + 10,
    clientY: point.y + 20,
  }
}

function canvasConnector(nodeId: string, side: 'left' | 'right') {
  const element = screen.queryByTestId(`connector-${nodeId}-${side}`)
  if (!element) return null

  return {
    visible: element.getAttribute('data-visible') === 'true',
  }
}

function countWindowListenerCalls(spy: ReturnType<typeof vi.spyOn>, eventName: string) {
  return spy.mock.calls.filter((call: unknown[]) => call[0] === eventName).length
}

describe('WorkflowCanvas', () => {
  afterEach(() => {
    pixiState.available = true
    vi.restoreAllMocks()
  })

  it('opens create request from a blank canvas context menu with snapped position', () => {
    const props = renderCanvas()

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), {
      clientX: 342,
      clientY: 190,
    })

    expect(props.onNodeContextRequest).toHaveBeenCalledWith({
      mode: 'create',
      position: { x: 330, y: 170 },
    })
  })

  it('opens edit request from a node context menu', () => {
    const props = renderCanvas()

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), clientPoint(initialPositions.ci))

    expect(props.onSelectNode).toHaveBeenCalledWith('ci')
    expect(props.onNodeContextRequest).toHaveBeenCalledWith({
      mode: 'edit',
      nodeId: 'ci',
    })
  })

  it('selects a node on click', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions['main-head']),
    })
    fireEvent.pointerUp(window)

    expect(props.onSelectNode).toHaveBeenCalledWith('main-head')
  })

  it('does not submit a node drop for a pointer click without movement', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerUp(window)

    expect(props.onSelectNode).toHaveBeenCalledWith('ci')
    expect(props.onNodeDrop).not.toHaveBeenCalled()
  })

  it('submits a node drop after pointer movement exceeds the drag threshold', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 12, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window)

    expect(props.onNodeDrop).toHaveBeenCalledTimes(1)
  })

  it('submits a clamped branch drop after dragging a branch header', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 50,
      ...clientPoint({ x: 330, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 50,
      ...clientPoint({ x: 1200, y: 52 }),
    })
    fireEvent.pointerUp(window, { pointerId: 50 })

    expect(props.onBranchDrop).toHaveBeenCalledWith({
      branchId: 'staging',
      startX: 330,
      endX: 1030,
    })
  })

  it('keeps dragged branch headers to the right of the timeline spacing', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 53,
      ...clientPoint({ x: 330, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 53,
      ...clientPoint({ x: 0, y: 52 }),
    })
    fireEvent.pointerUp(window, { pointerId: 53 })

    expect(props.onBranchDrop).toHaveBeenCalledWith({
      branchId: 'staging',
      startX: 330,
      endX: nodeBounds.minX,
    })
  })

  it('does not submit a branch drop for a pointer click without horizontal movement', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 51,
      ...clientPoint({ x: 330, y: 52 }),
    })
    fireEvent.pointerUp(window, { pointerId: 51 })

    expect(props.onBranchDrop).not.toHaveBeenCalled()
  })

  it('previews branch movement by moving assigned nodes during drag', async () => {
    renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 52,
      ...clientPoint({ x: 330, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 52,
      ...clientPoint({ x: 410, y: 52 }),
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '拖动 staging' })).toHaveStyle({
        left: '410px',
      })
      expect(screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })).toHaveStyle({
        left: `${initialPositions.ci.x}px`,
      })
    })

    fireEvent.pointerUp(window, { pointerId: 52 })
  })

  it('keeps node drag window listeners stable while draft position updates', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 18, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 36, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 54, y: initialPositions.ci.y }),
    })

    expect(countWindowListenerCalls(addListener, 'pointermove')).toBe(1)
    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(0)

    fireEvent.pointerUp(window)

    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(1)
  })

  it('keeps branch drag window listeners stable while draft position updates', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 60,
      ...clientPoint({ x: 520, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 60,
      ...clientPoint({ x: 550, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 60,
      ...clientPoint({ x: 580, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 60,
      ...clientPoint({ x: 610, y: 52 }),
    })

    expect(countWindowListenerCalls(addListener, 'pointermove')).toBe(1)
    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(0)

    fireEvent.pointerUp(window, { pointerId: 60 })

    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(1)
  })

  it('handles an immediate node pointerup after pointerdown and allows the next drag', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 10,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerUp(window, { pointerId: 10 })

    expect(props.onNodeDrop).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 11,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      pointerId: 11,
      ...clientPoint({ x: initialPositions.ci.x + 28, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window, { pointerId: 11 })

    expect(props.onNodeDrop).toHaveBeenCalledTimes(1)
  })

  it('ignores branch drag move and finish events from another pointer', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 70,
      ...clientPoint({ x: 520, y: 52 }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 71,
      ...clientPoint({ x: 620, y: 52 }),
    })
    fireEvent.pointerUp(window, { pointerId: 71 })

    expect(props.onBranchDrop).not.toHaveBeenCalled()

    fireEvent.pointerMove(window, {
      pointerId: 70,
      ...clientPoint({ x: 620, y: 52 }),
    })
    fireEvent.pointerUp(window, { pointerId: 70 })

    expect(props.onBranchDrop).toHaveBeenCalledWith({
      branchId: 'develop',
      startX: 520,
      endX: 620,
    })
  })

  it('ignores node drag move and finish events from another pointer', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 21,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      pointerId: 22,
      ...clientPoint({ x: initialPositions.ci.x + 36, y: initialPositions.ci.y }),
    })
    fireEvent.pointerCancel(window, { pointerId: 22 })
    fireEvent.pointerUp(window, { pointerId: 22 })

    expect(props.onNodeDrop).not.toHaveBeenCalled()

    fireEvent.pointerMove(window, {
      pointerId: 21,
      ...clientPoint({ x: initialPositions.ci.x + 36, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window, { pointerId: 21 })

    expect(props.onNodeDrop).toHaveBeenCalledTimes(1)
  })

  it('keeps DOM nodes as transparent overlays while Pixi is available', async () => {
    renderCanvas()

    const gate = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })

    await waitFor(() => {
      expect(gate).toHaveClass('bg-transparent')
      expect(gate).toHaveClass('border-transparent')
      expect(gate).not.toHaveClass('bg-[#edf6ff]')
      expect(gate).not.toHaveClass('shadow-[0_0_0_4px_rgba(22,124,128,0.16)]')
    })
  })

  it('does not use DOM node overlays as the main interaction path while Pixi is available', () => {
    const props = renderCanvas()
    const node = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })

    fireEvent.click(node)
    fireEvent.contextMenu(node)
    fireEvent.pointerDown(node, {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 24, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window)

    expect(props.onSelectNode).not.toHaveBeenCalled()
    expect(props.onNodeContextRequest).not.toHaveBeenCalled()
    expect(props.onNodeDrop).not.toHaveBeenCalled()
  })

  it('deletes an edge from the canvas context menu hit layer', () => {
    const props = renderCanvas()

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), clientPoint({ x: 320, y: 120 }))

    expect(props.onDeleteEdge).toHaveBeenCalledWith('edge-main-develop')
  })

  it('treats a connector context menu as a node edit request', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.contextMenu(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    )

    expect(props.onSelectNode).toHaveBeenCalledWith('ci')
    expect(props.onNodeContextRequest).toHaveBeenCalledWith({
      mode: 'edit',
      nodeId: 'ci',
    })
    expect(props.onDeleteEdge).not.toHaveBeenCalled()
  })

  it('deletes a focused edge from the keyboard in fallback mode', async () => {
    pixiState.available = false
    const props = renderCanvas()

    await screen.findByTestId('pixi-fallback')
    fireEvent.keyDown(screen.getByRole('button', { name: '删除箭头 edge-main-develop' }), {
      key: 'Delete',
    })

    expect(props.onDeleteEdge).toHaveBeenCalledWith('edge-main-develop')
  })

  it('shows the relation handle when hovering a node', async () => {
    renderCanvas()

    expect(screen.queryByRole('button', { name: '拖动连接 main HEAD' })).not.toBeInTheDocument()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions['main-head'].x + 8, y: initialPositions['main-head'].y }),
    )

    await waitFor(() => {
      const rightConnector = canvasConnector('main-head', 'right')
      expect(rightConnector?.visible).toBe(true)
    })
  })

  it('places the relation handle on the hovered side of a node', async () => {
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x - 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'left')?.visible).toBe(true)
    })

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(true)
    })
  })

  it('clears the connector when the pointer leaves node and connector hit areas', async () => {
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(true)
    })

    fireEvent.pointerMove(screen.getByTestId('pixi-layer'), clientPoint({ x: 1060, y: 920 }))
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(false)
    })
  })

  it('clears the connector when the pointer leaves or cancels on the Pixi layer', async () => {
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(true)
    })

    fireEvent.pointerLeave(screen.getByTestId('pixi-layer'))
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(false)
    })

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(true)
    })

    fireEvent.pointerCancel(screen.getByTestId('pixi-layer'))
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(false)
    })
  })

  it('hides the relation handle while directly dragging a node', async () => {
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    await waitFor(() => {
      expect(canvasConnector('ci', 'right')?.visible).toBe(true)
    })

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })

    expect(canvasConnector('ci', 'right')?.visible).not.toBe(true)
    fireEvent.pointerUp(window)
  })

  it('restores DOM visuals when Pixi reports fallback mode', async () => {
    pixiState.available = false
    renderCanvas()

    await screen.findByTestId('pixi-fallback')
    const gate = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })

    await waitFor(() => {
      expect(gate).toHaveClass('bg-[#edf6ff]')
      expect(gate).toHaveClass('shadow-[0_0_0_4px_rgba(22,124,128,0.16)]')
    })
  })

  it('restores DOM node interaction handlers in fallback mode', async () => {
    pixiState.available = false
    const props = renderCanvas()

    await screen.findByTestId('pixi-fallback')
    const node = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })

    fireEvent.click(node)
    fireEvent.contextMenu(node)
    fireEvent.pointerDown(node, {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 24, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window)

    expect(props.onSelectNode).toHaveBeenCalledWith('ci')
    expect(props.onNodeContextRequest).toHaveBeenCalledWith({
      mode: 'edit',
      nodeId: 'ci',
    })
    expect(props.onNodeDrop).toHaveBeenCalledTimes(1)
  })

  it('restores DOM relation handle dragging in fallback mode', async () => {
    pixiState.available = false
    const props = renderCanvas()

    await screen.findByTestId('pixi-fallback')
    fireEvent.pointerEnter(screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: '拖动连接 CI 自动化 单测 + lint' }), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).toHaveBeenCalledWith({
      fromId: 'ci',
      toId: 'main-head',
    })
  })

  it('drops the relation handle on a target node', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).toHaveBeenCalledWith({
      fromId: 'ci',
      toId: 'main-head',
    })
  })

  it('keeps relation drag window listeners stable while preview updates', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 8,
        y: initialPositions['main-head'].y + 14,
      }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 12,
        y: initialPositions['main-head'].y + 24,
      }),
    })

    expect(countWindowListenerCalls(addListener, 'pointermove')).toBe(1)
    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(0)

    fireEvent.pointerUp(window)

    expect(countWindowListenerCalls(removeListener, 'pointermove')).toBe(1)
  })

  it('handles an immediate relation pointercancel after pointerdown and allows the next relation drag', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 30,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerCancel(window, { pointerId: 30 })

    expect(props.onRelationDrop).not.toHaveBeenCalled()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 31,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 31,
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window, { pointerId: 31 })

    expect(props.onRelationDrop).toHaveBeenCalledTimes(1)
  })

  it('ignores relation drag move and finish events from another pointer', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      pointerId: 41,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      pointerId: 42,
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerCancel(window, { pointerId: 42 })
    fireEvent.pointerUp(window, { pointerId: 42 })

    expect(props.onRelationDrop).not.toHaveBeenCalled()

    fireEvent.pointerMove(window, {
      pointerId: 41,
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window, { pointerId: 41 })

    expect(props.onRelationDrop).toHaveBeenCalledWith({
      fromId: 'ci',
      toId: 'main-head',
    })
  })

  it('does not start relation drag from an invisible connector action hit', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).not.toHaveBeenCalled()
  })

  it('cancels node drag on pointercancel and allows the next drag', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 24, y: initialPositions.ci.y }),
    })
    fireEvent.pointerCancel(window)
    fireEvent.pointerUp(window)

    expect(props.onNodeDrop).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 28, y: initialPositions.ci.y }),
    })
    fireEvent.pointerUp(window)

    expect(props.onNodeDrop).toHaveBeenCalledTimes(1)
  })

  it('cancels node drag on window blur without submitting a drop', () => {
    const props = renderCanvas()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint(initialPositions.ci),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({ x: initialPositions.ci.x + 24, y: initialPositions.ci.y }),
    })
    fireEvent.blur(window)
    fireEvent.pointerUp(window)

    expect(props.onNodeDrop).not.toHaveBeenCalled()
  })

  it('cancels relation drag on pointercancel and allows the next relation drag', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerCancel(window)
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).not.toHaveBeenCalled()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).toHaveBeenCalledTimes(1)
  })

  it('cancels relation drag on window blur without submitting a relation', () => {
    const props = renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })
    fireEvent.blur(window)
    fireEvent.pointerUp(window)

    expect(props.onRelationDrop).not.toHaveBeenCalled()
  })

  it('highlights the current receiving node while dragging a relation', async () => {
    renderCanvas()

    fireEvent.pointerMove(
      screen.getByTestId('pixi-layer'),
      clientPoint({ x: initialPositions.ci.x + 70, y: initialPositions.ci.y }),
    )
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      ...clientPoint({ x: initialPositions.ci.x + 79, y: initialPositions.ci.y }),
    })
    fireEvent.pointerMove(window, {
      ...clientPoint({
        x: initialPositions['main-head'].x + 10,
        y: initialPositions['main-head'].y + 20,
      }),
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '拖动 main HEAD' })).toHaveClass('ring-4')
    })
  })
})
