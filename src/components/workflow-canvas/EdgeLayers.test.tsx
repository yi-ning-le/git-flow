import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Edge } from '../../types'
import type { RenderEdge } from '../../pixi/graphRenderData'
import { EdgeHitLayer, EdgeLayer } from './EdgeLayers'

const renderEdges: RenderEdge[] = [
  {
    alpha: 1,
    color: 0x4f46c8,
    dashed: false,
    from: { x: 100, y: 120 },
    id: 'edge-1',
    to: { x: 200, y: 160 },
    width: 3,
  },
]

const edges: Edge[] = [
  { from: 'a', id: 'valid', kind: 'merge', label: 'valid', to: 'b' },
  { from: 'a', id: 'missing', kind: 'sync', label: 'missing', to: 'missing-node' },
]

const positions = {
  a: { x: 100, y: 120 },
  b: { x: 200, y: 160 },
}

describe('workflow canvas edge layers', () => {
  it('exposes edge hit targets for context menu and keyboard deletion', () => {
    const onDeleteEdge = vi.fn()
    render(<EdgeHitLayer edges={renderEdges} onDeleteEdge={onDeleteEdge} />)

    const edge = screen.getByRole('button', { name: '删除箭头 edge-1' })
    fireEvent.contextMenu(edge)
    fireEvent.keyDown(edge, { key: 'Enter' })
    fireEvent.keyDown(edge, { key: 'Backspace' })

    expect(onDeleteEdge).toHaveBeenCalledTimes(2)
    expect(onDeleteEdge).toHaveBeenNthCalledWith(1, 'edge-1')
    expect(onDeleteEdge).toHaveBeenNthCalledWith(2, 'edge-1')
  })

  it('marks the empty hit layer as hidden from assistive technology', () => {
    const { container } = render(<EdgeHitLayer edges={[]} onDeleteEdge={vi.fn()} />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders only valid fallback edges and a valid relation preview', () => {
    const { container, rerender } = render(
      <EdgeLayer
        edges={edges}
        positions={positions}
        relationDrag={{
          anchor: { x: 100, y: 120 },
          fromId: 'a',
          preview: { x: 260, y: 200 },
          pointerId: 1,
          side: 'right',
          targetId: null,
        }}
      />,
    )

    expect(container.querySelectorAll('line')).toHaveLength(2)

    rerender(
      <EdgeLayer
        edges={edges}
        positions={positions}
        relationDrag={{
          anchor: { x: 100, y: 120 },
          fromId: 'missing-node',
          preview: { x: 260, y: 200 },
          pointerId: 1,
          side: 'right',
          targetId: null,
        }}
      />,
    )

    expect(container.querySelectorAll('line')).toHaveLength(1)
  })
})
