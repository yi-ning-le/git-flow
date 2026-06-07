import { memo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import type {
  Branch,
  BranchDistribution,
  BranchId,
  BranchPatch,
  ChangeLog,
  Edge,
  NewEdgeForm,
  NodeOption,
  WorkflowTemplate,
  WorkflowNode,
} from '../types'
import { BranchDistributionTab } from './editor/BranchDistributionTab'
import { ChangeLogTab } from './editor/ChangeLogTab'
import { EdgesEditorTab } from './editor/EdgesEditorTab'
import { EditorSummary } from './editor/EditorSummary'
import { NodeEditorTab } from './editor/NodeEditorTab'

type EditorPanelProps = {
  activeTemplateId: string
  addBranch: () => void
  addEdge: () => void
  applyTemplate: (templateId: string) => void
  branchDistribution: BranchDistribution[]
  changeLogs: ChangeLog[]
  currentImpact: string
  deleteBranch: (branchId: BranchId) => void
  deleteEdge: (edgeId: string) => void
  edges: Edge[]
  newEdge: NewEdgeForm
  nodeLabelById: Map<string, string>
  nodeOptions: NodeOption[]
  selectedBranch: Branch
  selectedNode: WorkflowNode
  selectedOutgoingEdge: Edge | undefined
  setNewEdge: Dispatch<SetStateAction<NewEdgeForm>>
  updateBranch: (branchId: BranchId, patch: BranchPatch) => void
  updateEdge: (edgeId: string, patch: Partial<Edge>) => void
  workflowTemplates: WorkflowTemplate[]
}

function EditorPanelComponent({
  activeTemplateId,
  addBranch,
  addEdge,
  applyTemplate,
  branchDistribution,
  changeLogs,
  currentImpact,
  deleteBranch,
  deleteEdge,
  edges,
  newEdge,
  nodeLabelById,
  nodeOptions,
  selectedBranch,
  selectedNode,
  selectedOutgoingEdge,
  setNewEdge,
  updateBranch,
  updateEdge,
  workflowTemplates,
}: EditorPanelProps) {
  return (
    <aside className="min-h-0 rounded-workbench border border-border bg-surface p-[18px] shadow-workbench xl:h-full xl:overflow-auto">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-[34px] flex-[0_0_34px] items-center justify-center rounded-workbench border border-border bg-[var(--icon-bg)] text-accent">
          ↯
        </span>
        <div>
          <h2 className="m-0 mb-1 text-lg font-[760] leading-tight text-text">编辑与影响</h2>
          <p className="m-0 text-sm leading-snug text-muted">
            修改节点、关系和描述后，画布会立即同步。
          </p>
        </div>
      </div>

      <EditorSummary
        currentImpact={currentImpact}
        nodeLabelById={nodeLabelById}
        selectedBranch={selectedBranch}
        selectedNode={selectedNode}
        selectedOutgoingEdge={selectedOutgoingEdge}
      />

      <div className="mb-3 rounded-workbench border border-border bg-control p-3.5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="m-0 text-[15px] font-[760] text-text">Workflow 模板</h3>
          <span className="text-xs font-extrabold text-muted">一键切换</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {workflowTemplates.map((template) => (
            <button
              aria-pressed={activeTemplateId === template.id}
              className="min-h-[58px] rounded-md border border-border bg-surface px-2.5 py-2 text-left text-sm font-extrabold text-text aria-pressed:border-accent aria-pressed:bg-[var(--control-active)]"
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              type="button"
            >
              <span className="block leading-tight">{template.label}</span>
              <span className="mt-1 block text-xs font-semibold leading-snug text-muted">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Tabs.Root defaultValue="node">
        <Tabs.List
          aria-label="workflow 编辑视图"
          className="grid grid-cols-4 gap-1 rounded-workbench border border-border bg-control p-1"
        >
          {editorTabs.map(([value, label]) => (
            <Tabs.Trigger
              className="rounded-md px-2 py-2 text-sm font-bold text-muted data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm"
              key={value}
              value={value}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content className="mt-3" value="node">
          <NodeEditorTab selectedBranch={selectedBranch} selectedNode={selectedNode} />
        </Tabs.Content>

        <Tabs.Content className="mt-3" value="edges">
          <EdgesEditorTab
            addEdge={addEdge}
            deleteEdge={deleteEdge}
            edges={edges}
            newEdge={newEdge}
            nodeLabelById={nodeLabelById}
            nodeOptions={nodeOptions}
            setNewEdge={setNewEdge}
            updateEdge={updateEdge}
          />
        </Tabs.Content>

        <Tabs.Content className="mt-3" value="branches">
          <BranchDistributionTab
            addBranch={addBranch}
            branchDistribution={branchDistribution}
            deleteBranch={deleteBranch}
            updateBranch={updateBranch}
          />
        </Tabs.Content>

        <Tabs.Content className="mt-3" value="logs">
          <ChangeLogTab changeLogs={changeLogs} />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}

const editorTabs = [
  ['node', '节点'],
  ['edges', '关系'],
  ['branches', '分布'],
  ['logs', '记录'],
]

export const EditorPanel = memo(EditorPanelComponent)
