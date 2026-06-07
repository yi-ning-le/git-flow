import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialPositions, nodeBounds, workflowTemplates } from '../workflowData'
import { useWorkflowModel } from './useWorkflowModel'

describe('useWorkflowModel branch integrity', () => {
  it('exposes the common workflow template catalog', () => {
    expect(workflowTemplates.map((template) => template.id)).toEqual([
      'git-flow',
      'github-flow',
      'trunk-based',
      'gitlab-flow',
      'release-train',
      'feature-branch',
      'forking',
      'one-flow',
      'gitops',
    ])
  })

  it('normalizes an invalid branch when creating a node', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.createNode(
        {
          branch: 'missing-branch',
          description: 'invalid branch node',
          kind: 'gate',
          label: 'invalid branch',
        },
        { x: 770, y: 500 },
      )
    })

    const createdNode = result.current.state.nodes.find((node) => node.label === 'invalid branch')
    expect(createdNode).toMatchObject({ branch: 'main' })
    expect(result.current.state.positions[createdNode!.id]).toEqual({ x: 150, y: 500 })
  })

  it('normalizes an invalid branch when updating a node', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.updateNode('ci', { branch: 'missing-branch' })
    })

    expect(result.current.state.nodeById.get('ci')).toMatchObject({ branch: 'main' })
    expect(result.current.state.positions.ci).toEqual({ x: 150, y: initialPositions.ci.y })
  })

  it('keeps branch and position aligned when deleting a branch', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.deleteBranch('main')
    })

    expect(result.current.state.nodeById.get('main-head')).toMatchObject({ branch: 'staging' })
    expect(result.current.state.positions['main-head']).toEqual({
      x: 330,
      y: initialPositions['main-head'].y,
    })
  })

  it('moves a branch and keeps assigned node positions aligned', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.handleBranchDrop({
        branchId: 'staging',
        startX: 330,
        endX: 410,
      })
    })

    expect(result.current.state.branches.find((branch) => branch.id === 'staging')?.x).toBe(410)
    expect(result.current.state.positions['staging-cut']).toEqual({
      x: 410,
      y: initialPositions['staging-cut'].y,
    })
    expect(result.current.state.positions['staging-tests']).toEqual({
      x: 410,
      y: initialPositions['staging-tests'].y,
    })
    expect(result.current.state.positions.ci).toEqual(initialPositions.ci)
  })

  it('keeps dragged branches out of the timeline spacing', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.handleBranchDrop({
        branchId: 'staging',
        startX: 330,
        endX: 10,
      })
    })

    expect(result.current.state.branches.find((branch) => branch.id === 'staging')?.x).toBe(
      nodeBounds.minX,
    )
    expect(result.current.state.positions['staging-cut']).toEqual({
      x: nodeBounds.minX,
      y: initialPositions['staging-cut'].y,
    })
  })

  it('switches to a workflow template and resets form state around that model', () => {
    const { result } = renderHook(() => useWorkflowModel())
    const githubFlow = workflowTemplates.find((template) => template.id === 'github-flow')!

    act(() => {
      result.current.actions.applyTemplate(githubFlow.id)
    })

    expect(result.current.state.activeTemplateId).toBe(githubFlow.id)
    expect(result.current.state.branches.map((branch) => branch.id)).toEqual([
      'main',
      'review',
      'feature',
    ])
    expect(result.current.state.nodes.map((node) => node.id)).toEqual(
      githubFlow.nodes.map((node) => node.id),
    )
    expect(result.current.state.positions).toEqual(githubFlow.positions)
    expect(result.current.state.selectedNodeId).toBe(githubFlow.selectedNodeId)
    expect(result.current.state.newEdge).toMatchObject({
      from: githubFlow.nodes[0].id,
      to: githubFlow.nodes[1].id,
    })
  })

  it('includes release train as a switchable workflow template', () => {
    const { result } = renderHook(() => useWorkflowModel())
    const releaseTrain = workflowTemplates.find((template) => template.id === 'release-train')!

    act(() => {
      result.current.actions.applyTemplate(releaseTrain.id)
    })

    expect(result.current.state.activeTemplateId).toBe(releaseTrain.id)
    expect(result.current.state.branches.map((branch) => branch.id)).toEqual([
      'main',
      'train',
      'stabilize',
      'feature',
    ])
    expect(result.current.state.nodeById.get('rt-departure')).toMatchObject({
      branch: 'train',
      label: 'train departure\ncode freeze',
    })
    expect(result.current.state.edges.map((edge) => edge.id)).toContain('rt-edge-main-departure')
  })

  it('switches to added workflow templates with valid selected nodes and edges', () => {
    const { result } = renderHook(() => useWorkflowModel())

    for (const templateId of ['feature-branch', 'forking', 'one-flow', 'gitops']) {
      act(() => {
        result.current.actions.applyTemplate(templateId)
      })

      const nodeIds = new Set(result.current.state.nodes.map((node) => node.id))
      expect(nodeIds.has(result.current.state.selectedNodeId)).toBe(true)
      expect(
        result.current.state.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
      ).toBe(true)
    }
  })

  it('resets the currently selected workflow template instead of always returning to the default model', () => {
    const { result } = renderHook(() => useWorkflowModel())

    act(() => {
      result.current.actions.applyTemplate('trunk-based')
    })
    act(() => {
      result.current.actions.handleBranchDrop({
        branchId: 'release',
        startX: 620,
        endX: 720,
      })
    })
    act(() => {
      result.current.actions.resetLayout()
    })

    expect(result.current.state.activeTemplateId).toBe('trunk-based')
    expect(result.current.state.branches.find((branch) => branch.id === 'release')?.x).toBe(620)
    expect(result.current.state.nodeById.get('tb-ci')).toBeDefined()
    expect(result.current.state.nodeById.get('staging-tests')).toBeUndefined()
  })
})
