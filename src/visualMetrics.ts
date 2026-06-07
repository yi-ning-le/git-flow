import type { NodeKind } from './types'

export const branchLaneMetrics = {
  guideWidth: 74,
  headerHeight: 54,
  headerTop: 26,
  headerWidth: 162,
  lineTop: 96,
  lineWidth: 4,
  bottom: 32,
}

export const nodeVisualMetrics: Record<
  NodeKind,
  { minHeight: number; radius: number; width: number }
> = {
  commit: { minHeight: 42, radius: 11, width: 42 },
  gate: { minHeight: 46, radius: 8, width: 158 },
  hotfix: { minHeight: 50, radius: 8, width: 236 },
  tag: { minHeight: 44, radius: 22, width: 98 },
}

export const connectorHandleMetrics = {
  size: 26,
}

export function getNodeVisualMetrics(kind: NodeKind, label: string) {
  const metrics = nodeVisualMetrics[kind]
  if (kind === 'commit' || kind === 'tag') return metrics

  const lineCount = Math.max(1, label.split('\n').length)
  return {
    ...metrics,
    minHeight: Math.max(metrics.minHeight, lineCount * 24 + 20),
  }
}
