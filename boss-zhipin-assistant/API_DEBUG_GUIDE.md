# 🔍 API连接问题诊断指南

**错误信息**：`连接失败: API返回格式异常：缺少content.parts`

## 📋 快速诊断步骤

### 第1步：查看控制台日志

1. 打开Chrome浏览器
2. 按 **F12** 打开开发者工具
3. 切换到 **Console（控制台）** 标签
4. 点击插件的"测试连接"按钮
5. 查看控制台输出

---

## 🔍 日志分析

现在代码已经添加了详细的调试日志，你会看到：

### ✅ 正常情况的日志

```javascript
📦 Gemini API完整返回数据: {
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "OK"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [...]
    }
  ],
  "usageMetadata": {...}
}
✅ Gemini API测试成功，返回: OK
```

### ❌ 异常情况的日志

#### 情况1：被安全过滤器阻止

```javascript
📦 Gemini API完整返回数据: {
  "candidates": [
    {
      "finishReason": "SAFETY",
      "index": 0,
      "safetyRatings": [...]
    }
  ]
}
❌ candidate缺少content字段
⚠️ finishReason: SAFETY
连接失败: API返回异常：SAFETY（可能被安全过滤或其他限制）
```

**解决方案**：内容被安全过滤器阻止，可能是提示词包含敏感内容

#### 情况2：API Key无效

```javascript
❌ API请求失败: 400 - {
  "error": {
    "code": 400,
    "message": "API key not valid. Please pass a valid API key.",
    "status": "INVALID_ARGUMENT"
  }
}
```

**解决方案**：检查API Key是否正确

#### 情况3：配额用完

```javascript
❌ API请求失败: 429 - {
  "error": {
    "code": 429,
    "message": "Resource has been exhausted (e.g. check quota).",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**解决方案**：API配额已用完，需要等待重置或升级配额

#### 情况4：模型不存在

```javascript
❌ API请求失败: 404 - {
  "error": {
    "code": 404,
    "message": "models/gemini-2.5-flash is not found",
    "status": "NOT_FOUND"
  }
}
```

**解决方案**：模型名称错误，请使用正确的模型名称

---

## 🛠️ 常见问题解决方案

### 问题1：API Key无效

**症状**：`API key not valid`

**解决方案**：
1. 访问 https://aistudio.google.com/app/apikey
2. 确认API Key是否正确复制（包括前缀`AIza`）
3. 检查API Key是否已启用
4. 尝试创建新的API Key

### 问题2：配额用完

**症状**：`Resource has been exhausted`

**解决方案**：
1. 访问 https://console.cloud.google.com/
2. 查看API配额使用情况
3. 等待配额重置（通常每天重置）
4. 或升级到付费计划

### 问题3：网络问题（中国大陆）

**症状**：请求超时或无法连接

**解决方案**：
1. ✅ **推荐**：使用科学上网工具（VPN/代理）
2. 确保代理设置正确
3. 测试能否访问 https://generativelanguage.googleapis.com

### 问题4：CORS跨域问题

**症状**：`CORS policy` 错误

**解决方案**：
- 这不应该发生，因为Chrome扩展有特殊权限
- 如果出现，检查 `manifest.json` 中的 `host_permissions`

### 问题5：安全过滤器阻止

**症状**：`finishReason: SAFETY`

**解决方案**：
1. 检查提示词是否包含敏感内容
2. 简化测试消息（如"Hello"）
3. 如果测试消息也被阻止，可能是地区限制

---

## 🧪 手动测试API

如果插件测试失败，可以手动测试API：

### 使用curl命令测试

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello"
      }]
    }]
  }'
```

**替换 `YOUR_API_KEY` 为你的实际API Key**

### 预期正常返回

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Hello! How can I help you today?"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ]
}
```

---

## 📊 错误代码对照表

| 错误代码 | 含义 | 解决方案 |
|---------|------|---------|
| **400** | 请求参数错误 | 检查请求格式和API Key |
| **401** | 未授权 | API Key无效或未提供 |
| **403** | 禁止访问 | API Key没有权限或地区限制 |
| **404** | 资源不存在 | 模型名称错误 |
| **429** | 请求过多 | 配额用完或频率限制 |
| **500** | 服务器错误 | Google服务器问题，稍后重试 |

---

## 🔧 进阶调试

### 1. 检查请求头

打开Chrome开发者工具 → Network（网络）标签：

1. 点击"测试连接"
2. 找到请求 `generateContent`
3. 查看请求头是否包含：
   ```
   Content-Type: application/json
   x-goog-api-key: AIza...
   ```

### 2. 检查请求体

在Network标签中查看Payload：

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "你好，这是一个测试。请回复\"OK\"。"
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 10
  }
}
```

### 3. 检查响应

查看Response标签，应该看到：

**正常响应**：
```json
{
  "candidates": [...],
  "usageMetadata": {...}
}
```

**错误响应**：
```json
{
  "error": {
    "code": 400,
    "message": "...",
    "status": "..."
  }
}
```

---

## 📝 收集信息报告问题

如果以上方法都无法解决，请收集以下信息：

1. **控制台完整日志**
   - 复制所有 `📦 Gemini API` 开头的日志

2. **错误截图**
   - 包含完整的错误信息

3. **环境信息**
   - 操作系统
   - Chrome版本
   - 是否使用代理/VPN
   - 地区（中国大陆/海外）

4. **API Key状态**
   - 是否新创建的Key
   - 是否在Google AI Studio测试过
   - 配额使用情况

---

## ✅ 验证修复

修复后，应该看到：

1. **控制台日志**：
   ```
   📦 Gemini API完整返回数据: {...}
   📦 candidate对象: {...}
   ✅ Gemini API测试成功，返回: OK
   ```

2. **插件提示**：
   ```
   ✅ API连接成功
   ```

---

## 🔗 官方资源

- **Gemini API文档**：https://ai.google.dev/gemini-api/docs
- **API Key管理**：https://aistudio.google.com/app/apikey
- **配额查看**：https://console.cloud.google.com/
- **常见问题**：https://ai.google.dev/gemini-api/docs/troubleshooting

---

## 💡 下一步

1. **重新加载插件**
   ```
   Chrome → 扩展程序 → 找到插件 → 点击刷新图标
   ```

2. **打开开发者工具**
   ```
   按F12 → 切换到Console标签
   ```

3. **点击测试连接**
   ```
   插件设置 → 输入API Key → 点击"测试连接"
   ```

4. **查看控制台日志**
   ```
   找到 📦 开头的日志，复制完整输出
   ```

5. **分析日志内容**
   ```
   根据上面的"日志分析"章节对照查看
   ```

---

**提示**：现在所有API调用都会打印详细的返回数据，这样可以准确定位问题所在！
