import React, { useEffect, useState } from 'react';
import { Flame, RotateCw, ExternalLink, MousePointerClick } from 'lucide-react';

export const SidePanel = () => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const domScraper = () => {
    // 1. 用户手动划词 (优先级绝对第一)
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 0) {
      return { title: selection, company: "", isSelection: true };
    }

    const getText = (selector: string) => {
      const el = document.querySelector(selector);
      // 有些网站标题里会混入 <span class="visually-hidden">，只取可见文本稍微复杂点
      // 这里用简单版：直接取 textContent
      return el?.textContent?.trim() || null;
    };
    
    // 2. 自动抓取策略 (✨✨✨ 关键修改：调整了优先级顺序 ✨✨✨)
    // 越具体的 CSS Class 放越前面，通用的 h1 放最后
    const titleSelectors = [
      // --- Indeed 专区 (必须放最前面！) ---
      '[data-testid="jobsearch-JobInfoHeader-title"]', // Indeed 新版最稳的 ID
      '.jobsearch-JobInfoHeader-title',                // Indeed 通用类名
      
      // --- LinkedIn 专区 ---
      '.job-details-jobs-unified-top-card__job-title', // LinkedIn 详情页
      '.jobs-unified-top-card__job-title',             // LinkedIn 列表页
      
      // --- 通用/模糊匹配 ---
      '[class*="job-title"]',
      '[class*="JobTitle"]',
      
      // --- 最后的兜底 (一定要放最后！) ---
      'h1' 
    ];

    const companySelectors = [
      // --- Indeed 专区 ---
      '[data-testid="inlineHeader-companyName"]',      // Indeed 新版
      '[data-company-name="true"]',
      '.jobsearch-CompanyInfoContainer a',
      
      // --- LinkedIn 专区 ---
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      
      // --- 通用 ---
      '[class*="company-name"]',
      'a[href*="/company/"]'
    ];

    let foundTitle = null;
    for (const s of titleSelectors) {
      foundTitle = getText(s);
      if (foundTitle) break; // 一旦找到专用的，马上停止，防止被后面的 h1 覆盖
    }

    let foundCompany = null;
    for (const s of companySelectors) {
      foundCompany = getText(s);
      if (foundCompany) break;
    }

    return {
      title: foundTitle,
      company: foundCompany,
      isSelection: false
    };
  };

  const fetchTabInfo = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.id) {
      setUrl(tab.url || '');

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true }, 
          func: domScraper,
        });

        // 结果筛选逻辑
        let bestResult = null;
        const selectionResult = results.find(r => r.result?.isSelection);
        
        if (selectionResult) {
          bestResult = selectionResult.result;
        } else {
          // 过滤掉无效标题
          const validResults = results
            .map(r => r.result)
            .filter(r => {
              if (!r || !r.title) return false;
              const t = r.title.toLowerCase();
              // ✨ 增强过滤：如果抓到的标题看起来像搜索词，就扔掉
              const junkWords = ['linkedin', 'indeed', 'top job picks', 'jobs, employment', 'search'];
              if (junkWords.some(w => t.includes(w)) && t.length < 50) return false;
              return true;
            });
          
          if (validResults.length > 0) bestResult = validResults[0];
        }

        if (bestResult) {
          let finalTitle = bestResult.title;
          if (!bestResult.isSelection && finalTitle) {
             // 清洗 Indeed 标题中可能出现的 " - job post" 等后缀
             finalTitle = finalTitle.split(' - ')[0]; 
          }
          if (finalTitle) setTitle(finalTitle);

          if (bestResult.company) {
            setCompany(bestResult.company);
          } else {
             try {
               const domain = new URL(tab.url || '').hostname;
               const companyName = domain.replace('www.', '').split('.')[0];
               if (!['linkedin', 'indeed'].includes(companyName)) {
                 setCompany(companyName.charAt(0).toUpperCase() + companyName.slice(1));
               }
             } catch (e) {}
          }
        } else {
          // 最后的兜底
          if (!title) setTitle(tab.title?.split(' | ')[0] || '');
        }

      } catch (err) {
        console.error("Scraper failed:", err);
      }
    }
  };

  useEffect(() => {
    // 1. 初始化时先抓一次
    fetchTabInfo();

    // 2. 监听：当你在当前标签页内跳转 (比如在 LinkedIn 点了下一个职位)
    const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // 只有当 URL 变了，或者页面加载状态变成 'complete' 时才触发
      if (changeInfo.url || changeInfo.status === 'complete') {
        // 确认一下是当前窗口的当前标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id === tabId) {
            // ⚠️ 关键点：LinkedIn 是单页应用 (SPA)，URL 变了之后 DOM 可能还没渲染完。
            // 所以我们稍微等 1 秒再抓，保证抓到新的 H1
            setTimeout(() => {
              fetchTabInfo();
            }, 1000); 
          }
        });
      }
    };

    // 3. 监听：当你从别的标签页切回来 (比如从 Google 切回 LinkedIn)
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      // 切回来的时候，不需要延迟，直接抓
      fetchTabInfo();
    };

    // 注册监听器
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    // 清理函数：组件卸载时移除监听，防止内存泄漏
    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
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
          ⚡️ EzApply
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
            <b>Tip:</b> If auto-capture fails, <b>highlight the text</b> on page & click refresh 🔄.
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
}
