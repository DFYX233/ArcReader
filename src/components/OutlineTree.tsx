import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface PdfOutlineItem {
  title: string;
  dest: string | unknown[] | null;
  url?: string | null;
  items?: PdfOutlineItem[];
}

interface OutlineTreeProps {
  items: PdfOutlineItem[];
  onSelect: (item: PdfOutlineItem) => void;
}

export default function OutlineTree({ items, onSelect }: OutlineTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderItems = (nodes: PdfOutlineItem[], level: number, parentKey: string) => (
    <div className="outline-level">
      {nodes.map((item, index) => {
        const key = `${parentKey}-${index}`;
        const children = item.items || [];
        const isCollapsed = collapsed.has(key);
        return (
          <div key={key}>
            <div className={`outline-row ${level === 0 ? 'outline-root' : ''}`} style={{ paddingLeft: `${7 + level * 14}px` }}>
              {children.length ? (
                <button className="outline-expander" onClick={() => toggle(key)} aria-label={isCollapsed ? '展开目录' : '收起目录'}>
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </button>
              ) : <span className="outline-expander-placeholder" />}
              <button className="outline-title" onClick={() => onSelect(item)} title={item.title}>
                {item.title || '未命名条目'}
              </button>
            </div>
            {children.length > 0 && !isCollapsed && renderItems(children, level + 1, key)}
          </div>
        );
      })}
    </div>
  );

  return <div className="outline-tree">{renderItems(items, 0, 'outline')}</div>;
}
