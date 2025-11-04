/**
 * API速率限制器 - 防止触发429错误
 *
 * Gemini API免费版限制：
 * - 每分钟：15次请求 (RPM - Requests Per Minute)
 * - 每天：1500次请求 (RPD - Requests Per Day)
 */

class RateLimiter {
  constructor() {
    this.requests = []; // 请求时间戳记录
    this.maxRequestsPerMinute = 12; // 设为12次（低于15次限制，留安全余量）
    this.maxRequestsPerDay = 1400; // 设为1400次（低于1500次限制）
    this.minInterval = 5000; // 最小请求间隔：5秒
    this.lastRequestTime = 0;
    this.queue = []; // 请求队列
    this.processing = false;
  }

  /**
   * 检查是否可以发送请求
   */
  canMakeRequest() {
    const now = Date.now();

    // 清理1分钟前的记录
    this.requests = this.requests.filter(time => now - time < 60000);

    // 检查每分钟限制
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      return { allowed: false, reason: 'rpm', waitTime };
    }

    // 检查最小间隔
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      return { allowed: false, reason: 'interval', waitTime };
    }

    // 检查每天限制（简单统计）
    const todayRequests = this.requests.filter(time =>
      now - time < 24 * 60 * 60 * 1000
    );
    if (todayRequests.length >= this.maxRequestsPerDay) {
      return { allowed: false, reason: 'daily', waitTime: null };
    }

    return { allowed: true };
  }

  /**
   * 记录请求
   */
  recordRequest() {
    const now = Date.now();
    this.requests.push(now);
    this.lastRequestTime = now;

    // 保存到存储（用于跨会话统计）
    this.saveStats();
  }

  /**
   * 等待直到可以发送请求
   */
  async waitForSlot() {
    const check = this.canMakeRequest();

    if (check.allowed) {
      return true;
    }

    // 计算等待时间
    let waitTime = check.waitTime;

    if (check.reason === 'daily') {
      console.warn('⚠️ 已达到API每日配额限制，请明天再试');
      throw new Error('API每日配额已用完，请24小时后再试');
    }

    if (check.reason === 'rpm') {
      console.log(`⏳ 达到每分钟请求限制，等待 ${Math.ceil(waitTime/1000)} 秒...`);
    } else if (check.reason === 'interval') {
      console.log(`⏳ 请求间隔保护，等待 ${Math.ceil(waitTime/1000)} 秒...`);
    }

    // 等待
    await new Promise(resolve => setTimeout(resolve, waitTime + 100));

    // 递归检查
    return this.waitForSlot();
  }

  /**
   * 添加请求到队列
   */
  async enqueue(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: requestFn,
        priority,
        resolve,
        reject
      });

      // 按优先级排序（高优先级在前）
      this.queue.sort((a, b) => b.priority - a.priority);

      // 开始处理队列
      this.processQueue();
    });
  }

  /**
   * 处理队列
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      try {
        // 等待速率限制
        await this.waitForSlot();

        // 记录请求
        this.recordRequest();

        // 执行请求
        const result = await item.fn();
        item.resolve(result);

      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * 保存统计数据
   */
  async saveStats() {
    try {
      await chrome.storage.local.set({
        rateLimiterStats: {
          requests: this.requests,
          lastRequestTime: this.lastRequestTime,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('保存速率限制统计失败:', error);
    }
  }

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const result = await chrome.storage.local.get('rateLimiterStats');
      if (result.rateLimiterStats) {
        const stats = result.rateLimiterStats;
        const age = Date.now() - stats.timestamp;

        // 只加载最近24小时内的数据
        if (age < 24 * 60 * 60 * 1000) {
          this.requests = stats.requests || [];
          this.lastRequestTime = stats.lastRequestTime || 0;
        }
      }
    } catch (error) {
      console.error('加载速率限制统计失败:', error);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = Date.now();

    // 最近1分钟
    const lastMinute = this.requests.filter(time => now - time < 60000).length;

    // 最近1小时
    const lastHour = this.requests.filter(time => now - time < 3600000).length;

    // 最近24小时
    const lastDay = this.requests.filter(time => now - time < 24 * 60 * 60 * 1000).length;

    return {
      lastMinute,
      lastHour,
      lastDay,
      remainingToday: Math.max(0, this.maxRequestsPerDay - lastDay),
      queueLength: this.queue.length
    };
  }

  /**
   * 重置统计（仅用于测试）
   */
  reset() {
    this.requests = [];
    this.lastRequestTime = 0;
    this.queue = [];
    this.saveStats();
  }
}

// 创建全局单例
const rateLimiter = new RateLimiter();

// 页面加载时恢复统计数据
if (typeof window !== 'undefined') {
  rateLimiter.loadStats();
  window.rateLimiter = rateLimiter;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = rateLimiter;
}
