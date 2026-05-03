'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, chart: string) => Promise<{ svg: string }>;
    };
  }
}

const CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

let loadPromise: Promise<void> | null = null;

function loadMermaidCDN(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (typeof window !== 'undefined' && window.mermaid) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load mermaid CDN'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

function useMermaidSvg(chart: string): { svg: string | null; error: boolean } {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMermaidCDN();
        const mermaid = window.mermaid!;
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          securityLevel: 'loose',
        });
        const id = `m-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(svg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  return { svg, error };
}

export function Mermaid({ chart }: { chart: string }) {
  const { svg, error } = useMermaidSvg(chart);
  const ref = useRef<HTMLDivElement>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (svg && ref.current) ref.current.innerHTML = svg;
  }, [svg]);

  if (error) {
    return (
      <pre className="my-4 overflow-x-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
        {chart}
      </pre>
    );
  }

  return (
    <>
      <button
        type="button"
        className="group relative my-4 block w-full cursor-pointer text-left"
        onClick={() => setZoomOpen(true)}
        aria-label="點擊放大檢視"
      >
        <div ref={ref} className="overflow-x-auto" />
      </button>
      {zoomOpen && svg && (
        <MermaidZoomViewer svg={svg} onClose={() => setZoomOpen(false)} />
      )}
    </>
  );
}

function MermaidZoomViewer({
  svg,
  onClose,
}: {
  svg: string;
  onClose: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const fitToStage = useCallback(() => {
    const stage = stageRef.current;
    const svgEl = innerRef.current?.querySelector('svg');
    if (!stage || !svgEl) return;
    const sr = stage.getBoundingClientRect();
    const vb = svgEl.viewBox.baseVal;
    const w = vb?.width || svgEl.clientWidth || 800;
    const h = vb?.height || svgEl.clientHeight || 600;
    const s = Math.min((sr.width * 0.92) / w, (sr.height * 0.92) / h, 4);
    setScale(s);
    setPos({ x: (sr.width - w * s) / 2, y: (sr.height - h * s) / 2 });
  }, []);

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.innerHTML = svg;
      const el = innerRef.current.querySelector('svg');
      if (el) {
        const vb = el.viewBox.baseVal;
        if (vb && vb.width && vb.height) {
          el.setAttribute('width', String(vb.width));
          el.setAttribute('height', String(vb.height));
        }
        el.style.maxWidth = 'none';
      }
    }
    requestAnimationFrame(fitToStage);
  }, [svg, fitToStage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setScale((prev) => {
      const next = Math.min(8, Math.max(0.2, prev * factor));
      const k = next / prev;
      const stage = stageRef.current;
      if (stage) {
        const sr = stage.getBoundingClientRect();
        const px = cx ?? sr.width / 2;
        const py = cy ?? sr.height / 2;
        setPos((p) => ({ x: px - (px - p.x) * k, y: py - (py - p.y) * k }));
      }
      return next;
    });
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const sr = stageRef.current?.getBoundingClientRect();
    if (!sr) return;
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - sr.left, e.clientY - sr.top);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
  };
  const onPointerUp = () => { dragging.current = null; };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Mermaid 圖放大檢視"
      className="fixed inset-0 z-[60] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="absolute right-3 top-3 z-10 flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="toolbar"
      >
        <ToolBtn onClick={() => zoomAt(1 / 1.3)} label="縮小"><ZoomOut className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => zoomAt(1.3)} label="放大"><ZoomIn className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={fitToStage} label="重設"><RotateCcw className="h-4 w-4" /></ToolBtn>
        <span className="ml-1 w-10 text-right text-xs tabular-nums text-white/70">
          {Math.round(scale * 100)}%
        </span>
        <ToolBtn onClick={onClose} label="關閉"><X className="h-4 w-4" /></ToolBtn>
      </div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by parent dialog */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: interactive zoom/pan area */}
      <div
        ref={stageRef}
        className="m-4 flex-1 cursor-grab overflow-hidden rounded-lg border border-border bg-background touch-none active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={innerRef}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          className="absolute left-0 top-0 will-change-transform [&_svg]:block"
        />
      </div>
    </div>
  );
}

function ToolBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
    >
      {children}
    </button>
  );
}
