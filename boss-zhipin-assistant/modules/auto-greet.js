/**
 * 半自动打招呼模块 - 显示推荐 + 一键填充（2025-11-04优化）
 */

class AutoGreetAssistant {
  constructor() {
    this.processedNiuren = new Set();  // 改用牛人
  }

  /**
   * 初始化 - 扫描牛人列表（2025-11-04优化）
   */
  init() {
    console.log('✅ 半自动打招呼助手已启动');

    // 检查是否启用
    const config = window.configManager?.get();
    if (!config || !config.autoGreetEnabled) {
      console.log('⚠️ 自动打招呼功能未启用');
      return;
    }

    this.scanChatList();

    // 定期扫描新牛人
    setInterval(() => {
      this.scanChatList();
    }, 15000);  // 每15秒扫描一次
  }

  /**
   * 扫描聊天列表（2025-11-04新增 - 使用真实选择器）
   */
  async scanChatList() {
    try {
      const chatList = document.querySelector(CONFIG.SELECTORS.chatList); // .user-list
      if (!chatList) {
        console.warn('⚠️ 未找到聊天列表');
        return;
      }

      const items = chatList.querySelectorAll(CONFIG.SELECTORS.chatItem); // .geek-item
      console.log(`📊 扫描到 ${items.length} 个聊天项`);

      items.forEach((item) => {
        this.analyzeNiurenAndShowBadge(item);
      });

    } catch (error) {
      console.error('❌ 扫描牛人失败:', error);
    }
  }

  /**
   * 分析牛人并显示徽章（2025-11-04优化）
   */
  async analyzeNiurenAndShowBadge(itemElement) {
    try {
      // 提取姓名作为ID
      const nameEl = itemElement.querySelector('.geek-name') ||
                    itemElement.querySelector('[class*="name"]');
      if (!nameEl) return;

      const name = nameEl.textContent.trim();
      if (!name) return;

      // 检查是否已处理
      if (this.processedNiuren.has(name)) return;

      // 标记为已处理
      this.processedNiuren.add(name);

      // 快速评分（简化版，不调用AI）
      const score = this.quickScoreFromElement(itemElement);

      // 在聊天项上显示匹配度徽章
      this.showMatchBadge(itemElement, score);

      // 如果高匹配度，显示打招呼建议
      if (score >= 75) {
        this.showGreetSuggestion(itemElement, { name, element: itemElement }, score);
      }

    } catch (error) {
      console.error('❌ 分析牛人失败:', error);
    }
  }

  /**
   * 从聊天列表元素快速评分（2025-11-04新增）
   */
  quickScoreFromElement(element) {
    let score = 60; // 基础分

    const text = element.textContent;

    // 有最新消息 +10
    if (element.querySelector('[class*="last-msg"]')) {
      score += 10;
    }

    // 包含学历关键词 +15
    if (text.includes('本科') || text.includes('硕士') || text.includes('博士')) {
      score += 15;
    } else if (text.includes('大专')) {
      score += 10;
    }

    // 包含经验关键词 +10
    if (text.includes('年') || text.includes('经验')) {
      score += 10;
    }

    // 最近活跃 +15
    if (text.includes('刚刚') || text.includes('在线') || text.includes('分钟前')) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * 显示匹配度徽章（2025-11-04优化）
   */
  showMatchBadge(element, score) {
    if (!element) return;

    // 移除旧徽章
    const oldBadge = element.querySelector('.boss-match-badge');
    if (oldBadge) oldBadge.remove();

    // 创建新徽章
    const badge = document.createElement('div');
    badge.className = 'boss-match-badge';

    const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#999';
    const stars = score >= 80 ? '⭐⭐⭐⭐⭐' : score >= 60 ? '⭐⭐⭐' : '⭐';

    badge.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: ${color};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      z-index: 10;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;
    badge.textContent = `${score}分`;

    // 添加到聊天项（需要设置relative定位）
    element.style.position = 'relative';
    element.appendChild(badge);
  }

  /**
   * 查找聊天输入框（统一方法）- 已针对Boss直聘优化
   */
  findInputBox() {
    // 根据真实DOM结构优化的选择器顺序（2025-11-03 分析）
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
          // 检查元素是否可见且可编辑
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isEditable = !el.hasAttribute('readonly') && !el.hasAttribute('disabled');

          if (isVisible && isEditable) {
            console.log('✅ 找到输入框:', selector, el);
            return el;
          }
        }
      } catch (e) {
        // 某些选择器可能无效，继续尝试下一个
        continue;
      }
    }

    console.warn('⚠️ 未找到输入框，请确保在聊天页面');
    return null;
  }

  /**
   * 显示打招呼建议按钮
   */
  showGreetSuggestion(element, candidate, score) {
    if (!element) return;

    // 检查是否已有按钮
    if (element.querySelector('.boss-greet-btn')) return;

    // 创建按钮
    const btn = document.createElement('button');
    btn.className = 'boss-greet-btn';
    btn.innerHTML = '🤖 AI建议打招呼';
    btn.onclick = (e) => {
      e.stopPropagation();
      this.showGreetPanel(candidate, score);
    };

    element.appendChild(btn);
  }

  /**
   * 显示打招呼面板（2025-11-04优化）
   */
  async showGreetPanel(niuren, score) {
    // 移除旧面板
    const oldPanel = document.querySelector('.boss-greet-panel');
    if (oldPanel) oldPanel.remove();

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'boss-greet-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      min-width: 400px;
      max-width: 600px;
    `;

    panel.innerHTML = `
      <div class="boss-greet-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="font-size: 16px; font-weight: bold;">🎯 高匹配牛人 - ${niuren.name || '牛人'}</div>
        <button class="boss-close-btn" style="border: none; background: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
      </div>
      <div class="boss-greet-body">
        <div class="boss-greet-info" style="padding: 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 16px;">
          <p style="margin: 4px 0;">匹配度：<strong style="color: #52c41a;">${score}分 ⭐⭐⭐⭐⭐</strong></p>
          <p style="margin: 4px 0;">应聘职位：${niuren.position || '未知'}</p>
        </div>
        <div class="boss-greet-suggestions">
          <p style="font-weight: bold; margin-bottom: 12px;">💬 建议招呼语：</p>
          <div class="boss-greet-options">
            <div class="boss-greet-option" style="margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px;">
              <div class="boss-greet-text" style="margin-bottom: 8px; color: #333;">您好！看到您有相关经验，与我们的岗位非常匹配，欢迎进一步沟通。</div>
              <button class="boss-use-greet-btn" data-text="您好！看到您有相关经验，与我们的岗位非常匹配，欢迎进一步沟通。"
                      style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">使用</button>
            </div>
            <div class="boss-greet-option" style="margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px;">
              <div class="boss-greet-text" style="margin-bottom: 8px; color: #333;">Hi！您的简历很不错，我们正在招聘${niuren.position || '相关岗位'}，期待和您聊聊~</div>
              <button class="boss-use-greet-btn" data-text="Hi！您的简历很不错，我们正在招聘${niuren.position || '相关岗位'}，期待和您聊聊~"
                      style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">使用</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 关闭按钮
    panel.querySelector('.boss-close-btn').onclick = () => panel.remove();

    // 使用按钮
    panel.querySelectorAll('.boss-use-greet-btn').forEach(btn => {
      btn.onclick = () => {
        const text = btn.getAttribute('data-text');
        this.fillGreeting(text, niuren);
        panel.remove();
      };
    });

    // 点击外部关闭
    panel.onclick = (e) => {
      if (e.target === panel) panel.remove();
    };
  }

  /**
   * 填充招呼语
   */
  fillGreeting(text, candidate) {
    // 如果当前不在聊天页面，先点击候选人进入聊天
    const inputBox = this.findInputBox();
    if (!inputBox) {
      if (candidate.element) {
        candidate.element.click();

        // 等待聊天窗口加载
        setTimeout(() => {
          this.fillToInput(text);
        }, 1000);
      } else {
        this.showToast('❌ 未找到输入框，请进入聊天页面');
      }
    } else {
      this.fillToInput(text);
    }
  }

  /**
   * 填充到输入框（2025-11-04优化 - 提示按回车发送）
   */
  fillToInput(text) {
    const inputBox = this.findInputBox();

    if (inputBox) {
      // 判断是contenteditable还是textarea/input
      if (inputBox.hasAttribute('contenteditable')) {
        // contenteditable元素使用textContent
        inputBox.textContent = text;
      } else {
        // textarea/input使用value
        inputBox.value = text;
      }

      // 触发输入事件
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));

      // 聚焦到输入框
      inputBox.focus();

      // 将光标移动到末尾
      if (window.getSelection && document.createRange) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(inputBox);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      this.showToast('✅ 已填充招呼语，请检查后按【回车键】发送');
    } else {
      this.showToast('❌ 未找到输入框，请手动进入聊天页面');
    }
  }

  /**
   * 显示提示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'boss-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.autoGreetAssistant = new AutoGreetAssistant();
}
