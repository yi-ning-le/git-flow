import { memo } from 'react'
import type { BranchDistribution, BranchId, BranchPatch } from '../../types'
import { fieldClass, nodeBounds } from '../../workflowData'
import { cn } from '../../workflowUtils'

type BranchDistributionTabProps = {
  addBranch: () => void
  branchDistribution: BranchDistribution[]
  deleteBranch: (branchId: BranchId) => void
  updateBranch: (branchId: BranchId, patch: BranchPatch) => void
}

function BranchDistributionTabComponent({
  addBranch,
  branchDistribution,
  deleteBranch,
  updateBranch,
}: BranchDistributionTabProps) {
  return (
    <div className="my-3.5 grid gap-2">
      <button
        className="min-h-9 rounded-md border border-border bg-surface px-3 text-sm font-extrabold text-text"
        onClick={addBranch}
        type="button"
      >
        新增 branch
      </button>

      {branchDistribution.map((branch) => (
        <div
          className="grid gap-2 rounded-workbench border border-border bg-control px-3 py-2.5"
          data-testid={`branch-card-${branch.id}`}
          key={branch.id}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <span className="font-[850]" style={{ color: branch.color }}>
              {branch.label}
            </span>
            <strong className="text-text">{branch.nodes.length}</strong>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <label className="grid gap-1 text-xs font-extrabold text-muted">
              名称
              <input
                aria-label={`${branch.id} branch 名称`}
                className={fieldClass}
                onChange={(event) => updateBranch(branch.id, { label: event.target.value })}
                value={branch.label}
              />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-muted">
              颜色
              <input
                aria-label={`${branch.id} branch 颜色`}
                className={cn(fieldClass, 'h-9 p-1')}
                onChange={(event) => updateBranch(branch.id, { color: event.target.value })}
                type="color"
                value={branch.color}
              />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <label className="grid gap-1 text-xs font-extrabold text-muted">
              环境
              <input
                aria-label={`${branch.id} branch 环境`}
                className={fieldClass}
                onChange={(event) => updateBranch(branch.id, { environment: event.target.value })}
                value={branch.environment}
              />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-muted">
              X
              <input
                aria-label={`${branch.id} branch X 坐标`}
                className={fieldClass}
                max={nodeBounds.maxX}
                min={nodeBounds.minX}
                onChange={(event) => updateBranch(branch.id, { x: event.target.valueAsNumber })}
                type="number"
                value={branch.x}
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs font-extrabold text-muted">
            策略
            <textarea
              aria-label={`${branch.id} branch 策略`}
              className={cn(fieldClass, 'min-h-20 resize-y')}
              onChange={(event) => updateBranch(branch.id, { policy: event.target.value })}
              value={branch.policy}
            />
          </label>

          <button
            className="min-h-9 rounded-md border border-[#efb49f] bg-[#fff1ec] px-3 text-sm font-extrabold text-[#7a321b] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={branchDistribution.length <= 1}
            onClick={() => deleteBranch(branch.id)}
            type="button"
          >
            删除 branch
          </button>
        </div>
      ))}
    </div>
  )
}

export const BranchDistributionTab = memo(BranchDistributionTabComponent)
