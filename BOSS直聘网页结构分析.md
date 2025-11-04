# Boss直聘网页结构完整分析文档

> 分析日期: 2025-11-02
> 分析目的: 为Chrome插件开发提供完整的DOM选择器和页面结构参考

---

## 目录
1. [整体架构](#整体架构)
2. [导航菜单](#导航菜单)
3. [推荐牛人页面](#推荐牛人页面)
4. [沟通聊天页面](#沟通聊天页面)
5. [候选人详情面板](#候选人详情面板)
6. [关键DOM选择器汇总](#关键dom选择器汇总)

---

## 整体架构

### 页面类型
Boss直聘招聘者端主要包含以下页面类型：

```
https://www.zhipin.com/
├── /web/chat/recommend          # 推荐牛人（使用iframe）
├── /web/geek/chat               # 沟通列表
├── /web/geek/recommend          # 推荐牛人（主页面）
├── /web/geek/search             # 搜索牛人
└── /web/geek/manage             # 牛人管理
```

### 技术特点
- ✅ **单页应用 (SPA)**: 使用前端路由，页面切换不刷新
- ✅ **Iframe嵌套**: 推荐牛人、搜索等页面使用iframe加载内容
- ✅ **ContentEditable输入框**: 聊天输入使用 `<div contenteditable="true">` 而非 `<textarea>`
- ✅ **动态DOM**: 大量使用JavaScript动态渲染内容

---

## 导航菜单

### 主导航栏
```html
<nav class="menu-nav">
  <a href="/web/position/index">职位管理</a>
  <div class="menu-recommend">推荐牛人</div>
  <div class="menu-geeksearch">搜索</div>
  <a href="/web/chat/index">沟通</a>
  <a href="/web/interaction">互动</a>
  <a href="/web/geek/manage">牛人管理</a>
  <a href="/web/vip/boss/home">道具</a>
  <a href="/web/toolbox">工具箱</a>
</nav>
```

### 选择器
- 主导航容器: `.menu-nav`
- 职位管理: `[href="/web/position/index"]`
- 推荐牛人: `.menu-recommend`
- 搜索: `.menu-geeksearch`
- 沟通: `[href="/web/chat/index"]`

---

## 推荐牛人页面

### URL
- 主页面: `https://www.zhipin.com/web/chat/recommend`
- Iframe内容: `https://www.zhipin.com/web/frame/recommend/?filterParams=&t=&inspectFilterGuide=&version=8612`

### 结构特点
**⚠️ 重要**: 推荐牛人页面的候选人列表和详情都在 **iframe** 中渲染！

```html
<div class="main-content">
  <iframe src="https://www.zhipin.com/web/frame/recommend/..."
          width="1368"
          height="638">
    <!-- 候选人列表在这里面 -->
  </iframe>
</div>
```

### 候选人卡片结构（在iframe内）

根据之前的snapshot分析，候选人卡片包含以下信息：

```javascript
// 候选人卡片示例结构
{
  "头像": "image元素",
  "姓名": "陈豪",
  "活跃状态": "刚刚活跃",
  "基本信息": {
    "年龄": "32岁",
    "工作年限": "10年",
    "学历": "本科",
    "求职状态": "离职-随时到岗"
  },
  "期望": {
    "地点": "温州",
    "职位": "产品经理",
    "薪资": "面议" / "11-14K"
  },
  "优势": "工业设计本科毕业，有良好的逻辑能力...",
  "技能标签": ["产品路线图", "Axure", "SKetch", "需求分析", "产品上线"],
  "工作经历": [
    {
      "时间": "2023.04-2023.09",
      "公司": "浙江卡赢信息",
      "职位": "产品经理"
    }
  ],
  "教育经历": [
    {
      "时间": "2011-2015",
      "学校": "北京林业大学",
      "专业": "工业设计",
      "学历": "本科"
    }
  ],
  "操作按钮": "打招呼"
}
```

### 关键选择器（推测，需在iframe内验证）
```css
/* 候选人列表 */
.geek-list               /* 候选人列表容器 */
.geek-item               /* 单个候选人卡片 */

/* 候选人信息 */
.geek-name               /* 姓名 */
.geek-status             /* 活跃状态 */
.geek-position           /* 期望职位 */
.geek-salary             /* 期望薪资 */
.geek-location           /* 期望地点 */

/* 详细信息 */
.geek-info-item          /* 基本信息项（年龄、学历等）*/
.tag, .skill-tag         /* 技能标签 */
.experience-item         /* 工作经历项 */
.education               /* 教育背景 */
.advantage, .self-intro  /* 个人优势 */

/* 操作按钮 */
button[打招呼]           /* 打招呼按钮 */
```

---

## 沟通聊天页面

### URL
- 主页面: `https://www.zhipin.com/web/geek/chat`
- 沟通列表: `https://www.zhipin.com/web/chat/index`

### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  导航栏                                                  │
├──────────────┬──────────────────────────────────────────┤
│              │  筛选标签                                 │
│  候选人      ├──────────────────────────────────────────┤
│  列表        │                                           │
│              │  聊天消息区域                             │
│  (左侧)      │                                           │
│              │  (中间)                                   │
│              ├──────────────────────────────────────────┤
│              │  输入框 [contenteditable]                │
├──────────────┼──────────────────────────────────────────┤
│              │  候选人详情面板                          │
│              │  (右侧，点击候选人后展开)                │
└──────────────┴──────────────────────────────────────────┘
```

### 1. 筛选标签栏

```html
<div class="chat-tabs">
  <div class="tab-item">全部</div>
  <div class="tab-item">新招呼</div>
  <div class="tab-item">沟通中</div>
  <div class="tab-item">已约面</div>
  <div class="tab-item">已获取简历</div>
  <div class="tab-item">已交换电话</div>
  <div class="tab-item">已交换微信</div>
  <div class="tab-item">收藏</div>
</div>
```

**选择器**:
- 标签容器: `.chat-tabs`
- 单个标签: `.tab-item`

---

### 2. 候选人列表（左侧）

```html
<div class="chat-conversation-list">
  <div class="geek-item" id="_45235754-0">
    <img src="..." alt="陈婷婷">
    <div class="geek-info">
      <div class="name">陈婷婷</div>
      <div class="position">产品开发专员</div>
      <div class="last-msg">[送达]方便相互了解一下吗？很看好你的能力。</div>
      <div class="time">17:14</div>
    </div>
  </div>
  <!-- 更多候选人... -->
</div>
```

**选择器**:
- 列表容器: `.chat-conversation-list`
- 单个候选人: `.geek-item`
- 候选人ID: `[id^="_"]` 或 `.geek-item[id]`
- 姓名: `.name`, `[class*="name"]`
- 应聘职位: `.position`, `[class*="position"]`
- 最新消息: `.last-msg`, `[class*="message"]`
- 时间: `.time`, `[class*="time"]`
- 未读标识: `.unread`, `[class*="unread"]`

---

### 3. 聊天消息区域（中间）

```html
<div class="chat-conversation">
  <div class="message-list">
    <h3>11月2日 沟通的职位-产品开发专员</h3>

    <!-- 我发送的消息 -->
    <div class="message-item mine">
      <div class="message-time">17:14</div>
      <div class="message-status">送达</div>
      <div class="message-content">
        方便相互了解一下吗？很看好你的能力。
      </div>
    </div>

    <!-- 对方发送的消息 -->
    <div class="message-item other">
      <div class="message-time">17:20</div>
      <div class="message-content">
        您好，可以的
      </div>
    </div>
  </div>
</div>
```

**选择器**:
- 聊天容器: `.chat-conversation`
- 消息列表: `.message-list`
- 单条消息: `.message-item`
- 我的消息: `.message-item.mine`, `.message-item.self`
- 对方消息: `.message-item.other`
- 消息内容: `.message-content`
- 消息时间: `.message-time`
- 消息状态: `.message-status` (送达/已读)

**判断消息方向**:
```javascript
// 判断是否是对方发的消息
const isFromOther = !messageElement.classList.contains('mine') &&
                    !messageElement.classList.contains('self');
```

---

### 4. 聊天输入框 ⭐ 核心发现

**⚠️ 关键**: Boss直聘使用 `<div contenteditable="true">` 作为输入框，而不是 `<textarea>`！

#### 实测结构
```html
<div class="boss-chat-editor-input"
     contenteditable="true"
     id="boss-chat-editor-input"
     style="height: 126px;">
  <!-- 用户输入的文本在这里 -->
</div>
```

#### 准确的选择器
```css
#boss-chat-editor-input                    /* ID选择器 - 最精确 */
.boss-chat-editor-input                    /* Class选择器 */
[contenteditable="true"]                   /* 属性选择器 */
div[contenteditable="true"]                /* 标签+属性 */
```

#### JavaScript操作方法

**❌ 错误方法** (不要使用):
```javascript
// 这样不起作用！
inputBox.value = "文本内容";  // ❌ contenteditable没有value属性
```

**✅ 正确方法**:
```javascript
// 1. 设置内容
inputBox.textContent = "文本内容";  // ✅ 使用textContent

// 2. 触发输入事件（让Boss直聘检测到内容变化）
inputBox.dispatchEvent(new Event('input', { bubbles: true }));
inputBox.dispatchEvent(new Event('change', { bubbles: true }));

// 3. 聚焦输入框
inputBox.focus();

// 4. 将光标移到末尾
if (window.getSelection && document.createRange) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(inputBox);
  range.collapse(false); // false = 末尾
  sel.removeAllRanges();
  sel.addRange(range);
}
```

#### 读取输入框内容
```javascript
// ❌ 错误
const text = inputBox.value;  // undefined

// ✅ 正确
const text = inputBox.textContent.trim();
// 或
const text = inputBox.innerText.trim();
```

---

### 5. 操作按钮栏

```html
<div class="chat-actions">
  <button class="action-btn">求简历</button>
  <button class="action-btn">换电话</button>
  <button class="action-btn">换微信</button>
  <button class="action-btn">约面试</button>
  <button class="action-btn">不合适</button>
</div>
```

**选择器**:
- 操作栏: `.chat-actions`
- 求简历: `button:contains("求简历")`
- 换电话: `button:contains("换电话")`
- 换微信: `button:contains("换微信")`
- 约面试: `button:contains("约面试")`
- 不合适: `button:contains("不合适")`

---

### 6. 候选人详情面板（右侧）

点击左侧候选人列表后，右侧展开详情面板：

```html
<div class="geek-detail-panel">
  <!-- 基本信息 -->
  <div class="geek-header">
    <div class="name">陈婷婷</div>
    <div class="info-tags">
      <span>30岁</span>
      <span>8年</span>
      <span>大专</span>
    </div>
  </div>

  <!-- 快捷按钮 -->
  <div class="detail-actions">
    <button>在线简历</button>
    <button>附件简历</button>
  </div>

  <!-- 工作经历 -->
  <div class="work-experience">
    <div class="exp-item">
      <div class="time">2024.05-2025.06</div>
      <div class="company">晓风科技</div>
      <div class="position">产品经理</div>
    </div>
  </div>

  <!-- 教育背景 -->
  <div class="education">
    <div class="edu-item">
      <div class="time">2014-2017</div>
      <div class="school">江西财经职业学院</div>
      <div class="major">金融与证券</div>
      <div class="degree">大专</div>
    </div>
  </div>

  <!-- 期望信息 -->
  <div class="expect-info">
    <div class="label">期望：</div>
    <div class="value">温州 · 产品经理 10-13K</div>
  </div>
</div>
```

**选择器**:
- 详情面板: `.geek-detail-panel`, `.user-card`, `[class*="detail"]`
- 姓名: `.geek-header .name`
- 基本信息标签: `.info-tags span`
- 工作经历容器: `.work-experience`
- 单条工作经历: `.exp-item`, `.experience-item`
- 教育背景容器: `.education`
- 单条教育经历: `.edu-item`, `.education-item`
- 期望信息: `.expect-info`

---

## 候选人详情面板

### 展开条件
- 在推荐牛人页面点击候选人卡片
- 在沟通列表点击候选人
- 详情面板通常在页面右侧或以弹窗形式出现

### 完整信息结构

```javascript
// 候选人详情完整数据结构
{
  // 基本信息
  "id": "45235754",
  "name": "陈婷婷",
  "age": "30岁",
  "experience": "8年",
  "education": "大专",
  "status": "在职-月内到岗" / "离职-随时到岗",
  "activeStatus": "刚刚活跃" / "今日活跃" / "3日内活跃",

  // 期望
  "expectations": {
    "location": "温州",
    "position": "产品经理",
    "salary": "10-13K" / "面议"
  },

  // 优势
  "advantages": "工业设计本科毕业，有良好的逻辑能力...",

  // 技能标签
  "skills": [
    "产品路线图",
    "Axure",
    "SKetch",
    "需求分析",
    "产品上线"
  ],

  // 工作经历
  "workHistory": [
    {
      "period": "2024.05-2025.06",
      "company": "晓风科技",
      "position": "产品经理",
      "description": "..."
    }
  ],

  // 教育经历
  "educationHistory": [
    {
      "period": "2014-2017",
      "school": "江西财经职业学院",
      "major": "金融与证券",
      "degree": "大专"
    }
  ]
}
```

---

## 关键DOM选择器汇总

### 通用选择器优先级

为了保证插件在不同页面都能正常工作，建议使用以下优先级策略：

#### 1. 聊天输入框 ⭐⭐⭐
```javascript
// 优先级从高到低
const inputSelectors = [
  '#boss-chat-editor-input',                    // ID - 最精确
  '.boss-chat-editor-input',                    // Class
  '[contenteditable="true"]',                   // 属性
  'div[contenteditable="true"]',                // 标签+属性
  '.chat-editor [contenteditable="true"]',      // 父级+属性
  '[class*="editor"][contenteditable="true"]',  // 模糊匹配
  '[class*="input"][contenteditable="true"]'    // 模糊匹配
];

// 查找逻辑
function findChatInput() {
  for (const selector of inputSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      // 确保元素可见且不是只读
      if (el.offsetParent !== null &&
          !el.hasAttribute('readonly') &&
          !el.hasAttribute('disabled') &&
          el.offsetHeight > 20) {
        return el;
      }
    }
  }
  return null;
}
```

#### 2. 候选人列表项
```javascript
const candidateSelectors = [
  '.geek-item',                      // 标准class
  '.chat-conversation-item',         // 聊天页面
  '[class*="geek-item"]',           // 模糊匹配
  '[class*="conversation"]',        // 模糊匹配
  '[id^="_"]'                       // ID特征匹配
];
```

#### 3. 候选人详情面板
```javascript
const detailSelectors = [
  '.geek-detail-panel',
  '.geek-detail',
  '.user-card',
  '.detail-panel',
  '[class*="detail-panel"]',
  '[class*="geek-detail"]',
  '[class*="user-card"]'
];
```

#### 4. 候选人信息字段
```javascript
const fieldSelectors = {
  name: [
    '.geek-name',
    '.name',
    '[class*="name"]'
  ],
  position: [
    '.geek-position',
    '.position',
    '[class*="position"]'
  ],
  education: [
    '.education',
    '[class*="education"]'
  ],
  experience: [
    '.work-experience',
    '.experience-item',
    '[class*="experience"]'
  ],
  skills: [
    '.tag',
    '.skill-tag',
    '[class*="tag"]'
  ],
  advantages: [
    '.advantage',
    '.self-intro',
    '[class*="advantage"]',
    '[class*="intro"]'
  ],
  status: [
    '.geek-status',
    '[class*="status"]',
    '[class*="active"]'
  ]
};
```

#### 5. 聊天消息
```javascript
const messageSelectors = {
  list: [
    '.message-list',
    '.chat-window',
    '[class*="message"]',
    '[class*="chat"]'
  ],
  item: [
    '.message-item',
    '[class*="message"]'
  ],
  mine: [
    '.message-item.mine',
    '.message-item.self',
    '[class*="mine"]',
    '[class*="self"]'
  ],
  other: [
    '.message-item.other',
    '[class*="other"]'
  ]
};

// 判断消息是否来自对方
function isMessageFromOther(messageElement) {
  return !messageElement.classList.contains('mine') &&
         !messageElement.classList.contains('self') &&
         !messageElement.querySelector('[class*="self"]');
}
```

---

## 数据提取示例代码

### 1. 提取候选人基本信息

```javascript
function extractCandidateInfo(element) {
  const info = {
    id: null,
    name: null,
    age: null,
    experience: null,
    education: null,
    position: null,
    salary: null,
    location: null,
    status: null,
    skills: [],
    advantages: null
  };

  // ID
  info.id = element.getAttribute('id') ||
            element.getAttribute('data-id') ||
            element.getAttribute('data-uid');

  // 姓名
  const nameEl = element.querySelector('.geek-name, .name, [class*="name"]');
  if (nameEl) info.name = nameEl.textContent.trim();

  // 基本信息（年龄、学历、经验）
  const infoEls = element.querySelectorAll('.geek-info-item, .info-item, [class*="info"]');
  infoEls.forEach(el => {
    const text = el.textContent.trim();
    if (text.includes('岁')) info.age = text;
    if (text.includes('年') && !text.includes('岁')) info.experience = text;
    if (text.includes('大专') || text.includes('本科') || text.includes('硕士')) {
      info.education = text;
    }
  });

  // 期望职位
  const posEl = element.querySelector('.geek-position, .position, [class*="position"]');
  if (posEl) info.position = posEl.textContent.trim();

  // 期望薪资
  const salaryEl = element.querySelector('.geek-salary, [class*="salary"], [class*="expect"]');
  if (salaryEl) info.salary = salaryEl.textContent.trim();

  // 工作地点
  const locEl = element.querySelector('.geek-location, [class*="location"], [class*="city"]');
  if (locEl) info.location = locEl.textContent.trim();

  // 在线状态
  const statusEl = element.querySelector('.geek-status, [class*="status"], [class*="active"]');
  if (statusEl) info.status = statusEl.textContent.trim();

  // 技能标签
  const skillEls = element.querySelectorAll('.tag, .skill-tag, [class*="tag"]');
  info.skills = Array.from(skillEls).map(el => el.textContent.trim()).filter(Boolean);

  // 个人优势
  const advEl = element.querySelector('.advantage, .self-intro, [class*="advantage"]');
  if (advEl) info.advantages = advEl.textContent.trim();

  return info;
}
```

### 2. 提取工作经历

```javascript
function extractWorkExperience(element) {
  const experiences = [];
  const expEls = element.querySelectorAll('.experience-item, [class*="experience"]');

  expEls.forEach(expEl => {
    const text = expEl.textContent.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length >= 3) {
      experiences.push({
        period: lines[0],      // "2024.05-2025.06"
        company: lines[1],     // "晓风科技"
        position: lines[2],    // "产品经理"
        description: lines.slice(3).join(' ')
      });
    }
  });

  return experiences;
}
```

### 3. 提取教育背景

```javascript
function extractEducation(element) {
  const educations = [];
  const eduEls = element.querySelectorAll('.education-item, [class*="education"]');

  eduEls.forEach(eduEl => {
    const text = eduEl.textContent.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length >= 3) {
      educations.push({
        period: lines[0],      // "2014-2017"
        school: lines[1],      // "江西财经职业学院"
        major: lines[2],       // "金融与证券"
        degree: lines[3] || '' // "大专"
      });
    }
  });

  return educations;
}
```

### 4. 监听新消息

```javascript
function observeNewMessages(callback) {
  // 查找聊天容器
  const chatContainer = document.querySelector('.chat-conversation, [class*="message"], [class*="chat"]');

  if (!chatContainer) {
    console.error('未找到聊天容器');
    return null;
  }

  // 监听DOM变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains('message-item')) {
            // 判断是否是对方发的消息
            const isFromOther = !node.classList.contains('mine') &&
                                !node.classList.contains('self');

            if (isFromOther) {
              const messageText = node.textContent.trim();
              callback({
                element: node,
                text: messageText,
                time: new Date()
              });
            }
          }
        });
      }
    });
  });

  observer.observe(chatContainer, {
    childList: true,
    subtree: true
  });

  return observer;
}

// 使用示例
observeNewMessages((message) => {
  console.log('收到新消息:', message.text);
  // 触发自动回复建议
  showReplySuggestions(message.text);
});
```

---

## 页面检测与路由

### 判断当前页面类型

```javascript
function detectCurrentPage() {
  const url = window.location.href;

  if (url.includes('/web/chat')) {
    // 沟通页面
    if (url.includes('/web/chat/recommend')) {
      return { type: 'chat_recommend', name: '推荐牛人（带聊天）' };
    }
    return { type: 'chat', name: '沟通列表' };
  }

  if (url.includes('/web/geek/recommend')) {
    return { type: 'recommend', name: '推荐牛人' };
  }

  if (url.includes('/web/geek/search')) {
    return { type: 'search', name: '搜索牛人' };
  }

  if (url.includes('/web/geek/manage')) {
    return { type: 'manage', name: '牛人管理' };
  }

  if (url.includes('/web/position')) {
    return { type: 'position', name: '职位管理' };
  }

  return { type: 'unknown', name: '未知页面' };
}
```

### 监听URL变化（SPA路由）

```javascript
function observeUrlChanges(callback) {
  let lastUrl = location.href;

  // 使用MutationObserver监听body变化
  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      const oldPage = detectCurrentPage();
      lastUrl = currentUrl;
      const newPage = detectCurrentPage();

      callback({
        from: oldPage,
        to: newPage,
        url: currentUrl
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

// 使用示例
observeUrlChanges((change) => {
  console.log(`页面切换: ${change.from.name} -> ${change.to.name}`);

  // 根据页面类型启动不同功能
  if (change.to.type === 'chat') {
    initChatAssistant();
  } else if (change.to.type === 'recommend') {
    initCandidateScorer();
  }
});
```

---

## 反检测注意事项

### Boss直聘的反自动化机制

根据实测，Boss直聘有以下检测机制：

1. **navigator.webdriver 检测** ⭐ 核心
   - 使用CDP（Chrome DevTools Protocol）会导致 `navigator.webdriver` 为 `true`
   - Boss会检测这个属性并强制登出

2. **埋点系统**
   - 使用"数星埋点"系统 (`warlockdata.min.2.2.8.js`)
   - 监控用户行为模式

3. **行为分析**
   - 监控鼠标移动、点击频率
   - 分析页面停留时间

4. **Token机制**
   - `/wapi/zppassport/set/zpToken` 会清空cookie中的 `bst` token
   - 这是强制登出的具体实现方式

### 安全的插件开发策略

✅ **推荐做法**：
- 使用Chrome Extension的Content Script
- 只读取页面DOM，不修改行为
- 半自动模式：AI生成建议，用户手动点击发送
- 不使用CDP或Puppeteer等自动化工具

❌ **避免做法**：
- 使用CDP连接浏览器
- 完全自动化（如自动点击、自动发送）
- 修改 `navigator` 对象
- 高频率操作

---

## 插件开发建议

### 推荐架构

```
boss-zhipin-assistant/
├── manifest.json                    # Chrome Extension配置
├── content.js                       # 主控制脚本
├── modules/
│   ├── extractor.js                # 数据提取模块
│   ├── analyzer.js                 # AI分析模块
│   ├── auto-reply.js               # 智能回复建议
│   ├── auto-greet.js               # 智能打招呼
│   ├── candidate-scorer.js         # 候选人打分
│   ├── candidate-list.js           # 候选人列表管理
│   └── debug-panel.js              # 调试面板
├── utils/
│   ├── config.js                   # 配置管理
│   ├── storage.js                  # 存储管理
│   └── dom-utils.js                # DOM工具函数
├── popup/
│   ├── popup.html                  # 插件弹窗
│   └── popup.js                    # 弹窗逻辑
└── styles/
    └── inject.css                   # 注入样式
```

### 核心功能模块

#### 1. 数据提取模块 (extractor.js)
```javascript
class CandidateExtractor {
  // 智能提取 - 根据当前页面自动选择提取方式
  smartExtract() { }

  // 从聊天列表提取
  extractFromChatList() { }

  // 从详情页提取完整信息
  extractFromDetailPage() { }

  // 提取简历文本（用于AI分析）
  extractResumeText() { }
}
```

#### 2. 智能回复建议 (auto-reply.js)
```javascript
class AutoReplyAssistant {
  // 查找输入框（统一方法）
  findInputBox() { }

  // 监听聊天窗口变化
  observeChatWindow() { }

  // 检查新消息
  checkForNewMessages() { }

  // 显示回复建议面板
  showReplySuggestions(messageText, inputBox) { }

  // 填充回复到输入框
  fillReply(inputBox, text) { }
}
```

#### 3. 候选人打分 (candidate-scorer.js)
```javascript
class CandidateScorer {
  // 检查并对当前页面打分
  checkAndScorePage() { }

  // 判断是否在候选人详情页
  isDetailPage() { }

  // 对当前候选人打分
  scoreCurrentCandidate() { }

  // 规则引擎评分（不使用AI）
  ruleBasedScoring(candidate, config) { }

  // 显示评分卡片
  showScoreCard(candidate, analysis) { }
}
```

#### 4. 候选人列表管理 (candidate-list.js)
```javascript
class CandidateListManager {
  // 添加候选人到列表
  addCandidate(candidateInfo, analysis) { }

  // 显示候选人列表面板
  showPanel() { }

  // 导出候选人数据
  exportCandidates() { }

  // 保存到本地存储
  saveToStorage() { }
}
```

---

## 测试清单

### 功能测试

- [ ] **输入框检测**
  - [ ] 在聊天页面能正确找到输入框
  - [ ] 能正确填充文本到输入框
  - [ ] 触发事件后Boss直聘能检测到内容变化
  - [ ] 光标能正确定位到末尾

- [ ] **候选人信息提取**
  - [ ] 推荐牛人页面能提取候选人基本信息
  - [ ] 聊天列表能提取候选人信息
  - [ ] 详情页能提取完整简历信息
  - [ ] 工作经历、教育背景解析正确

- [ ] **智能回复**
  - [ ] 能检测到对方发送的新消息
  - [ ] 不会误判自己发送的消息
  - [ ] 回复建议面板显示正常
  - [ ] 点击"使用"按钮能正确填充

- [ ] **候选人打分**
  - [ ] 进入详情页能自动触发打分
  - [ ] 评分卡片显示完整信息
  - [ ] 不会重复打分同一个候选人
  - [ ] 切换候选人时卡片正确更新

- [ ] **候选人列表**
  - [ ] 分析过的候选人能自动添加到列表
  - [ ] 列表显示姓名、分数等信息
  - [ ] 筛选功能正常工作
  - [ ] 数据能正确持久化存储

### 兼容性测试

- [ ] **页面切换**
  - [ ] 从推荐牛人切换到沟通页面
  - [ ] 从沟通页面切换到推荐牛人
  - [ ] 刷新页面后功能正常

- [ ] **多候选人测试**
  - [ ] 连续查看多个候选人
  - [ ] 快速切换候选人
  - [ ] 候选人列表达到100个后正常工作

- [ ] **边界情况**
  - [ ] 候选人信息不完整时
  - [ ] 网络延迟时
  - [ ] 快速点击操作时

---

## 常见问题与解决方案

### Q1: 为什么找不到输入框？
**A**: Boss直聘使用 `<div contenteditable="true">` 而不是 `<textarea>`。使用以下选择器：
```javascript
const inputBox = document.querySelector('#boss-chat-editor-input');
```

### Q2: 如何判断是否在候选人详情页？
**A**: 检查URL和DOM：
```javascript
function isDetailPage() {
  const url = window.location.href;
  return (url.includes('/web/geek/recommend') || url.includes('/web/geek/chat')) &&
         !!document.querySelector('.geek-detail, .user-detail, [class*="detail-container"]');
}
```

### Q3: 推荐牛人页面为什么提取不到候选人？
**A**: 因为内容在iframe中。需要访问iframe内的document：
```javascript
const iframe = document.querySelector('iframe');
if (iframe && iframe.contentWindow) {
  const iframeDoc = iframe.contentWindow.document;
  const candidates = iframeDoc.querySelectorAll('.geek-item');
}
```

### Q4: 如何避免被检测为自动化？
**A**:
1. 使用Chrome Extension而不是CDP
2. 半自动模式：AI生成建议，用户手动操作
3. 不要高频率自动点击
4. 只读取DOM，不修改网页行为

### Q5: 填充文本后Boss直聘检测不到内容？
**A**: 需要触发input和change事件：
```javascript
inputBox.textContent = text;
inputBox.dispatchEvent(new Event('input', { bubbles: true }));
inputBox.dispatchEvent(new Event('change', { bubbles: true }));
```

---

## 更新日志

### 2025-11-02
- ✅ 完成推荐牛人页面结构分析
- ✅ 完成沟通聊天页面结构分析
- ✅ 发现并确认聊天输入框使用contenteditable
- ✅ 整理完整的DOM选择器汇总
- ✅ 编写数据提取示例代码

---

## 附录：实际测试数据

### 测试环境
- 浏览器: Chrome 120+
- Boss直聘版本: 8612
- 测试日期: 2025-11-02

### 实测选择器验证

```javascript
// ✅ 已验证有效的选择器
const verified = {
  chatInput: '#boss-chat-editor-input',
  chatConversation: '.chat-conversation',
  geekItem: '.geek-item',
  messageMine: '.message-item.mine'
};
```

---

**文档结束**
