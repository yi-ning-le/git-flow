import { memo } from 'react'
import type { Branch, WorkflowNode } from '../../types'

type NodeEditorTabProps = {
  selectedBranch: Branch
  selectedNode: WorkflowNode
}

function NodeEditorTabComponent({ selectedBranch, selectedNode }: NodeEditorTabProps) {
  return (
    <div className="grid gap-3">
      <div className="rounded-workbench border border-border bg-control p-3.5">
        <h3 className="m-0 mb-3 text-[15px] font-[760] text-text">节点详情</h3>
        <dl className="m-0 grid gap-3">
          <div className="grid gap-1">
            <dt className="text-xs font-extrabold text-muted">节点文案</dt>
            <dd className="m-0 whitespace-pre-line text-sm font-[760] text-text">
              {selectedNode.label}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <dt className="text-xs font-extrabold text-muted">类型</dt>
              <dd className="m-0 text-sm text-text">{selectedNode.kind}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-xs font-extrabold text-muted">Branch</dt>
              <dd className="m-0 text-sm text-text">{selectedBranch.label}</dd>
            </div>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-extrabold text-muted">描述</dt>
            <dd className="m-0 text-[13px] leading-snug text-muted">{selectedNode.description}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export const NodeEditorTab = memo(NodeEditorTabComponent)
