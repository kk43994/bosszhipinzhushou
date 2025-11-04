/**
 * F12信息捕获面板 - 专门用于监控和导出调试信息
 * 让用户可以轻松把报错和调试信息分享给开发者
 */

class F12CapturePanel {
  constructor() {
    this.consoleMonitor = null;
    this.autoScroll = true;
    this.currentFilter = 'all';

    this.init();
  }

  async init() {
    // 初始化Console监控器
    this.consoleMonitor = new ConsoleMonitor();

    // 创建UI
    this.createPanel();

    // 监听捕获事件
    window.addEventListener('bossConsoleCapture', (event) => {
      if (this.autoScroll) {
        this.appendLog(event.detail);
      }
    });

    // 定时更新统计
    setInterval(() => {
      this.updateStats();
    }, 2000);

    console.log('✅ F12捕获面板已启动');
  }

  createPanel() {
    // 检查是否已存在
    if (document.getElementById('boss-f12-capture-panel')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'boss-f12-capture-panel';
    panel.innerHTML = `
      <div class="f12-header">
        <div class="f12-title-bar">
          <span class="f12-icon">🔍</span>
          <span class="f12-title">F12调试信息捕获</span>
          <span class="f12-badge" id="f12TotalLogs">0</span>
        </div>
        <div class="f12-controls">
          <button class="f12-btn" id="f12Minimize" title="最小化">−</button>
          <button class="f12-btn" id="f12Close" title="关闭">×</button>
        </div>
      </div>

      <div class="f12-body">
        <!-- 统计信息卡片 -->
        <div class="f12-stats-cards">
          <div class="stat-card stat-error">
            <div class="stat-icon">🚨</div>
            <div class="stat-info">
              <div class="stat-label">错误</div>
              <div class="stat-value" id="statErrors">0</div>
            </div>
          </div>
          <div class="stat-card stat-warn">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <div class="stat-label">警告</div>
              <div class="stat-value" id="statWarnings">0</div>
            </div>
          </div>
          <div class="stat-card stat-info">
            <div class="stat-icon">ℹ️</div>
            <div class="stat-info">
              <div class="stat-label">信息</div>
              <div class="stat-value" id="statInfos">0</div>
            </div>
          </div>
          <div class="stat-card stat-log">
            <div class="stat-icon">📝</div>
            <div class="stat-info">
              <div class="stat-label">日志</div>
              <div class="stat-value" id="statLogs">0</div>
            </div>
          </div>
        </div>

        <!-- 过滤器 -->
        <div class="f12-filters">
          <button class="f12-filter-btn active" data-filter="all">全部</button>
          <button class="f12-filter-btn" data-filter="error">❌ 错误</button>
          <button class="f12-filter-btn" data-filter="warn">⚠️ 警告</button>
          <button class="f12-filter-btn" data-filter="info">ℹ️ 信息</button>
          <button class="f12-filter-btn" data-filter="log">📝 日志</button>
          <button class="f12-filter-btn" data-filter="debug">🐛 调试</button>
        </div>

        <!-- 工具栏 -->
        <div class="f12-toolbar">
          <button class="f12-tool-btn" id="f12Clear">
            <span>🗑️</span> 清空
          </button>
          <button class="f12-tool-btn" id="f12Pause">
            <span>⏸️</span> 暂停
          </button>
          <button class="f12-tool-btn" id="f12AutoScroll">
            <span>📜</span> 自动滚动
          </button>
          <button class="f12-tool-btn primary" id="f12Export">
            <span>📤</span> 导出完整信息
          </button>
        </div>

        <!-- 日志显示区 -->
        <div class="f12-logs-container" id="f12LogsContainer">
          <div class="f12-log-item f12-log-system">
            ⏳ 等待捕获日志...
          </div>
        </div>
      </div>

      <div class="f12-footer">
        <div class="f12-footer-info">
          <span>📊 总日志: <strong id="footerTotal">0</strong></span>
          <span>🚨 错误: <strong id="footerErrors" class="text-error">0</strong></span>
          <span>⚡ 实时更新</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 注入样式
    this.injectStyles();

    // 绑定事件
    this.bindEvents();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #boss-f12-capture-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 800px;
        max-height: 600px;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(237, 100, 166, 0.3);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        z-index: 99999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Consolas', monospace;
        font-size: 13px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #boss-f12-capture-panel.minimized .f12-body,
      #boss-f12-capture-panel.minimized .f12-footer {
        display: none;
      }

      /* 头部 */
      .f12-header {
        background: linear-gradient(135deg, #ed64a6 0%, #f093fb 100%);
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .f12-title-bar {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .f12-icon {
        font-size: 20px;
        animation: rotate 3s linear infinite;
      }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .f12-title {
        font-weight: 600;
        font-size: 15px;
      }

      .f12-badge {
        background: rgba(255,255,255,0.3);
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      }

      .f12-controls {
        display: flex;
        gap: 6px;
      }

      .f12-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .f12-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.1);
      }

      /* 主体 */
      .f12-body {
        padding: 16px;
        max-height: 500px;
        overflow-y: auto;
      }

      /* 统计卡片 */
      .f12-stats-cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }

      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 2px solid #e8e8e8;
        transition: all 0.3s;
      }

      .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.1);
      }

      .stat-card.stat-error {
        border-color: #ff4d4f;
        background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
      }

      .stat-card.stat-warn {
        border-color: #faad14;
        background: linear-gradient(135deg, #fffbf0 0%, #ffffff 100%);
      }

      .stat-card.stat-info {
        border-color: #1890ff;
        background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
      }

      .stat-card.stat-log {
        border-color: #52c41a;
        background: linear-gradient(135deg, #f6ffed 0%, #ffffff 100%);
      }

      .stat-icon {
        font-size: 24px;
      }

      .stat-info {
        flex: 1;
      }

      .stat-label {
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 22px;
        font-weight: bold;
        color: #333;
      }

      /* 过滤器 */
      .f12-filters {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .f12-filter-btn {
        padding: 6px 14px;
        border: 1px solid #e8e8e8;
        background: white;
        border-radius: 16px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        color: #666;
      }

      .f12-filter-btn:hover {
        background: #f5f5f5;
        border-color: #ed64a6;
      }

      .f12-filter-btn.active {
        background: linear-gradient(135deg, #ed64a6 0%, #f093fb 100%);
        color: white;
        border-color: #ed64a6;
      }

      /* 工具栏 */
      .f12-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .f12-tool-btn {
        padding: 8px 16px;
        border: 1px solid #e8e8e8;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        color: #333;
      }

      .f12-tool-btn:hover {
        background: #f5f5f5;
        border-color: #ed64a6;
        transform: translateY(-2px);
      }

      .f12-tool-btn.primary {
        background: linear-gradient(135deg, #ed64a6 0%, #f093fb 100%);
        color: white;
        border: none;
        font-weight: 600;
      }

      .f12-tool-btn.primary:hover {
        box-shadow: 0 4px 12px rgba(237, 100, 166, 0.4);
      }

      .f12-tool-btn.active {
        background: #1890ff;
        color: white;
        border-color: #1890ff;
      }

      /* 日志容器 */
      .f12-logs-container {
        background: rgba(0, 0, 0, 0.02);
        border-radius: 10px;
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
      }

      .f12-logs-container::-webkit-scrollbar {
        width: 8px;
      }

      .f12-logs-container::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.05);
        border-radius: 4px;
      }

      .f12-logs-container::-webkit-scrollbar-thumb {
        background: rgba(237, 100, 166, 0.4);
        border-radius: 4px;
      }

      .f12-logs-container::-webkit-scrollbar-thumb:hover {
        background: rgba(237, 100, 166, 0.6);
      }

      /* 日志项 */
      .f12-log-item {
        padding: 10px;
        margin-bottom: 6px;
        border-radius: 8px;
        background: white;
        border-left: 4px solid #e8e8e8;
        transition: all 0.2s;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .f12-log-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transform: translateX(4px);
      }

      .f12-log-error {
        background: #fff1f0;
        border-left-color: #ff4d4f;
      }

      .f12-log-warn {
        background: #fffbe6;
        border-left-color: #faad14;
      }

      .f12-log-info {
        background: #e6f7ff;
        border-left-color: #1890ff;
      }

      .f12-log-log {
        background: #f6ffed;
        border-left-color: #52c41a;
      }

      .f12-log-system {
        background: #fafafa;
        border-left-color: #d9d9d9;
        color: #999;
      }

      .f12-log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 11px;
      }

      .f12-log-meta {
        display: flex;
        gap: 10px;
        color: #999;
      }

      .f12-log-type {
        font-weight: bold;
        text-transform: uppercase;
      }

      .f12-log-type.error { color: #ff4d4f; }
      .f12-log-type.warn { color: #faad14; }
      .f12-log-type.info { color: #1890ff; }
      .f12-log-type.log { color: #52c41a; }

      .f12-log-content {
        color: #333;
        line-height: 1.6;
        word-break: break-all;
      }

      .f12-log-stack {
        margin-top: 8px;
        padding: 8px;
        background: rgba(0,0,0,0.05);
        border-radius: 6px;
        font-size: 11px;
        color: #666;
        white-space: pre-wrap;
        max-height: 150px;
        overflow-y: auto;
      }

      .f12-log-json {
        margin-top: 8px;
        padding: 8px;
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 6px;
        font-size: 11px;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
      }

      /* 底部 */
      .f12-footer {
        background: rgba(248, 249, 255, 0.8);
        padding: 10px 16px;
        border-top: 1px solid rgba(237, 100, 166, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .f12-footer-info {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #666;
      }

      .text-error {
        color: #ff4d4f !important;
      }
    `;

    document.head.appendChild(style);
  }

  bindEvents() {
    // 最小化
    document.getElementById('f12Minimize').onclick = () => {
      const panel = document.getElementById('boss-f12-capture-panel');
      panel.classList.toggle('minimized');
    };

    // 关闭
    document.getElementById('f12Close').onclick = () => {
      if (confirm('确定关闭F12捕获面板吗？')) {
        document.getElementById('boss-f12-capture-panel').remove();
      }
    };

    // 过滤器
    document.querySelectorAll('.f12-filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.f12-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.refreshLogs();
      };
    });

    // 清空
    document.getElementById('f12Clear').onclick = () => {
      if (confirm('确定清空所有日志吗？')) {
        this.consoleMonitor.clearLogs();
        this.refreshLogs();
      }
    };

    // 暂停/继续
    const pauseBtn = document.getElementById('f12Pause');
    pauseBtn.onclick = () => {
      if (this.consoleMonitor.isCapturing) {
        this.consoleMonitor.pause();
        pauseBtn.innerHTML = '<span>▶️</span> 继续';
        pauseBtn.classList.add('active');
      } else {
        this.consoleMonitor.resume();
        pauseBtn.innerHTML = '<span>⏸️</span> 暂停';
        pauseBtn.classList.remove('active');
      }
    };

    // 自动滚动
    const autoScrollBtn = document.getElementById('f12AutoScroll');
    autoScrollBtn.classList.add('active');
    autoScrollBtn.onclick = () => {
      this.autoScroll = !this.autoScroll;
      autoScrollBtn.classList.toggle('active');
    };

    // 导出
    document.getElementById('f12Export').onclick = () => {
      this.exportLogs();
    };

    // 可拖动
    this.makeDraggable(document.getElementById('boss-f12-capture-panel'));
  }

  makeDraggable(element) {
    const header = element.querySelector('.f12-header');
    let isDragging = false;
    let startX, startY, startLeft, startBottom;

    header.onmousedown = (e) => {
      if (e.target.closest('.f12-controls')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startBottom = window.innerHeight - rect.bottom;

      element.style.transition = 'none';
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      element.style.left = (startLeft + dx) + 'px';
      element.style.bottom = (startBottom - dy) + 'px';
      element.style.right = 'auto';
    };

    document.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        element.style.transition = '';
      }
    };
  }

  appendLog(log) {
    const container = document.getElementById('f12LogsContainer');

    // 过滤
    if (this.currentFilter !== 'all' && log.type !== this.currentFilter) {
      return;
    }

    const logEl = this.createLogElement(log);

    // 如果是第一条日志，清空占位符
    if (container.children.length === 1 && container.children[0].textContent.includes('等待捕获')) {
      container.innerHTML = '';
    }

    container.insertBefore(logEl, container.firstChild);

    // 限制显示数量
    while (container.children.length > 100) {
      container.removeChild(container.lastChild);
    }

    // 自动滚动到顶部
    if (this.autoScroll) {
      container.scrollTop = 0;
    }
  }

  createLogElement(log) {
    const el = document.createElement('div');
    el.className = `f12-log-item f12-log-${log.type}`;

    let content = '';

    // 头部
    content += `
      <div class="f12-log-header">
        <div class="f12-log-meta">
          <span class="f12-log-type ${log.type}">${log.type.toUpperCase()}</span>
          <span>${log.time}</span>
          <span>${log.source}</span>
        </div>
      </div>
    `;

    // 消息内容
    if (log.message) {
      content += `<div class="f12-log-content">${this.escapeHtml(log.message)}</div>`;
    }

    if (log.args && log.args.length > 0) {
      log.args.forEach(arg => {
        if (typeof arg === 'object' && arg !== null) {
          content += `<div class="f12-log-json">${JSON.stringify(arg, null, 2)}</div>`;
        } else {
          content += `<div class="f12-log-content">${this.escapeHtml(String(arg))}</div>`;
        }
      });
    }

    // 错误堆栈
    if (log.stack) {
      content += `<div class="f12-log-stack"><strong>堆栈:</strong>\n${this.escapeHtml(log.stack)}</div>`;
    }

    if (log.error && log.error.stack) {
      content += `<div class="f12-log-stack"><strong>错误堆栈:</strong>\n${this.escapeHtml(log.error.stack)}</div>`;
    }

    // 文件信息
    if (log.filename) {
      content += `<div class="f12-log-content"><strong>文件:</strong> ${log.filename}:${log.lineno}:${log.colno}</div>`;
    }

    el.innerHTML = content;
    return el;
  }

  refreshLogs() {
    const container = document.getElementById('f12LogsContainer');
    container.innerHTML = '';

    const logs = this.consoleMonitor.filterLogs({
      type: this.currentFilter === 'all' ? null : this.currentFilter
    });

    if (logs.length === 0) {
      container.innerHTML = '<div class="f12-log-item f12-log-system">📭 暂无日志</div>';
      return;
    }

    logs.slice(0, 100).forEach(log => {
      container.appendChild(this.createLogElement(log));
    });
  }

  updateStats() {
    const stats = this.consoleMonitor.getStats();

    document.getElementById('f12TotalLogs').textContent = stats.total;
    document.getElementById('statErrors').textContent = stats.byType.error || 0;
    document.getElementById('statWarnings').textContent = stats.byType.warn || 0;
    document.getElementById('statInfos').textContent = stats.byType.info || 0;
    document.getElementById('statLogs').textContent = stats.byType.log || 0;

    document.getElementById('footerTotal').textContent = stats.total;
    document.getElementById('footerErrors').textContent = stats.byType.error || 0;
  }

  exportLogs() {
    const stats = this.consoleMonitor.getStats();

    // 创建导出内容
    const sections = [];

    sections.push('='.repeat(100));
    sections.push('Boss直聘智能助手 - 完整调试信息导出');
    sections.push('='.repeat(100));
    sections.push('');

    sections.push('📊 基本信息');
    sections.push('-'.repeat(100));
    sections.push(`导出时间: ${new Date().toLocaleString('zh-CN')}`);
    sections.push(`页面URL: ${window.location.href}`);
    sections.push(`User-Agent: ${navigator.userAgent}`);
    sections.push(`浏览器: ${navigator.appName} ${navigator.appVersion}`);
    sections.push(`插件版本: ${chrome.runtime.getManifest().version}`);
    sections.push('');

    sections.push('📈 统计信息');
    sections.push('-'.repeat(100));
    sections.push(`总日志数: ${stats.total}`);
    sections.push(`错误: ${stats.byType.error || 0}`);
    sections.push(`警告: ${stats.byType.warn || 0}`);
    sections.push(`信息: ${stats.byType.info || 0}`);
    sections.push(`普通日志: ${stats.byType.log || 0}`);
    sections.push('');

    if (stats.recentErrors.length > 0) {
      sections.push('🚨 最近10个错误');
      sections.push('-'.repeat(100));
      stats.recentErrors.forEach((error, i) => {
        sections.push(`\n[错误 ${i + 1}] ${error.time}`);
        sections.push(`消息: ${error.message || '无消息'}`);
        if (error.filename) {
          sections.push(`位置: ${error.filename}:${error.lineno}:${error.colno}`);
        }
        if (error.stack) {
          sections.push(`堆栈:\n${error.stack}`);
        }
        if (error.error && error.error.stack) {
          sections.push(`详细堆栈:\n${error.error.stack}`);
        }
        sections.push('-'.repeat(50));
      });
      sections.push('');
    }

    sections.push('📝 完整日志 (按时间倒序)');
    sections.push('-'.repeat(100));
    sections.push(this.consoleMonitor.exportAsText());
    sections.push('');

    sections.push('📦 JSON格式数据');
    sections.push('-'.repeat(100));
    sections.push(this.consoleMonitor.exportAsJSON());
    sections.push('');

    sections.push('='.repeat(100));
    sections.push('导出完成');
    sections.push('='.repeat(100));

    const fullText = sections.join('\n');

    // 创建下载
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boss-debug-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // 同时复制到剪贴板
    navigator.clipboard.writeText(fullText).then(() => {
      alert('✅ 调试信息已导出并复制到剪贴板！\n\n' +
            `文件已保存: boss-debug-${Date.now()}.txt\n\n` +
            '你现在可以:\n' +
            '1. 直接粘贴发送给开发者\n' +
            '2. 或查看下载的txt文件');
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 全局暴露
window.F12CapturePanel = F12CapturePanel;
