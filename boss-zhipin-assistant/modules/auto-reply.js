/**
 * 半自动回复模块 - AI建议 + 一键填充
 */

class AutoReplyAssistant {
  constructor() {
    this.isActive = false;
    this.currentCandidate = null;
    this.replyDebounceTimer = null; // 防抖定时器
    this.lastReplyTime = 0; // 上次生成回复的时间
    this.minReplyInterval = 5000; // 最小回复间隔：5秒
  }

  /**
   * 初始化 - 监听聊天窗口（2025-11-04优化）
   */
  init() {
    console.log('✅ 半自动回复助手已启动');
    this.lastMessageText = '';  // 防止重复处理同一消息
    this.messageObserver = null;
    this.initMessageListener();
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
   * 初始化消息监听（2025-11-04新增 - 使用真实DOM选择器）
   */
  initMessageListener() {
    const chatConversation = document.querySelector(CONFIG.SELECTORS.chatConversation); // .chat-conversation
    if (!chatConversation) {
      console.warn('⚠️ 未找到消息容器，3秒后重试...');
      setTimeout(() => this.initMessageListener(), 3000);
      return;
    }

    console.log('✅ 找到消息容器，开始监听新消息');

    // 使用MutationObserver监听新消息
    this.messageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // 检查是否是新增的消息节点
          if (node.nodeType === 1 && node.classList && node.classList.contains('message-item')) {
            this.onNewMessage(node);
          }
        });
      });
    });

    this.messageObserver.observe(chatConversation, {
      childList: true,
      subtree: true
    });

    console.log('✅ 消息监听已启动');
  }

  /**
   * 新消息处理（2025-11-04新增）
   */
  async onNewMessage(messageNode) {
    try {
      // 判断是否是对方发送的消息（不是自己发送的）
      if (this.isOwnMessage(messageNode)) {
        console.log('💬 检测到自己的消息，跳过');
        return;
      }

      const messageText = messageNode.textContent.trim();
      console.log('🔔 收到牛人新消息:', messageText);

      // 防抖：避免短时间内重复处理同一消息
      if (this.lastMessageText === messageText) {
        return;
      }
      this.lastMessageText = messageText;

      // 检查配置是否启用自动回复
      const config = window.configManager?.get();
      if (!config || !config.autoReplyEnabled) {
        console.log('⚠️ 自动回复功能未启用');
        return;
      }

      // 获取当前牛人信息
      const candidate = window.candidateExtractor?.extractCurrentCandidate();
      if (!candidate) {
        console.warn('⚠️ 无法获取牛人信息');
      }

      // 显示智能回复建议
      await this.showReplySuggestions(messageText, candidate);

    } catch (error) {
      console.error('❌ 处理新消息失败:', error);
    }
  }

  /**
   * 判断是否是自己发送的消息（2025-11-04新增）
   */
  isOwnMessage(messageNode) {
    // 根据class判断（需要根据实际情况调整）
    // Boss直聘的自己消息通常有特定class
    return messageNode.classList.contains('self') ||
           messageNode.classList.contains('own') ||
           messageNode.classList.contains('mine') ||
           messageNode.querySelector('.self-message') ||
           messageNode.querySelector('[class*="self"]') ||
           messageNode.querySelector('[class*="mine"]');
  }

  /**
   * 显示回复建议面板（2025-11-04优化 - 面板位置在输入框上方 + 防抖）
   */
  async showReplySuggestions(messageText, candidate) {
    // ✅ 防抖：清除之前的定时器
    if (this.replyDebounceTimer) {
      clearTimeout(this.replyDebounceTimer);
    }

    // ✅ 速率限制：检查距离上次回复的时间
    const now = Date.now();
    const timeSinceLastReply = now - this.lastReplyTime;

    if (timeSinceLastReply < this.minReplyInterval) {
      const waitTime = Math.ceil((this.minReplyInterval - timeSinceLastReply) / 1000);
      console.log(`⏳ 回复间隔保护，${waitTime}秒后再生成回复`);

      // 显示提示
      this.showToast(`⏳ 请等待${waitTime}秒后再生成回复（防止API超限）`, 'warning');
      return;
    }

    // ✅ 防抖等待：2秒内没有新消息才处理
    this.replyDebounceTimer = setTimeout(async () => {
      await this._doShowReplySuggestions(messageText, candidate);
      this.lastReplyTime = Date.now();
    }, 2000);

    console.log('⏳ 收到消息，2秒后生成回复建议（防抖保护）');
  }

  /**
   * 实际显示回复建议（内部方法）
   */
  async _doShowReplySuggestions(messageText, candidate) {
    try {
      // 移除旧的建议面板
      const oldPanel = document.querySelector('.boss-reply-suggestions');
      if (oldPanel) oldPanel.remove();

      // 创建建议面板
      const panel = document.createElement('div');
      panel.className = 'boss-reply-suggestions';
      panel.style.cssText = `
        position: sticky;
        bottom: 100%;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
        z-index: 1000;
      `;

      panel.innerHTML = `
        <div class="boss-suggestion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: bold;">
          🤖 AI智能回复建议
          <button class="boss-close-btn" style="border: none; background: none; font-size: 20px; cursor: pointer; color: #999;">×</button>
        </div>
        <div class="boss-suggestion-content">
          <div class="boss-loading" style="text-align: center; color: #667eea; padding: 20px;">⏳ 分析中...</div>
        </div>
      `;

      // 插入到输入操作区域的顶部
      const operateArea = document.querySelector(CONFIG.SELECTORS.operateArea); // .conversation-operate
      if (operateArea) {
        operateArea.insertBefore(panel, operateArea.firstChild);
      } else {
        console.warn('⚠️ 未找到操作区域，面板可能显示位置不正确');
        document.body.appendChild(panel);
      }

      // 关闭按钮
      panel.querySelector('.boss-close-btn').onclick = () => panel.remove();

      // 生成AI建议
      const suggestions = await this.generateSmartSuggestions(messageText, candidate);

      // 显示建议选项
      const content = panel.querySelector('.boss-suggestion-content');
      content.innerHTML = suggestions.map((sug, index) => `
        <div class="boss-suggestion-item" style="margin-bottom: 10px; padding: 10px; border: 1px solid #f0f0f0; border-radius: 6px; cursor: pointer; transition: all 0.2s;" data-index="${index}"
             onmouseenter="this.style.backgroundColor='#f5f7fa'; this.style.borderColor='#667eea';"
             onmouseleave="this.style.backgroundColor='white'; this.style.borderColor='#f0f0f0';">
          <div class="boss-suggestion-label" style="font-size: 12px; color: #999; margin-bottom: 6px;">
            ${sug.style === 'formal' ? '📋 正式风格' : sug.style === 'friendly' ? '😊 友好风格' : '⚡ 简洁风格'}
          </div>
          <div class="boss-suggestion-text" style="color: #333; margin-bottom: 8px; line-height: 1.6;">${sug.text}</div>
          <button class="boss-use-btn" data-text="${this.escapeHtml(sug.text)}"
                  style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;"
                  onmouseenter="this.style.background='#5568d3';"
                  onmouseleave="this.style.background='#667eea';">
            使用此回复
          </button>
        </div>
      `).join('');

      // 绑定"使用"按钮
      content.querySelectorAll('.boss-use-btn').forEach(btn => {
        btn.onclick = () => {
          const text = btn.getAttribute('data-text');
          this.fillReplyToInput(text);
          panel.remove();
        };
      });

    } catch (error) {
      console.error('❌ 显示回复建议失败:', error);
    }
  }

  /**
   * 生成智能回复建议（2025-11-04优化 - 支持AI分析 + 429错误处理）
   */
  async generateSmartSuggestions(messageText, candidate) {
    // 检查是否启用AI
    const config = window.configManager?.get();

    if (config && config.useAI && config.apiKey && window.aiAnalyzer) {
      try {
        // 使用AI生成个性化回复
        console.log('🤖 使用AI生成回复建议...');
        const aiSuggestions = await window.aiAnalyzer.generateReply(candidate, { lastMessage: messageText });
        if (aiSuggestions && aiSuggestions.length > 0) {
          return aiSuggestions;
        }
      } catch (error) {
        console.warn('⚠️ AI生成失败，使用规则回复:', error.message);

        // ✅ 特殊处理429错误 - 显示友好提示
        if (error.message.includes('429') || error.message.includes('频率超限')) {
          this.showToast('⚠️ API调用频率超限，已自动使用规则回复', 'warning');
          console.warn('💡 建议：减少同时回复的消息数量，或等待1分钟后再使用AI功能');
        }
      }
    }

    // 降级：基于关键词规则生成建议
    const keywords = {
      薪资: [
        { style: 'formal', text: '您好！关于薪资待遇，我们可以根据您的经验和能力面谈确定，欢迎进一步沟通。' },
        { style: 'friendly', text: 'Hi！薪资方面咱们可以详细聊聊，根据您的实际情况来定，期待和您深入交流~' },
        { style: 'brief', text: '薪资可面谈，欢迎沟通。' }
      ],
      岗位: [
        { style: 'formal', text: '您好！该岗位主要负责视频拍摄、剪辑和运营工作，如有意向可以详细沟通具体职责。' },
        { style: 'friendly', text: 'Hi！我们的岗位主要是做短视频内容的哦，包括拍摄剪辑和运营，感兴趣的话可以详细聊聊~' },
        { style: 'brief', text: '主要负责视频拍摄剪辑和运营，欢迎了解。' }
      ],
      工作: [
        { style: 'formal', text: '您好！很高兴收到您的咨询，请问有什么可以帮您了解的吗？' },
        { style: 'friendly', text: 'Hi！看到您的简历啦，有什么想了解的随时问我~' },
        { style: 'brief', text: '您好，请问有什么可以帮您？' }
      ]
    };

    // 匹配关键词
    for (const [keyword, replies] of Object.entries(keywords)) {
      if (messageText.includes(keyword)) {
        return replies;
      }
    }

    // 默认回复
    return [
      { style: 'formal', text: '您好！感谢您的关注，请问有什么可以帮您的吗？' },
      { style: 'friendly', text: 'Hi！收到您的消息啦，有什么想了解的随时问我~' },
      { style: 'brief', text: '您好，欢迎咨询。' }
    ];
  }

  /**
   * 填充回复到输入框（2025-11-04优化 - 提示按回车发送）
   */
  fillReplyToInput(text) {
    const inputBox = this.findInputBox();
    if (!inputBox) {
      this.showToast('❌ 未找到输入框，请确保在聊天页面');
      return;
    }

    // 判断是contenteditable还是textarea/input
    if (inputBox.hasAttribute('contenteditable')) {
      // contenteditable元素使用textContent
      inputBox.textContent = text;
    } else {
      // textarea/input使用value
      inputBox.value = text;
    }

    // 触发input事件（让Boss直聘检测到内容变化）
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));

    // 聚焦输入框
    inputBox.focus();

    // 将光标移动到末尾（contenteditable需要）
    if (inputBox.hasAttribute('contenteditable')) {
      if (window.getSelection && document.createRange) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(inputBox);
        range.collapse(false); // false = 末尾
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    console.log('✅ 已填充回复，请检查后按回车发送');

    // 提示用户按回车发送
    this.showToast('✅ 已填充回复，请检查后按【回车键】发送');
  }

  /**
   * 显示提示消息
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

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.autoReplyAssistant = new AutoReplyAssistant();
}
