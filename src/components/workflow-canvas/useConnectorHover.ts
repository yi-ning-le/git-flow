import { useCallback, useState } from 'react'
import type { ConnectorSide, HoveredConnector, NodeHoverEvent } from './types'
import { getConnectorSide, isConnectorElementForNode, isNodeElementForConnector } from './utils'

type UseConnectorHoverInput = {
  isNodeDraggingRef: { current: unknown }
  isRelationDraggingRef: { current: unknown }
}

export function useConnectorHover({
  isNodeDraggingRef,
  isRelationDraggingRef,
}: UseConnectorHoverInput) {
  const [hoveredConnector, setHoveredConnector] = useState<HoveredConnector | null>(null)

  const handleNodePointerEnter = useCallback(
    (nodeId: string, event: NodeHoverEvent) => {
      if (isRelationDraggingRef.current) return
      setHoveredConnector({ nodeId, side: getConnectorSide(event) })
    },
    [isRelationDraggingRef],
  )

  const handleNodePointerMove = useCallback(
    (nodeId: string, event: NodeHoverEvent) => {
      if (isNodeDraggingRef.current || isRelationDraggingRef.current) return

      const side = getConnectorSide(event)
      setHoveredConnector((current) => {
        if (current?.nodeId === nodeId && current.side === side) return current
        return { nodeId, side }
      })
    },
    [isNodeDraggingRef, isRelationDraggingRef],
  )

  const handleNodePointerLeave = useCallback(
    (nodeId: string, event: NodeHoverEvent) => {
      if (isRelationDraggingRef.current) return
      if (isConnectorElementForNode(event.relatedTarget, nodeId)) return
      setHoveredConnector((current) => (current?.nodeId === nodeId ? null : current))
    },
    [isRelationDraggingRef],
  )

  const handleConnectorPointerEnter = useCallback(
    (nodeId: string, side: ConnectorSide) => {
      if (isRelationDraggingRef.current) return
      setHoveredConnector({ nodeId, side })
    },
    [isRelationDraggingRef],
  )

  const handleConnectorPointerLeave = useCallback(
    (nodeId: string, event: NodeHoverEvent) => {
      if (isRelationDraggingRef.current) return
      if (isNodeElementForConnector(event.relatedTarget, nodeId)) return
      setHoveredConnector((current) => (current?.nodeId === nodeId ? null : current))
    },
    [isRelationDraggingRef],
  )

  return {
    handleConnectorPointerEnter,
    handleConnectorPointerLeave,
    handleNodePointerEnter,
    handleNodePointerLeave,
    handleNodePointerMove,
    hoveredConnector,
    setHoveredConnector,
  }
}
