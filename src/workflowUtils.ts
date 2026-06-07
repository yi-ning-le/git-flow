import { branches as initialBranches, nodeBounds } from './workflowData'
import type { Branch, Position, WorkflowNode } from './types'

let idCounter = 0

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function createId(prefix: string) {
  const randomUUID = globalThis.crypto?.randomUUID
  if (randomUUID) return `${prefix}-${randomUUID.call(globalThis.crypto)}`

  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getNearestBranch(x: number, branches: Branch[] = initialBranches) {
  return branches.reduce((closest, branch) =>
    Math.abs(branch.x - x) < Math.abs(closest.x - x) ? branch : closest,
  )
}

export function snapToBranchLine(position: Position, branches: Branch[] = initialBranches) {
  const nearestBranch = getNearestBranch(position.x, branches)
  return {
    x: nearestBranch.x,
    y: clamp(position.y, nodeBounds.minY, nodeBounds.maxY),
  }
}

export function getTimingChange(startY: number, endY: number) {
  const delta = Math.round(endY - startY)
  if (Math.abs(delta) < 24) return '时间顺序基本不变'
  return delta < 0 ? `提前 ${Math.abs(delta)} 个时间单位` : `延后 ${delta} 个时间单位`
}

export function describeImpact(node: WorkflowNode, from: Branch, to: Branch, timing: string) {
  if (node.kind === 'hotfix') {
    if (to.id === 'main')
      return 'hotfix 直接靠近生产线：上线最快，但必须确保 staging/develop 回合并不遗漏。'
    if (to.id === 'staging') return 'hotfix 先进入预生产验证：风险更低，但生产修复会等待一轮验收。'
    if (to.id === 'develop') return 'hotfix 先回开发集成：适合修复根因，但紧急上线路径会变长。'
    return 'hotfix 停留在主题分支：需要明确 owner、回合并目标和超时清理。'
  }

  if (node.kind === 'gate') {
    if (to.id === 'main')
      return '质量门禁被放到生产线附近：发布前检查更晚，main protection 压力上升。'
    if (to.id === 'staging') return '质量门禁保留在预生产：适合 UAT、集成测试和发布前验收。'
    if (to.id === 'develop') return '质量门禁前移到开发集成：反馈更早，但 staging 仍需要冒烟验证。'
    return '质量门禁下沉到主题分支：PR 反馈更快，但跨分支集成风险要另行覆盖。'
  }

  if (node.kind === 'tag') {
    if (to.id === 'main')
      return 'tag 仍绑定 main：发布审计最清晰，符合 GitHub Flow 的发布记录方式。'
    if (to.id === 'staging') return 'tag 改成候选版本标记：适合 RC 流程，但需要最终生产 tag 追踪。'
    return 'tag 离开 main：版本语义会变弱，建议改名为 build 或 candidate artifact。'
  }

  if (from.id !== to.id) {
    return `${node.label} 从 ${from.label} 移到 ${to.label}：branch 职责发生变化，${to.policy}`
  }

  return `${node.label} 保持在 ${to.label}，${timing}；主要影响是该步骤在流程中的等待和反馈位置。`
}
