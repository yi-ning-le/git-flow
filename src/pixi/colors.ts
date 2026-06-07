import type { EdgeKind, NodeKind } from '../types'

export const edgeColors: Record<EdgeKind, number> = {
  candidate: 0x8c8a82,
  hotfix: 0xa33a16,
  merge: 0x4f46c8,
  sync: 0x1769aa,
}

export const edgeWidths: Record<EdgeKind, number> = {
  candidate: 3,
  hotfix: 3.5,
  merge: 3,
  sync: 3,
}

export const nodeFillColors: Record<NodeKind, number> = {
  commit: 0xffffff,
  gate: 0xedf6ff,
  hotfix: 0xfff0ea,
  tag: 0xe8f7f2,
}

export const nodeStrokeFallback = 0x167c80
export const relationPreviewColor = 0x167c80
export const selectedRingColor = 0x167c80
export const draggingRingColor = 0x5247c7
