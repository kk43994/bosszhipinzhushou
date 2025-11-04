/**
 * 配置管理模块
 */

const CONFIG = {
  // 运行模式
  MODE: {
    SAFE: 'safe',        // 安全模式（半自动）
    AUTO: 'auto'         // 自动模式（全自动）
  },

  // 默认配置
  DEFAULT: {
    mode: 'safe',                    // 默认使用安全模式
    autoReplyEnabled: false,         // 默认关闭自动回复
    autoGreetEnabled: false,         // 默认关闭自动打招呼
    useAI: false,                    // 默认使用规则评分，不调用AI
    aiProvider: 'gemini',            // AI提供商：gemini 或 zhipu
    geminiApiKey: '',                // Gemini API密钥
    zhipuApiKey: '',                 // 智谱AI API密钥
    apiKey: '',                      // ⚠️ 废弃字段，保留用于向后兼容

    // 筛选标准
    filterCriteria: {
      minEducation: '大专',          // 最低学历
      minExperience: 0,              // 最低工作年限
      requiredSkills: [],            // 必备技能
      excludeKeywords: ['兼职', '实习生'],  // 排除关键词
      maxSalaryExpectation: 20000    // 最高期望薪资
    },

    // 反检测配置（自动模式专用）
    antiDetection: {
      enabled: true,
      randomDelay: {
        min: 2000,                   // 最小延迟2秒
        max: 8000                    // 最大延迟8秒
      },
      humanBehavior: {
        mouseMovement: true,         // 模拟鼠标移动
        scrolling: true,             // 模拟滚动
        typing: true                 // 模拟打字
      }
    },

    // 自动回复配置
    autoReply: {
      workingHours: {
        enabled: true,
        start: '09:00',
        end: '18:00'
      },
      replyTemplates: {
        greeting: '您好！感谢您的咨询。',
        salaryInquiry: '关于薪资待遇，我们可以面聊详谈。',
        jobInquiry: '我们的岗位主要负责{job_description}。'
      },
      maxRepliesPerHour: 20          // 每小时最多回复次数
    },

    // 自动打招呼配置
    autoGreet: {
      onlyHighMatch: true,           // 只对高匹配度候选人打招呼
      minMatchScore: 80,             // 最低匹配分数
      maxGreetsPerDay: 50,           // 每天最多打招呼次数
      greetTemplate: '您好！看到您的简历与我们的{position}岗位高度匹配，欢迎进一步沟通。'
    }
  },

  // Boss直聘页面选择器（2025-11-04 真实DOM结构）
  SELECTORS: {
    // 左侧聊天列表
    chatList: '.user-list',                    // ✅ 聊天列表容器
    chatItemWrap: '.geek-item-wrap',           // ✅ 聊天项包装
    chatItem: '.geek-item',                    // ✅ 单个聊天项
    candidateNameInList: '.geek-name',         // ✅ 列表中的候选人姓名
    lastMessage: '.last-msg',                  // 最后一条消息
    unreadBadge: '.unread-num',                // 未读标记

    // 右侧候选人详情区域
    candidateCard: '.base-info-content',       // ✅ 候选人详细信息卡片
    candidateName: '.base-name',               // ✅ 候选人姓名
    candidateExperience: '.experience-content', // ✅ 工作经历
    candidateWorkDetail: '.work-content',      // ✅ 工作详情
    candidateEducation: '.education-info',     // 教育背景
    candidateSkills: '.tag-list',              // 技能标签

    // 右侧聊天窗口
    chatWindow: '.chat-container',             // ✅ 聊天容器
    chatConversation: '.chat-conversation',    // ✅ 消息对话区域
    messageItem: '.message-item',              // ✅ 单条消息
    messageInput: '#boss-chat-editor-input',   // ✅ 输入框（contenteditable）

    // 输入操作区域
    operateArea: '.conversation-operate',      // ✅ 操作区域容器
    editorContainer: '.conversation-editor',   // ✅ 编辑器容器
    toolbarBox: '.toolbar-box',                // ✅ 工具栏（表情、常用语等）

    // 操作按钮
    resumeButtonOnline: '.resume-btn-online',  // ✅ 在线简历按钮
    resumeButtonFile: '.resume-btn-file',      // ✅ 附件简历按钮
    greetButton: '.start-chat-btn',            // 开始聊天按钮
    rejectButton: '.not-suitable-btn',         // 不合适按钮

    // 推荐牛人页面选择器（2025-11-04新增）
    recommend: {
      cardList: '.card-list',                  // ✅ 牛人卡片列表容器
      cardItem: '.card-item',                  // ✅ 单个卡片项（li）
      cardWrap: '.candidate-card-wrap',        // ✅ 卡片包装
      cardInner: '.card-inner',                // ✅ 卡片内容区域

      // 卡片内信息元素
      avatar: '.col-1 img.avatar',             // 头像
      name: '.name',                           // 姓名
      activeStatus: '.active-text',            // 活跃状态（刚刚活跃）
      baseInfo: '.base-info',                  // 基本信息（年龄、经验、学历）
      expectation: '.row-flex',                // 期望职位行
      advantage: '.geek-desc',                 // 优势描述
      tags: '.tag-item',                       // 技能标签
      highlight: '.highlight',                 // 亮点标记
      experience: '.experience-item',          // 工作经历
      greetButton: '.btn.btn-greet',           // ✅ 打招呼按钮
    }
  },

  // Gemini API配置
  API: {
    gemini: {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      model: 'gemini-2.5-flash',
      maxTokens: 2048,
      temperature: 0.7,
      topK: 40,
      topP: 0.95
    }
  }
  // 注意：将来如需支持其他AI（如Claude），可在此添加配置
};

// 配置管理器
class ConfigManager {
  constructor() {
    this.config = { ...CONFIG.DEFAULT };
    this.loadConfig();
  }

  // 加载配置
  async loadConfig() {
    try {
      const stored = await chrome.storage.local.get('config');
      if (stored.config) {
        // ✅ 配置迁移：将旧的apiKey迁移到新字段
        if (stored.config.apiKey && !stored.config.geminiApiKey) {
          console.log('🔄 检测到旧配置，自动迁移API Key...');
          stored.config.geminiApiKey = stored.config.apiKey;
          stored.config.aiProvider = 'gemini';
          // 保存迁移后的配置
          await chrome.storage.local.set({ config: stored.config });
          console.log('✅ 配置迁移完成');
        }

        this.config = { ...this.config, ...stored.config };
        console.log('📝 当前配置:', {
          useAI: this.config.useAI,
          aiProvider: this.config.aiProvider,
          geminiApiKey: this.config.geminiApiKey ? '已配置' : '未配置',
          zhipuApiKey: this.config.zhipuApiKey ? '已配置' : '未配置'
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  // 保存配置
  async saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      await chrome.storage.local.set({ config: this.config });
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }

  // 获取配置
  get(key) {
    return key ? this.config[key] : this.config;
  }

  // 是否启用自动模式
  isAutoMode() {
    return this.config.mode === CONFIG.MODE.AUTO;
  }

  // 是否启用安全模式
  isSafeMode() {
    return this.config.mode === CONFIG.MODE.SAFE;
  }
}

// 导出配置
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.configManager = new ConfigManager();
}
