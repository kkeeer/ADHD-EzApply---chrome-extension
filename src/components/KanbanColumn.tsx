import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JobCard } from './JobCard';
import { Job } from '../utils/storage';

interface KanbanColumnProps {
  id: string;
  title: string;
  jobs: Job[];
  color: string;
  bgColor: string;
  onDeleteJob?: (id: string) => void; // ✨ 接收删除函数
}

export function KanbanColumn({ id, title, jobs, color, bgColor, onDeleteJob }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl">
      <div className={`p-4 rounded-t-2xl border-b border-slate-100/50 flex justify-between items-center ${bgColor}`}>
        <h2 className={`font-bold ${color}`}>{title}</h2>
      </div>
      
      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto min-h-[150px]">
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onDelete={onDeleteJob} // ✨ 传递给卡片
              />
            ))}
            {jobs.length === 0 && (
              <div className="h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}




