import { memo, useEffect, useRef, useState } from 'react'
import type { MouseEventHandler, PointerEventHandler, ReactNode } from 'react'
import type { GraphRenderData } from '../pixi/graphRenderData'
import type { PixiGraphRenderer } from '../pixi/PixiGraphRenderer'

type PixiGraphLayerProps = {
  data: GraphRenderData
  fallback: ReactNode
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  onAvailabilityChange?: (available: boolean) => void
  onPointerCancel?: PointerEventHandler<HTMLDivElement>
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
  onPointerMove?: PointerEventHandler<HTMLDivElement>
}

function PixiGraphLayerComponent({
  data,
  fallback,
  onAvailabilityChange,
  onContextMenu,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
}: PixiGraphLayerProps) {
  const [failed, setFailed] = useState(false)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<PixiGraphRenderer | null>(null)
  const latestDataRef = useRef(data)

  latestDataRef.current = data

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const hostElement = host

    let disposed = false
    let renderer: PixiGraphRenderer | null = null

    async function setupRenderer() {
      try {
        const { PixiGraphRenderer } = await import('../pixi/PixiGraphRenderer')
        if (disposed) {
          return
        }

        const nextRenderer = new PixiGraphRenderer()
        renderer = nextRenderer
        await nextRenderer.init(hostElement, data.width, data.height)

        if (disposed) {
          nextRenderer.destroy()
          return
        }

        rendererRef.current = nextRenderer
        onAvailabilityChange?.(true)
        nextRenderer.render(latestDataRef.current)
      } catch {
        renderer?.destroy()
        if (!disposed) {
          setFailed(true)
          onAvailabilityChange?.(false)
        }
      }
    }

    void setupRenderer()

    return () => {
      disposed = true
      if (rendererRef.current === renderer) {
        rendererRef.current = null
      }
      renderer?.destroy()
    }
  }, [data.height, data.width, onAvailabilityChange])

  useEffect(() => {
    rendererRef.current?.render(data)
  }, [data])

  if (failed) return fallback

  return (
    <div
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 z-[2] overflow-visible"
      data-renderer="pixi"
      data-testid="pixi-layer"
      onContextMenu={onContextMenu}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      ref={hostRef}
    />
  )
}

export const PixiGraphLayer = memo(PixiGraphLayerComponent)
