import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Edge, NewEdgeForm, NodeOption } from '../../types'
import { EdgesEditorTab } from './EdgesEditorTab'

const nodeOptions: NodeOption[] = [
  { id: 'main-head', label: 'main HEAD' },
  { id: 'ci', label: 'CI 自动化 / 单测 + lint' },
  { id: 'hotfix', label: 'hotfix 分支 / main + staging + develop' },
]

const edges: Edge[] = [
  {
    id: 'edge-1',
    from: 'ci',
    to: 'main-head',
    kind: 'merge',
    label: 'ci to main',
  },
]

function renderTab(overrides: Partial<Parameters<typeof EdgesEditorTab>[0]> = {}) {
  const props = {
    addEdge: vi.fn(),
    deleteEdge: vi.fn(),
    edges,
    newEdge: {
      from: 'ci',
      to: 'main-head',
      kind: 'merge',
      label: 'new edge',
    } satisfies NewEdgeForm,
    nodeLabelById: new Map(nodeOptions.map((option) => [option.id, option.label])),
    nodeOptions,
    setNewEdge: vi.fn(),
    updateEdge: vi.fn(),
    ...overrides,
  }

  render(<EdgesEditorTab {...props} />)
  return props
}

describe('EdgesEditorTab', () => {
  it('disables creating a self-loop relation', () => {
    renderTab({
      newEdge: {
        from: 'ci',
        to: 'ci',
        kind: 'merge',
        label: 'self loop',
      },
    })

    expect(screen.getByRole('button', { name: '新增关系' })).toBeDisabled()
  })

  it('disables creating a relation when fewer than two nodes exist', () => {
    renderTab({
      nodeOptions: [nodeOptions[0]],
      newEdge: {
        from: 'main-head',
        to: '',
        kind: 'merge',
        label: 'new edge',
      },
    })

    expect(screen.getByRole('button', { name: '新增关系' })).toBeDisabled()
  })

  it('disables self-loop options while editing an existing relation', () => {
    renderTab()

    const fromSelect = screen.getByLabelText('关系 edge-1 From') as HTMLSelectElement
    const toSelect = screen.getByLabelText('关系 edge-1 To') as HTMLSelectElement
    const disabledFromOption = Array.from(fromSelect.options).find(
      (option) => option.value === 'main-head',
    )
    const disabledToOption = Array.from(toSelect.options).find((option) => option.value === 'ci')

    expect(disabledFromOption).toBeDisabled()
    expect(disabledToOption).toBeDisabled()
  })
})
