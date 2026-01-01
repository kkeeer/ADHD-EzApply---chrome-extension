import { useDraggable } from '@dnd-kit/core';
import { Flame, ExternalLink, Trash2 } from 'lucide-react';
import { Job } from '../utils/storage';

interface JobCardProps {
  job: Job;
  onDelete?: (id: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.url) chrome.tabs.create({ url: job.url });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this job permanently?')) {
      onDelete?.(job.id);
    }
  };

  // ✨✨✨ 关键修改：万能兼容获取 Note ✨✨✨
  // 1. 优先取 job.note (新数据)
  // 2. 如果没有，取 job.notes (旧数据，如果有的话)
  // 3. 强行转换类型 (as any) 避免 TypeScript 报错
  const displayNote = job.note || (job as any).notes;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="font-semibold text-slate-800 leading-tight flex-1">{job.title}</h3>
        {job.priority && (
          <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" />
        )}
      </div>
      
      <p className="text-slate-600 text-sm mb-2">{job.company}</p>
      
      {/* ✨✨✨ 这里只要 displayNote 有值，就一定会渲染！ ✨✨✨ */}
      {displayNote && (
        <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-100">
          <p className="text-slate-500 text-xs line-clamp-3 italic">
            {displayNote}
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
        <span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(job.createdAt)}</span>
        
        <div className="flex gap-1">
          {onDelete && (
            <button
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {job.url && (
            <button
              onClick={handleOpenLink}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
              title="Open URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




