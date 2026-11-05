import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface ThumbnailProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  nightMode: boolean;
  transparentMode: boolean;
  onClick: () => void;
}

export default function Thumbnail({
  doc,
  pageNumber,
  active,
  nightMode,
  transparentMode,
  onClick,
}: ThumbnailProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [visible, setVisible] = useState(pageNumber <= 2);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (active) buttonRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    doc.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const scale = 144 / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return;
      setRatio(base.height / base.width);
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      renderTask = page.render({
        canvasContext: context,
        viewport,
        background: transparentMode ? 'rgba(255,255,255,0)' : '#ffffff',
      });
      renderTask.promise.catch(() => undefined);
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, transparentMode, visible]);

  return (
    <button
      ref={buttonRef}
      className={`thumbnail-item ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`跳转到第 ${pageNumber} 页`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="thumbnail-paper" style={{ aspectRatio: `1 / ${ratio}` }}>
        {visible && <canvas ref={canvasRef} className={nightMode ? 'night-canvas' : ''} />}
      </span>
      <span className="thumbnail-number">{String(pageNumber).padStart(2, '0')}</span>
    </button>
  );
}
