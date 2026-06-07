import { memo } from 'react'
import type { PointerEvent } from 'react'
import type { Branch } from '../../types'
import { cn } from '../../workflowUtils'

type BranchLanesProps = {
  activeBranchDragId: string | null
  branches: Branch[]
  onBranchPointerDown: (branchId: string, event: PointerEvent<HTMLButtonElement>) => void
}

function BranchLanesComponent({
  activeBranchDragId,
  branches,
  onBranchPointerDown,
}: BranchLanesProps) {
  return (
    <>
      {branches.map((branch) => (
        <div
          className="absolute top-[26px] z-[4] w-[162px] -translate-x-1/2"
          key={branch.id}
          style={{ left: branch.x }}
        >
          <button
            aria-label={`拖动 ${branch.label} branch`}
            className={cn(
              'mx-auto block max-w-full cursor-grab select-none rounded-workbench border-[1.5px] bg-white/80 px-[18px] py-3 text-center text-2xl font-[850] leading-none active:cursor-grabbing',
              activeBranchDragId === branch.id && 'shadow-[0_0_0_4px_rgba(22,124,128,0.16)]',
            )}
            onPointerDown={(event) => onBranchPointerDown(branch.id, event)}
            style={{ borderColor: branch.color, color: branch.color }}
            type="button"
          >
            {branch.label}
          </button>
        </div>
      ))}
    </>
  )
}

export const BranchLanes = memo(BranchLanesComponent)
