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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
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
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, transparentMode]);

  return (
    <button
      className={`thumbnail-item ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`跳转到第 ${pageNumber} 页`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="thumbnail-paper" style={{ aspectRatio: `1 / ${ratio}` }}>
        <canvas ref={canvasRef} className={nightMode ? 'night-canvas' : ''} />
      </span>
      <span className="thumbnail-number">{String(pageNumber).padStart(2, '0')}</span>
    </button>
  );
}
