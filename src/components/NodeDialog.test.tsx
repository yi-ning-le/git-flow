import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WorkflowNode } from '../types'
import { branches } from '../workflowData'
import { NodeDialog } from './NodeDialog'

const node: WorkflowNode = {
  branch: 'staging',
  description: 'old description',
  id: 'node-1',
  kind: 'gate',
  label: 'old label',
}

function renderDialog(overrides: Partial<Parameters<typeof NodeDialog>[0]> = {}) {
  const props = {
    branches,
    canDelete: true,
    node,
    onClose: vi.fn(),
    onCreateNode: vi.fn(),
    onDeleteNode: vi.fn(),
    onUpdateNode: vi.fn(),
    request: { mode: 'edit', nodeId: node.id } as const,
    ...overrides,
  }

  render(<NodeDialog {...props} />)
  return props
}

describe('NodeDialog', () => {
  it('infers branch from create position and submits a new node', async () => {
    const user = userEvent.setup()
    const props = renderDialog({
      node: undefined,
      request: { mode: 'create', position: { x: 520, y: 240 } },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('节点 Branch')).toHaveValue('develop')
    })

    await user.clear(screen.getByLabelText('节点文案'))
    await user.type(screen.getByLabelText('节点文案'), 'new release gate')
    await user.clear(screen.getByLabelText('节点描述'))
    await user.type(screen.getByLabelText('节点描述'), 'new description')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(props.onCreateNode).toHaveBeenCalledWith(
      {
        branch: 'develop',
        description: 'new description',
        kind: 'gate',
        label: 'new release gate',
      },
      { x: 520, y: 240 },
    )
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('loads edit values and submits an update', async () => {
    const user = userEvent.setup()
    const props = renderDialog()

    await waitFor(() => {
      expect(screen.getByLabelText('节点文案')).toHaveValue('old label')
    })

    await user.clear(screen.getByLabelText('节点文案'))
    await user.type(screen.getByLabelText('节点文案'), 'updated label')
    await user.selectOptions(screen.getByLabelText('节点类型'), 'tag')
    await user.selectOptions(screen.getByLabelText('节点 Branch'), 'main')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(props.onUpdateNode).toHaveBeenCalledWith('node-1', {
      branch: 'main',
      description: 'old description',
      kind: 'tag',
      label: 'updated label',
    })
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('deletes the current node when deletion is allowed', async () => {
    const user = userEvent.setup()
    const props = renderDialog()

    await user.click(screen.getByRole('button', { name: '删除节点' }))

    expect(props.onDeleteNode).toHaveBeenCalledWith('node-1')
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
