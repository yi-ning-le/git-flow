import { memo } from 'react'
import type { Branch, Edge, WorkflowNode } from '../../types'

type EditorSummaryProps = {
  currentImpact: string
  nodeLabelById: Map<string, string>
  selectedBranch: Branch
  selectedNode: WorkflowNode
  selectedOutgoingEdge: Edge | undefined
}

function EditorSummaryComponent({
  currentImpact,
  nodeLabelById,
  selectedBranch,
  selectedNode,
  selectedOutgoingEdge,
}: EditorSummaryProps) {
  return (
    <>
      <div className="mb-3 rounded-workbench border border-border bg-control p-3.5">
        <span className="mb-1.5 block text-xs font-extrabold uppercase text-muted">
          {selectedNode.kind}
        </span>
        <h3 className="m-0 mb-2 whitespace-pre-line text-[15px] font-[760] text-text">
          {selectedNode.label}
        </h3>
        <p className="m-0 text-[13px] leading-snug text-muted">{selectedNode.description}</p>
      </div>

      <div className="mb-3 rounded-workbench border border-border bg-control p-3.5">
        <div className="mb-2 flex items-baseline gap-2">
          <strong className="text-2xl text-text">{selectedBranch.label}</strong>
          <span className="text-xs text-muted">当前归属 branch</span>
        </div>
        <p className="m-0 text-[13px] leading-snug text-muted">{currentImpact}</p>
        <p className="m-0 mt-2 text-[13px] leading-snug text-muted">
          当前指向：
          <strong className="ml-1 text-text">
            {selectedOutgoingEdge
              ? (nodeLabelById.get(selectedOutgoingEdge.to) ?? selectedOutgoingEdge.to)
              : '暂无出边'}
          </strong>
        </p>
      </div>
    </>
  )
}

export const EditorSummary = memo(EditorSummaryComponent)
