import React, { useEffect, useState } from 'react';
import { Flame, RotateCw, ExternalLink, MousePointerClick } from 'lucide-react';

export const SidePanel = () => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // 🕵️‍♂️ 间谍函数 (保持不变，因为逻辑本身没问题)
  const domScraper = () => {
    // 1. 优先检查用户是否高亮了文字
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 0) {
      return {
        title: selection,
        company: "",
        isSelection: true // 标记：这是用户手动选的，优先级最高！
      };
    }

    // 2. 自动抓取策略
    const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() || null;
    
    // 尝试抓取 H1 或特定 Class
    const titleSelectors = [
      'h1', 
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '[class*="job-title"]'
    ];

    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      '[class*="company-name"]',
      'a[href*="/company/"]'
    ];

    let foundTitle = null;
    for (const s of titleSelectors) {
      foundTitle = getText(s);
      if (foundTitle) break;
    }

    let foundCompany = null;
    for (const s of companySelectors) {
      foundCompany = getText(s);
      if (foundCompany) break;
    }

    return {
      title: foundTitle, // 这里不返回 document.title，防止内层 frame 返回空标题干扰
      company: foundCompany,
      isSelection: false
    };
  };

  const fetchTabInfo = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.id) {
      setUrl(tab.url || '');

      try {
        // ✨✨✨ 关键修改：开启全图透视 (allFrames: true) ✨✨✨
        // 这会让脚本在页面里的每一个“小房间”里都跑一遍
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true }, 
          func: domScraper,
        });

        // 🕵️‍♂️ 结果筛选逻辑：从所有房间的报告里，找出最有用的那个
        let bestResult = null;

        // 🥇 第一名：如果有个房间说“用户刚才在我这里选中了文字”，那就它了！
        const selectionResult = results.find(r => r.result?.isSelection);
        
        if (selectionResult) {
          bestResult = selectionResult.result;
        } else {
          // 🥈 第二名：没人选中，那就找哪个房间抓到了像样的 Job Title
          // 过滤掉 null 和空标题
          const validResults = results
            .map(r => r.result)
            .filter(r => r && r.title && r.title !== 'LinkedIn' && !r.title.includes('Top job picks'));
          
          if (validResults.length > 0) {
            // 通常 H1 最准，取第一个找到有效标题的结果
            bestResult = validResults[0];
          }
        }

        // 应用结果
        if (bestResult) {
          // 标题处理
          let finalTitle = bestResult.title;
          if (!bestResult.isSelection && finalTitle) {
             // 如果是自动抓的，简单清洗一下
             finalTitle = finalTitle.split(' | ')[0].replace('Top job picks for you', '');
          }
          if (finalTitle) setTitle(finalTitle);

          // 公司名处理
          if (bestResult.company) {
            setCompany(bestResult.company);
          } else {
             // 兜底：如果没抓到公司，尝试用 URL 猜
             try {
               const domain = new URL(tab.url || '').hostname;
               const companyName = domain.replace('www.', '').split('.')[0];
               if (companyName !== 'linkedin' && !company) {
                 setCompany(companyName.charAt(0).toUpperCase() + companyName.slice(1));
               }
             } catch (e) {}
          }
        } else {
          // 🥉 实在没办法了，用浏览器顶部的 Tab Title 兜底
          if (!title) setTitle(tab.title?.split(' | ')[0] || '');
        }

      } catch (err) {
        console.error("Scraper failed:", err);
      }
    }
  };

  useEffect(() => {
    fetchTabInfo();
  }, []);

  const handleSave = () => {
    if (!title) {
      alert("Please enter a Job Title!");
      return;
    }

    const newJob = {
      id: crypto.randomUUID(),
      title,
      company,
      url,
      note,
      priority,
      status: 'inbox',
      createdAt: Date.now(),
    };

    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || [];
      // @ts-ignore
      const updatedJobs = [newJob, ...jobs];
      chrome.storage.local.set({ jobs: updatedJobs }, () => {
        setStatus('saved');
        setTimeout(() => {
          setStatus('idle');
          setNote('');
          setPriority(false);
        }, 1500);
      });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🧠 Job Saver
        </h1>
        <button 
          onClick={fetchTabInfo} 
          className="p-2 bg-white rounded-full shadow-sm hover:bg-blue-50 text-slate-500 transition-all active:scale-90"
          title="Retry Capture"
        >
          <RotateCw size={18} />
        </button>
      </div>

      {!title && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex gap-2 items-start">
          <MousePointerClick size={14} className="mt-0.5 shrink-0" />
          <span>
            <b>Tip:</b> If auto-capture fails, <b>highlight the text</b> and click refresh 🔄.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 flex-1">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
          <input 
            className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all ${
              !title ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
            }`}
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Product Designer"
            autoFocus={!title} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</label>
          <input 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm transition-all"
            value={company} 
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Spotify" 
          />
        </div>

        <div 
          onClick={() => setPriority(!priority)}
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all select-none ${
            priority 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${priority ? 'bg-orange-100' : 'bg-slate-100'}`}>
            <Flame size={20} className={priority ? 'text-orange-500 fill-orange-500' : 'text-slate-400'} />
          </div>
          <span className={`font-medium ${priority ? 'text-orange-700' : 'text-slate-600'}`}>
            High Priority?
          </span>
          <div className={`ml-auto w-5 h-5 rounded-full border flex items-center justify-center ${
            priority ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
          }`}>
            {priority && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
          <textarea 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm h-24 resize-none transition-all"
            placeholder="Salary, deadlines, or tech stack..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={status === 'saved'}
          className={`mt-2 w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
            status === 'saved' 
              ? 'bg-green-500 shadow-green-200' 
              : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
          }`}
        >
          {status === 'saved' ? (
            <>✅ Saved to Inbox</>
          ) : (
            <>Save Job</>
          )}
        </button>

        <a 
          href="dashboard.html" 
          target="_blank" 
          className="mt-auto text-center py-4 text-sm text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors"
        >
          Open Board <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};
