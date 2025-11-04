# 🔌 添加新AI提供商教程

本文档说明如何为Boss直聘智能助手添加新的AI提供商支持。

**当前支持**：
- ✅ Google Gemini
- ✅ 智谱AI GLM-4

**计划支持**（已预留接口）：
- 📋 百度文心一言
- 📋 阿里通义千问
- 📋 Moonshot Kimi
- 📋 DeepSeek
- 📋 OpenAI兼容API

---

## 📋 快速添加流程

添加一个新的AI提供商需要以下5个步骤：

```
1. 实现适配器类（ai-adapter.js）
2. 更新popup界面（popup.html）
3. 更新配置管理（config.js）
4. 测试API连接（popup.js）
5. 更新文档
```

**预计时间**：30分钟 - 1小时

---

## 📝 详细步骤

### Step 1: 实现适配器类

**文件**：`utils/ai-adapter.js`

#### 1.1 创建适配器类

在文件末尾添加新的适配器类（参考模板）：

```javascript
// ============================================
// 示例：百度文心一言适配器
// ============================================

class WenxinAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    const apiKey = this.config.wenxinApiKey;       // ← 1. 定义配置字段名
    const secretKey = this.config.wenxinSecretKey; // 如需多个密钥

    if (!apiKey || !secretKey) {
      throw new Error('未配置百度文心API密钥');
    }

    const model = options.model || 'ERNIE-4.0-Turbo';  // ← 2. 默认模型
    console.log('🤖 调用百度文心API...');

    // ← 3. Step 1: 获取access_token（百度特有）
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;

    const tokenResponse = await fetch(tokenUrl, { method: 'POST' });
    if (!tokenResponse.ok) {
      throw new Error('获取access_token失败');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // ← 4. Step 2: 调用文心一言API（使用重试逻辑）
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${accessToken}`;

    const response = await this.retryOnRateLimit(async () => {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          max_output_tokens: options.maxTokens || 2048
        })
      });
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`文心API调用失败 (${response.status}): ${errorText}`);
    }

    // ← 5. 解析响应（根据实际API文档调整）
    const data = await response.json();

    if (data.result) {
      console.log('✅ 文心API调用成功');
      return data.result;  // 百度返回格式
    } else {
      throw new Error('文心API返回格式异常');
    }
  }
}
```

#### 1.2 注册到适配器工厂

在`AIAdapter.getAdapter()`方法中添加case：

```javascript
getAdapter(provider) {
  switch (provider) {
    case 'gemini':
      return new GeminiAdapter(this.config);
    case 'zhipu':
      return new ZhipuAdapter(this.config);
    case 'wenxin':  // ← 添加新的case
      return new WenxinAdapter(this.config);
    // ...
  }
}
```

#### 1.3 更新提供商列表

在`AIAdapter.getSupportedProviders()`中添加：

```javascript
{
  id: 'wenxin',                    // ← 唯一ID
  name: '百度文心一言',             // ← 显示名称
  icon: '🔵',                      // ← 图标emoji
  status: 'active',                // ← active/planned
  description: '国内大厂，免费额度', // ← 描述
  models: ['ERNIE-4.0-Turbo', 'ERNIE-3.5-8K'],  // ← 可用模型
  apiKeyFormat: 'API Key + Secret Key',         // ← 密钥格式
  apiKeyUrl: 'https://console.bce.baidu.com/...' // ← 获取密钥的URL
}
```

---

### Step 2: 更新popup界面

**文件**：`popup/popup.html`

#### 2.1 添加下拉选项

在`<select id="aiProvider">`中添加option：

```html
<select id="aiProvider">
  <option value="gemini">Google Gemini</option>
  <option value="zhipu">智谱AI GLM-4</option>
  <option value="wenxin">百度文心一言</option>  <!-- ← 新增 -->
</select>
```

#### 2.2 添加API Key输入区域

在智谱AI配置区域后添加：

```html
<!-- 百度文心一言 API Key -->
<div class="input-group api-provider-config" id="wenxinConfig" style="display: none;">
  <label>百度文心API Key</label>
  <input type="password" id="wenxinApiKey" placeholder="输入API Key...">

  <!-- 如果需要多个密钥 -->
  <label style="margin-top: 8px;">Secret Key</label>
  <input type="password" id="wenxinSecretKey" placeholder="输入Secret Key...">

  <div class="api-hint" style="font-size: 11px; color: #999; margin-top: 4px; line-height: 1.6;">
    💡 获取API Key: 访问 <a href="https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application" target="_blank" style="color: #667eea;">百度智能云控制台</a><br>
    ✅ 国内直接访问，有免费额度
  </div>
</div>
```

---

### Step 3: 更新popup.js

**文件**：`popup/popup.js`

#### 3.1 更新DOM元素引用

```javascript
const elements = {
  // ...
  wenxinApiKey: document.getElementById('wenxinApiKey'),
  wenxinSecretKey: document.getElementById('wenxinSecretKey'),
  wenxinConfig: document.getElementById('wenxinConfig'),
  // ...
};
```

#### 3.2 更新toggleProviderConfig函数

```javascript
function toggleProviderConfig(provider) {
  // 隐藏所有配置
  elements.geminiConfig.style.display = 'none';
  elements.zhipuConfig.style.display = 'none';
  elements.wenxinConfig.style.display = 'none';  // ← 新增

  // 显示对应配置
  if (provider === 'gemini') {
    elements.geminiConfig.style.display = 'block';
  } else if (provider === 'zhipu') {
    elements.zhipuConfig.style.display = 'block';
  } else if (provider === 'wenxin') {  // ← 新增
    elements.wenxinConfig.style.display = 'block';
  }
}
```

#### 3.3 更新loadConfig函数

```javascript
async function loadConfig() {
  const config = result.config || {
    // ...
    wenxinApiKey: '',        // ← 新增
    wenxinSecretKey: '',     // ← 新增
  };

  elements.wenxinApiKey.value = config.wenxinApiKey || '';        // ← 新增
  elements.wenxinSecretKey.value = config.wenxinSecretKey || '';  // ← 新增
}
```

#### 3.4 更新saveConfig函数

```javascript
async function saveConfig() {
  const config = {
    // ...
    wenxinApiKey: elements.wenxinApiKey.value.trim(),        // ← 新增
    wenxinSecretKey: elements.wenxinSecretKey.value.trim(),  // ← 新增
  };
}
```

#### 3.5 添加测试函数

```javascript
// 测试百度文心一言API
async function testWenxinAPI(apiKey, secretKey) {
  // Step 1: 获取access_token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;

  const tokenResponse = await fetch(tokenUrl, { method: 'POST' });
  if (!tokenResponse.ok) {
    throw new Error('API密钥验证失败');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Step 2: 测试API调用
  const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say hello' }],
      temperature: 0.7,
      max_output_tokens: 100
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败: ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();

  if (data.result) {
    console.log('✅ 文心API测试成功，返回:', data.result);
  } else {
    throw new Error('API返回格式异常');
  }
}
```

#### 3.6 更新testApiConnection函数

```javascript
async function testApiConnection() {
  const provider = elements.aiProvider.value;

  // ...
  if (provider === 'gemini') {
    // ...
  } else if (provider === 'zhipu') {
    // ...
  } else if (provider === 'wenxin') {  // ← 新增
    const apiKey = elements.wenxinApiKey.value.trim();
    const secretKey = elements.wenxinSecretKey.value.trim();

    if (!apiKey || !secretKey) {
      showToast('请输入API Key和Secret Key', 'error');
      return;
    }

    await testWenxinAPI(apiKey, secretKey);
    showToast('✅ 百度文心API连接成功！', 'success');
  }
}
```

---

### Step 4: 更新config.js

**文件**：`utils/config.js`

#### 4.1 更新默认配置

```javascript
DEFAULT: {
  // ...
  wenxinApiKey: '',       // ← 新增
  wenxinSecretKey: '',    // ← 新增
}
```

#### 4.2 （可选）添加配置迁移逻辑

如果需要从旧配置迁移，在`loadConfig()`中添加。

---

### Step 5: 更新analyzer.js（如果使用适配器）

**文件**：`modules/analyzer.js`

#### 方案A：使用ai-adapter.js（推荐）

```javascript
async callAI(prompt) {
  const adapter = new AIAdapter();
  await adapter.init(this.config.get());
  return await adapter.call(prompt);
}
```

#### 方案B：手动添加case（当前方式）

```javascript
async callAI(prompt) {
  const provider = this.config.get('aiProvider') || 'gemini';

  if (provider === 'gemini') {
    return await this.callGemini(prompt, this.config.get('geminiApiKey'));
  } else if (provider === 'zhipu') {
    return await this.callZhipuAI(prompt, this.config.get('zhipuApiKey'));
  } else if (provider === 'wenxin') {  // ← 新增
    return await this.callWenxin(prompt, this.config.get('wenxinApiKey'), this.config.get('wenxinSecretKey'));
  }
}

// 添加对应的调用方法
async callWenxin(prompt, apiKey, secretKey) {
  // 实现百度文心调用逻辑
}
```

---

## 📚 API文档参考

### 百度文心一言
- 官方文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2
- API调用流程：先获取access_token，再调用模型API
- 认证方式：API Key + Secret Key
- 免费额度：新用户赠送

### 阿里通义千问
- 官方文档：https://help.aliyun.com/zh/dashscope/developer-reference/api-details
- Endpoint：`https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- 认证方式：Bearer Token
- 免费额度：新用户赠送

### Moonshot Kimi
- 官方文档：https://platform.moonshot.cn/docs/api-reference
- Endpoint：`https://api.moonshot.cn/v1/chat/completions`
- 认证方式：Bearer Token（OpenAI兼容）
- 特点：超长上下文（128K）

### DeepSeek
- 官方文档：https://platform.deepseek.com/api-docs/
- Endpoint：`https://api.deepseek.com/v1/chat/completions`
- 认证方式：Bearer Token（OpenAI兼容）
- 特点：高性价比，0.1元/百万token

---

## 🧪 测试清单

添加新AI提供商后，请完成以下测试：

### 基础测试
- [ ] 重新加载插件
- [ ] 打开popup，选择新的AI提供商
- [ ] 输入API密钥
- [ ] 点击"测试连接"
- [ ] 查看控制台日志

**预期结果**：
```
✅ XXX API连接成功！
✅ API配置已自动保存
```

### 功能测试
- [ ] 查看候选人，触发AI评分
- [ ] 收到消息，触发智能回复
- [ ] 检查AI分析是否正常工作

**预期控制台日志**：
```
🤖 调用XXX API...
✅ XXX API调用成功
```

### 切换测试
- [ ] 切换回Gemini，验证仍然正常
- [ ] 再切换到新提供商，验证仍然正常
- [ ] 验证配置正确保存和加载

---

## 🐛 常见问题

### Q1：API调用失败，返回401/403错误

**原因**：
- API Key格式不正确
- API Key没有权限
- 认证方式错误

**解决**：
1. 检查API Key是否复制完整
2. 查看官方文档确认认证方式
3. 检查API Key的权限和配额

---

### Q2：API返回数据格式异常

**原因**：响应格式与代码解析不一致

**解决**：
1. 打印完整响应：`console.log(JSON.stringify(data, null, 2))`
2. 对比官方文档的返回格式
3. 调整解析逻辑

---

### Q3：切换提供商后不生效

**原因**：配置没有正确保存或加载

**解决**：
1. 检查saveConfig是否保存了新字段
2. 检查loadConfig是否加载了新字段
3. 刷新页面重新加载配置

---

## 📝 提交清单

完成新AI提供商添加后，请准备以下内容：

### 代码文件
- [ ] `utils/ai-adapter.js` - 添加适配器类
- [ ] `popup/popup.html` - 添加UI元素
- [ ] `popup/popup.js` - 添加配置和测试逻辑
- [ ] `utils/config.js` - 添加默认配置
- [ ] `modules/analyzer.js` - 添加调用逻辑（可选）

### 文档
- [ ] 更新 `README.md` - 添加到支持列表
- [ ] 更新 `ZHIPU_AI_INTEGRATION.md` - 参考格式创建新文档
- [ ] 截图：测试连接成功的截图
- [ ] 截图：实际使用的截图

### 测试
- [ ] 基础功能测试通过
- [ ] 切换测试通过
- [ ] 配置保存加载测试通过

---

## 🎉 完成示例

添加完成后，用户应该能看到：

**Popup界面**：
```
AI提供商: [下拉菜单]
  - Google Gemini
  - 智谱AI GLM-4
  - 百度文心一言  ← 新增
  - ...

[百度文心API Key输入框]
[Secret Key输入框]
[测试连接按钮]
```

**控制台日志**：
```
🤖 调用百度文心API...
⏳ 检查API速率限制...
📊 API使用统计 - 最近1分钟: 1次, 今日: 5次
✅ 文心API调用成功
```

---

## 💡 最佳实践

1. **复用已有代码**：参考GeminiAdapter和ZhipuAdapter的实现
2. **使用retryOnRateLimit**：自动处理429错误
3. **详细的日志**：方便调试和排查问题
4. **友好的错误提示**：告诉用户具体哪里出错了
5. **遵循命名规范**：`{provider}ApiKey`, `{provider}Config`等
6. **测试充分**：至少测试基础功能、切换、配额超限

---

**文档版本**：v1.0
**最后更新**：2025-11-04
**维护者**：Boss直聘智能助手项目组

**联系方式**：如有问题或建议，请提Issue
