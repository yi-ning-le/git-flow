import { describe, expect, it } from 'vitest'
import { getNodeVisualMetrics, nodeVisualMetrics } from './visualMetrics'

describe('visualMetrics', () => {
  it('returns base metrics for each node kind', () => {
    expect(nodeVisualMetrics.commit).toEqual({ minHeight: 42, radius: 11, width: 42 })
    expect(nodeVisualMetrics.gate).toEqual({ minHeight: 46, radius: 8, width: 158 })
    expect(nodeVisualMetrics.hotfix).toEqual({ minHeight: 50, radius: 8, width: 236 })
    expect(nodeVisualMetrics.tag).toEqual({ minHeight: 44, radius: 22, width: 98 })
  })

  it('expands multiline gate and hotfix nodes', () => {
    expect(getNodeVisualMetrics('gate', 'a\nb\nc').minHeight).toBe(92)
    expect(getNodeVisualMetrics('hotfix', 'a\nb\nc').minHeight).toBe(92)
  })

  it('keeps commit and tag heights stable regardless of label lines', () => {
    expect(getNodeVisualMetrics('commit', 'a\nb\nc').minHeight).toBe(
      nodeVisualMetrics.commit.minHeight,
    )
    expect(getNodeVisualMetrics('tag', 'a\nb\nc').minHeight).toBe(nodeVisualMetrics.tag.minHeight)
  })
})
