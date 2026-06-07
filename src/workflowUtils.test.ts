import { describe, expect, it } from 'vitest'
import type { WorkflowNode } from './types'
import { branchById, nodeBounds } from './workflowData'
import {
  clamp,
  createId,
  describeImpact,
  getNearestBranch,
  getTimingChange,
  snapToBranchLine,
} from './workflowUtils'

const baseNode: WorkflowNode = {
  branch: 'develop',
  description: 'desc',
  id: 'node',
  kind: 'gate',
  label: 'Quality gate',
}

describe('workflowUtils', () => {
  it('creates unique ids with the requested prefix', () => {
    const first = createId('edge')
    const second = createId('edge')

    expect(first).toMatch(/^edge-/)
    expect(second).toMatch(/^edge-/)
    expect(first).not.toBe(second)
  })

  it('clamps values to a min/max range', () => {
    expect(clamp(2, 5, 10)).toBe(5)
    expect(clamp(12, 5, 10)).toBe(10)
    expect(clamp(7, 5, 10)).toBe(7)
  })

  it('finds the nearest branch line by x position', () => {
    expect(getNearestBranch(145).id).toBe('main')
    expect(getNearestBranch(350).id).toBe('staging')
    expect(getNearestBranch(745).id).toBe('feature')
  })

  it('snaps x to the nearest branch and clamps y to node bounds', () => {
    expect(snapToBranchLine({ x: 342, y: nodeBounds.minY - 40 })).toEqual({
      x: 330,
      y: nodeBounds.minY,
    })
    expect(snapToBranchLine({ x: 760, y: nodeBounds.maxY + 40 })).toEqual({
      x: 770,
      y: nodeBounds.maxY,
    })
  })

  it('describes timing changes with a dead zone', () => {
    expect(getTimingChange(100, 110)).toBe('时间顺序基本不变')
    expect(getTimingChange(150, 100)).toBe('提前 50 个时间单位')
    expect(getTimingChange(100, 150)).toBe('延后 50 个时间单位')
  })

  it('describes impact for gate, tag, hotfix, changed branch, and default cases', () => {
    expect(
      describeImpact(
        { ...baseNode, kind: 'gate' },
        branchById.get('develop')!,
        branchById.get('main')!,
        '当前选中',
      ),
    ).toContain('质量门禁被放到生产线附近')

    expect(
      describeImpact(
        { ...baseNode, kind: 'tag' },
        branchById.get('main')!,
        branchById.get('staging')!,
        '当前选中',
      ),
    ).toContain('tag 改成候选版本标记')

    expect(
      describeImpact(
        { ...baseNode, kind: 'hotfix' },
        branchById.get('feature')!,
        branchById.get('develop')!,
        '当前选中',
      ),
    ).toContain('hotfix 先回开发集成')

    expect(
      describeImpact(
        { ...baseNode, kind: 'commit' },
        branchById.get('develop')!,
        branchById.get('feature')!,
        '当前选中',
      ),
    ).toContain('branch 职责发生变化')

    expect(
      describeImpact(
        { ...baseNode, kind: 'commit' },
        branchById.get('develop')!,
        branchById.get('develop')!,
        '提前 30 个时间单位',
      ),
    ).toContain('保持在 develop')
  })
})
