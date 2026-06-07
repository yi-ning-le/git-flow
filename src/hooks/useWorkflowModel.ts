import { useCallback, useMemo, useState } from 'react'
import type {
  Branch,
  BranchDropChange,
  BranchId,
  BranchPatch,
  ChangeLog,
  Edge,
  NewEdgeForm,
  NewNodeForm,
  NodeContextRequest,
  NodeDropChange,
  Position,
  RelationDropChange,
  WorkflowTemplate,
  WorkflowNode,
} from '../types'
import {
  branches as initialBranches,
  initialEdges,
  initialPositions,
  initialWorkflowNodes,
  nodeBounds,
  workflowTemplates,
} from '../workflowData'
import {
  clamp,
  createId,
  describeImpact,
  getNearestBranch,
  getTimingChange,
  snapToBranchLine,
} from '../workflowUtils'

const initialNewEdge = getDefaultEdgeForm(initialWorkflowNodes)
const defaultTemplate = workflowTemplates[0]

export function useWorkflowModel() {
  const [branches, setBranches] = useState(initialBranches)
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflowNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [positions, setPositions] = useState(initialPositions)
  const [selectedNodeId, setSelectedNodeId] = useState('staging-tests')
  const [activeTemplateId, setActiveTemplateId] = useState(defaultTemplate.id)
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([])
  const [nodeDialogRequest, setNodeDialogRequest] = useState<NodeContextRequest | null>(null)
  const [newEdge, setNewEdge] = useState<NewEdgeForm>(initialNewEdge)

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ id: node.id, label: node.label.replaceAll('\n', ' / ') })),
    [nodes],
  )
  const nodeLabelById = useMemo(
    () => new Map(nodeOptions.map((option) => [option.id, option.label])),
    [nodeOptions],
  )
  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  )
  const selectedNode = nodeById.get(selectedNodeId) ?? nodes[0] ?? initialWorkflowNodes[0]
  const selectedPosition =
    positions[selectedNode.id] ??
    snapToBranchLine({ x: branchById.get(selectedNode.branch)?.x ?? 150, y: 160 }, branches)
  const selectedBranch = getNearestBranch(selectedPosition.x, branches)
  const selectedOutgoingEdge = edges.find((edge) => edge.from === selectedNode.id)
  const currentImpact = describeImpact(
    selectedNode,
    branchById.get(selectedNode.branch) ?? selectedBranch,
    selectedBranch,
    '当前选中',
  )

  const branchDistribution = useMemo(
    () =>
      branches.map((branch) => ({
        ...branch,
        nodes: nodes.filter((node) => node.branch === branch.id),
      })),
    [branches, nodes],
  )

  const handleNodeDrop = useCallback(
    ({ nodeId, start, end }: NodeDropChange) => {
      const finalPosition = snapToBranchLine(end, branches)
      const node = nodeById.get(nodeId)
      if (!node) return

      const fromBranch = getNearestBranch(start.x, branches)
      const toBranch = getNearestBranch(finalPosition.x, branches)
      const timing = getTimingChange(start.y, finalPosition.y)
      const impact = describeImpact(node, fromBranch, toBranch, timing)

      setNodes((current) =>
        current.map((currentNode) =>
          currentNode.id === nodeId ? { ...currentNode, branch: toBranch.id } : currentNode,
        ),
      )
      setPositions((current) => ({
        ...current,
        [nodeId]: finalPosition,
      }))
      setChangeLogs((current) => [
        {
          id: createId('log'),
          nodeLabel: nodeLabelById.get(nodeId) ?? node.label,
          fromBranch: fromBranch.label,
          toBranch: toBranch.label,
          timing,
          impact,
        },
        ...current.slice(0, 5),
      ])
    },
    [branches, nodeById, nodeLabelById],
  )

  const handleRelationDrop = useCallback(
    ({ fromId, toId }: RelationDropChange) => {
      const source = nodeById.get(fromId)
      const target = nodeById.get(toId)
      if (!source || !target || fromId === toId) return

      const sourceLabel = nodeLabelById.get(fromId) ?? source.label
      const targetLabel = nodeLabelById.get(toId) ?? target.label

      setEdges((current) => [
        ...current,
        {
          id: createId('edge'),
          from: fromId,
          to: toId,
          kind: 'merge',
          label: `${sourceLabel} -> ${targetLabel}`,
        },
      ])
      setChangeLogs((current) => [
        {
          id: createId('log'),
          nodeLabel: `关系: ${sourceLabel}`,
          fromBranch: sourceLabel,
          toBranch: targetLabel,
          timing: '新增关系',
          impact: `已通过拖拽新增 ${sourceLabel} 指向 ${targetLabel} 的关系。`,
        },
        ...current.slice(0, 5),
      ])
    },
    [nodeById, nodeLabelById],
  )

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNode>) => {
      const branch = patch.branch ? getBranchOrFallback(patch.branch, branches) : null
      const nextPatch = branch ? { ...patch, branch: branch.id } : patch

      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? { ...node, ...nextPatch } : node)),
      )
      if (!branch) return

      setPositions((current) => ({
        ...current,
        [nodeId]: getPositionOnBranch(branch, current[nodeId]?.y ?? selectedPosition.y),
      }))
    },
    [branches, selectedPosition.y],
  )

  const createNode = useCallback(
    (nodeForm: NewNodeForm, position: Position) => {
      const branch = getBranchOrFallback(nodeForm.branch, branches)
      const id = createId('node')
      const label = nodeForm.label.trim() || 'new node'
      const description = nodeForm.description.trim() || '暂无描述。'

      setNodes((current) => [
        ...current,
        {
          id,
          label,
          kind: nodeForm.kind,
          branch: branch.id,
          description,
        },
      ])
      setPositions((current) => ({
        ...current,
        [id]: getPositionOnBranch(branch, position.y),
      }))
      setSelectedNodeId(id)
    },
    [branches],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (nodes.length <= 1) return

      const nextNodes = nodes.filter((node) => node.id !== nodeId)
      const nextSelected = nextNodes[0]
      setNodes(nextNodes)
      setEdges((current) => current.filter((edge) => edge.from !== nodeId && edge.to !== nodeId))
      setPositions((current) => {
        const next = { ...current }
        delete next[nodeId]
        return next
      })
      if (nextSelected) {
        setSelectedNodeId(nextSelected.id)
      }
      setNewEdge((current) => normalizeEdgeForm(current, nextNodes))
    },
    [nodes],
  )

  const addEdge = useCallback(() => {
    if (!isValidEdgeEndpoint(newEdge, nodeById)) return

    setEdges((current) => [
      ...current,
      {
        id: createId('edge'),
        from: newEdge.from,
        to: newEdge.to,
        kind: newEdge.kind,
        label: newEdge.label.trim() || '关系',
      },
    ])
  }, [newEdge, nodeById])

  const updateEdge = useCallback((edgeId: string, patch: Partial<Edge>) => {
    setEdges((current) =>
      current.map((edge) => {
        if (edge.id !== edgeId) return edge

        const nextEdge = { ...edge, ...patch }
        return nextEdge.from === nextEdge.to ? edge : nextEdge
      }),
    )
  }, [])

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId))
  }, [])

  const commitBranchX = useCallback(
    (branchId: BranchId, x: number) => {
      const nextX = clamp(x, nodeBounds.minX, nodeBounds.maxX)

      setBranches((current) =>
        current.map((branch) => (branch.id === branchId ? { ...branch, x: nextX } : branch)),
      )
      setPositions((current) => {
        const next = { ...current }
        for (const node of nodes) {
          if (node.branch === branchId && next[node.id]) {
            next[node.id] = { ...next[node.id], x: nextX }
          }
        }
        return next
      })
    },
    [nodes],
  )

  const handleBranchDrop = useCallback(
    ({ branchId, endX }: BranchDropChange) => {
      commitBranchX(branchId, endX)
    },
    [commitBranchX],
  )

  const updateBranch = useCallback(
    (branchId: BranchId, patch: BranchPatch) => {
      const nextX =
        typeof patch.x === 'number' && Number.isFinite(patch.x)
          ? clamp(patch.x, nodeBounds.minX, nodeBounds.maxX)
          : undefined
      const textPatch = { ...patch }
      delete textPatch.x

      setBranches((current) =>
        current.map((branch) =>
          branch.id === branchId
            ? {
                ...branch,
                ...textPatch,
                ...(nextX === undefined ? null : { x: nextX }),
              }
            : branch,
        ),
      )

      if (nextX !== undefined) commitBranchX(branchId, nextX)
    },
    [commitBranchX],
  )

  const addBranch = useCallback(() => {
    const lastBranch = branches.at(-1)
    const x = clamp((lastBranch?.x ?? 150) + 150, nodeBounds.minX, nodeBounds.maxX)

    setBranches((current) => [
      ...current,
      {
        id: createId('branch'),
        label: 'new branch',
        x,
        color: '#167c80',
        environment: '自定义环境',
        policy: '描述这条 branch 的合并规则、验证职责和清理策略。',
      },
    ])
  }, [branches])

  const deleteBranch = useCallback(
    (branchId: BranchId) => {
      if (branches.length <= 1) return

      const deletedBranch = branchById.get(branchId)
      const remainingBranches = branches.filter((branch) => branch.id !== branchId)
      if (!deletedBranch || remainingBranches.length === 0) return

      const fallbackBranch = getNearestBranch(deletedBranch.x, remainingBranches)
      setBranches(remainingBranches)
      setNodes((current) =>
        current.map((node) =>
          node.branch === branchId ? { ...node, branch: fallbackBranch.id } : node,
        ),
      )
      setPositions((current) => {
        const next = { ...current }
        for (const node of nodes) {
          if (node.branch === branchId && next[node.id]) {
            next[node.id] = getPositionOnBranch(fallbackBranch, next[node.id].y)
          }
        }
        return next
      })
    },
    [branchById, branches, nodes],
  )

  const applyTemplate = useCallback((templateId: string) => {
    const template = workflowTemplates.find(
      (workflowTemplate) => workflowTemplate.id === templateId,
    )
    if (!template) return

    loadTemplate(template, {
      setActiveTemplateId,
      setBranches,
      setChangeLogs,
      setEdges,
      setNewEdge,
      setNodeDialogRequest,
      setNodes,
      setPositions,
      setSelectedNodeId,
    })
  }, [])

  const resetLayout = useCallback(() => {
    const template =
      workflowTemplates.find((workflowTemplate) => workflowTemplate.id === activeTemplateId) ??
      defaultTemplate

    loadTemplate(template, {
      setActiveTemplateId,
      setBranches,
      setChangeLogs,
      setEdges,
      setNewEdge,
      setNodeDialogRequest,
      setNodes,
      setPositions,
      setSelectedNodeId,
    })
  }, [activeTemplateId])

  return {
    actions: {
      addBranch,
      addEdge,
      applyTemplate,
      createNode,
      deleteBranch,
      deleteEdge,
      deleteNode,
      handleBranchDrop,
      handleNodeDrop,
      handleRelationDrop,
      resetLayout,
      setNewEdge,
      setNodeDialogRequest,
      setSelectedNodeId,
      updateBranch,
      updateEdge,
      updateNode,
    },
    state: {
      activeTemplateId,
      branches,
      branchDistribution,
      changeLogs,
      currentImpact,
      edges,
      newEdge,
      nodeById,
      nodeDialogRequest,
      nodeLabelById,
      nodeOptions,
      nodes,
      positions,
      selectedBranch,
      selectedNode,
      selectedNodeId,
      selectedOutgoingEdge,
      workflowTemplates,
    },
  }
}

type TemplateStateSetters = {
  setActiveTemplateId: (templateId: string) => void
  setBranches: (branches: Branch[]) => void
  setChangeLogs: (changeLogs: ChangeLog[]) => void
  setEdges: (edges: Edge[]) => void
  setNewEdge: (edge: NewEdgeForm) => void
  setNodeDialogRequest: (request: NodeContextRequest | null) => void
  setNodes: (nodes: WorkflowNode[]) => void
  setPositions: (positions: Record<string, Position>) => void
  setSelectedNodeId: (nodeId: string) => void
}

function loadTemplate(
  template: WorkflowTemplate,
  {
    setActiveTemplateId,
    setBranches,
    setChangeLogs,
    setEdges,
    setNewEdge,
    setNodeDialogRequest,
    setNodes,
    setPositions,
    setSelectedNodeId,
  }: TemplateStateSetters,
) {
  setBranches(template.branches)
  setNodes(template.nodes)
  setEdges(template.edges)
  setPositions(template.positions)
  setSelectedNodeId(template.selectedNodeId)
  setActiveTemplateId(template.id)
  setChangeLogs([])
  setNodeDialogRequest(null)
  setNewEdge(getDefaultEdgeForm(template.nodes))
}

function getDefaultEdgeForm(nodes: WorkflowNode[]): NewEdgeForm {
  return {
    from: nodes[0]?.id ?? '',
    to: nodes[1]?.id ?? '',
    kind: 'merge',
    label: '新的关系',
  }
}

function normalizeEdgeForm(form: NewEdgeForm, nodes: WorkflowNode[]): NewEdgeForm {
  const nodeIds = new Set(nodes.map((node) => node.id))
  if (
    form.from &&
    form.to &&
    form.from !== form.to &&
    nodeIds.has(form.from) &&
    nodeIds.has(form.to)
  ) {
    return form
  }

  return {
    ...getDefaultEdgeForm(nodes),
    kind: form.kind,
    label: form.label,
  }
}

function isValidEdgeEndpoint(edge: NewEdgeForm, nodeById: Map<string, WorkflowNode>) {
  return Boolean(
    edge.from &&
    edge.to &&
    edge.from !== edge.to &&
    nodeById.has(edge.from) &&
    nodeById.has(edge.to),
  )
}

function getBranchOrFallback(branchId: BranchId, branches: Branch[]) {
  return branches.find((branch) => branch.id === branchId) ?? branches[0] ?? initialBranches[0]
}

function getPositionOnBranch(branch: Branch, y: number): Position {
  return {
    x: branch.x,
    y: clamp(y, nodeBounds.minY, nodeBounds.maxY),
  }
}
