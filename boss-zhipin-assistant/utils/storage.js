/**
 * 数据存储模块
 */

class StorageManager {
  constructor() {
    this.prefix = 'boss_assistant_';
  }

  // 保存候选人数据
  async saveCandidate(candidateId, data) {
    const key = `${this.prefix}candidate_${candidateId}`;
    try {
      await chrome.storage.local.set({ [key]: {
        ...data,
        savedAt: Date.now()
      }});
      return true;
    } catch (error) {
      console.error('保存候选人数据失败:', error);
      return false;
    }
  }

  // 获取候选人数据
  async getCandidate(candidateId) {
    const key = `${this.prefix}candidate_${candidateId}`;
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('获取候选人数据失败:', error);
      return null;
    }
  }

  // 保存分析结果
  async saveAnalysis(candidateId, analysis) {
    const candidate = await this.getCandidate(candidateId) || {};
    candidate.analysis = {
      ...analysis,
      analyzedAt: Date.now()
    };
    return await this.saveCandidate(candidateId, candidate);
  }

  // 获取所有候选人
  async getAllCandidates() {
    try {
      const all = await chrome.storage.local.get(null);
      const candidates = [];
      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith(`${this.prefix}candidate_`)) {
          candidates.push(value);
        }
      }
      return candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    } catch (error) {
      console.error('获取候选人列表失败:', error);
      return [];
    }
  }

  // 保存操作日志
  async logAction(action, data) {
    const logKey = `${this.prefix}log_${Date.now()}`;
    try {
      await chrome.storage.local.set({ [logKey]: {
        action,
        data,
        timestamp: Date.now()
      }});

      // 清理30天前的日志
      await this.cleanOldLogs(30);
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }

  // 清理旧日志
  async cleanOldLogs(days = 30) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    try {
      const all = await chrome.storage.local.get(null);
      const toRemove = [];

      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith(`${this.prefix}log_`) && value.timestamp < cutoff) {
          toRemove.push(key);
        }
      }

      if (toRemove.length > 0) {
        await chrome.storage.local.remove(toRemove);
        console.log(`清理了 ${toRemove.length} 条旧日志`);
      }
    } catch (error) {
      console.error('清理日志失败:', error);
    }
  }

  // 统计数据
  async getStats() {
    try {
      const all = await chrome.storage.local.get(null);
      let totalCandidates = 0;
      let analyzedCount = 0;
      let highMatchCount = 0;

      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith(`${this.prefix}candidate_`)) {
          totalCandidates++;
          if (value.analysis) {
            analyzedCount++;
            if (value.analysis.matchScore >= 80) {
              highMatchCount++;
            }
          }
        }
      }

      return {
        totalCandidates,
        analyzedCount,
        highMatchCount,
        matchRate: analyzedCount > 0 ? (highMatchCount / analyzedCount * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return {
        totalCandidates: 0,
        analyzedCount: 0,
        highMatchCount: 0,
        matchRate: 0
      };
    }
  }

  // 清空所有数据
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      console.log('已清空所有数据');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.storageManager = new StorageManager();
}
