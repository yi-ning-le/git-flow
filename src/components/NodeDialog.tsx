import { memo, useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type {
  Branch,
  BranchId,
  NewNodeForm,
  NodeContextRequest,
  NodeKind,
  Position,
  WorkflowNode,
} from '../types'
import { fieldClass, labelClass, nodeKinds } from '../workflowData'
import { cn, getNearestBranch } from '../workflowUtils'

type NodeDialogProps = {
  branches: Branch[]
  canDelete: boolean
  node: WorkflowNode | undefined
  onClose: () => void
  onCreateNode: (node: NewNodeForm, position: Position) => void
  onDeleteNode: (nodeId: string) => void
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void
  request: NodeContextRequest | null
}

const emptyForm: NewNodeForm = {
  label: 'new gate',
  kind: 'gate',
  branch: 'staging',
  description: '描述这个节点对 workflow 的影响。',
}

function NodeDialogComponent({
  branches,
  canDelete,
  node,
  onClose,
  onCreateNode,
  onDeleteNode,
  onUpdateNode,
  request,
}: NodeDialogProps) {
  const [form, setForm] = useState<NewNodeForm>(emptyForm)
  const isCreate = request?.mode === 'create'
  const title = isCreate ? '新增节点' : '编辑节点'

  const createPosition = useMemo(() => {
    if (request?.mode !== 'create') return null
    return request.position
  }, [request])

  useEffect(() => {
    if (!request) return

    if (request.mode === 'create') {
      setForm({
        ...emptyForm,
        branch: getNearestBranch(request.position.x, branches).id,
      })
      return
    }

    if (node) {
      setForm({
        label: node.label,
        kind: node.kind,
        branch: node.branch,
        description: node.description,
      })
    }
  }, [branches, node, request])

  const submit = () => {
    const nextForm = {
      label: form.label.trim() || 'new node',
      kind: form.kind,
      branch: form.branch,
      description: form.description.trim() || '暂无描述。',
    }

    if (request?.mode === 'create' && createPosition) {
      onCreateNode(nextForm, createPosition)
      onClose()
      return
    }

    if (request?.mode === 'edit' && node) {
      onUpdateNode(node.id, nextForm)
      onClose()
    }
  }

  const deleteNode = () => {
    if (!node || !canDelete) return
    onDeleteNode(node.id)
    onClose()
  }

  return (
    <Dialog.Root open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-workbench border border-border bg-surface p-5 shadow-workbench">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="m-0 text-lg font-[760] leading-tight text-text">
                {title}
              </Dialog.Title>
              <Dialog.Description className="m-0 mt-1 text-sm leading-snug text-muted">
                {isCreate ? '创建一个新的 workflow 节点。' : '修改节点文案、类型、branch 和描述。'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-control text-sm font-extrabold text-muted">
              ×
            </Dialog.Close>
          </div>

          <div className="grid gap-3">
            <label className={labelClass}>
              节点文案
              <textarea
                aria-label="节点文案"
                className={cn(fieldClass, 'min-h-20 resize-y whitespace-pre-line')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
                value={form.label}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                类型
                <select
                  aria-label="节点类型"
                  className={fieldClass}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, kind: event.target.value as NodeKind }))
                  }
                  value={form.kind}
                >
                  {nodeKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Branch
                <select
                  aria-label="节点 Branch"
                  className={fieldClass}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, branch: event.target.value as BranchId }))
                  }
                  value={form.branch}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={labelClass}>
              描述
              <textarea
                aria-label="节点描述"
                className={cn(fieldClass, 'min-h-24 resize-y')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              className="min-h-9 rounded-md border border-[#efb49f] bg-[#fff1ec] px-3 text-sm font-extrabold text-[#7a321b] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isCreate || !canDelete}
              onClick={deleteNode}
              type="button"
            >
              删除节点
            </button>
            <div className="flex gap-2 sm:justify-end">
              <Dialog.Close className="min-h-9 rounded-md border border-border bg-control px-3 text-sm font-extrabold text-muted">
                取消
              </Dialog.Close>
              <button
                className="min-h-9 rounded-md border border-border bg-surface px-3 text-sm font-extrabold text-text"
                onClick={submit}
                type="button"
              >
                保存
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const NodeDialog = memo(NodeDialogComponent)
