import { useRef } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { AppHeader } from './components/AppHeader'
import { EditorPanel } from './components/EditorPanel'
import { NodeDialog } from './components/NodeDialog'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { useWorkflowModel } from './hooks/useWorkflowModel'

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { actions, state } = useWorkflowModel()

  return (
    <Tooltip.Provider delayDuration={250}>
      <main className="flex min-h-svh flex-col p-4 md:p-7 xl:h-svh xl:min-h-0 xl:overflow-hidden">
        <AppHeader onReset={actions.resetLayout} />

        <section
          aria-label="Git workflow 拖拽模拟器"
          className="mx-auto grid w-full max-w-[1540px] grid-cols-1 items-stretch gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_420px]"
        >
          <WorkflowCanvas
            branches={state.branches}
            canvasRef={canvasRef}
            edges={state.edges}
            nodes={state.nodes}
            onDeleteEdge={actions.deleteEdge}
            onBranchDrop={actions.handleBranchDrop}
            onNodeContextRequest={actions.setNodeDialogRequest}
            onNodeDrop={actions.handleNodeDrop}
            onRelationDrop={actions.handleRelationDrop}
            onSelectNode={actions.setSelectedNodeId}
            positions={state.positions}
            selectedNodeId={state.selectedNodeId}
          />
          <EditorPanel
            addBranch={actions.addBranch}
            addEdge={actions.addEdge}
            branchDistribution={state.branchDistribution}
            changeLogs={state.changeLogs}
            currentImpact={state.currentImpact}
            deleteBranch={actions.deleteBranch}
            deleteEdge={actions.deleteEdge}
            edges={state.edges}
            newEdge={state.newEdge}
            nodeLabelById={state.nodeLabelById}
            nodeOptions={state.nodeOptions}
            selectedBranch={state.selectedBranch}
            selectedNode={state.selectedNode}
            selectedOutgoingEdge={state.selectedOutgoingEdge}
            setNewEdge={actions.setNewEdge}
            activeTemplateId={state.activeTemplateId}
            applyTemplate={actions.applyTemplate}
            updateBranch={actions.updateBranch}
            updateEdge={actions.updateEdge}
            workflowTemplates={state.workflowTemplates}
          />
        </section>
        <NodeDialog
          branches={state.branches}
          canDelete={state.nodes.length > 1}
          node={
            state.nodeDialogRequest?.mode === 'edit'
              ? state.nodeById.get(state.nodeDialogRequest.nodeId)
              : undefined
          }
          onClose={() => actions.setNodeDialogRequest(null)}
          onCreateNode={actions.createNode}
          onDeleteNode={actions.deleteNode}
          onUpdateNode={actions.updateNode}
          request={state.nodeDialogRequest}
        />
      </main>
    </Tooltip.Provider>
  )
}

export default App
