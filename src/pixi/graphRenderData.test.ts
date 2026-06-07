import { describe, expect, it } from 'vitest'
import type { Edge, WorkflowNode } from '../types'
import {
  branches,
  canvasSize,
  initialEdges,
  initialPositions,
  initialWorkflowNodes,
} from '../workflowData'
import { branchLaneMetrics, connectorHandleMetrics } from '../visualMetrics'
import { edgeColors, edgeWidths, relationPreviewColor } from './colors'
import { buildGraphRenderData } from './graphRenderData'

describe('buildGraphRenderData', () => {
  it('maps branches, edges, nodes, and selected state into render data', () => {
    const data = buildGraphRenderData({
      activeDragId: 'ci',
      branches,
      edges: initialEdges,
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'staging-tests',
    })

    expect(data.width).toBe(canvasSize.width)
    expect(data.height).toBe(canvasSize.height)
    expect(data.branches).toHaveLength(branches.length)
    expect(data.connectors).toHaveLength(initialWorkflowNodes.length * 2)
    expect(data.edges).toHaveLength(initialEdges.length)
    expect(data.nodes).toHaveLength(initialWorkflowNodes.length)

    expect(data.branches[0]).toMatchObject({
      guide: {
        bottom: canvasSize.height - branchLaneMetrics.bottom,
        top: branchLaneMetrics.lineTop,
        width: branchLaneMetrics.guideWidth,
      },
      line: {
        bottom: canvasSize.height - branchLaneMetrics.bottom,
        top: branchLaneMetrics.lineTop,
        width: branchLaneMetrics.lineWidth,
      },
    })

    expect(data.nodes.find((node) => node.id === 'staging-tests')).toMatchObject({
      dragging: false,
      height: 92,
      selected: true,
    })
    expect(data.nodes.find((node) => node.id === 'ci')).toMatchObject({
      dragging: true,
      selected: false,
    })
  })

  it('maps edge kind visuals', () => {
    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: initialEdges,
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'main-head',
    })

    const syncEdge = data.edges.find((edge) => edge.id === 'edge-develop-staging')
    const hotfixEdge = data.edges.find((edge) => edge.id === 'edge-release-hotfix')

    expect(syncEdge).toMatchObject({
      color: edgeColors.sync,
      dashed: true,
      width: edgeWidths.sync,
    })
    expect(hotfixEdge).toMatchObject({
      color: edgeColors.hotfix,
      dashed: false,
      width: edgeWidths.hotfix,
    })
  })

  it('creates left and right connectors aligned to node visual bounds', () => {
    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: initialEdges,
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'main-head',
    })

    const ciLeft = data.connectors.find(
      (connector) => connector.nodeId === 'ci' && connector.side === 'left',
    )
    const ciRight = data.connectors.find(
      (connector) => connector.nodeId === 'ci' && connector.side === 'right',
    )
    const ciNode = data.nodes.find((node) => node.id === 'ci')

    expect(ciNode).toBeDefined()
    expect(ciLeft).toMatchObject({
      radius: connectorHandleMetrics.size / 2,
      visible: false,
      x: initialPositions.ci.x - ciNode!.width / 2,
      y: initialPositions.ci.y,
    })
    expect(ciRight).toMatchObject({
      radius: connectorHandleMetrics.size / 2,
      visible: false,
      x: initialPositions.ci.x + ciNode!.width / 2,
      y: initialPositions.ci.y,
    })
  })

  it('marks only the hovered connector side as visible', () => {
    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: initialEdges,
      hoveredConnector: { nodeId: 'ci', side: 'left' },
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'main-head',
    })

    expect(
      data.connectors.find((connector) => connector.nodeId === 'ci' && connector.side === 'left')
        ?.visible,
    ).toBe(true)
    expect(
      data.connectors.find((connector) => connector.nodeId === 'ci' && connector.side === 'right')
        ?.visible,
    ).toBe(false)
    expect(data.connectors.filter((connector) => connector.visible)).toHaveLength(1)
  })

  it('keeps the relation drag source connector visible', () => {
    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: [],
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: {
        anchor: { x: 599, y: 610 },
        fromId: 'ci',
        preview: { x: 150, y: 180 },
        side: 'right',
      },
      selectedNodeId: 'ci',
    })

    expect(
      data.connectors.find((connector) => connector.nodeId === 'ci' && connector.side === 'right')
        ?.visible,
    ).toBe(true)
    expect(
      data.connectors.find((connector) => connector.nodeId === 'ci' && connector.side === 'left')
        ?.visible,
    ).toBe(false)
  })

  it('uses node boundary points for edges instead of node centers', () => {
    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: initialEdges,
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'main-head',
    })

    const mainDevelop = data.edges.find((edge) => edge.id === 'edge-main-develop')
    expect(mainDevelop?.from).not.toEqual(initialPositions['main-head'])
    expect(mainDevelop?.to).not.toEqual(initialPositions['develop-head'])
    expect(mainDevelop?.from.x).toBeCloseTo(initialPositions['main-head'].x + 11)
    expect(mainDevelop?.from.y).toBe(initialPositions['main-head'].y)
    expect(mainDevelop?.to.x).toBeCloseTo(initialPositions['develop-head'].x - 11)
    expect(mainDevelop?.to.y).toBe(initialPositions['develop-head'].y)
  })

  it('filters edges and nodes with missing positions', () => {
    const nodes: WorkflowNode[] = [
      initialWorkflowNodes[0],
      { ...initialWorkflowNodes[1], id: 'missing-node' },
    ]
    const edges: Edge[] = [
      { id: 'valid', from: 'main-head', to: 'main-head', kind: 'merge', label: 'valid' },
      { id: 'missing', from: 'main-head', to: 'missing-node', kind: 'merge', label: 'missing' },
    ]

    const data = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges,
      nodes,
      positions: initialPositions,
      relationDrag: null,
      selectedNodeId: 'main-head',
    })

    expect(data.edges.map((edge) => edge.id)).toEqual(['valid'])
    expect(data.nodes.map((node) => node.id)).toEqual(['main-head'])
  })

  it('creates relation preview only when the source position exists', () => {
    const preview = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: [],
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: {
        anchor: { x: 599, y: 610 },
        fromId: 'ci',
        preview: { x: 150, y: 180 },
        side: 'right',
      },
      selectedNodeId: 'ci',
    }).relationPreview

    expect(preview).toEqual({
      color: relationPreviewColor,
      from: { x: 599, y: 610 },
      to: { x: 150, y: 180 },
      width: 3,
    })

    const missingPreview = buildGraphRenderData({
      activeDragId: null,
      branches,
      edges: [],
      nodes: initialWorkflowNodes,
      positions: initialPositions,
      relationDrag: {
        anchor: { x: 599, y: 610 },
        fromId: 'missing',
        preview: { x: 150, y: 180 },
        side: 'right',
      },
      selectedNodeId: 'ci',
    }).relationPreview

    expect(missingPreview).toBeNull()
  })
})
