export interface DesktopPdfPayload {
  name: string;
  path: string;
  size: number;
  data: ArrayBuffer;
}

export interface ArcDesktopApi {
  isDesktop: true;
  platform: string;
  openPdf: () => Promise<DesktopPdfPayload | null>;
  getInitialFile: () => Promise<DesktopPdfPayload | null>;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => Promise<void>;
  setWindowOpacity: (opacity: number) => Promise<number>;
  setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
  onOpenFile: (callback: (payload: DesktopPdfPayload) => void) => () => void;
}

declare global {
  interface Window {
    arcDesktop?: ArcDesktopApi;
  }
}
