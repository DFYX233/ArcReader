import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  nightMode: boolean;
  transparentMode: boolean;
}

const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>(function PdfPage(
  { doc, pageNumber, scale, nightMode, transparentMode },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [dimensions, setDimensions] = useState({ width: 595 * scale, height: 842 * scale });
  const [rendering, setRendering] = useState(true);

  useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement);

  useEffect(() => {
    const element = localRef.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      setDimensions({ width: viewport.width, height: viewport.height });
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, scale]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setRendering(true);

    doc.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return;

      renderTaskRef.current?.cancel();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * pixelRatio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

      const task = page.render({
        canvasContext: context,
        viewport,
        background: transparentMode ? 'rgba(255,255,255,0)' : '#ffffff',
      });
      renderTaskRef.current = task;
      task.promise
        .then(() => {
          if (!cancelled) setRendering(false);
        })
        .catch((error: Error) => {
          if (error?.name !== 'RenderingCancelledException') {
            console.error('页面渲染失败:', error);
            if (!cancelled) setRendering(false);
          }
        });
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [doc, pageNumber, scale, transparentMode, visible]);

  return (
    <div
      ref={localRef}
      className={`pdf-page ${nightMode ? 'night-page' : ''}`}
      data-page={pageNumber}
      style={{ width: dimensions.width, height: dimensions.height }}
      aria-label={`第 ${pageNumber} 页`}
    >
      {visible && <canvas ref={canvasRef} className={nightMode ? 'night-canvas' : ''} />}
      {!visible && <div className="page-placeholder" />}
      {rendering && visible && <div className="page-loading"><span /></div>}
      <span className="page-corner">{pageNumber}</span>
    </div>
  );
});

export default PdfPage;
