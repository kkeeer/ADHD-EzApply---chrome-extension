import { useDraggable } from '@dnd-kit/core';
import { Flame, ExternalLink } from 'lucide-react';
import { Job } from '../utils/storage';

interface JobCardProps {
  job: Job;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function JobCard({ job }: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleOpenLink = (e: React.MouseEvent) => {
    // 这里的 stopPropagation 防止点击事件冒泡
    e.stopPropagation();
    if (job.url) {
      chrome.tabs.create({ url: job.url });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-800 text-lg flex-1">{job.title}</h3>
        {job.priority && (
          <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
        )}
      </div>
      
      <p className="text-slate-600 text-sm mb-3">{job.company}</p>
      
      {job.notes && (
        <p className="text-slate-500 text-xs mb-3 line-clamp-2">{job.notes}</p>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">{formatTimeAgo(job.createdAt)}</span>
        {job.url && (
          <button
            onClick={handleOpenLink}
            // 👇👇👇 核心修复：阻止按下鼠标时的事件传播，防止触发拖拽
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            // 👆👆👆 
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-blue-500"
            title="Open original URL"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}




