import { useDroppable } from '@dnd-kit/core';
import { JobCard } from './JobCard';
import { Job } from '../utils/storage';

interface KanbanColumnProps {
  id: string;
  title: string;
  jobs: Job[];
  color: string;
  bgColor: string;
}

export function KanbanColumn({ id, title, jobs, color, bgColor }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 rounded-xl p-4 min-h-[600px] transition-colors ${
        isOver ? `${bgColor} opacity-80` : bgColor
      }`}
    >
      <h2 className={`text-xl font-bold mb-4 ${color}`}>{title}</h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
        {jobs.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No jobs here yet
          </div>
        )}
      </div>
    </div>
  );
}




