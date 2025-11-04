/**
 * 推荐页面一键打招呼模块（2025-11-04新增）
 * 功能：在推荐牛人页面实现智能打招呼
 */

class RecommendGreeter {
  constructor() {
    this.selectors = CONFIG.SELECTORS.recommend;
    this.greetHistory = new Set();  // 已打招呼的牛人
  }

  /**
   * 初始化
   */
  init() {
    console.log('✅ 推荐页面打招呼模块已启动');
  }

  /**
   * 发送招呼语
   * @param {Object} niurenInfo - 牛人信息
   * @param {String} greetText - 招呼语文本
   */
  async sendGreeting(niurenInfo, greetText) {
    try {
      console.log('📤 准备发送招呼:', niurenInfo.name, greetText);

      // 检查是否已经打过招呼
      const cardId = this.generateCardId(niurenInfo);
      if (this.greetHistory.has(cardId)) {
        this.showToast('⚠️ 您已经向该牛人打过招呼了');
        return;
      }

      // 找到打招呼按钮
      const greetBtn = niurenInfo.element?.querySelector(this.selectors.greetButton);
      if (!greetBtn) {
        this.showToast('❌ 未找到打招呼按钮');
        return;
      }

      // 显示确认提示
      const confirmed = await this.confirmGreeting(niurenInfo, greetText);
      if (!confirmed) return;

      // 点击打招呼按钮
      greetBtn.click();

      // 等待跳转到聊天页面
      await this.waitForChatPage();

      // 填充招呼语到输入框
      await this.fillGreetingToChat(greetText);

      // 标记为已打招呼
      this.greetHistory.add(cardId);

      // 保存历史
      this.saveGreetHistory();

      this.showToast('✅ 招呼语已填充，请检查后按【回车键】发送');

    } catch (error) {
      console.error('❌ 发送招呼失败:', error);
      this.showToast('❌ 发送招呼失败: ' + error.message);
    }
  }

  /**
   * 确认发送招呼
   */
  confirmGreeting(niurenInfo, greetText) {
    return new Promise((resolve) => {
      const confirmed = confirm(
        `确认向 ${niurenInfo.name} 发送以下招呼吗？\n\n${greetText}\n\n点击"确定"后将跳转到聊天页面并自动填充招呼语。`
      );
      resolve(confirmed);
    });
  }

  /**
   * 等待跳转到聊天页面
   */
  waitForChatPage() {
    return new Promise((resolve) => {
      console.log('⏳ 等待跳转到聊天页面...');

      const checkChat = () => {
        // 检查是否在聊天页面
        if (window.location.href.includes('/web/chat')) {
          console.log('✅ 已跳转到聊天页面');
          // 再等待1秒确保页面加载完成
          setTimeout(resolve, 1000);
        } else {
          setTimeout(checkChat, 500);
        }
      };

      checkChat();
    });
  }

  /**
   * 填充招呼语到聊天输入框
   */
  async fillGreetingToChat(greetText) {
    try {
      // 等待输入框出现
      const inputBox = await this.waitForInputBox();

      if (!inputBox) {
        throw new Error('未找到聊天输入框');
      }

      // 填充文本
      if (inputBox.hasAttribute('contenteditable')) {
        // contenteditable元素使用textContent
        inputBox.textContent = greetText;
      } else {
        // textarea/input使用value
        inputBox.value = greetText;
      }

      // 触发输入事件
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));

      // 聚焦到输入框
      inputBox.focus();

      // 将光标移动到末尾
      if (inputBox.hasAttribute('contenteditable')) {
        if (window.getSelection && document.createRange) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(inputBox);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      console.log('✅ 招呼语已填充到输入框');

    } catch (error) {
      console.error('❌ 填充招呼语失败:', error);
      throw error;
    }
  }

  /**
   * 等待输入框出现
   */
  waitForInputBox() {
    return new Promise((resolve) => {
      const findInput = () => {
        const inputBox = this.findInputBox();
        if (inputBox) {
          resolve(inputBox);
        } else {
          setTimeout(findInput, 500);
        }
      };
      findInput();
    });
  }

  /**
   * 查找聊天输入框（复用auto-greet的方法）
   */
  findInputBox() {
    const selectors = [
      '#boss-chat-editor-input',                    // ✅ 最精确 - Boss直聘专用ID
      '.boss-chat-editor-input',                    // ✅ 备用class选择器
      '.conversation-editor [contenteditable="true"]',  // ✅ 父容器+contenteditable
      '[contenteditable="true"]',                   // 通用contenteditable
      'textarea',                                   // 备用textarea
    ];

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isEditable = !el.hasAttribute('readonly') && !el.hasAttribute('disabled');

          if (isVisible && isEditable) {
            console.log('✅ 找到输入框:', selector, el);
            return el;
          }
        }
      } catch (e) {
        continue;
      }
    }

    console.warn('⚠️ 未找到输入框');
    return null;
  }

  /**
   * 批量打招呼（高级功能）
   */
  async batchGreet(niurenList, greetTextGenerator) {
    console.log(`🚀 开始批量打招呼，共 ${niurenList.length} 个牛人`);

    for (let i = 0; i < niurenList.length; i++) {
      const niuren = niurenList[i];
      const greetText = greetTextGenerator(niuren);

      console.log(`[${i + 1}/${niurenList.length}] 向 ${niuren.name} 打招呼`);

      await this.sendGreeting(niuren, greetText);

      // 安全延迟（防止被检测为批量操作）
      if (i < niurenList.length - 1) {
        const delay = this.getRandomDelay(5000, 10000);
        console.log(`⏳ 等待 ${delay / 1000} 秒后继续...`);
        await this.sleep(delay);
      }
    }

    this.showToast('🎉 批量打招呼完成！');
  }

  /**
   * 获取随机延迟时间
   */
  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成卡片ID
   */
  generateCardId(info) {
    return `${info.name}_${info.age}_${info.education}`;
  }

  /**
   * 保存打招呼历史
   */
  async saveGreetHistory() {
    try {
      await chrome.storage.local.set({
        greetHistory: Array.from(this.greetHistory)
      });
    } catch (error) {
      console.error('保存打招呼历史失败:', error);
    }
  }

  /**
   * 加载打招呼历史
   */
  async loadGreetHistory() {
    try {
      const result = await chrome.storage.local.get('greetHistory');
      if (result.greetHistory) {
        this.greetHistory = new Set(result.greetHistory);
        console.log(`📋 加载了 ${this.greetHistory.size} 条打招呼历史`);
      }
    } catch (error) {
      console.error('加载打招呼历史失败:', error);
    }
  }

  /**
   * 显示Toast提示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'boss-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999999;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    // 添加动画样式
    if (!document.getElementById('boss-toast-animation')) {
      const style = document.createElement('style');
      style.id = 'boss-toast-animation';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.recommendGreeter = new RecommendGreeter();
}
