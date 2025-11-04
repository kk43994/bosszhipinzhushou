# 🔍 API链接问题诊断报告

## 发现的问题

### ❌ 问题1：API认证方式不统一

项目中存在**两种不同的API Key传递方式**：

#### 方式A：Header方式（推荐）✅
```javascript
headers: {
  'Content-Type': 'application/json',
  'x-goog-api-key': apiKey  // Google官方推荐
}
```

**使用文件**：
- ✅ `modules/analyzer.js` (Line 102)
- ✅ `popup/popup.js` (Line 162)

#### 方式B：URL参数方式
```javascript
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
```

**使用文件**：
- ⚠️ `modules/recommend-scorer.js` (Line 265)
- ⚠️ `modules/job-config-manager.js` (Line 195)
- ⚠️ `modules/debug-panel.js` (Line 1204)

---

## 推荐方案

根据Google官方文档，应该**统一使用Header方式**：

### 优点：
1. ✅ **安全性更高**：API Key不会出现在URL中
2. ✅ **Google官方推荐**：符合最佳实践
3. ✅ **日志更安全**：不会在网络日志中暴露Key

### 需要修复的文件：
1. `modules/recommend-scorer.js` - Line 265
2. `modules/job-config-manager.js` - Line 195
3. `modules/debug-panel.js` - Line 1204

---

## 修复方案
