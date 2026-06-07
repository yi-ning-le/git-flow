import { describe, expect, it } from 'vitest'
import type { WorkflowNode } from '../../types'
import {
  getConnectorSideFromRect,
  getConnectorXOffset,
  getRelationDropTargetId,
  isConnectorElementForNode,
  isNodeElementForConnector,
} from './utils'

const nodes: WorkflowNode[] = [
  {
    branch: 'main',
    description: 'source',
    id: 'source',
    kind: 'commit',
    label: 'source',
  },
  {
    branch: 'develop',
    description: 'near',
    id: 'near',
    kind: 'gate',
    label: 'near',
  },
  {
    branch: 'staging',
    description: 'far',
    id: 'far',
    kind: 'gate',
    label: 'far',
  },
  {
    branch: 'feature',
    description: 'missing',
    id: 'missing',
    kind: 'gate',
    label: 'missing',
  },
  {
    branch: 'feature',
    description: 'wide',
    id: 'wide',
    kind: 'hotfix',
    label: 'hotfix 分支\nmain + staging + develop',
  },
]

describe('workflow canvas utils', () => {
  it('calculates connector side and horizontal offset', () => {
    expect(getConnectorSideFromRect(124, { left: 100, width: 80 })).toBe('left')
    expect(getConnectorSideFromRect(145, { left: 100, width: 80 })).toBe('right')
    expect(getConnectorXOffset(120, 'left')).toBe(-60)
    expect(getConnectorXOffset(120, 'right')).toBe(60)
  })

  it('recognizes node and connector elements by data attributes', () => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <button data-node-id="node-1"><span id="inside-node"></span></button>
      <button data-connector-node-id="node-1"><span id="inside-connector"></span></button>
    `

    expect(isNodeElementForConnector(wrapper.querySelector('#inside-node'), 'node-1')).toBe(true)
    expect(isConnectorElementForNode(wrapper.querySelector('#inside-connector'), 'node-1')).toBe(
      true,
    )
    expect(isNodeElementForConnector(wrapper.querySelector('#inside-node'), 'node-2')).toBe(false)
    expect(isConnectorElementForNode(null, 'node-1')).toBe(false)
  })

  it('finds the nearest relation drop target within range', () => {
    const positions = {
      far: { x: 400, y: 400 },
      near: { x: 180, y: 120 },
      source: { x: 100, y: 100 },
      wide: { x: 500, y: 200 },
    }

    expect(getRelationDropTargetId(nodes, positions, 'source', { x: 170, y: 125 })).toBe('near')
    expect(getRelationDropTargetId([nodes[0]], positions, 'source', { x: 100, y: 100 })).toBeNull()
    expect(getRelationDropTargetId(nodes, positions, 'source', { x: 290, y: 290 })).toBeNull()
  })

  it('uses visual node bounds instead of a fixed radius for relation targets', () => {
    const positions = {
      far: { x: 500, y: 200 },
      near: { x: 450, y: 200 },
      source: { x: 100, y: 100 },
      wide: { x: 500, y: 200 },
    }

    expect(getRelationDropTargetId(nodes, positions, 'source', { x: 625, y: 200 })).toBe('wide')
    expect(getRelationDropTargetId(nodes, positions, 'source', { x: 650, y: 200 })).toBeNull()
    expect(getRelationDropTargetId(nodes, positions, 'source', { x: 452, y: 200 })).toBe('near')
  })
})
