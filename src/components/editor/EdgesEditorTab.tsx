import { memo, useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Edge, EdgeKind, NewEdgeForm, NodeOption } from '../../types'
import { edgeKinds, fieldClass, labelClass } from '../../workflowData'
import { cn } from '../../workflowUtils'

type EdgesEditorTabProps = {
  addEdge: () => void
  deleteEdge: (edgeId: string) => void
  edges: Edge[]
  newEdge: NewEdgeForm
  nodeLabelById: Map<string, string>
  nodeOptions: NodeOption[]
  setNewEdge: Dispatch<SetStateAction<NewEdgeForm>>
  updateEdge: (edgeId: string, patch: Partial<Edge>) => void
}

function EdgesEditorTabComponent({
  addEdge,
  deleteEdge,
  edges,
  newEdge,
  nodeLabelById,
  nodeOptions,
  setNewEdge,
  updateEdge,
}: EdgesEditorTabProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(edges[0]?.id ?? null)
  const nodeOptionIds = useMemo(
    () => new Set(nodeOptions.map((option) => option.id)),
    [nodeOptions],
  )
  const canAddEdge =
    nodeOptions.length >= 2 &&
    newEdge.from !== newEdge.to &&
    nodeOptionIds.has(newEdge.from) &&
    nodeOptionIds.has(newEdge.to)

  useEffect(() => {
    if (edges.length === 0) {
      setSelectedEdgeId(null)
      return
    }

    if (!selectedEdgeId || !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(edges[0].id)
    }
  }, [edges, selectedEdgeId])

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId],
  )

  return (
    <div className="grid gap-3">
      <div className="rounded-workbench border border-border bg-control p-3.5">
        <h3 className="m-0 mb-3 text-[15px] font-[760] text-text">新增关系</h3>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className={labelClass}>
              From
              <select
                aria-label="新增关系 From"
                className={fieldClass}
                onChange={(event) =>
                  setNewEdge((current) => ({ ...current, from: event.target.value }))
                }
                value={newEdge.from}
              >
                <NodeOptions disabledId={newEdge.to} nodeOptions={nodeOptions} />
              </select>
            </label>
            <label className={labelClass}>
              To
              <select
                aria-label="新增关系 To"
                className={fieldClass}
                onChange={(event) =>
                  setNewEdge((current) => ({ ...current, to: event.target.value }))
                }
                value={newEdge.to}
              >
                <NodeOptions disabledId={newEdge.from} nodeOptions={nodeOptions} />
              </select>
            </label>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <label className={labelClass}>
              类型
              <select
                aria-label="新增关系类型"
                className={fieldClass}
                onChange={(event) =>
                  setNewEdge((current) => ({ ...current, kind: event.target.value as EdgeKind }))
                }
                value={newEdge.kind}
              >
                <EdgeKindOptions />
              </select>
            </label>
            <label className={labelClass}>
              标签
              <input
                aria-label="新增关系标签"
                className={fieldClass}
                onChange={(event) =>
                  setNewEdge((current) => ({ ...current, label: event.target.value }))
                }
                value={newEdge.label}
              />
            </label>
          </div>
          <button
            className="min-h-9 rounded-md border border-border bg-surface px-3 text-sm font-extrabold text-text disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canAddEdge}
            onClick={addEdge}
            type="button"
          >
            新增关系
          </button>
        </div>
      </div>

      <div className="rounded-workbench border border-border bg-control p-3.5">
        <h3 className="m-0 mb-3 text-[15px] font-[760] text-text">关系列表</h3>
        {edges.length === 0 ? (
          <p className="m-0 text-[13px] text-muted">当前没有节点关系。</p>
        ) : (
          <div className="grid max-h-64 gap-2 overflow-auto pr-1">
            {edges.map((edge) => {
              const isSelected = selectedEdgeId === edge.id
              return (
                <div
                  className={cn(
                    'grid grid-cols-[1fr_auto] gap-2 rounded-md border p-2',
                    isSelected ? 'border-accent bg-surface' : 'border-border bg-control',
                  )}
                  key={edge.id}
                >
                  <button
                    className="grid gap-1 text-left"
                    onClick={() => setSelectedEdgeId(edge.id)}
                    type="button"
                  >
                    <span className="text-[13px] font-extrabold text-text">
                      {nodeLabelById.get(edge.from) ?? edge.from} →{' '}
                      {nodeLabelById.get(edge.to) ?? edge.to}
                    </span>
                    <span className="text-xs font-extrabold text-muted">
                      {edge.kind} · {edge.label}
                    </span>
                  </button>
                  <button
                    className="min-h-8 rounded-md border border-[#efb49f] bg-[#fff1ec] px-2 text-xs font-extrabold text-[#7a321b]"
                    onClick={() => deleteEdge(edge.id)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedEdge ? (
        <div className="rounded-workbench border border-border bg-control p-3.5">
          <h3 className="m-0 mb-3 text-[15px] font-[760] text-text">编辑选中关系</h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                From
                <select
                  aria-label={`关系 ${selectedEdge.id} From`}
                  className={fieldClass}
                  onChange={(event) => updateEdge(selectedEdge.id, { from: event.target.value })}
                  value={selectedEdge.from}
                >
                  <NodeOptions disabledId={selectedEdge.to} nodeOptions={nodeOptions} />
                </select>
              </label>
              <label className={labelClass}>
                To
                <select
                  aria-label={`关系 ${selectedEdge.id} To`}
                  className={fieldClass}
                  onChange={(event) => updateEdge(selectedEdge.id, { to: event.target.value })}
                  value={selectedEdge.to}
                >
                  <NodeOptions disabledId={selectedEdge.from} nodeOptions={nodeOptions} />
                </select>
              </label>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <label className={labelClass}>
                类型
                <select
                  aria-label={`关系 ${selectedEdge.id} 类型`}
                  className={fieldClass}
                  onChange={(event) =>
                    updateEdge(selectedEdge.id, { kind: event.target.value as EdgeKind })
                  }
                  value={selectedEdge.kind}
                >
                  <EdgeKindOptions />
                </select>
              </label>
              <label className={labelClass}>
                标签
                <input
                  aria-label={`关系 ${selectedEdge.id} 标签`}
                  className={fieldClass}
                  onChange={(event) => updateEdge(selectedEdge.id, { label: event.target.value })}
                  value={selectedEdge.label}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NodeOptions({
  disabledId,
  nodeOptions,
}: {
  disabledId?: string
  nodeOptions: NodeOption[]
}) {
  return (
    <>
      {nodeOptions.map((option) => (
        <option disabled={option.id === disabledId} key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </>
  )
}

function EdgeKindOptions() {
  return (
    <>
      {edgeKinds.map((kind) => (
        <option key={kind} value={kind}>
          {kind}
        </option>
      ))}
    </>
  )
}

export const EdgesEditorTab = memo(EdgesEditorTabComponent)
