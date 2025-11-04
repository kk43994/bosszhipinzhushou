/**
 * Popup界面逻辑
 */

// DOM元素
const elements = {
  pluginEnabled: document.getElementById('pluginEnabled'),
  statusDot: document.getElementById('statusDot'),
  modeRadios: document.querySelectorAll('input[name="mode"]'),
  useAI: document.getElementById('useAI'),
  aiProvider: document.getElementById('aiProvider'),
  apiSettings: document.getElementById('apiSettings'),
  geminiApiKey: document.getElementById('geminiApiKey'),
  zhipuApiKey: document.getElementById('zhipuApiKey'),
  geminiConfig: document.getElementById('geminiConfig'),
  zhipuConfig: document.getElementById('zhipuConfig'),
  testApi: document.getElementById('testApi'),
  autoReplyEnabled: document.getElementById('autoReplyEnabled'),
  autoGreetEnabled: document.getElementById('autoGreetEnabled'),
  // 岗位需求配置（已迁移到popup-job-config.js，保留引用以兼容旧代码）
  jobRequirements: document.getElementById('jobRequirementsRaw'),
  // 其他
  saveBtn: document.getElementById('saveBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  statusText: document.getElementById('statusText'),
  candidatesCount: document.getElementById('candidatesCount'),
  repliesCount: document.getElementById('repliesCount')
};

// 加载配置
async function loadConfig() {
  try {
    const result = await chrome.storage.local.get('config');
    const config = result.config || {
      enabled: true,
      mode: 'safe',
      useAI: false,
      aiProvider: 'gemini',  // 默认使用Gemini
      geminiApiKey: '',
      zhipuApiKey: '',
      autoReplyEnabled: true,
      autoGreetEnabled: true,
      jobRequirements: ''
    };

    // 插件启用状态
    elements.pluginEnabled.checked = config.enabled !== false;
    updatePluginStatus(config.enabled !== false);

    // 设置模式
    elements.modeRadios.forEach(radio => {
      radio.checked = radio.value === config.mode;
    });

    // AI设置
    elements.useAI.checked = config.useAI || false;
    elements.aiProvider.value = config.aiProvider || 'gemini';
    elements.geminiApiKey.value = config.geminiApiKey || '';
    elements.zhipuApiKey.value = config.zhipuApiKey || '';
    toggleApiSettings(config.useAI);
    toggleProviderConfig(config.aiProvider || 'gemini');

    // 功能开关
    elements.autoReplyEnabled.checked = config.autoReplyEnabled !== false;
    elements.autoGreetEnabled.checked = config.autoGreetEnabled !== false;

    // 加载岗位需求配置（如果元素存在）
    if (elements.jobRequirements) {
      elements.jobRequirements.value = config.jobRequirements || '';
    }

    console.log('配置加载完成:', config);
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

// 保存配置
async function saveConfig() {
  try {
    const mode = document.querySelector('input[name="mode"]:checked').value;

    const config = {
      enabled: elements.pluginEnabled.checked,
      mode,
      useAI: elements.useAI.checked,
      aiProvider: elements.aiProvider.value,  // AI提供商
      geminiApiKey: elements.geminiApiKey.value.trim(),
      zhipuApiKey: elements.zhipuApiKey.value.trim(),
      autoReplyEnabled: elements.autoReplyEnabled.checked,
      autoGreetEnabled: elements.autoGreetEnabled.checked,
      jobRequirements: elements.jobRequirements?.value?.trim() || ''  // 安全访问，防止null错误
    };

    await chrome.storage.local.set({ config });

    // 通知content script重新加载配置
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'configUpdated',
          config: config
        });
      }
    } catch (e) {
      console.log('通知content script失败:', e);
    }

    // 显示成功提示
    showToast('设置已保存', 'success');

    console.log('配置已保存:', config);
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast('保存失败: ' + error.message, 'error');
  }
}

// 更新插件状态显示
function updatePluginStatus(enabled) {
  if (enabled) {
    elements.statusText.textContent = '运行中';
    elements.statusDot.classList.add('active');
  } else {
    elements.statusText.textContent = '已关闭';
    elements.statusDot.classList.remove('active');
  }
}

// 切换API设置显示
function toggleApiSettings(show) {
  elements.apiSettings.style.display = show ? 'block' : 'none';
}

// 切换AI提供商配置显示
function toggleProviderConfig(provider) {
  if (provider === 'gemini') {
    elements.geminiConfig.style.display = 'block';
    elements.zhipuConfig.style.display = 'none';
  } else if (provider === 'zhipu') {
    elements.geminiConfig.style.display = 'none';
    elements.zhipuConfig.style.display = 'block';
  }
}

// 测试API连接（支持Gemini和智谱AI）
async function testApiConnection() {
  const provider = elements.aiProvider.value;
  const apiKey = provider === 'gemini' ? elements.geminiApiKey.value.trim() : elements.zhipuApiKey.value.trim();

  if (!apiKey) {
    const providerName = provider === 'gemini' ? 'Gemini' : '智谱AI';
    showToast(`请输入${providerName} API密钥`, 'error');
    return;
  }

  // Gemini API Key格式检查
  if (provider === 'gemini' && !apiKey.startsWith('AIza')) {
    showToast('⚠️ Gemini API Key通常以"AIza"开头，请检查', 'error');
    return;
  }

  elements.testApi.textContent = '测试中...';
  elements.testApi.disabled = true;

  try {
    if (provider === 'gemini') {
      await testGeminiAPI(apiKey);
      showToast('✅ Gemini API连接成功！', 'success');
    } else {
      await testZhipuAPI(apiKey);
      showToast('✅ 智谱AI API连接成功！', 'success');
    }

    // ✅ 测试成功后自动保存配置
    console.log('API测试成功，自动保存配置...');
    await saveConfig();
    showToast('✅ API配置已自动保存', 'success');

  } catch (error) {
    showToast('❌ 连接失败: ' + error.message, 'error');
  } finally {
    elements.testApi.textContent = '测试连接';
    elements.testApi.disabled = false;
  }
}

// 测试Gemini API
async function testGeminiAPI(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  // ✅ 测试连接不使用速率限制器（允许用户随时测试）
  // 但在实际使用中，所有AI功能调用都会受速率限制保护

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'Say hello'
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
        topK: 40,
        topP: 0.95
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = '请求失败';

    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || errorMessage;

      // 常见错误提示优化
      if (errorMessage.includes('API key not valid')) {
        errorMessage = 'API密钥无效，请检查是否正确';
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'API配额已用完，请查看Google AI Studio';
      } else if (errorMessage.includes('permission')) {
        errorMessage = 'API密钥权限不足';
      }
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  // 打印完整的API返回数据，方便调试
  console.log('📦 Gemini API完整返回数据:', JSON.stringify(data, null, 2));

  // 完整的数据结构验证
  if (!data || !data.candidates || !data.candidates[0]) {
    console.error('❌ API返回数据格式错误 - 缺少candidates:', data);
    throw new Error(`API返回格式异常：缺少candidates。返回数据: ${JSON.stringify(data)}`);
  }

  const candidate = data.candidates[0];
  console.log('📦 candidate对象:', JSON.stringify(candidate, null, 2));

  if (!candidate.content) {
    console.error('❌ candidate缺少content字段:', candidate);

    // 检查是否有finishReason说明为什么没有content
    if (candidate.finishReason) {
      throw new Error(`API返回异常：${candidate.finishReason}. 可能原因：内容被安全过滤或其他限制`);
    }

    throw new Error(`API返回格式异常：缺少content。candidate数据: ${JSON.stringify(candidate)}`);
  }

  if (!candidate.content.parts || !candidate.content.parts[0]) {
    console.error('❌ content缺少parts字段:', candidate.content);
    throw new Error(`API返回格式异常：缺少content.parts。content数据: ${JSON.stringify(candidate.content)}`);
  }

  console.log('✅ Gemini API测试成功，返回:', candidate.content.parts[0].text);
}

// 测试智谱AI API
async function testZhipuAPI(apiKey) {
  const url = `https://open.bigmodel.cn/api/paas/v4/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`  // 智谱AI使用Bearer认证
    },
    body: JSON.stringify({
      model: 'glm-4-flash',  // 使用免费的glm-4-flash模型
      messages: [
        {
          role: 'user',
          content: 'Say hello'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = '请求失败';

    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || errorMessage;

      // 常见错误提示优化
      if (errorMessage.includes('invalid') || errorMessage.includes('认证')) {
        errorMessage = 'API密钥无效，请检查是否正确';
      } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
        errorMessage = 'API配额已用完，请查看智谱AI控制台';
      }
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  // 打印完整的API返回数据，方便调试
  console.log('📦 智谱AI API完整返回数据:', JSON.stringify(data, null, 2));

  // 智谱AI返回格式验证（OpenAI兼容格式）
  if (!data || !data.choices || !data.choices[0]) {
    console.error('❌ API返回数据格式错误 - 缺少choices:', data);
    throw new Error(`API返回格式异常：缺少choices。返回数据: ${JSON.stringify(data)}`);
  }

  const choice = data.choices[0];
  console.log('📦 choice对象:', JSON.stringify(choice, null, 2));

  if (!choice.message || !choice.message.content) {
    console.error('❌ choice缺少message.content字段:', choice);
    throw new Error(`API返回格式异常：缺少message.content。choice数据: ${JSON.stringify(choice)}`);
  }

  console.log('✅ 智谱AI API测试成功，返回:', choice.message.content);
}

// 刷新分析
async function refreshAnalysis() {
  elements.refreshBtn.textContent = '刷新中...';
  elements.refreshBtn.disabled = true;

  try {
    // 发送消息给content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'refresh' });
      showToast('已刷新分析', 'success');
    }
  } catch (error) {
    console.error('刷新失败:', error);
    showToast('刷新失败，请确保在Boss直聘页面', 'error');
  } finally {
    elements.refreshBtn.textContent = '刷新分析';
    elements.refreshBtn.disabled = false;
  }
}

// 显示Toast
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#667eea'};
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 9999;
    animation: slideDown 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 加载统计数据
async function loadStats() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url?.includes('zhipin.com')) {
      elements.statusText.textContent = '运行中';
      elements.statusText.previousElementSibling.classList.add('active');

      // 尝试获取统计
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getStats' });
        if (response) {
          elements.candidatesCount.textContent = response.candidatesFound || 0;
        }
      } catch (e) {
        // 页面可能还未加载完成
      }
    } else {
      elements.statusText.textContent = '未在Boss直聘页面';
      elements.statusText.previousElementSibling.classList.remove('active');
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 事件监听
elements.pluginEnabled.addEventListener('change', (e) => {
  updatePluginStatus(e.target.checked);
  saveConfig(); // 自动保存
});

elements.useAI.addEventListener('change', async (e) => {
  toggleApiSettings(e.target.checked);

  // ✅ 切换"使用AI"开关时自动保存配置
  console.log('使用AI开关变更，自动保存配置...');
  await saveConfig();
});

// AI提供商切换监听
elements.aiProvider.addEventListener('change', (e) => {
  toggleProviderConfig(e.target.value);
});

elements.testApi.addEventListener('click', testApiConnection);
elements.saveBtn.addEventListener('click', saveConfig);
elements.refreshBtn.addEventListener('click', refreshAnalysis);

document.getElementById('helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://github.com/your-repo/boss-assistant/wiki' });
});

document.getElementById('feedbackLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://github.com/your-repo/boss-assistant/issues' });
});

// 初始化
loadConfig();
loadStats();

// 定时更新统计
setInterval(loadStats, 3000);
