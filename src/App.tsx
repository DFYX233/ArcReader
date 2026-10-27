import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Keyboard,
  Layers3,
  ListTree,
  LoaderCircle,
  Maximize,
  Minimize,
  Minus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Scan,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import PdfPage from './components/PdfPage';
import Thumbnail from './components/Thumbnail';
import OutlineTree, { type PdfOutlineItem } from './components/OutlineTree';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface SearchResult {
  page: number;
  snippet: string;
}

const SAMPLE_NAME = 'ArcReader · 通透阅读指南.pdf';
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function formatBytes(bytes: number) {
  if (!bytes) return '内置文档';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function App() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState(SAMPLE_NAME);
  const [fileSize, setFileSize] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.05);
  const [fitMode, setFitMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'pages' | 'outline'>('pages');
  const [outline, setOutline] = useState<PdfOutlineItem[]>([]);
  const [nightMode, setNightMode] = useState(() => localStorage.getItem('arcreader-theme') === 'night');
  const [transparentMode, setTransparentMode] = useState(() => localStorage.getItem('arcreader-transparent') !== 'false');
  const [opacity, setOpacity] = useState(() => Number(localStorage.getItem('arcreader-opacity') || 76));
  const [windowTranslucent, setWindowTranslucent] = useState(() => localStorage.getItem('arcreader-window-translucent') === 'true');
  const [windowOpacity, setWindowOpacity] = useState(() => Number(localStorage.getItem('arcreader-window-opacity') || 82));
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => localStorage.getItem('arcreader-always-on-top') === 'true');
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState('');

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollFrame = useRef<number | null>(null);
  const initialized = useRef(false);
  const loadSequence = useRef(0);

  const showToast = useCallback((message: string) => setToast(message), []);

  const loadDocument = useCallback(async (source: ArrayBuffer, name: string, size: number) => {
    const requestId = ++loadSequence.current;
    setLoading(true);
    setAppearanceOpen(false);
    setSearchResults([]);
    setHasSearched(false);
    setOutline([]);
    try {
      const nextDoc = await pdfjsLib.getDocument({ data: new Uint8Array(source.slice(0)) }).promise;
      const nextOutline = await nextDoc.getOutline().catch(() => []) as PdfOutlineItem[];
      if (requestId !== loadSequence.current) {
        void nextDoc.destroy();
        return;
      }
      const previousDoc = docRef.current;
      docRef.current = nextDoc;
      setDoc(nextDoc);
      setOutline(nextOutline);
      setSidebarTab(nextOutline.length ? 'outline' : 'pages');
      setFileName(name);
      setFileSize(size);
      setNumPages(nextDoc.numPages);
      setPageNumber(1);
      setScale(1.05);
      setFitMode(false);
      if (viewerRef.current) viewerRef.current.scrollTop = 0;
      if (previousDoc) void previousDoc.destroy();
    } catch (error) {
      if (requestId === loadSequence.current) {
        console.error('PDF 加载失败:', error);
        showToast('无法打开此 PDF，请确认文件未加密或损坏');
      }
    } finally {
      if (requestId === loadSequence.current) setLoading(false);
    }
  }, [showToast]);

  const loadSample = useCallback(async () => {
    try {
      const response = await fetch('sample.pdf');
      if (!response.ok) throw new Error('示例文档不存在');
      const buffer = await response.arrayBuffer();
      await loadDocument(buffer, SAMPLE_NAME, buffer.byteLength);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [loadDocument]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const desktop = window.arcDesktop;
    if (!desktop) {
      void loadSample();
      return;
    }
    void desktop.getInitialFile().then((file) => {
      if (file) return loadDocument(file.data, file.name, file.size);
      return loadSample();
    }).catch((error) => {
      console.error('启动文件读取失败:', error);
      return loadSample();
    });
  }, [loadDocument, loadSample]);

  useEffect(() => {
    localStorage.setItem('arcreader-theme', nightMode ? 'night' : 'day');
    document.documentElement.style.colorScheme = nightMode ? 'dark' : 'light';
  }, [nightMode]);

  useEffect(() => {
    localStorage.setItem('arcreader-transparent', String(transparentMode));
  }, [transparentMode]);

  useEffect(() => {
    localStorage.setItem('arcreader-opacity', String(opacity));
  }, [opacity]);

  useEffect(() => {
    localStorage.setItem('arcreader-window-translucent', String(windowTranslucent));
    localStorage.setItem('arcreader-window-opacity', String(windowOpacity));
    void window.arcDesktop?.setWindowOpacity(windowTranslucent ? windowOpacity / 100 : 1);
  }, [windowOpacity, windowTranslucent]);

  useEffect(() => {
    localStorage.setItem('arcreader-always-on-top', String(alwaysOnTop));
    void window.arcDesktop?.setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const desktop = window.arcDesktop;
    if (!desktop) return;
    return desktop.onOpenFile((file) => {
      void loadDocument(file.data, file.name, file.size).then(() => showToast(`已打开 ${file.name}`));
    });
  }, [loadDocument, showToast]);

  const openFilePicker = useCallback(() => {
    const desktop = window.arcDesktop;
    if (!desktop) {
      fileInputRef.current?.click();
      return;
    }
    void desktop.openPdf().then(async (file) => {
      if (!file) return;
      await loadDocument(file.data, file.name, file.size);
      showToast(`已打开 ${file.name}`);
    }).catch((error) => {
      console.error('原生文件对话框打开失败:', error);
      showToast('无法读取所选 PDF 文件');
    });
  }, [loadDocument, showToast]);

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('请选择 PDF 格式文件');
      return;
    }
    const buffer = await file.arrayBuffer();
    await loadDocument(buffer, file.name, file.size);
    showToast(`已打开 ${file.name}`);
  }, [loadDocument, showToast]);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const goToPage = useCallback((page: number, smooth = true) => {
    if (!docRef.current) return;
    const target = clamp(page, 1, docRef.current.numPages);
    setPageNumber(target);
    const element = pageRefs.current[target];
    const viewer = viewerRef.current;
    if (element && viewer) {
      viewer.scrollTo({ top: Math.max(0, element.offsetTop - 28), behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  const goToOutline = useCallback(async (item: PdfOutlineItem) => {
    const document = docRef.current;
    if (!document) return;
    try {
      const destination = typeof item.dest === 'string'
        ? await document.getDestination(item.dest)
        : item.dest;
      if (!Array.isArray(destination) || !destination[0]) {
        if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const reference = destination[0] as number | { num: number; gen: number };
      const pageIndex = typeof reference === 'number'
        ? reference
        : await document.getPageIndex(reference);
      goToPage(pageIndex + 1);
    } catch (error) {
      console.error('目录跳转失败:', error);
      showToast('无法定位此目录条目');
    }
  }, [goToPage, showToast]);

  const changeZoom = useCallback((delta: number) => {
    setFitMode(false);
    setScale((current) => clamp(Math.round((current + delta) * 100) / 100, 0.5, 2.5));
  }, []);

  const fitWidth = useCallback(() => {
    const viewer = viewerRef.current;
    const document = docRef.current;
    if (!viewer || !document) return;
    void document.getPage(1).then((page) => {
      const width = page.getViewport({ scale: 1 }).width;
      const available = viewer.clientWidth - (window.innerWidth < 700 ? 36 : 128);
      setScale(clamp(available / width, 0.5, 2.5));
      setFitMode(true);
    });
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (fitMode) fitWidth();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitMode, fitWidth]);

  const handleScroll = () => {
    if (scrollFrame.current) return;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = null;
      const viewer = viewerRef.current;
      if (!viewer) return;
      const viewerTop = viewer.getBoundingClientRect().top;
      let closestPage = pageNumber;
      let closestDistance = Number.POSITIVE_INFINITY;
      Object.entries(pageRefs.current).forEach(([page, element]) => {
        if (!element) return;
        const distance = Math.abs(element.getBoundingClientRect().top - viewerTop - 28);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = Number(page);
        }
      });
      if (closestPage !== pageNumber) setPageNumber(closestPage);
    });
  };

  const runSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query || !doc) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    const results: SearchResult[] = [];
    try {
      for (let page = 1; page <= doc.numPages; page += 1) {
        const pdfPage = await doc.getPage(page);
        const content = await pdfPage.getTextContent();
        const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ');
        const index = text.toLocaleLowerCase().indexOf(query);
        if (index >= 0) {
          const start = Math.max(0, index - 34);
          const end = Math.min(text.length, index + query.length + 58);
          results.push({
            page,
            snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
          });
        }
        if (results.length >= 60) break;
      }
      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      showToast('当前文档无法提取文字，可能为扫描版 PDF');
    } finally {
      setSearching(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast('当前浏览器不支持全屏模式');
    }
  };

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'o') {
        event.preventDefault();
        openFilePicker();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'f') {
        event.preventDefault();
        setSearchOpen(true);
        setAppearanceOpen(false);
        return;
      }
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (key === 'escape') target.blur();
        return;
      }
      if (key === 'arrowright' || key === 'pagedown') {
        event.preventDefault();
        goToPage(pageNumber + 1);
      } else if (key === 'arrowleft' || key === 'pageup') {
        event.preventDefault();
        goToPage(pageNumber - 1);
      } else if (key === '+' || key === '=') {
        changeZoom(0.1);
      } else if (key === '-') {
        changeZoom(-0.1);
      } else if (key === '0') {
        fitWidth();
      } else if (key === 'n') {
        setNightMode((current) => !current);
      } else if (key === 't') {
        if (window.arcDesktop) setWindowTranslucent((current) => !current);
        else setTransparentMode((current) => !current);
      } else if (key === 'p' && window.arcDesktop) {
        setAlwaysOnTop((current) => !current);
      } else if (key === 'f') {
        setFocusMode((current) => !current);
      } else if (key === 'escape') {
        setAppearanceOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeZoom, fitWidth, goToPage, openFilePicker, pageNumber]);

  const rootStyle = {
    '--paper-opacity': transparentMode ? opacity / 100 : 1,
    '--glass-opacity': transparentMode ? 0.5 + (opacity / 100) * 0.34 : 0.96,
  } as CSSProperties;

  const displayName = fileName.replace(/\.pdf$/i, '');

  return (
    <div
      className={`app ${nightMode ? 'night' : 'day'} ${transparentMode ? 'is-transparent' : ''} ${focusMode ? 'focus-mode' : ''} ${window.arcDesktop ? 'is-desktop' : ''}`}
      style={rootStyle}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-one" />
        <span className="orb orb-two" />
        <span className="orb orb-three" />
        <span className="grid-texture" />
      </div>

      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleFileInput} />

      <header className="topbar">
        <div className="brand-area">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <path d="M8 26.5V14.8C8 9.7 12.2 6 17.4 6v20.5H8Z" fill="currentColor" opacity=".42" />
              <path d="M19.5 26.5V6c5.8.5 9.5 4.2 9.5 9.2v11.3h-9.5Z" fill="currentColor" />
              <path d="M6 29.5h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="brand-copy">
            <strong>ArcReader</strong>
            <span>READ IN YOUR LIGHT</span>
          </div>
          <span className="brand-divider" />
          <button className="open-button" onClick={openFilePicker}>
            <FolderOpen size={16} />
            <span>打开 PDF</span>
          </button>
        </div>

        <div className="document-toolbar">
          <div className="page-controls">
            <button className="icon-button compact" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1} title="上一页">
              <ChevronLeft size={17} />
            </button>
            <div className="page-input-wrap">
              <input
                aria-label="当前页码"
                type="number"
                min={1}
                max={numPages || 1}
                value={pageNumber}
                onChange={(event) => goToPage(Number(event.target.value), false)}
              />
              <span>/ {numPages || '—'}</span>
            </div>
            <button className="icon-button compact" onClick={() => goToPage(pageNumber + 1)} disabled={!numPages || pageNumber >= numPages} title="下一页">
              <ChevronRight size={17} />
            </button>
          </div>
          <span className="toolbar-divider" />
          <div className="zoom-controls">
            <button className="icon-button compact" onClick={() => changeZoom(-0.1)} disabled={scale <= 0.5} title="缩小">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-value">{Math.round(scale * 100)}%</span>
            <button className="icon-button compact" onClick={() => changeZoom(0.1)} disabled={scale >= 2.5} title="放大">
              <ZoomIn size={16} />
            </button>
            <button className={`icon-button compact fit-button ${fitMode ? 'selected' : ''}`} onClick={fitWidth} title="适应宽度（0）">
              <Scan size={16} />
            </button>
          </div>
        </div>

        <div className="top-actions">
          <button
            className={`icon-button ${searchOpen ? 'active' : ''}`}
            onClick={() => { setSearchOpen((current) => !current); setAppearanceOpen(false); }}
            title="搜索文档（Ctrl+F）"
          >
            <Search size={18} />
          </button>
          <button
            className={`icon-button ${(window.arcDesktop ? windowTranslucent : transparentMode) ? 'active-subtle' : ''}`}
            onClick={() => window.arcDesktop
              ? setWindowTranslucent((current) => !current)
              : setTransparentMode((current) => !current)}
            title={window.arcDesktop ? '切换窗口半透明（T）' : '切换页面透明（T）'}
          >
            <Layers3 size={18} />
          </button>
          {window.arcDesktop && (
            <button
              className={`icon-button ${alwaysOnTop ? 'active' : ''}`}
              onClick={() => setAlwaysOnTop((current) => !current)}
              title={alwaysOnTop ? '取消窗口置顶（P）' : '窗口始终置顶（P）'}
            >
              <Pin size={17} />
            </button>
          )}
          <button className={`mode-button ${nightMode ? 'night-active' : ''}`} onClick={() => setNightMode((current) => !current)} title="切换夜间模式（N）">
            {nightMode ? <Moon size={17} /> : <Sun size={17} />}
            <span>{nightMode ? '夜间' : '日间'}</span>
          </button>
          <span className="toolbar-divider action-divider" />
          <button
            className={`icon-button ${appearanceOpen ? 'active' : ''}`}
            onClick={() => { setAppearanceOpen((current) => !current); setSearchOpen(false); }}
            title="阅读外观"
          >
            <SlidersHorizontal size={18} />
          </button>
          {window.arcDesktop && (
            <div className="desktop-window-controls" aria-label="窗口控制">
              <button onClick={() => void window.arcDesktop?.windowControl('minimize')} title="最小化"><Minus size={15} /></button>
              <button onClick={() => void window.arcDesktop?.windowControl('maximize')} title="最大化或还原"><Maximize size={13} /></button>
              <button className="window-close" onClick={() => void window.arcDesktop?.windowControl('close')} title="关闭"><X size={15} /></button>
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        {!focusMode && (
          <aside className={`thumbnail-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            <div className="sidebar-heading">
              {sidebarOpen && <div><span>{sidebarTab === 'pages' ? '文档页面' : '文档目录'}</span><small>{sidebarTab === 'pages' ? `${numPages} PAGES` : `${outline.length} SECTIONS`}</small></div>}
              <button className="icon-button compact" onClick={() => setSidebarOpen((current) => !current)} title={sidebarOpen ? '收起侧栏' : '展开侧栏'}>
                {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
              </button>
            </div>
            {sidebarOpen && (
              <>
                <div className="current-document">
                  <span className="file-icon"><FileText size={17} /></span>
                  <div><strong title={displayName}>{displayName}</strong><span>{formatBytes(fileSize)}</span></div>
                </div>
                <div className="sidebar-tabs">
                  <button className={sidebarTab === 'pages' ? 'active' : ''} onClick={() => setSidebarTab('pages')}><BookOpen size={13} />页面</button>
                  <button className={sidebarTab === 'outline' ? 'active' : ''} onClick={() => setSidebarTab('outline')}><ListTree size={13} />目录</button>
                </div>
                {sidebarTab === 'pages' ? (
                  <div className="thumbnail-list">
                    {doc && Array.from({ length: numPages }, (_, index) => index + 1).map((page) => (
                      <Thumbnail
                        key={`${fileName}-${page}`}
                        doc={doc}
                        pageNumber={page}
                        active={page === pageNumber}
                        nightMode={nightMode}
                        transparentMode={transparentMode}
                        onClick={() => goToPage(page)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="outline-list">
                    {outline.length ? (
                      <OutlineTree items={outline} onSelect={(item) => void goToOutline(item)} />
                    ) : (
                      <div className="outline-empty"><ListTree size={25} /><strong>这份 PDF 没有目录</strong><span>你仍然可以使用页面缩略图浏览</span></div>
                    )}
                  </div>
                )}
                <div className="sidebar-footer">
                  <span className="privacy-dot" />
                  仅在本地阅读，文件不会上传
                </div>
              </>
            )}
          </aside>
        )}

        <section className="reader-area">
          <div className="reader-caption">
            <div className="reader-file-title">
              <span className="reading-indicator" />
              <span>{displayName}</span>
            </div>
            <div className="reader-quick-actions">
              {transparentMode && <span className="mode-chip"><Sparkles size={12} /> 通透 {100 - opacity}%</span>}
              {nightMode && <span className="mode-chip"><Moon size={12} /> 夜间</span>}
              <button className="icon-button compact" onClick={() => setFocusMode((current) => !current)} title={focusMode ? '退出专注模式（F）' : '专注模式（F）'}>
                {focusMode ? <PanelLeftOpen size={16} /> : <BookOpen size={16} />}
              </button>
              <button className="icon-button compact" onClick={toggleFullscreen} title="全屏阅读">
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>

          <main ref={viewerRef} className="pdf-viewer" onScroll={handleScroll}>
            {loading && (
              <div className="loading-state">
                <span className="loading-logo"><LoaderCircle size={28} /></span>
                <strong>正在展开文档</strong>
                <span>为每一次专注阅读做准备</span>
              </div>
            )}
            {!loading && !doc && (
              <div className="empty-state">
                <span className="empty-icon"><FileText size={32} /></span>
                <h2>打开一本值得专注的 PDF</h2>
                <p>拖入文件，或从电脑中选择。所有阅读都在本地完成。</p>
                <div><button className="primary-button" onClick={openFilePicker}><FolderOpen size={17} /> 选择 PDF</button><button className="secondary-button" onClick={loadSample}>打开示例</button></div>
              </div>
            )}
            {!loading && doc && (
              <div className="pages-column">
                {Array.from({ length: numPages }, (_, index) => index + 1).map((page) => (
                  <PdfPage
                    key={`${fileName}-${page}`}
                    ref={(element) => { pageRefs.current[page] = element; }}
                    doc={doc}
                    pageNumber={page}
                    scale={scale}
                    nightMode={nightMode}
                    transparentMode={transparentMode}
                  />
                ))}
                <div className="end-of-document"><span /> 已读到文档末尾 <span /></div>
              </div>
            )}
          </main>
        </section>

        {searchOpen && (
          <aside className="search-panel floating-panel">
            <div className="panel-heading">
              <div><Search size={17} /><strong>文档内搜索</strong></div>
              <button className="icon-button compact" onClick={() => setSearchOpen(false)}><X size={17} /></button>
            </div>
            <form className="search-form" onSubmit={runSearch}>
              <Search size={16} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setHasSearched(false); }}
                placeholder="输入关键词…"
              />
              {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); }}><X size={14} /></button>}
            </form>
            <button className="search-submit" onClick={() => void runSearch()} disabled={searching || !searchQuery.trim()}>
              {searching ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />}
              {searching ? '正在搜索…' : '搜索全文'}
            </button>
            <div className="search-summary">
              {hasSearched && !searching && (searchResults.length ? `找到 ${searchResults.length} 个相关页面` : '未找到匹配内容')}
            </div>
            <div className="search-results">
              {searchResults.map((result, index) => (
                <button key={`${result.page}-${index}`} className="search-result" onClick={() => goToPage(result.page)}>
                  <span className="result-page">第 {result.page} 页</span>
                  <span>{result.snippet}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
              {!hasSearched && (
                <div className="search-hint">
                  <Keyboard size={22} />
                  <p>搜索当前 PDF 中的文字内容</p>
                  <span>扫描版 PDF 需要先进行 OCR 识别</span>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {appearanceOpen && (
        <aside className="appearance-panel floating-panel">
          <div className="panel-heading">
            <div><SlidersHorizontal size={17} /><strong>阅读外观</strong></div>
            <button className="icon-button compact" onClick={() => setAppearanceOpen(false)}><X size={17} /></button>
          </div>
          <div className="appearance-section">
            <label>色彩模式</label>
            <div className="theme-options">
              <button className={!nightMode ? 'selected' : ''} onClick={() => setNightMode(false)}>
                <span className="theme-preview day-preview"><Sun size={18} /></span>
                <span>日间</span>{!nightMode && <Check size={14} />}
              </button>
              <button className={nightMode ? 'selected' : ''} onClick={() => setNightMode(true)}>
                <span className="theme-preview night-preview"><Moon size={18} /></span>
                <span>夜间</span>{nightMode && <Check size={14} />}
              </button>
            </div>
          </div>
          <div className="appearance-section transparency-section">
            <div className="setting-row">
              <div><strong>页面背景透明</strong><span>仅调整 PDF 纸张与界面背景</span></div>
              <button className={`switch ${transparentMode ? 'on' : ''}`} onClick={() => setTransparentMode((current) => !current)} role="switch" aria-checked={transparentMode}><span /></button>
            </div>
            <div className={`opacity-control ${!transparentMode ? 'disabled' : ''}`}>
              <div className="slider-label"><span>背景不透明度</span><strong>{transparentMode ? opacity : 100}%</strong></div>
              <input
                type="range"
                min="0"
                max="100"
                value={transparentMode ? opacity : 100}
                disabled={!transparentMode}
                onChange={(event) => setOpacity(Number(event.target.value))}
                style={{ '--range-progress': `${transparentMode ? opacity : 100}%` } as CSSProperties}
              />
              <div className="preset-row">
                <button className={transparentMode && opacity === 25 ? 'selected' : ''} onClick={() => { setTransparentMode(true); setOpacity(25); }}>悬浮</button>
                <button className={transparentMode && opacity === 76 ? 'selected' : ''} onClick={() => { setTransparentMode(true); setOpacity(76); }}>柔和</button>
                <button className={!transparentMode || opacity === 100 ? 'selected' : ''} onClick={() => { setTransparentMode(true); setOpacity(100); }}>纸张</button>
              </div>
            </div>
          </div>
          {window.arcDesktop && (
            <div className="appearance-section window-settings">
              <div className="setting-row">
                <div><strong>窗口半透明</strong><span>让整个阅读器窗口透出桌面</span></div>
                <button className={`switch ${windowTranslucent ? 'on' : ''}`} onClick={() => setWindowTranslucent((current) => !current)} role="switch" aria-checked={windowTranslucent}><span /></button>
              </div>
              <div className={`opacity-control ${!windowTranslucent ? 'disabled' : ''}`}>
                <div className="slider-label"><span>窗口不透明度</span><strong>{windowTranslucent ? windowOpacity : 100}%</strong></div>
                <input
                  type="range"
                  min="35"
                  max="100"
                  value={windowTranslucent ? windowOpacity : 100}
                  disabled={!windowTranslucent}
                  onChange={(event) => setWindowOpacity(Number(event.target.value))}
                  style={{ '--range-progress': `${windowTranslucent ? ((windowOpacity - 35) / 65) * 100 : 100}%` } as CSSProperties}
                />
              </div>
              <div className="setting-row always-top-setting">
                <div><strong>始终置顶</strong><span>保持在其他 Windows 窗口上方</span></div>
                <button className={`switch ${alwaysOnTop ? 'on' : ''}`} onClick={() => setAlwaysOnTop((current) => !current)} role="switch" aria-checked={alwaysOnTop}><span /></button>
              </div>
            </div>
          )}
          <div className="appearance-section focus-setting">
            <div className="setting-row">
              <div><strong>专注模式</strong><span>隐藏缩略图与辅助信息</span></div>
              <button className={`switch ${focusMode ? 'on' : ''}`} onClick={() => setFocusMode((current) => !current)} role="switch" aria-checked={focusMode}><span /></button>
            </div>
          </div>
          <div className="shortcut-note"><Keyboard size={15} /><span><kbd>N</kbd> 夜间　<kbd>T</kbd> 透明　{window.arcDesktop && <><kbd>P</kbd> 置顶　</>}<kbd>F</kbd> 专注</span></div>
        </aside>
      )}

      <footer className="statusbar">
        <div><span className={`status-dot ${loading ? 'busy' : ''}`} />{loading ? '正在加载' : '阅读就绪'}<span className="status-separator">·</span><span>PDF.js 本地渲染</span></div>
        <div className="status-center"><kbd>←</kbd><kbd>→</kbd> 翻页 <span className="status-separator">·</span> <kbd>+</kbd><kbd>−</kbd> 缩放</div>
        <div><span>第 {pageNumber} / {numPages || '—'} 页</span><span className="status-separator">·</span><span>{Math.round(scale * 100)}%</span></div>
      </footer>

      {dragging && (
        <div className="drop-overlay">
          <div><FolderOpen size={34} /><strong>松开即可开始阅读</strong><span>支持 PDF 格式文件</span></div>
        </div>
      )}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}
