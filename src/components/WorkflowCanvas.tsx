import { memo } from 'react'
import type { RefObject } from 'react'
import type {
  Branch,
  BranchDropChange,
  Edge,
  NodeContextRequest,
  NodeDropChange,
  Position,
  RelationDropChange,
  WorkflowNode,
} from '../types'
import { PixiGraphLayer } from './PixiGraphLayer'
import { canvasSize, timelineLayout } from '../workflowData'
import { BranchLanes } from './workflow-canvas/BranchLanes'
import { CanvasHeader } from './workflow-canvas/CanvasHeader'
import { EdgeHitLayer, EdgeLayer } from './workflow-canvas/EdgeLayers'
import { NodeLayer } from './workflow-canvas/NodeLayer'
import { RelationHandle } from './workflow-canvas/RelationHandle'
import { useWorkflowCanvasInteractions } from './workflow-canvas/useWorkflowCanvasInteractions'

type WorkflowCanvasProps = {
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

const canvasBackgroundImage =
  'linear-gradient(rgba(30, 33, 31, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 33, 31, 0.04) 1px, transparent 1px)'

function WorkflowCanvasComponent(props: WorkflowCanvasProps) {
  const {
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
  } = props
  const canvas = useWorkflowCanvasInteractions({
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
  })

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-workbench border border-border bg-surface p-[18px] shadow-workbench xl:h-full">
      <CanvasHeader />

      <div
        className="min-h-[420px] flex-1 overflow-auto overscroll-contain rounded-workbench border border-border xl:min-h-0"
        ref={canvasRef}
      >
        <div
          className="relative min-w-[1120px] touch-none bg-[#fffefa] bg-[length:36px_36px]"
          onContextMenu={canvas.isPixiAvailable ? undefined : canvas.handleCanvasContextMenu}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundImage: canvasBackgroundImage,
          }}
        >
          <div
            className="absolute bottom-[18px] top-[22px] border-l-2 border-dashed border-[#beb9ae]"
            style={{ left: timelineLayout.axisX }}
          >
            <span className="absolute -left-6 -top-2 bg-[#fffefa] px-2 text-lg font-extrabold text-text">
              时间
            </span>
          </div>

          <PixiGraphLayer
            data={canvas.graphRenderData}
            fallback={
              <EdgeLayer
                edges={edges}
                positions={canvas.displayPositions}
                relationDrag={canvas.relationDrag}
              />
            }
            onAvailabilityChange={canvas.setIsPixiAvailable}
            onContextMenu={canvas.handleCanvasContextMenu}
            onPointerCancel={canvas.handlePixiPointerLeave}
            onPointerDown={canvas.handlePixiPointerDown}
            onPointerLeave={canvas.handlePixiPointerLeave}
            onPointerMove={canvas.handlePixiPointerMove}
          />
          {!canvas.isPixiAvailable ? (
            <BranchLanes
              activeBranchDragId={canvas.activeBranchDragId}
              branches={canvas.displayBranches}
              onBranchPointerDown={canvas.handleBranchPointerDown}
            />
          ) : null}
          {!canvas.isPixiAvailable ? (
            <EdgeHitLayer edges={canvas.graphRenderData.edges} onDeleteEdge={onDeleteEdge} />
          ) : null}
          <NodeLayer
            activeDragId={canvas.activeDragId}
            activeRelationDrag={canvas.relationDrag}
            branches={canvas.displayBranches}
            nodes={nodes}
            onNodeContextRequest={onNodeContextRequest}
            onNodePointerDown={canvas.handleFallbackNodePointerDown}
            onNodePointerEnter={canvas.handleNodePointerEnter}
            onNodePointerLeave={canvas.handleNodePointerLeave}
            onNodePointerMove={canvas.handleNodePointerMove}
            onSelectNode={onSelectNode}
            positions={canvas.displayPositions}
            selectedNodeId={selectedNodeId}
            useDomInteractions={!canvas.isPixiAvailable}
            useDomVisuals={!canvas.isPixiAvailable}
          />
          {!canvas.isPixiAvailable && canvas.connectorNode && canvas.connectorPosition ? (
            <RelationHandle
              node={canvas.connectorNode}
              onPointerDown={canvas.handleFallbackRelationPointerDown}
              onPointerEnter={canvas.handleConnectorPointerEnter}
              onPointerLeave={canvas.handleConnectorPointerLeave}
              position={canvas.connectorPosition}
              side={canvas.connectorSide}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const WorkflowCanvas = memo(WorkflowCanvasComponent)
