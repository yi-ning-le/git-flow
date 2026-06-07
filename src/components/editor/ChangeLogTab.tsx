import { memo } from 'react'
import type { ChangeLog } from '../../types'
import { cn } from '../../workflowUtils'

type ChangeLogTabProps = {
  changeLogs: ChangeLog[]
}

function ChangeLogTabComponent({ changeLogs }: ChangeLogTabProps) {
  return (
    <div className="rounded-workbench border border-border bg-control p-3.5">
      {changeLogs.length === 0 ? (
        <p className="m-0 text-[13px] leading-snug text-muted">
          拖动任意节点后，会记录 branch 迁移和时间顺序变化。
        </p>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {changeLogs.map((log, index) => (
            <li
              className={cn('grid gap-1', index > 0 && 'border-t border-border pt-2.5')}
              key={log.id}
            >
              <strong className="text-[13px] text-text">{log.nodeLabel}</strong>
              <span className="text-xs font-extrabold text-accent">
                {log.fromBranch} → {log.toBranch} · {log.timing}
              </span>
              <p className="m-0 text-[13px] leading-snug text-muted">{log.impact}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export const ChangeLogTab = memo(ChangeLogTabComponent)
