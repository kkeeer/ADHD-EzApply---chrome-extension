import { useState, useEffect } from 'react';
import { Job, getJobs, updateJobStatus } from '../utils/storage';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
    
    // Listen for storage changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.jobs) {
        setJobs(changes.jobs.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const loadJobs = async () => {
    const loadedJobs = await getJobs();
    setJobs(loadedJobs);
    setLoading(false);
  };

  const moveJob = async (jobId: string, newStatus: Job['status']) => {
    await updateJobStatus(jobId, newStatus);
    await loadJobs();
  };

  return { jobs, loading, moveJob, refresh: loadJobs };
}




