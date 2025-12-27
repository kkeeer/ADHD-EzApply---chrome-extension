import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { Trash2, AlertCircle } from 'lucide-react'; // ✨ 新增 Alert 图标
import confetti from 'canvas-confetti';
import { KanbanColumn } from './KanbanColumn';
import { JobCard } from './JobCard';
import { useJobs } from '../hooks/useJobs';
import { Job } from '../utils/storage';

function triggerConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: NodeJS.Timeout = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

function showToast(message: string, type: 'success' | 'comfort' = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-semibold text-white shadow-lg ${
    type === 'success' ? 'bg-green-500' : 'bg-blue-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

export function Dashboard() {
  const { jobs, loading, moveJob } = useJobs();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortByNewest = (a: Job, b: Job) => (b.createdAt || 0) - (a.createdAt || 0);

  // 1. 获取所有 Inbox 岗位
  const allInboxJobs = jobs.filter((j) => j.status === 'inbox').sort(sortByNewest);
  // ✨ 核心修改：Inbox 限制显示前 15 个 (Focus Limit)
  const visibleInboxJobs = allInboxJobs.slice(0, 15);
  const hiddenInboxCount = allInboxJobs.length - visibleInboxJobs.length;

  const appliedJobs = jobs.filter((j) => j.status === 'applied').sort(sortByNewest);
  
  const allArchiveJobs = jobs.filter((j) => j.status === 'archive').sort(sortByNewest);
  const visibleArchiveJobs = allArchiveJobs.slice(0, 20);
  const hiddenArchiveCount = allArchiveJobs.length - visibleArchiveJobs.length;

  const handleClearArchive = () => {
    if (confirm('Are you sure you want to delete ALL archived jobs? This cannot be undone.')) {
      const activeJobs = jobs.filter(j => j.status !== 'archive');
      chrome.storage.local.set({ jobs: activeJobs }, () => {
        showToast('Archive cleared!', 'comfort');
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const jobId = active.id as string;
    const newStatus = over.id as Job['status'];

    const currentJob = jobs.find((j) => j.id === jobId);
    if (!currentJob) return;

    if (currentJob.status === 'inbox' && newStatus === 'applied') {
      triggerConfetti();
      showToast('Great job! 🎉', 'success');
    }

    if (currentJob.status === 'applied' && newStatus === 'archive') {
      showToast('Next one will be better! 💪', 'comfort');
    }

    await moveJob(jobId, newStatus);
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800">Job Applications</h1>
          
          {allArchiveJobs.length > 0 && (
            <button 
              onClick={handleClearArchive}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete all archived jobs"
            >
              <Trash2 size={16} />
              <span>Clear Archive ({allArchiveJobs.length})</span>
            </button>
          )}
        </div>
        
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 items-start h-full">
            
            {/* 🟡 INBOX COLUMN */}
            <div className="flex flex-col gap-2 flex-1 min-w-[320px]">
              <KanbanColumn
                id="inbox"
                title={`Inbox (${allInboxJobs.length})`}
                jobs={visibleInboxJobs} // 只传前15个
                color="text-yellow-700"
                bgColor="bg-yellow-50"
              />
              {/* ✨ Inbox 压力提示：告诉用户去处理 */}
              {hiddenInboxCount > 0 && (
                <div className="flex items-center gap-2 justify-center p-3 bg-yellow-100 rounded-xl text-yellow-700 text-xs font-medium animate-pulse">
                  <AlertCircle size={14} />
                  <span>{hiddenInboxCount} older jobs hidden. Move some to Applied!</span>
                </div>
              )}
            </div>

            {/* 🔵 APPLIED COLUMN */}
            <KanbanColumn
              id="applied"
              title={`Applied (${appliedJobs.length})`}
              jobs={appliedJobs}
              color="text-blue-700"
              bgColor="bg-blue-50"
            />

            {/* ⚪️ ARCHIVE COLUMN */}
            <div className="flex flex-col gap-2 flex-1 min-w-[320px]">
              <KanbanColumn
                id="archive"
                title="Archive"
                jobs={visibleArchiveJobs}
                color="text-slate-700"
                bgColor="bg-slate-100"
              />
              {hiddenArchiveCount > 0 && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  {hiddenArchiveCount} older jobs hidden
                </p>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <JobCard job={jobs.find((j) => j.id === activeId)!} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}


