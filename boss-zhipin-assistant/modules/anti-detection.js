/**
 * 反检测模块 - 模拟人类行为，避免被平台检测为自动化
 * ⚠️ 仅在用户明确开启"自动模式"时使用
 */

class AntiDetection {
  constructor() {
    this.config = window.configManager;
  }

  /**
   * 随机延迟（模拟人类思考时间）
   */
  async randomDelay(min = 2000, max = 8000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`等待 ${(delay / 1000).toFixed(1)} 秒...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 智能延迟（根据操作类型调整）
   */
  async smartDelay(actionType) {
    const delays = {
      read: [1000, 3000],        // 阅读延迟
      think: [2000, 5000],       // 思考延迟
      type: [100, 300],          // 打字间隔
      click: [500, 1500],        // 点击延迟
      scroll: [800, 2000]        // 滚动延迟
    };

    const [min, max] = delays[actionType] || [1000, 3000];
    return this.randomDelay(min, max);
  }

  /**
   * 模拟鼠标移动到元素
   */
  async moveMouseToElement(element) {
    if (!this.config.get('antiDetection')?.humanBehavior?.mouseMovement) {
      return;
    }

    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // 触发鼠标移动事件
      const moveEvent = new MouseEvent('mousemove', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      });

      element.dispatchEvent(moveEvent);

      // 触发hover效果
      const overEvent = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      });

      element.dispatchEvent(overEvent);

      await this.randomDelay(100, 300);
    } catch (error) {
      console.error('模拟鼠标移动失败:', error);
    }
  }

  /**
   * 人性化点击（带延迟和鼠标移动）
   */
  async humanClick(element) {
    if (!element) {
      throw new Error('元素不存在');
    }

    try {
      // 1. 滚动元素到可视区域
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.smartDelay('scroll');

      // 2. 移动鼠标到元素
      await this.moveMouseToElement(element);

      // 3. 短暂停留（模拟瞄准）
      await this.randomDelay(100, 500);

      // 4. 点击
      element.click();

      // 5. 点击后延迟
      await this.smartDelay('click');

      console.log('人性化点击完成');
    } catch (error) {
      console.error('人性化点击失败:', error);
      throw error;
    }
  }

  /**
   * 人性化输入文本（模拟打字速度）
   */
  async humanType(inputElement, text) {
    if (!inputElement || !text) {
      throw new Error('输入元素或文本为空');
    }

    if (!this.config.get('antiDetection')?.humanBehavior?.typing) {
      // 如果未启用打字模拟，直接设置值
      inputElement.value = text;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    try {
      // 1. 聚焦输入框
      inputElement.focus();
      await this.randomDelay(200, 500);

      // 2. 清空现有内容
      inputElement.value = '';

      // 3. 逐字输入
      for (let i = 0; i < text.length; i++) {
        inputElement.value += text[i];

        // 触发input事件
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));

        // 随机打字间隔（50-200ms）
        const typingDelay = Math.floor(Math.random() * 150) + 50;

        // 偶尔停顿（模拟思考）
        if (Math.random() < 0.1) {
          await this.randomDelay(300, 800);
        } else {
          await new Promise(resolve => setTimeout(resolve, typingDelay));
        }
      }

      // 4. 输入完成后短暂停留
      await this.randomDelay(300, 800);

      console.log('人性化输入完成');
    } catch (error) {
      console.error('人性化输入失败:', error);
      throw error;
    }
  }

  /**
   * 模拟页面滚动
   */
  async simulateScroll(direction = 'down', distance = 300) {
    if (!this.config.get('antiDetection')?.humanBehavior?.scrolling) {
      return;
    }

    try {
      const currentScroll = window.scrollY;
      const targetScroll = direction === 'down'
        ? currentScroll + distance
        : currentScroll - distance;

      // 平滑滚动
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });

      await this.randomDelay(500, 1500);
    } catch (error) {
      console.error('模拟滚动失败:', error);
    }
  }

  /**
   * 随机浏览行为（增加真实性）
   */
  async randomBrowsingBehavior() {
    const behaviors = [
      async () => {
        // 随机滚动
        await this.simulateScroll(Math.random() > 0.5 ? 'down' : 'up', Math.random() * 300 + 100);
      },
      async () => {
        // 短暂停留
        await this.randomDelay(1000, 3000);
      },
      async () => {
        // 移动鼠标到随机位置
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const event = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          clientX: x,
          clientY: y
        });
        document.dispatchEvent(event);
        await this.randomDelay(200, 600);
      }
    ];

    // 随机执行一个行为
    if (Math.random() < 0.3) {  // 30%概率执行
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      await behavior();
    }
  }

  /**
   * 检查是否在工作时间
   */
  isWorkingHours() {
    const config = this.config.get('autoReply')?.workingHours;
    if (!config?.enabled) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = config.start.split(':').map(Number);
    const [endHour, endMinute] = config.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * 检查操作频率限制
   */
  async checkRateLimit(actionType) {
    const key = `rateLimit_${actionType}`;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    try {
      const stored = await chrome.storage.local.get(key);
      const records = stored[key] || [];

      // 清理1小时前的记录
      const recentRecords = records.filter(time => now - time < oneHour);

      // 检查是否超过限制
      const limits = {
        reply: this.config.get('autoReply')?.maxRepliesPerHour || 20,
        greet: Math.floor((this.config.get('autoGreet')?.maxGreetsPerDay || 50) / 24)
      };

      const limit = limits[actionType] || 10;

      if (recentRecords.length >= limit) {
        console.warn(`${actionType} 操作频率超限，当前: ${recentRecords.length}/${limit}`);
        return false;
      }

      // 记录本次操作
      recentRecords.push(now);
      await chrome.storage.local.set({ [key]: recentRecords });

      return true;
    } catch (error) {
      console.error('检查频率限制失败:', error);
      return true; // 发生错误时允许操作
    }
  }

  /**
   * 生成随机User-Agent（暂时用不到，预留）
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * 安全执行自动化操作（带重试）
   */
  async safeExecute(action, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`执行操作 (尝试 ${attempt}/${maxRetries})`);

        // 执行随机浏览行为
        await this.randomBrowsingBehavior();

        // 执行实际操作
        const result = await action();

        console.log('操作成功完成');
        return result;
      } catch (error) {
        console.error(`操作失败 (尝试 ${attempt}/${maxRetries}):`, error);

        if (attempt < maxRetries) {
          // 指数退避重试
          const backoffDelay = Math.pow(2, attempt) * 1000;
          console.log(`等待 ${backoffDelay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          throw error;
        }
      }
    }
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.antiDetection = new AntiDetection();
}
