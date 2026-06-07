export type BranchId = string
export type NodeKind = 'commit' | 'gate' | 'tag' | 'hotfix'
export type EdgeKind = 'merge' | 'sync' | 'hotfix' | 'candidate'

export type Position = {
  x: number
  y: number
}

export type Branch = {
  id: BranchId
  label: string
  x: number
  color: string
  environment: string
  policy: string
}

export type WorkflowNode = {
  id: string
  label: string
  kind: NodeKind
  branch: BranchId
  description: string
}

export type Edge = {
  id: string
  from: string
  to: string
  kind: EdgeKind
  label: string
}

export type ChangeLog = {
  id: string
  nodeLabel: string
  fromBranch: string
  toBranch: string
  timing: string
  impact: string
}

export type NewNodeForm = {
  label: string
  kind: NodeKind
  branch: BranchId
  description: string
}

export type NewEdgeForm = {
  from: string
  to: string
  kind: EdgeKind
  label: string
}

export type NodeOption = {
  id: string
  label: string
}

export type NodeDropChange = {
  nodeId: string
  start: Position
  end: Position
}

export type BranchDropChange = {
  branchId: BranchId
  startX: number
  endX: number
}

export type RelationDropChange = {
  fromId: string
  toId: string
}

export type NodeContextRequest =
  | {
      mode: 'create'
      position: Position
    }
  | {
      mode: 'edit'
      nodeId: string
    }

export type BranchDistribution = Branch & {
  nodes: WorkflowNode[]
}

export type BranchPatch = Partial<Pick<Branch, 'color' | 'environment' | 'label' | 'policy' | 'x'>>

export type WorkflowTemplate = {
  id: string
  label: string
  description: string
  branches: Branch[]
  nodes: WorkflowNode[]
  edges: Edge[]
  positions: Record<string, Position>
  selectedNodeId: string
}
