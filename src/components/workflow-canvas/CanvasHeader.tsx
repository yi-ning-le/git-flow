import { memo } from 'react'
import { cn } from '../../workflowUtils'

const legendItems = [
  ['生产环境', 'before:bg-[linear-gradient(#22c73a,#008e12)]'],
  ['预生产环境', 'before:bg-[linear-gradient(#43a7ff,#0959bb)]'],
  ['开发环境', 'before:bg-[linear-gradient(#df70ff,#982ed6)]'],
  ['紧急 hotfix', 'before:bg-[linear-gradient(#ff8b4c,#a33a16)]'],
]

function CanvasHeaderComponent() {
  return (
    <div className="mb-3.5 flex flex-col items-start justify-between gap-5 md:flex-row">
      <div>
        <h2 className="m-0 mb-1 text-lg font-[760] leading-tight text-text">Branch 时间线</h2>
        <p className="m-0 text-sm leading-snug text-muted">
          拖动节点调整时间与归属；在右侧新增/删除节点，或修改节点间关系。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {legendItems.map(([label, markerClass]) => (
          <span
            className={cn(
              'flex min-h-8 items-center gap-2 rounded-workbench border border-dashed border-border px-2.5 text-[13px] font-bold text-text before:h-3.5 before:w-3.5 before:rounded-full',
              markerClass,
            )}
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export const CanvasHeader = memo(CanvasHeaderComponent)
