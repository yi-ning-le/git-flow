import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GraphRenderData } from '../pixi/graphRenderData'
import { PixiGraphLayer } from './PixiGraphLayer'

const rendererMock = vi.hoisted(() => ({
  instances: [] as Array<{
    destroy: ReturnType<typeof vi.fn>
    init: ReturnType<typeof vi.fn>
    render: ReturnType<typeof vi.fn>
  }>,
  rejectInit: false,
}))

vi.mock('../pixi/PixiGraphRenderer', () => ({
  PixiGraphRenderer: class {
    destroy = vi.fn()
    init = vi.fn((_host: HTMLDivElement, _width: number, _height: number) =>
      rendererMock.rejectInit ? Promise.reject(new Error('pixi unavailable')) : Promise.resolve(),
    )
    render = vi.fn()

    constructor() {
      rendererMock.instances.push(this)
    }
  },
}))

const graphData: GraphRenderData = {
  branches: [],
  connectors: [],
  edges: [],
  height: 980,
  nodes: [],
  relationPreview: null,
  width: 1120,
}

describe('PixiGraphLayer', () => {
  afterEach(() => {
    rendererMock.instances = []
    rendererMock.rejectInit = false
  })

  it('initializes the renderer, reports availability, and renders data', async () => {
    const onAvailabilityChange = vi.fn()
    render(
      <PixiGraphLayer
        data={graphData}
        fallback={<div data-testid="fallback" />}
        onAvailabilityChange={onAvailabilityChange}
      />,
    )

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalledWith(true)
    })
    expect(rendererMock.instances[0].init).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      1120,
      980,
    )
    expect(rendererMock.instances[0].render).toHaveBeenCalledWith(graphData)
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('renders subsequent data changes through the existing renderer', async () => {
    const { rerender } = render(
      <PixiGraphLayer data={graphData} fallback={<div data-testid="fallback" />} />,
    )
    await waitFor(() => {
      expect(rendererMock.instances[0].render).toHaveBeenCalledWith(graphData)
    })

    const nextData = {
      ...graphData,
      nodes: [
        {
          branchColor: 0x08705f,
          dragging: false,
          fillColor: 0x08705f,
          height: 42,
          id: 'main-head',
          kind: 'commit' as const,
          label: 'main HEAD',
          position: { x: 150, y: 120 },
          radius: 11,
          selected: true,
          width: 42,
        },
      ],
    }
    rerender(<PixiGraphLayer data={nextData} fallback={<div data-testid="fallback" />} />)

    await waitFor(() => {
      expect(rendererMock.instances[0].render).toHaveBeenCalledWith(nextData)
    })
  })

  it('renders fallback and reports unavailable when initialization fails', async () => {
    rendererMock.rejectInit = true
    const onAvailabilityChange = vi.fn()

    render(
      <PixiGraphLayer
        data={graphData}
        fallback={<div data-testid="fallback" />}
        onAvailabilityChange={onAvailabilityChange}
      />,
    )

    expect(await screen.findByTestId('fallback')).toBeInTheDocument()
    expect(onAvailabilityChange).toHaveBeenCalledWith(false)
    expect(rendererMock.instances[0].destroy).toHaveBeenCalled()
  })

  it('destroys the renderer on unmount', async () => {
    const { unmount } = render(
      <PixiGraphLayer data={graphData} fallback={<div data-testid="fallback" />} />,
    )
    await waitFor(() => {
      expect(rendererMock.instances[0].render).toHaveBeenCalledWith(graphData)
    })

    unmount()

    expect(rendererMock.instances[0].destroy).toHaveBeenCalled()
  })
})
