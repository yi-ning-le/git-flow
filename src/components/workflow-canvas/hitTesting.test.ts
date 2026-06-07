import { describe, expect, it } from 'vitest'
import type {
  GraphRenderData,
  RenderBranch,
  RenderConnector,
  RenderEdge,
  RenderNode,
} from '../../pixi/graphRenderData'
import {
  hitTestBranch,
  hitTestCanvas,
  hitTestConnector,
  hitTestEdge,
  hitTestNode,
} from './hitTesting'

const branch: RenderBranch = {
  color: 0x1769aa,
  guide: {
    bottom: 948,
    top: 96,
    width: 74,
  },
  header: {
    height: 54,
    top: 26,
    width: 162,
  },
  id: 'staging',
  label: 'staging',
  line: {
    bottom: 948,
    top: 96,
    width: 4,
  },
  x: 330,
}

const commitNode: RenderNode = {
  branchColor: 0x08705f,
  dragging: false,
  fillColor: 0x08705f,
  height: 42,
  id: 'commit',
  kind: 'commit',
  label: 'commit',
  position: { x: 100, y: 100 },
  radius: 11,
  selected: false,
  width: 42,
}

const rectNode: RenderNode = {
  branchColor: 0x1769aa,
  dragging: false,
  fillColor: 0xedf6ff,
  height: 68,
  id: 'gate',
  kind: 'gate',
  label: 'gate',
  position: { x: 240, y: 120 },
  radius: 8,
  selected: false,
  width: 158,
}

const connector: RenderConnector = {
  nodeId: 'gate',
  radius: 13,
  side: 'right',
  visible: false,
  x: 319,
  y: 120,
}

const edge: RenderEdge = {
  alpha: 1,
  color: 0x4f46c8,
  dashed: false,
  from: { x: 120, y: 200 },
  id: 'edge-1',
  to: { x: 280, y: 200 },
  width: 3,
}

const data: GraphRenderData = {
  branches: [branch],
  connectors: [connector],
  edges: [edge],
  height: 980,
  nodes: [commitNode, rectNode],
  relationPreview: null,
  width: 1120,
}

describe('workflow canvas hit testing', () => {
  it('hits circle and rectangle nodes and rejects points outside their bounds', () => {
    expect(hitTestNode({ x: 107, y: 100 }, [commitNode])?.id).toBe('commit')
    expect(hitTestNode({ x: 116, y: 100 }, [commitNode])).toBeNull()
    expect(hitTestNode({ x: 310, y: 120 }, [rectNode])?.id).toBe('gate')
    expect(hitTestNode({ x: 330, y: 120 }, [rectNode])).toBeNull()
  })

  it('gives connector hits priority over node hits', () => {
    const visibleConnector = { ...connector, visible: true }

    expect(hitTestConnector({ x: 319, y: 120 }, [visibleConnector])?.nodeId).toBe('gate')

    const hit = hitTestCanvas({ x: 319, y: 120 }, { ...data, connectors: [visibleConnector] })
    expect(hit).toEqual({ type: 'connector', nodeId: 'gate', side: 'right' })
  })

  it('only allows invisible connector hits in hover mode', () => {
    expect(hitTestConnector({ x: 319, y: 120 }, [connector], 'hover')?.nodeId).toBe('gate')
    expect(hitTestConnector({ x: 319, y: 120 }, [connector], 'action')).toBeNull()
    expect(hitTestCanvas({ x: 319, y: 120 }, data, 'hover')).toEqual({
      type: 'connector',
      nodeId: 'gate',
      side: 'right',
    })
    expect(hitTestCanvas({ x: 319, y: 120 }, data, 'action')).toEqual({
      type: 'node',
      nodeId: 'gate',
    })
  })

  it('rejects connector hits outside the padded radius and chooses the closest connector', () => {
    expect(hitTestConnector({ x: 337, y: 120 }, [connector], 'hover')).toBeNull()

    const nearConnector: RenderConnector = {
      ...connector,
      nodeId: 'near',
      side: 'left',
      visible: true,
      x: 326,
    }

    expect(
      hitTestConnector({ x: 325, y: 120 }, [{ ...connector, visible: true }, nearConnector])
        ?.nodeId,
    ).toBe('near')
  })

  it('uses point-to-segment distance for edge hits', () => {
    expect(hitTestEdge({ x: 200, y: 206 }, [edge])?.id).toBe('edge-1')
    expect(hitTestEdge({ x: 200, y: 222 }, [edge])).toBeNull()
  })

  it('hits branch headers for Pixi branch dragging', () => {
    expect(hitTestBranch({ x: 330, y: 52 }, [branch])?.id).toBe('staging')
    expect(hitTestBranch({ x: 330, y: 90 }, [branch])).toBeNull()
    expect(hitTestCanvas({ x: 330, y: 52 }, data)).toEqual({ type: 'branch', branchId: 'staging' })
  })

  it('hits edge endpoints, diagonal edges, and zero-length edges', () => {
    const diagonal: RenderEdge = {
      ...edge,
      from: { x: 10, y: 10 },
      id: 'diagonal',
      to: { x: 110, y: 110 },
    }
    const zeroLength: RenderEdge = {
      ...edge,
      from: { x: 400, y: 400 },
      id: 'zero',
      to: { x: 400, y: 400 },
    }

    expect(hitTestEdge({ x: 120, y: 200 }, [edge])?.id).toBe('edge-1')
    expect(hitTestEdge({ x: 60, y: 64 }, [diagonal])?.id).toBe('diagonal')
    expect(hitTestEdge({ x: 406, y: 400 }, [zeroLength])?.id).toBe('zero')
    expect(hitTestEdge({ x: 420, y: 400 }, [zeroLength])).toBeNull()
  })

  it('falls through to node, edge, and empty hits in fixed priority order', () => {
    expect(hitTestCanvas({ x: 240, y: 120 }, data)).toEqual({ type: 'node', nodeId: 'gate' })
    expect(hitTestCanvas({ x: 200, y: 206 }, data)).toEqual({ type: 'edge', edgeId: 'edge-1' })
    expect(hitTestCanvas({ x: 500, y: 500 }, data)).toEqual({ type: 'empty' })
  })

  it('keeps connector over node and node over edge when hit areas overlap', () => {
    const overlappingConnector: RenderConnector = {
      ...connector,
      visible: true,
      x: rectNode.position.x,
      y: rectNode.position.y,
    }
    const overlappingEdge: RenderEdge = {
      ...edge,
      from: { x: 180, y: 120 },
      to: { x: 300, y: 120 },
    }

    expect(
      hitTestCanvas(
        { x: rectNode.position.x, y: rectNode.position.y },
        {
          ...data,
          connectors: [overlappingConnector],
          edges: [overlappingEdge],
        },
      ),
    ).toEqual({ type: 'connector', nodeId: 'gate', side: 'right' })

    expect(
      hitTestCanvas(
        { x: rectNode.position.x, y: rectNode.position.y },
        {
          ...data,
          connectors: [],
          edges: [overlappingEdge],
        },
      ),
    ).toEqual({ type: 'node', nodeId: 'gate' })
  })

  it('falls back to node hits when an overlapping connector is invisible in action mode', () => {
    const overlappingConnector: RenderConnector = {
      ...connector,
      visible: false,
      x: rectNode.position.x,
      y: rectNode.position.y,
    }

    expect(
      hitTestCanvas(
        { x: rectNode.position.x, y: rectNode.position.y },
        {
          ...data,
          connectors: [overlappingConnector],
          edges: [],
        },
        'action',
      ),
    ).toEqual({ type: 'node', nodeId: 'gate' })
  })
})
