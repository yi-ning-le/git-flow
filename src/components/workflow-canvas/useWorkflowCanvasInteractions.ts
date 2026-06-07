import { useCallback, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, RefObject } from 'react'
import type {
  Branch,
  BranchDropChange,
  Edge,
  NodeContextRequest,
  NodeDropChange,
  Position,
  RelationDropChange,
  WorkflowNode,
} from '../../types'
import { buildGraphRenderData } from '../../pixi/graphRenderData'
import { canvasSize } from '../../workflowData'
import { clamp, snapToBranchLine } from '../../workflowUtils'
import { hitTestCanvas } from './hitTesting'
import type { ConnectorSide, RelationDrag } from './types'
import { useBranchDrag } from './useBranchDrag'
import type { BranchDragState } from './useBranchDrag'
import { useConnectorHover } from './useConnectorHover'
import { useNodeDrag } from './useNodeDrag'
import type { NodeDragState } from './useNodeDrag'
import { useRelationDrag } from './useRelationDrag'

type UseWorkflowCanvasInteractionsInput = {
  branches: Branch[]
  canvasRef: RefObject<HTMLDivElement | null>
  edges: Edge[]
  nodes: WorkflowNode[]
  onBranchDrop: (change: BranchDropChange) => void
  onDeleteEdge: (edgeId: string) => void
  onNodeContextRequest: (request: NodeContextRequest) => void
  onNodeDrop: (change: NodeDropChange) => void
  onRelationDrop: (change: RelationDropChange) => void
  onSelectNode: (nodeId: string) => void
  positions: Record<string, Position>
  selectedNodeId: string
}

export function useWorkflowCanvasInteractions({
  branches,
  canvasRef,
  edges,
  nodes,
  onBranchDrop,
  onDeleteEdge,
  onNodeContextRequest,
  onNodeDrop,
  onRelationDrop,
  onSelectNode,
  positions,
  selectedNodeId,
}: UseWorkflowCanvasInteractionsInput) {
  const [isPixiAvailable, setIsPixiAvailable] = useState(true)
  const branchDragRef = useRef<BranchDragState | null>(null)
  const nodeDragRef = useRef<NodeDragState | null>(null)
  const relationDragRef = useRef<RelationDrag | null>(null)

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      return {
        x: clamp(clientX - rect.left + canvas.scrollLeft, 0, canvasSize.width),
        y: clamp(clientY - rect.top + canvas.scrollTop, 0, canvasSize.height),
      }
    },
    [canvasRef],
  )

  const {
    handleConnectorPointerEnter,
    handleConnectorPointerLeave,
    handleNodePointerEnter,
    handleNodePointerLeave,
    handleNodePointerMove,
    hoveredConnector,
    setHoveredConnector,
  } = useConnectorHover({
    isNodeDraggingRef: nodeDragRef,
    isRelationDraggingRef: relationDragRef,
  })

  const handleNodeDragEnd = useCallback(() => setHoveredConnector(null), [setHoveredConnector])
  const handleNodeDragStart = useCallback(() => setHoveredConnector(null), [setHoveredConnector])
  const handleBranchDragEnd = useCallback(() => setHoveredConnector(null), [setHoveredConnector])
  const handleBranchDragStart = useCallback(() => setHoveredConnector(null), [setHoveredConnector])

  const { activeBranchDragId, draftBranchX, startBranchDrag } = useBranchDrag({
    branches,
    dragRef: branchDragRef,
    getCanvasPoint,
    onBranchDrop,
    onDragEnd: handleBranchDragEnd,
    onDragStart: handleBranchDragStart,
  })

  const { activeDragId, draftPosition, startNodeDrag } = useNodeDrag({
    branches,
    dragRef: nodeDragRef,
    getCanvasPoint,
    onDragEnd: handleNodeDragEnd,
    onDragStart: handleNodeDragStart,
    onNodeDrop,
    onSelectNode,
    positions,
  })

  const displayBranches = useMemo(() => {
    if (!activeBranchDragId || draftBranchX === null) return branches
    return branches.map((branch) =>
      branch.id === activeBranchDragId ? { ...branch, x: draftBranchX } : branch,
    )
  }, [activeBranchDragId, branches, draftBranchX])

  const displayPositions = useMemo(() => {
    let nextPositions = positions

    if (activeBranchDragId && draftBranchX !== null) {
      nextPositions = { ...nextPositions }
      for (const node of nodes) {
        if (node.branch === activeBranchDragId && nextPositions[node.id]) {
          nextPositions[node.id] = { ...nextPositions[node.id], x: draftBranchX }
        }
      }
    }

    if (activeDragId && draftPosition) {
      nextPositions = {
        ...nextPositions,
        [activeDragId]: draftPosition,
      }
    }

    return nextPositions
  }, [activeBranchDragId, activeDragId, draftBranchX, draftPosition, nodes, positions])

  const { relationDrag, startRelationDrag } = useRelationDrag({
    displayPositions,
    getCanvasPoint,
    isNodeDraggingRef: nodeDragRef,
    nodes,
    onRelationDrop,
    onSelectNode,
    relationDragRef,
    setHoveredConnector,
  })

  const connectorNodeId = relationDrag?.fromId ?? (activeDragId ? null : hoveredConnector?.nodeId)
  const connectorSide =
    hoveredConnector && hoveredConnector.nodeId === connectorNodeId
      ? hoveredConnector.side
      : 'right'
  const connectorNode = connectorNodeId ? nodes.find((node) => node.id === connectorNodeId) : null
  const connectorPosition = connectorNodeId ? displayPositions[connectorNodeId] : null
  const graphRenderData = useMemo(
    () =>
      buildGraphRenderData({
        activeDragId,
        branches: displayBranches,
        edges,
        hoveredConnector,
        nodes,
        positions: displayPositions,
        relationDrag,
        selectedNodeId,
      }),
    [
      activeDragId,
      displayBranches,
      displayPositions,
      edges,
      hoveredConnector,
      nodes,
      relationDrag,
      selectedNodeId,
    ],
  )

  const getCanvasHit = useCallback(
    (clientX: number, clientY: number, phase: 'action' | 'hover' = 'action') => {
      const point = getCanvasPoint(clientX, clientY)
      if (!point) return null

      return {
        hit: hitTestCanvas(point, graphRenderData, phase),
        point,
      }
    },
    [getCanvasPoint, graphRenderData],
  )

  const getNodeConnectorSide = useCallback(
    (nodeId: string, point: Position): ConnectorSide => {
      const position = displayPositions[nodeId]
      return position && point.x < position.x ? 'left' : 'right'
    },
    [displayPositions],
  )

  const handlePixiPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (
        !isPixiAvailable ||
        branchDragRef.current ||
        nodeDragRef.current ||
        relationDragRef.current
      ) {
        if (branchDragRef.current || nodeDragRef.current) setHoveredConnector(null)
        return
      }

      const result = getCanvasHit(event.clientX, event.clientY, 'hover')
      if (!result) return

      if (result.hit.type === 'connector') {
        setHoveredConnector({ nodeId: result.hit.nodeId, side: result.hit.side })
        return
      }

      if (result.hit.type === 'node') {
        setHoveredConnector({
          nodeId: result.hit.nodeId,
          side: getNodeConnectorSide(result.hit.nodeId, result.point),
        })
        return
      }

      setHoveredConnector(null)
    },
    [getCanvasHit, getNodeConnectorSide, isPixiAvailable, setHoveredConnector],
  )

  const handlePixiPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isPixiAvailable || event.button !== 0) return

      const result = getCanvasHit(event.clientX, event.clientY, 'action')
      if (!result) return

      if (result.hit.type === 'branch') {
        event.preventDefault()
        startBranchDrag(result.hit.branchId, result.point, event.pointerId)
        return
      }

      if (result.hit.type === 'connector') {
        event.preventDefault()
        startRelationDrag(result.hit.nodeId, result.hit.side, result.point, event.pointerId)
        return
      }

      if (result.hit.type === 'node') {
        event.preventDefault()
        startNodeDrag(result.hit.nodeId, result.point, event.pointerId)
      }
    },
    [getCanvasHit, isPixiAvailable, startBranchDrag, startNodeDrag, startRelationDrag],
  )

  const handleCanvasContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (branchDragRef.current || nodeDragRef.current || relationDragRef.current) return

      const result = getCanvasHit(event.clientX, event.clientY, 'action')
      if (!result) return

      event.preventDefault()
      if (isPixiAvailable && result.hit.type === 'branch') {
        return
      }

      if (isPixiAvailable && result.hit.type === 'edge') {
        onDeleteEdge(result.hit.edgeId)
        return
      }

      if (isPixiAvailable && (result.hit.type === 'node' || result.hit.type === 'connector')) {
        onSelectNode(result.hit.nodeId)
        onNodeContextRequest({
          mode: 'edit',
          nodeId: result.hit.nodeId,
        })
        return
      }

      if (result.hit.type === 'empty') {
        onNodeContextRequest({
          mode: 'create',
          position: snapToBranchLine(result.point, branches),
        })
      }
    },
    [
      branches,
      getCanvasHit,
      isPixiAvailable,
      onDeleteEdge,
      onNodeContextRequest,
      onSelectNode,
      startBranchDrag,
    ],
  )

  const handleBranchPointerDown = useCallback(
    (branchId: string, event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      const point = getCanvasPoint(event.clientX, event.clientY)
      if (!point) return

      event.preventDefault()
      event.stopPropagation()
      startBranchDrag(branchId, point, event.pointerId)
    },
    [getCanvasPoint, startBranchDrag],
  )

  const handleFallbackNodePointerDown = useCallback(
    (nodeId: string, event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      const point = getCanvasPoint(event.clientX, event.clientY)
      if (!point) return

      event.preventDefault()
      startNodeDrag(nodeId, point, event.pointerId)
    },
    [getCanvasPoint, startNodeDrag],
  )

  const handleFallbackRelationPointerDown = useCallback(
    (nodeId: string, side: ConnectorSide, event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      const point = getCanvasPoint(event.clientX, event.clientY)
      if (!point) return

      event.preventDefault()
      event.stopPropagation()
      startRelationDrag(nodeId, side, point, event.pointerId)
    },
    [getCanvasPoint, startRelationDrag],
  )

  const handlePixiPointerLeave = useCallback(() => {
    if (branchDragRef.current || nodeDragRef.current || relationDragRef.current) return
    setHoveredConnector(null)
  }, [setHoveredConnector])

  return {
    activeBranchDragId,
    activeDragId,
    connectorNode,
    connectorPosition,
    connectorSide,
    displayBranches,
    displayPositions,
    graphRenderData,
    handleBranchPointerDown,
    handleCanvasContextMenu,
    handleConnectorPointerEnter,
    handleConnectorPointerLeave,
    handleFallbackNodePointerDown,
    handleFallbackRelationPointerDown,
    handleNodePointerEnter,
    handleNodePointerLeave,
    handleNodePointerMove,
    handlePixiPointerDown,
    handlePixiPointerLeave,
    handlePixiPointerMove,
    isPixiAvailable,
    relationDrag,
    setIsPixiAvailable,
    startNodeDrag,
    startRelationDrag,
  }
}
