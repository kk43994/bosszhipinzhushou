/**
 * 悬浮调试面板 - 优化版 (2025-11-04)
 * 功能：实时监控插件运行状态、性能指标、API调用、日志追踪
 */

class DebugPanel {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // 增加日志容量
    this.isMinimized = false;
    this.isPinned = false; // 是否固定位置
    this.isCollapsed = false; // 是否折叠区块

    // 性能监控
    this.performanceMetrics = {
      startTime: Date.now(),
      apiCalls: 0,
      apiSuccess: 0,
      apiFailed: 0,
      candidatesAnalyzed: 0,
      averageScoreTime: 0,
      errors: []
    };

    // 创建面板
    this.createPanel();

    // 启动性能监控
    this.startPerformanceMonitoring();
  }

  /**
   * 创建悬浮面板 - 优化UI
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'boss-debug-panel';
    panel.innerHTML = `
      <div class="debug-header">
        <div class="debug-title-bar">
          <span class="debug-icon">🤖</span>
          <span class="debug-title">Boss智能助手调试台</span>
          <span class="debug-version">v1.0</span>
        </div>
        <div class="debug-controls">
          <button class="debug-btn" id="debugPin" title="固定/取消固定">📌</button>
          <button class="debug-btn" id="debugMinimize" title="最小化">−</button>
          <button class="debug-btn" id="debugClose" title="关闭">×</button>
        </div>
      </div>

      <div class="debug-body">
        <!-- 性能仪表盘 -->
        <div class="debug-section" data-section="performance">
          <div class="section-header" data-toggle="performance">
            <h4>📊 性能监控</h4>
            <span class="section-toggle">▼</span>
          </div>
          <div class="section-content" id="performanceContent">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">运行时长</div>
                <div class="metric-value" id="metricUptime">0s</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">API调用</div>
                <div class="metric-value" id="metricApiCalls">0</div>
              </div>
              <div class="metric-card success">
                <div class="metric-label">成功率</div>
                <div class="metric-value" id="metricSuccessRate">100%</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">牛人分析</div>
                <div class="metric-value" id="metricCandidates">0</div>
              </div>
            </div>
            <div class="performance-bar">
              <div class="bar-label">内存使用</div>
              <div class="bar-container">
                <div class="bar-fill" id="memoryBar" style="width: 0%"></div>
              </div>
              <div class="bar-value" id="memoryValue">0 MB</div>
            </div>
          </div>
        </div>

        <!-- 模块状态 -->
        <div class="debug-section" data-section="modules">
          <div class="section-header" data-toggle="modules">
            <h4>🔌 模块状态</h4>
            <span class="section-toggle">▼</span>
          </div>
          <div class="section-content" id="modulesContent">
            <div class="module-list">
              <div class="module-item" data-module="config">
                <span class="module-icon">⚙️</span>
                <span class="module-name">配置管理</span>
                <span class="module-status status-loading" id="statusConfig">检测中</span>
              </div>
              <div class="module-item" data-module="analyzer">
                <span class="module-icon">🤖</span>
                <span class="module-name">AI分析器</span>
                <span class="module-status status-loading" id="statusAI">检测中</span>
              </div>
              <div class="module-item" data-module="scorer">
                <span class="module-icon">⭐</span>
                <span class="module-name">智能评分</span>
                <span class="module-status status-loading" id="statusScorer">检测中</span>
              </div>
              <div class="module-item" data-module="reply">
                <span class="module-icon">💬</span>
                <span class="module-name">回复助手</span>
                <span class="module-status status-loading" id="statusReply">检测中</span>
              </div>
              <div class="module-item" data-module="greet">
                <span class="module-icon">👋</span>
                <span class="module-name">打招呼助手</span>
                <span class="module-status status-loading" id="statusGreet">检测中</span>
              </div>
              <div class="module-item" data-module="dashboard">
                <span class="module-icon">📋</span>
                <span class="module-name">智能面板</span>
                <span class="module-status status-loading" id="statusDashboard">检测中</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 页面信息 -->
        <div class="debug-section" data-section="pageinfo">
          <div class="section-header" data-toggle="pageinfo">
            <h4>📄 页面信息</h4>
            <span class="section-toggle">▼</span>
          </div>
          <div class="section-content" id="pageinfoContent">
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">当前页面</span>
                <span class="info-value" id="infoPageType">未知</span>
              </div>
              <div class="info-row">
                <span class="info-label">URL</span>
                <span class="info-value small" id="infoURL">-</span>
              </div>
              <div class="info-row">
                <span class="info-label">牛人数量</span>
                <span class="info-value" id="infoCandidates">0</span>
              </div>
              <div class="info-row">
                <span class="info-label">输入框</span>
                <span class="info-value" id="infoInput">未检测</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 实时日志 -->
        <div class="debug-section" data-section="logs">
          <div class="section-header" data-toggle="logs">
            <h4>📝 实时日志</h4>
            <div class="section-actions">
              <button class="mini-btn" id="clearLogs" title="清空日志">🗑️</button>
              <button class="mini-btn" id="exportLogs" title="导出日志">💾</button>
              <span class="section-toggle">▼</span>
            </div>
          </div>
          <div class="section-content" id="logsContent">
            <div class="log-filters">
              <button class="filter-btn active" data-filter="all">全部</button>
              <button class="filter-btn" data-filter="success">成功</button>
              <button class="filter-btn" data-filter="info">信息</button>
              <button class="filter-btn" data-filter="warning">警告</button>
              <button class="filter-btn" data-filter="error">错误</button>
            </div>
            <div class="debug-logs" id="debugLogs">
              <div class="log-item log-info">⏳ 等待日志输出...</div>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="debug-section" data-section="actions">
          <div class="section-header" data-toggle="actions">
            <h4>🔧 快捷操作</h4>
            <span class="section-toggle">▼</span>
          </div>
          <div class="section-content" id="actionsContent">
            <div class="action-grid">
              <button class="action-btn primary" id="actionRefresh">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">刷新分析</span>
              </button>
              <button class="action-btn" id="actionTestAPI">
                <span class="btn-icon">🧪</span>
                <span class="btn-text">测试API</span>
              </button>
              <button class="action-btn" id="actionExtract">
                <span class="btn-icon">📋</span>
                <span class="btn-text">提取牛人</span>
              </button>
              <button class="action-btn" id="actionClearCache">
                <span class="btn-icon">🗑️</span>
                <span class="btn-text">清空缓存</span>
              </button>
              <button class="action-btn" id="actionTestScore">
                <span class="btn-icon">⭐</span>
                <span class="btn-text">测试评分</span>
              </button>
              <button class="action-btn" id="actionShowDashboard">
                <span class="btn-icon">📊</span>
                <span class="btn-text">显示面板</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="debug-footer">
        <span class="footer-item">🟢 运行中</span>
        <span class="footer-item">日志: <span id="logCount">0</span></span>
        <span class="footer-item">错误: <span id="errorCount">0</span></span>
      </div>
    `;

    document.body.appendChild(panel);

    // 添加优化样式
    this.injectStyles();

    // 绑定事件
    this.bindEvents();

    // 启动状态更新
    this.startUpdating();

    // 拦截console
    this.interceptConsole();

    this.log('调试面板已启动', 'success');
  }

  /**
   * 注入优化样式
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #boss-debug-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 450px;
        max-height: 85vh;
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.15);
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 13px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #boss-debug-panel:hover {
        box-shadow: 0 16px 64px rgba(0,0,0,0.2);
      }

      #boss-debug-panel.minimized .debug-body,
      #boss-debug-panel.minimized .debug-footer {
        display: none;
      }

      #boss-debug-panel.pinned {
        opacity: 0.3;
        transition: opacity 0.3s;
      }

      #boss-debug-panel.pinned:hover {
        opacity: 1;
      }

      /* 头部 */
      .debug-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .debug-title-bar {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .debug-icon {
        font-size: 18px;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .debug-title {
        font-weight: 600;
        font-size: 15px;
      }

      .debug-version {
        font-size: 11px;
        opacity: 0.8;
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 10px;
      }

      .debug-controls {
        display: flex;
        gap: 6px;
      }

      .debug-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .debug-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.1);
      }

      .debug-btn:active {
        transform: scale(0.95);
      }

      /* 主体 */
      .debug-body {
        max-height: calc(85vh - 100px);
        overflow-y: auto;
        padding: 16px;
        scrollbar-width: thin;
        scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
      }

      .debug-body::-webkit-scrollbar {
        width: 6px;
      }

      .debug-body::-webkit-scrollbar-track {
        background: transparent;
      }

      .debug-body::-webkit-scrollbar-thumb {
        background: rgba(102, 126, 234, 0.3);
        border-radius: 3px;
      }

      .debug-body::-webkit-scrollbar-thumb:hover {
        background: rgba(102, 126, 234, 0.5);
      }

      /* 区块 */
      .debug-section {
        margin-bottom: 14px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid rgba(102, 126, 234, 0.1);
        transition: all 0.3s;
      }

      .debug-section:hover {
        background: rgba(255, 255, 255, 0.7);
        border-color: rgba(102, 126, 234, 0.2);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        margin-bottom: 12px;
      }

      .section-header h4 {
        margin: 0;
        font-size: 14px;
        color: #333;
        font-weight: 600;
      }

      .section-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .section-toggle {
        font-size: 12px;
        transition: transform 0.3s;
      }

      .section-header.collapsed .section-toggle {
        transform: rotate(-90deg);
      }

      .section-content {
        animation: slideDown 0.3s ease-out;
      }

      .section-content.hidden {
        display: none;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* 性能指标 */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.8);
        padding: 12px;
        border-radius: 10px;
        text-align: center;
        border: 2px solid #e8e8e8;
        transition: all 0.3s;
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .metric-card.success {
        border-color: #52c41a;
        background: rgba(82, 196, 26, 0.1);
      }

      .metric-label {
        font-size: 11px;
        color: #999;
        margin-bottom: 6px;
      }

      .metric-value {
        font-size: 20px;
        font-weight: bold;
        color: #333;
      }

      .metric-card.success .metric-value {
        color: #52c41a;
      }

      /* 性能条 */
      .performance-bar {
        margin-top: 10px;
      }

      .bar-label {
        font-size: 11px;
        color: #999;
        margin-bottom: 6px;
      }

      .bar-container {
        height: 8px;
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.5s ease-out;
      }

      .bar-value {
        font-size: 11px;
        color: #666;
      }

      /* 模块列表 */
      .module-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .module-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        border: 1px solid #e8e8e8;
        transition: all 0.2s;
      }

      .module-item:hover {
        background: rgba(255, 255, 255, 1);
        transform: translateX(4px);
      }

      .module-icon {
        font-size: 18px;
      }

      .module-name {
        flex: 1;
        font-size: 13px;
        color: #333;
        font-weight: 500;
      }

      .module-status {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 600;
      }

      .status-loading {
        background: #ff9800;
        color: white;
      }

      .status-ok {
        background: #52c41a;
        color: white;
      }

      .status-error {
        background: #f5222d;
        color: white;
      }

      /* 信息列表 */
      .info-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 6px;
      }

      .info-label {
        font-size: 12px;
        color: #999;
      }

      .info-value {
        font-size: 12px;
        color: #333;
        font-weight: 600;
      }

      .info-value.small {
        font-size: 11px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 日志 */
      .log-filters {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }

      .filter-btn {
        padding: 4px 10px;
        border: 1px solid #e8e8e8;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 14px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        color: #666;
      }

      .filter-btn:hover {
        background: rgba(255, 255, 255, 1);
        border-color: #667eea;
      }

      .filter-btn.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      .debug-logs {
        max-height: 250px;
        overflow-y: auto;
        background: rgba(30, 30, 30, 0.05);
        border-radius: 8px;
        padding: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
        scrollbar-width: thin;
      }

      .log-item {
        padding: 6px 10px;
        margin-bottom: 4px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.6;
        border-left: 3px solid transparent;
        transition: all 0.2s;
        animation: fadeIn 0.3s;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .log-item:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .log-success {
        color: #52c41a;
        border-left-color: #52c41a;
        background: rgba(82, 196, 26, 0.05);
      }

      .log-info {
        color: #1890ff;
        border-left-color: #1890ff;
        background: rgba(24, 144, 255, 0.05);
      }

      .log-warning {
        color: #faad14;
        border-left-color: #faad14;
        background: rgba(250, 173, 20, 0.05);
      }

      .log-error {
        color: #f5222d;
        border-left-color: #f5222d;
        background: rgba(245, 34, 45, 0.1);
      }

      .log-time {
        opacity: 0.6;
        font-size: 10px;
        margin-right: 8px;
      }

      /* 操作按钮 */
      .action-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 12px;
        color: #333;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 1);
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .action-btn:active {
        transform: translateY(0);
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
      }

      .action-btn.primary:hover {
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
      }

      .btn-icon {
        font-size: 16px;
      }

      .btn-text {
        font-weight: 500;
      }

      .mini-btn {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.2s;
      }

      .mini-btn:hover {
        opacity: 1;
        transform: scale(1.2);
      }

      /* 底部 */
      .debug-footer {
        display: flex;
        justify-content: space-between;
        padding: 10px 18px;
        background: rgba(248, 249, 255, 0.8);
        border-top: 1px solid rgba(102, 126, 234, 0.1);
        font-size: 11px;
        color: #666;
      }

      .footer-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      #errorCount {
        color: #f5222d;
        font-weight: bold;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const panel = document.getElementById('boss-debug-panel');

    // 最小化/恢复
    document.getElementById('debugMinimize').onclick = () => {
      this.isMinimized = !this.isMinimized;
      panel.classList.toggle('minimized');
      this.log(this.isMinimized ? '面板已最小化' : '面板已恢复', 'info');
    };

    // 固定/取消固定
    document.getElementById('debugPin').onclick = () => {
      this.isPinned = !this.isPinned;
      panel.classList.toggle('pinned');
      this.log(this.isPinned ? '面板已固定（半透明）' : '面板已取消固定', 'info');
    };

    // 关闭
    document.getElementById('debugClose').onclick = () => {
      panel.remove();
      this.log('调试面板已关闭', 'info');
    };

    // 区块折叠/展开
    document.querySelectorAll('.section-header').forEach(header => {
      header.onclick = () => {
        const section = header.parentElement;
        const content = section.querySelector('.section-content');
        const toggle = header.querySelector('.section-toggle');

        header.classList.toggle('collapsed');
        content.classList.toggle('hidden');

        if (toggle) {
          toggle.textContent = content.classList.contains('hidden') ? '▶' : '▼';
        }
      };
    });

    // 清空日志
    document.getElementById('clearLogs').onclick = () => {
      this.clearLogs();
    };

    // 导出日志
    document.getElementById('exportLogs').onclick = () => {
      this.exportLogs();
    };

    // 日志过滤
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterLogs(btn.dataset.filter);
      };
    });

    // 快捷操作
    document.getElementById('actionRefresh').onclick = () => {
      this.log('触发刷新分析...', 'info');
      this.refreshAnalysis();
    };

    document.getElementById('actionTestAPI').onclick = () => {
      this.log('开始测试API连接...', 'info');
      this.testAPI();
    };

    document.getElementById('actionExtract').onclick = () => {
      this.log('提取牛人信息...', 'info');
      this.extractCandidates();
    };

    document.getElementById('actionClearCache').onclick = () => {
      this.log('清空缓存...', 'warning');
      this.clearCache();
    };

    document.getElementById('actionTestScore').onclick = () => {
      this.log('测试评分功能...', 'info');
      this.testScoring();
    };

    document.getElementById('actionShowDashboard').onclick = () => {
      this.log('显示智能分析面板...', 'info');
      this.showDashboard();
    };

    // 可拖动
    this.makeDraggable(panel);
  }

  /**
   * 可拖动
   */
  makeDraggable(element) {
    const header = element.querySelector('.debug-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.onmousedown = (e) => {
      if (e.target.closest('.debug-controls')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = element.offsetLeft;
      startTop = element.offsetTop;
      element.style.transition = 'none';
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      element.style.left = (startLeft + dx) + 'px';
      element.style.top = (startTop + dy) + 'px';
      element.style.right = 'auto';
    };

    document.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        element.style.transition = '';
      }
    };
  }

  /**
   * 启动状态更新
   */
  startUpdating() {
    // 每2秒更新一次状态
    setInterval(() => {
      this.updateModuleStatus();
      this.updatePageInfo();
      this.updatePerformanceMetrics();
    }, 2000);
  }

  /**
   * 更新模块状态
   */
  updateModuleStatus() {
    const modules = {
      config: { element: 'statusConfig', check: () => !!window.configManager },
      analyzer: { element: 'statusAI', check: () => !!window.aiAnalyzer },
      scorer: { element: 'statusScorer', check: () => !!window.recommendScorer },
      reply: { element: 'statusReply', check: () => !!window.autoReplyAssistant },
      greet: { element: 'statusGreet', check: () => !!window.autoGreetAssistant },
      dashboard: { element: 'statusDashboard', check: () => !!window.recommendDashboard }
    };

    for (const [key, module] of Object.entries(modules)) {
      const el = document.getElementById(module.element);
      if (!el) continue;

      const isLoaded = module.check();
      el.textContent = isLoaded ? '✅ 正常' : '❌ 未加载';
      el.className = isLoaded ? 'module-status status-ok' : 'module-status status-error';
    }
  }

  /**
   * 更新页面信息
   */
  updatePageInfo() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // 检测页面类型
    let pageType = '未知';
    if (pathname.includes('/web/chat')) pageType = '💬 沟通页面';
    else if (pathname.includes('/web/geek/job')) pageType = '📝 职位管理';
    else if (pathname.includes('/web/geek/recommend')) pageType = '🔍 推荐牛人';
    else if (pathname.includes('/web/geek/')) pageType = '🔍 搜索牛人';

    document.getElementById('infoPageType').textContent = pageType;
    document.getElementById('infoURL').textContent = url;

    // 牛人数量
    const candidates = window.recommendDashboard?.state?.niurenList?.length || 0;
    document.getElementById('infoCandidates').textContent = candidates;

    // 输入框
    const input = document.querySelector('[contenteditable="true"]') ||
                  document.querySelector('textarea');
    document.getElementById('infoInput').textContent = input ? '✅ 已检测' : '❌ 未检测';
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics() {
    // 运行时长
    const uptime = Math.floor((Date.now() - this.performanceMetrics.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const uptimeText = hours > 0 ? `${hours}h ${minutes}m` :
                       minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    document.getElementById('metricUptime').textContent = uptimeText;

    // API调用
    document.getElementById('metricApiCalls').textContent = this.performanceMetrics.apiCalls;

    // 成功率
    const total = this.performanceMetrics.apiCalls;
    const successRate = total > 0 ?
      Math.round((this.performanceMetrics.apiSuccess / total) * 100) : 100;
    document.getElementById('metricSuccessRate').textContent = successRate + '%';

    // 牛人分析
    document.getElementById('metricCandidates').textContent = this.performanceMetrics.candidatesAnalyzed;

    // 内存使用（估算）
    if (performance.memory) {
      const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
      const totalMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1);
      const percentage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1);

      document.getElementById('memoryValue').textContent = `${usedMB} / ${totalMB} MB`;
      document.getElementById('memoryBar').style.width = percentage + '%';
    }

    // 日志和错误计数
    document.getElementById('logCount').textContent = this.logs.length;
    document.getElementById('errorCount').textContent = this.performanceMetrics.errors.length;
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    // 监控API调用
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args) {
      const startTime = Date.now();
      self.performanceMetrics.apiCalls++;

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;

        if (response.ok) {
          self.performanceMetrics.apiSuccess++;
          self.log(`API调用成功 (${duration}ms): ${args[0]}`, 'success');
        } else {
          self.performanceMetrics.apiFailed++;
          self.log(`API调用失败: ${response.status}`, 'error');
        }

        return response;
      } catch (error) {
        self.performanceMetrics.apiFailed++;
        self.log(`API调用异常: ${error.message}`, 'error');
        throw error;
      }
    };
  }

  /**
   * 拦截console
   */
  interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const self = this;

    console.log = function(...args) {
      originalLog.apply(console, args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');

      // 只记录插件相关日志
      if (message.includes('Boss') || message.includes('智能助手') ||
          message.includes('✅') || message.includes('❌')) {
        self.log(message, 'info');
      }
    };

    console.error = function(...args) {
      originalError.apply(console, args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      self.log(message, 'error');
      self.performanceMetrics.errors.push({ time: Date.now(), message });
    };

    console.warn = function(...args) {
      originalWarn.apply(console, args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      self.log(message, 'warning');
    };
  }

  /**
   * 添加日志
   */
  log(message, type = 'info') {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const log = {
      time,
      message,
      type,
      timestamp: Date.now()
    };

    this.logs.unshift(log);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.renderLogs();
  }

  /**
   * 渲染日志
   */
  renderLogs() {
    const logsContainer = document.getElementById('debugLogs');
    if (!logsContainer) return;

    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const filteredLogs = activeFilter === 'all' ?
      this.logs :
      this.logs.filter(log => log.type === activeFilter);

    logsContainer.innerHTML = filteredLogs.length === 0 ?
      '<div class="log-item log-info">📭 暂无日志</div>' :
      filteredLogs.map(log => `
        <div class="log-item log-${log.type}">
          <span class="log-time">${log.time}</span>
          ${this.escapeHtml(log.message)}
        </div>
      `).join('');

    // 滚动到最新
    logsContainer.scrollTop = 0;
  }

  /**
   * 过滤日志
   */
  filterLogs(filter) {
    this.renderLogs();
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.renderLogs();
    this.log('日志已清空', 'info');
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const data = this.logs.map(log =>
      `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boss-assistant-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.log('日志已导出', 'success');
  }

  /**
   * 刷新分析
   */
  refreshAnalysis() {
    if (window.recommendDashboard) {
      window.recommendDashboard.scanNiurenList();
      this.log('已触发牛人列表刷新', 'success');
    } else {
      this.log('智能面板未加载', 'error');
    }
  }

  /**
   * 测试API连接
   */
  async testAPI() {
    try {
      const result = await chrome.storage.local.get('config');
      const config = result.config || {};

      // ✅ 支持新的配置格式
      const aiProvider = config.aiProvider || 'gemini';
      const apiKey = aiProvider === 'gemini' ? config.geminiApiKey : config.zhipuApiKey;

      // 向后兼容：如果新字段不存在，尝试读取旧字段
      const legacyKey = config.apiKey;
      const finalKey = apiKey || legacyKey;

      if (!finalKey) {
        const providerName = aiProvider === 'gemini' ? 'Gemini' : '智谱AI';
        this.log(`未配置${providerName} API密钥，请在插件设置中配置`, 'error');
        return;
      }

      const providerName = aiProvider === 'gemini' ? 'Gemini' : '智谱AI';
      this.log(`开始测试${providerName} API连接...`, 'info');

      // 根据提供商调用不同的API
      if (aiProvider === 'gemini') {
        await this.testGeminiAPI(finalKey);
      } else {
        await this.testZhipuAPI(finalKey);
      }
    } catch (error) {
      this.log(`❌ API测试异常: ${error.message}`, 'error');
    }
  }

  /**
   * 测试Gemini API
   */
  async testGeminiAPI(apiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: '测试连接' }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
            topK: 40,
            topP: 0.95
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        this.log('✅ Gemini API连接成功', 'success');
        this.log(`返回内容: ${data.candidates[0].content.parts[0].text}`, 'info');
      } else {
        this.log('⚠️ Gemini API连接成功但返回格式异常', 'warning');
        console.log('Gemini返回数据:', data);
      }
    } else {
      const errorText = await response.text();
      let errorMsg = `Gemini API调用失败 (${response.status})`;

      if (response.status === 400) {
        errorMsg = '请求参数错误，请检查API配置';
      } else if (response.status === 401 || response.status === 403) {
        errorMsg = 'API密钥无效或权限不足';
      } else if (response.status === 429) {
        errorMsg = 'API请求频率超限，请稍后重试';
      } else if (response.status === 500) {
        errorMsg = 'Gemini服务器错误，请稍后重试';
      }

      this.log(`❌ ${errorMsg}`, 'error');
      if (errorText) {
        console.error('Gemini API错误详情:', errorText);
      }
    }
  }

  /**
   * 测试智谱AI API
   */
  async testZhipuAPI(apiKey) {
    const response = await fetch(
      `https://open.bigmodel.cn/api/paas/v4/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            {
              role: 'user',
              content: '测试连接'
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        this.log('✅ 智谱AI API连接成功', 'success');
        this.log(`返回内容: ${data.choices[0].message.content}`, 'info');
      } else {
        this.log('⚠️ 智谱AI API连接成功但返回格式异常', 'warning');
        console.log('智谱AI返回数据:', data);
      }
    } else {
      const errorText = await response.text();
      let errorMsg = `智谱AI API调用失败 (${response.status})`;

      if (response.status === 401) {
        errorMsg = 'API密钥无效或已过期';
      } else if (response.status === 429) {
        errorMsg = 'API请求频率超限，请稍后重试';
      }

      this.log(`❌ ${errorMsg}`, 'error');
      if (errorText) {
        console.error('智谱AI API错误详情:', errorText);
      }
    }
  }
}

// 自动启动（仅在推荐页面、沟通页面、搜索页面）
if (window.location.href.includes('zhipin.com') &&
    (window.location.pathname.includes('/web/geek/') ||
     window.location.pathname.includes('/web/chat'))) {

  // 延迟启动，确保页面加载完成
  setTimeout(() => {
    if (!window.bossDebugPanel) {
      window.bossDebugPanel = new DebugPanel();
    }
  }, 3000);
}
