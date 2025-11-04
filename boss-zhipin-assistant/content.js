/**
 * Content Script - 主控制脚本
 * 在Boss直聘页面中运行
 */

(function() {
  'use strict';

  console.log('Boss直聘智能助手已加载');

  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('开始初始化...');

    // 检查是否在Boss直聘网站
    if (!window.location.href.includes('zhipin.com')) {
      console.log('不在Boss直聘网站，跳过加载');
      return;
    }

    // 添加插件标识（防止重复加载）
    if (window.bossAssistantLoaded) {
      console.log('插件已加载，跳过');
      return;
    }
    window.bossAssistantLoaded = true;

    // 延迟启动，确保页面元素加载完成
    setTimeout(() => {
      startAssistant();
    }, 2000);
  }

  /**
   * 检测当前页面类型（2025-11-04新增）
   */
  function detectCurrentPage() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    if (pathname.includes('/web/chat')) {
      return 'chat';  // 沟通页面
    } else if (pathname.includes('/web/geek/job')) {
      return 'jobManage';  // 职位管理
    } else if (pathname.includes('/web/geek/recommend')) {
      return 'recommend';  // 推荐牛人
    } else if (pathname.includes('/web/geek/')) {
      return 'search';  // 搜索牛人
    }

    return 'other';
  }

  async function startAssistant() {
    try {
      console.log('✨ 启动Boss直聘智能助手...');

      // 获取配置
      const config = await loadConfig();
      console.log('📋 配置加载完成:', config);

      // 检查插件是否启用
      if (config.enabled === false) {
        console.log('⏸️ 插件已关闭，跳过启动');
        showDisabledToast();
        return;
      }

      // 检测当前页面类型（2025-11-04优化）
      const pageType = detectCurrentPage();
      console.log(`📍 当前页面类型: ${pageType}`);

      // 🔍 启动F12调试信息捕获面板（2025-11-04新增）
      // 这个面板会实时捕获所有console输出、错误、网络请求等信息
      // 用户可以一键导出所有调试信息，方便反馈问题
      try {
        if (window.F12CapturePanel) {
          window.f12CapturePanel = new F12CapturePanel();
          console.log('🔍 F12调试信息捕获面板已启动');
        }
      } catch (error) {
        console.error('F12捕获面板启动失败:', error);
      }

      // 显示启动提示
      showWelcome();

      // 根据页面类型启用不同功能（2025-11-04优化）
      switch (pageType) {
        case 'chat':
          console.log('💬 沟通页面 - 启动聊天相关功能');

          // 启动半自动回复助手
          if (window.autoReplyAssistant) {
            window.autoReplyAssistant.init();
            console.log('✅ 半自动回复助手已启动');
          }

          // 启动半自动打招呼助手
          if (window.autoGreetAssistant) {
            window.autoGreetAssistant.init();
            console.log('✅ 半自动打招呼助手已启动');
          }

          // 启动一键发送面试地址功能（新增2025-11-04）
          if (window.interviewSender) {
            // interviewSender在构造函数中已自动初始化
            console.log('✅ 一键发送面试地址功能已启动');
          }
          break;

        case 'jobManage':
          console.log('📝 职位管理页面');
          // 暂无专用功能
          break;

        case 'recommend':
          console.log('🔍 推荐牛人页面 - 启动智能评分和打招呼功能');

          // 启动智能分析面板（新增2025-11-04）
          if (window.recommendDashboard) {
            window.recommendDashboard.init();
            console.log('✅ 推荐牛人智能分析面板已启动');
          }

          // 启动智能评分引擎
          if (window.recommendScorer) {
            window.recommendScorer.init();
            console.log('✅ 推荐牛人智能评分已启动');
          }

          // 启动一键打招呼功能
          if (window.recommendGreeter) {
            window.recommendGreeter.init();
            // 加载打招呼历史
            window.recommendGreeter.loadGreetHistory();
            console.log('✅ 推荐牛人一键打招呼已启动');
          }
          break;

        case 'search':
          console.log('🔍 牛人搜索页面');
          // 搜索页面可以复用推荐页面的功能

          // 启动智能分析面板
          if (window.recommendDashboard) {
            window.recommendDashboard.init();
          }

          if (window.recommendScorer) {
            window.recommendScorer.init();
          }
          if (window.recommendGreeter) {
            window.recommendGreeter.init();
            window.recommendGreeter.loadGreetHistory();
          }
          break;

        default:
          console.log('⚠️ 其他页面，暂不支持');
          showToast('当前页面暂不支持，请进入沟通页面使用');
      }

      // 添加快捷键支持
      setupKeyboardShortcuts();

      console.log('🎉 插件初始化完成！');

    } catch (error) {
      console.error('❌ 启动失败:', error);
      showError('助手启动失败: ' + error.message);
    }
  }

  /**
   * 加载配置
   */
  async function loadConfig() {
    try {
      const result = await chrome.storage.local.get('config');
      return result.config || {
        enabled: true,
        useAI: false,  // 默认不使用AI API（使用规则评分）
        apiKey: ''
      };
    } catch (error) {
      console.error('加载配置失败:', error);
      return { enabled: true, useAI: false, apiKey: '' };
    }
  }

  /**
   * 显示插件已关闭提示
   */
  function showDisabledToast() {
    const toast = document.createElement('div');
    toast.className = 'boss-disabled-toast';
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">⏸️</span>
        <div>
          <div style="font-weight: bold;">Boss智能助手已关闭</div>
          <div style="font-size: 12px; opacity: 0.8;">请在插件设置中启用</div>
        </div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999999;
      font-size: 14px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 显示欢迎提示
   */
  function showWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'boss-welcome-toast';
    welcome.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">🤖</span>
        <div>
          <div style="font-weight: bold;">Boss直聘智能助手已启动</div>
          <div style="font-size: 12px; opacity: 0.8;">半自动模式 | 安全无风险</div>
        </div>
      </div>
    `;

    document.body.appendChild(welcome);

    setTimeout(() => welcome.classList.add('show'), 100);
    setTimeout(() => {
      welcome.classList.remove('show');
      setTimeout(() => welcome.remove(), 500);
    }, 4000);
  }

  /**
   * 显示错误提示
   */
  function showError(message) {
    const error = document.createElement('div');
    error.className = 'boss-error-toast';
    error.textContent = '❌ ' + message;
    document.body.appendChild(error);

    setTimeout(() => error.classList.add('show'), 100);
    setTimeout(() => {
      error.classList.remove('show');
      setTimeout(() => error.remove(), 500);
    }, 5000);
  }

  /**
   * 设置键盘快捷键
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + A: 打开设置面板
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        openSettings();
      }

      // Ctrl/Cmd + Shift + R: 刷新候选人分析
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        refreshAnalysis();
      }
    });

    console.log('快捷键已设置:');
    console.log('  Ctrl+Shift+A: 打开设置');
    console.log('  Ctrl+Shift+R: 刷新分析');
  }

  /**
   * 打开设置面板
   */
  function openSettings() {
    // 触发打开Chrome插件弹窗
    console.log('请点击浏览器工具栏的插件图标打开设置');
    showToast('请点击浏览器工具栏的 🤖 图标打开设置');
  }

  /**
   * 刷新分析（2025-11-04优化）
   */
  function refreshAnalysis() {
    if (window.autoGreetAssistant) {
      window.autoGreetAssistant.processedNiuren.clear();  // 改为牛人
      window.autoGreetAssistant.scanChatList();
      showToast('🔄 正在重新分析牛人...');
    }
  }

  /**
   * 显示Toast提示
   */
  function showToast(message) {
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
   * 监听来自background的消息
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);

    if (request.action === 'ping') {
      sendResponse({ status: 'ok', loaded: true });
    }

    if (request.action === 'refresh') {
      refreshAnalysis();
      sendResponse({ status: 'ok' });
    }

    if (request.action === 'configUpdated') {
      console.log('配置已更新:', request.config);

      // 如果插件被关闭，停止所有功能
      if (request.config.enabled === false) {
        showDisabledToast();
        // TODO: 这里可以添加停止所有功能的逻辑
      } else {
        // 如果插件被启用，重新加载
        location.reload();
      }

      sendResponse({ status: 'ok' });
    }

    if (request.action === 'getStats') {
      // 获取当前页面统计（2025-11-04优化）
      const stats = {
        url: window.location.href,
        candidatesFound: window.autoGreetAssistant?.processedNiuren.size || 0
      };
      sendResponse(stats);
    }

    // 岗位配置相关消息处理（2025-11-04新增）
    if (request.action === 'getAllJobConfigs') {
      const configs = window.jobConfigManager?.getAllConfigs() || [];
      const activeConfigId = window.jobConfigManager?.activeConfigId || null;
      sendResponse({ configs, activeConfigId });
    }

    if (request.action === 'setActiveJobConfig') {
      const success = window.jobConfigManager?.setActiveConfig(request.configId);
      sendResponse({ success });
    }

    if (request.action === 'createJobConfig') {
      const config = window.jobConfigManager?.createConfig(request.configData);
      sendResponse({ config });
    }

    if (request.action === 'updateJobConfig') {
      const config = window.jobConfigManager?.updateConfig(request.configId, request.updates);
      sendResponse({ config });
    }

    if (request.action === 'deleteJobConfig') {
      const success = window.jobConfigManager?.deleteConfig(request.configId);
      sendResponse({ success });
    }

    if (request.action === 'parseJobRequirements') {
      // AI解析岗位需求（异步）
      (async () => {
        try {
          const config = await window.jobConfigManager?.parseJobRequirements(request.rawText);
          sendResponse({ config });
        } catch (error) {
          sendResponse({ error: error.message });
        }
      })();
      return true; // 异步响应
    }

    if (request.action === 'extractFromJobPage') {
      const rawText = window.jobConfigManager?.extractFromJobPage();
      sendResponse({ rawText });
    }

    if (request.action === 'exportJobConfigs') {
      const data = window.jobConfigManager?.exportConfigs();
      sendResponse({ data });
    }

    if (request.action === 'importJobConfigs') {
      (async () => {
        const success = await window.jobConfigManager?.importConfigs(request.data);
        sendResponse({ success });
      })();
      return true; // 异步响应
    }

    return true;
  });

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    console.log('Boss直聘助手已卸载');
  });

})();
