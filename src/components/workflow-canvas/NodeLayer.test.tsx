import * as Tooltip from '@radix-ui/react-tooltip'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Branch, WorkflowNode } from '../../types'
import { NodeLayer } from './NodeLayer'

const branches: Branch[] = [
  {
    color: '#08705f',
    environment: 'prod',
    id: 'main',
    label: 'main',
    policy: 'prod policy',
    x: 150,
  },
  {
    color: '#5247c7',
    environment: 'dev',
    id: 'develop',
    label: 'develop',
    policy: 'dev policy',
    x: 520,
  },
]

const nodes: WorkflowNode[] = [
  {
    branch: 'main',
    description: 'main description',
    id: 'main-head',
    kind: 'commit',
    label: 'main HEAD',
  },
  {
    branch: 'develop',
    description: 'ci description',
    id: 'ci',
    kind: 'gate',
    label: 'CI 自动化\n单测 + lint',
  },
  {
    branch: 'develop',
    description: 'missing position',
    id: 'missing-position',
    kind: 'gate',
    label: 'missing',
  },
]

const positions = {
  ci: { x: 520, y: 610 },
  'main-head': { x: 150, y: 120 },
}

function renderNodeLayer(overrides: Partial<Parameters<typeof NodeLayer>[0]> = {}) {
  const props = {
    activeDragId: null,
    activeRelationDrag: null,
    branches,
    nodes,
    onNodeContextRequest: vi.fn(),
    onNodePointerDown: vi.fn(),
    onNodePointerEnter: vi.fn(),
    onNodePointerLeave: vi.fn(),
    onNodePointerMove: vi.fn(),
    onSelectNode: vi.fn(),
    positions,
    selectedNodeId: 'main-head',
    useDomInteractions: false,
    useDomVisuals: false,
    ...overrides,
  }

  render(
    <Tooltip.Provider>
      <NodeLayer {...props} />
    </Tooltip.Provider>,
  )

  return props
}

describe('NodeLayer', () => {
  it('renders positioned nodes and skips nodes without positions', () => {
    renderNodeLayer()

    expect(screen.getByRole('button', { name: '拖动 main HEAD' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '拖动 missing' })).not.toBeInTheDocument()
  })

  it('selects and opens the edit request from node interactions', () => {
    const props = renderNodeLayer({
      useDomInteractions: true,
    })
    const node = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })

    fireEvent.click(node)
    fireEvent.contextMenu(node)

    expect(props.onSelectNode).toHaveBeenCalledWith('ci')
    expect(props.onNodeContextRequest).toHaveBeenCalledWith({
      mode: 'edit',
      nodeId: 'ci',
    })
  })

  it('marks relation candidates and the current drop target', () => {
    renderNodeLayer({
      activeRelationDrag: {
        anchor: { x: 150, y: 120 },
        fromId: 'main-head',
        preview: { x: 520, y: 610 },
        pointerId: 1,
        side: 'right',
        targetId: 'ci',
      },
    })

    expect(screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })).toHaveClass('ring-4')
    expect(screen.getByRole('button', { name: '拖动 main HEAD' })).not.toHaveClass('ring-2')
  })

  it('restores DOM visuals in fallback mode', () => {
    renderNodeLayer({
      selectedNodeId: 'ci',
      useDomInteractions: true,
      useDomVisuals: true,
    })

    const node = screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })
    expect(node).toHaveClass('bg-[#edf6ff]')
    expect(node).toHaveClass('shadow-[0_0_0_4px_rgba(22,124,128,0.16)]')
  })
})
