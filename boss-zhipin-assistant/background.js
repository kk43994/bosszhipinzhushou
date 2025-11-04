/**
 * Background Service Worker
 * 后台脚本 - 处理插件生命周期和消息传递
 */

console.log('Boss直聘智能助手 - 后台脚本已启动');

// 安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('插件已安装/更新:', details.reason);

  if (details.reason === 'install') {
    // 首次安装
    console.log('首次安装，初始化配置...');
    initDefaultConfig();

    // 打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/popup.html') + '?welcome=true'
    });
  } else if (details.reason === 'update') {
    // 更新
    console.log('插件已更新到版本:', chrome.runtime.getManifest().version);
  }
});

// 初始化默认配置
async function initDefaultConfig() {
  const defaultConfig = {
    mode: 'safe',  // 默认安全模式
    useAI: false,  // 默认不使用AI（使用规则评分）
    apiKey: '',
    autoReplyEnabled: true,
    autoGreetEnabled: true,
    filterCriteria: {
      minEducation: '大专',
      minExperience: 0,
      requiredSkills: [],
      excludeKeywords: ['兼职', '实习生'],
      maxSalaryExpectation: 20000
    }
  };

  try {
    await chrome.storage.local.set({ config: defaultConfig });
    console.log('默认配置已初始化');
  } catch (error) {
    console.error('初始化配置失败:', error);
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request, '来自:', sender.tab?.id);

  if (request.action === 'log') {
    // 记录日志
    console.log('[Content Script]:', request.message);
    sendResponse({ status: 'ok' });
  }

  if (request.action === 'notify') {
    // 显示通知
    showNotification(request.title, request.message);
    sendResponse({ status: 'ok' });
  }

  if (request.action === 'getConfig') {
    // 获取配置
    chrome.storage.local.get('config').then(result => {
      sendResponse(result.config || {});
    });
    return true; // 异步响应
  }

  if (request.action === 'saveStats') {
    // 保存统计数据
    saveStats(request.stats).then(() => {
      sendResponse({ status: 'ok' });
    });
    return true;
  }

  return false;
});

// 显示浏览器通知
function showNotification(title, message, iconUrl = 'icons/icon.svg') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    priority: 1
  });
}

// 保存统计数据
async function saveStats(stats) {
  try {
    const now = new Date();
    const dateKey = `stats_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    const result = await chrome.storage.local.get(dateKey);
    const todayStats = result[dateKey] || {
      candidatesAnalyzed: 0,
      repliesGenerated: 0,
      greetsGenerated: 0
    };

    // 累加统计
    todayStats.candidatesAnalyzed += stats.candidatesAnalyzed || 0;
    todayStats.repliesGenerated += stats.repliesGenerated || 0;
    todayStats.greetsGenerated += stats.greetsGenerated || 0;

    await chrome.storage.local.set({ [dateKey]: todayStats });
    console.log('统计已保存:', dateKey, todayStats);
  } catch (error) {
    console.error('保存统计失败:', error);
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成且是Boss直聘网站时
  if (changeInfo.status === 'complete' && tab.url?.includes('zhipin.com')) {
    console.log('Boss直聘页面已加载:', tab.url);

    // 可以在这里发送消息给content script
    // 或者执行一些初始化操作
  }
});

// 监听storage变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.config) {
    console.log('配置已更新:', changes.config.newValue);

    // 通知所有Boss直聘标签页配置已更新
    chrome.tabs.query({ url: 'https://www.zhipin.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: changes.config.newValue
        }).catch(() => {
          // 忽略错误（页面可能还未加载content script）
        });
      });
    });
  }
});

// 清理旧数据（每天执行一次）
setInterval(() => {
  cleanOldData();
}, 24 * 60 * 60 * 1000);

// 清理30天前的数据
async function cleanOldData() {
  try {
    const all = await chrome.storage.local.get(null);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const keysToRemove = [];

    for (const key of Object.keys(all)) {
      if (key.startsWith('stats_')) {
        const dateStr = key.replace('stats_', '');
        const date = new Date(dateStr);

        if (date < cutoffDate) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`已清理 ${keysToRemove.length} 条旧数据`);
    }
  } catch (error) {
    console.error('清理数据失败:', error);
  }
}

// 处理插件图标点击（可选）
chrome.action.onClicked.addListener((tab) => {
  console.log('插件图标被点击，当前标签页:', tab.url);
});

console.log('后台脚本初始化完成');
