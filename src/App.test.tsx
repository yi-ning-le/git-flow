import * as Tooltip from '@radix-ui/react-tooltip'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { initialEdges, initialPositions } from './workflowData'

vi.mock('./components/PixiGraphLayer', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    PixiGraphLayer: ({
      data,
      onPointerCancel,
      onContextMenu,
      onAvailabilityChange,
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
        onAvailabilityChange?.(true)
      }, [onAvailabilityChange])

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

afterEach(() => {
  vi.restoreAllMocks()
})

function renderApp() {
  render(
    <Tooltip.Provider>
      <App />
    </Tooltip.Provider>,
  )
}

describe('App workflow state', () => {
  it('syncs node branch after dragging so editing description does not move it back', async () => {
    const user = userEvent.setup()
    renderApp()

    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      clientX: initialPositions.ci.x,
      clientY: initialPositions.ci.y,
    })
    fireEvent.pointerMove(window, {
      clientX: initialPositions['staging-tests'].x,
      clientY: initialPositions.ci.y,
    })
    fireEvent.pointerUp(window)

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), {
      clientX: initialPositions['staging-tests'].x,
      clientY: initialPositions.ci.y,
    })
    await waitFor(() => {
      expect(screen.getByLabelText('节点 Branch')).toHaveValue('staging')
    })

    await user.clear(screen.getByLabelText('节点描述'))
    await user.type(screen.getByLabelText('节点描述'), 'updated ci description')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '拖动 CI 自动化 单测 + lint' })).toHaveStyle({
        left: `${initialPositions['staging-tests'].x}px`,
      })
    })
  })

  it('adds a new relation from drag without replacing existing outgoing hotfix edges', async () => {
    const user = userEvent.setup()
    renderApp()

    fireEvent.pointerMove(screen.getByTestId('pixi-layer'), {
      clientX: initialPositions.hotfix.x + 110,
      clientY: initialPositions.hotfix.y,
    })
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      clientX: initialPositions.hotfix.x + 118,
      clientY: initialPositions.hotfix.y,
    })
    fireEvent.pointerMove(window, {
      clientX: initialPositions['main-head'].x,
      clientY: initialPositions['main-head'].y,
    })
    fireEvent.pointerUp(window)

    await user.click(screen.getByRole('tab', { name: '关系' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(initialEdges.length + 1)
    })
    expect(getByExactText('hotfix 分支 / main + staging + develop → v1.1.1 🔥')).toBeInTheDocument()
    expect(
      getByExactText(
        'hotfix 分支 / main + staging + develop → staging 验证 / 集成测试 / UAT / 性能',
      ),
    ).toBeInTheDocument()
    expect(getByExactText('hotfix 分支 / main + staging + develop → main HEAD')).toBeInTheDocument()
  })

  it('removes an edge from canvas context menu and syncs the relation editor', async () => {
    const user = userEvent.setup()
    renderApp()

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), {
      clientX: 320,
      clientY: 120,
    })
    await user.click(screen.getByRole('tab', { name: '关系' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(initialEdges.length - 1)
    })
    expect(screen.queryByText(/同步基线/)).not.toBeInTheDocument()
  })

  it('adds a relation from the Pixi connector and allows editing and deleting it', async () => {
    const user = userEvent.setup()
    renderApp()

    fireEvent.pointerMove(screen.getByTestId('pixi-layer'), {
      clientX: initialPositions.ci.x + 70,
      clientY: initialPositions.ci.y,
    })
    fireEvent.pointerDown(screen.getByTestId('pixi-layer'), {
      button: 0,
      clientX: initialPositions.ci.x + 79,
      clientY: initialPositions.ci.y,
    })
    fireEvent.pointerMove(window, {
      clientX: initialPositions['main-head'].x,
      clientY: initialPositions['main-head'].y,
    })
    fireEvent.pointerUp(window)
    await user.click(screen.getByRole('tab', { name: '关系' }))

    await user.click(getByExactText('CI 自动化 / 单测 + lint → main HEAD'))
    await user.clear(screen.getByDisplayValue('CI 自动化 / 单测 + lint -> main HEAD'))
    await user.type(screen.getByLabelText(/关系 edge-.+ 标签/), 'ci to production')

    expect(screen.getByText('merge · ci to production')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: '删除' }).at(-1)!)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(initialEdges.length)
    })
    expect(screen.queryByText('merge · ci to production')).not.toBeInTheDocument()
  })

  it('normalizes the new edge form after deleting a referenced node', async () => {
    const user = userEvent.setup()
    renderApp()

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), {
      clientX: initialPositions['develop-head'].x,
      clientY: initialPositions['develop-head'].y,
    })
    await user.click(screen.getByRole('button', { name: '删除节点' }))
    await user.click(screen.getByRole('tab', { name: '关系' }))

    expect(screen.getByLabelText('新增关系 From')).not.toHaveValue('develop-head')
    expect(screen.getByLabelText('新增关系 To')).not.toHaveValue('develop-head')

    await user.click(screen.getByRole('button', { name: '新增关系' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(initialEdges.length - 1)
    })
    expect(document.body).not.toHaveTextContent('develop-head')
  })

  it('edits branch metadata and moves nodes when the branch x position changes', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: '分布' }))
    await user.clear(screen.getByLabelText('main branch 名称'))
    await user.type(screen.getByLabelText('main branch 名称'), 'production')
    fireEvent.change(screen.getByLabelText('main branch X 坐标'), {
      target: { value: '210' },
    })

    expect(screen.getAllByText('production').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '拖动 main HEAD' })).toHaveStyle({
      left: '210px',
    })
  })

  it('adds a branch from the branch editor', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: '分布' }))
    await user.click(screen.getByRole('button', { name: '新增 branch' }))

    expect(screen.getByDisplayValue('new branch')).toBeInTheDocument()
  })

  it('switches workflow templates from the editor panel', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /GitHub Flow/ }))

    expect(screen.getByRole('button', { name: /GitHub Flow/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '拖动 PR checks CI + review' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '拖动 staging 验证 集成测试 UAT / 性能' }),
    ).not.toBeInTheDocument()
  })

  it('switches to the release train workflow template', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Release Train/ }))

    expect(screen.getByRole('button', { name: /Release Train/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: '拖动 train departure code freeze' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '拖动 stabilization regression + sign-off' }),
    ).toBeInTheDocument()
  })

  it('renders the expanded workflow template catalog', () => {
    renderApp()

    expect(screen.getByRole('button', { name: /Feature Branch/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Forking/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OneFlow/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GitOps/ })).toBeInTheDocument()
  })

  it('deletes a branch and migrates its nodes to the nearest remaining branch', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: '分布' }))
    await user.click(
      within(screen.getByTestId('branch-card-main')).getByRole('button', { name: '删除 branch' }),
    )

    expect(screen.queryByLabelText('main branch 名称')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '拖动 main HEAD' })).toHaveStyle({
      left: `${initialPositions['staging-tests'].x}px`,
    })

    fireEvent.contextMenu(screen.getByTestId('pixi-layer'), {
      clientX: initialPositions['staging-tests'].x,
      clientY: initialPositions['main-head'].y,
    })
    await waitFor(() => {
      expect(screen.getByLabelText('节点 Branch')).toHaveValue('staging')
    })
  })
})

function getByExactText(text: string) {
  return screen.getByText((_, element) => element?.textContent === text)
}
