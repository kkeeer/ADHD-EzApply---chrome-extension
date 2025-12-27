export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  notes: string;
  priority: boolean;
  status: 'inbox' | 'applied' | 'archive';
  createdAt: number;
}

const STORAGE_KEY = 'jobs';

export async function getJobs(): Promise<Job[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

export async function saveJob(job: Omit<Job, 'id' | 'createdAt' | 'status'>): Promise<void> {
  const jobs = await getJobs();
  const newJob: Job = {
    ...job,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    createdAt: Date.now(),
    status: 'inbox',
  };
  jobs.push(newJob);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: jobs }, () => {
      resolve();
    });
  });
}

export async function updateJobStatus(jobId: string, status: Job['status']): Promise<void> {
  const jobs = await getJobs();
  const updatedJobs = jobs.map((job) =>
    job.id === jobId ? { ...job, status } : job
  );
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: updatedJobs }, () => {
      resolve();
    });
  });
}

export async function deleteJob(jobId: string): Promise<void> {
  const jobs = await getJobs();
  const filteredJobs = jobs.filter((job) => job.id !== jobId);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: filteredJobs }, () => {
      resolve();
    });
  });
}




