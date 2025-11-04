/**
 * 岗位配置管理模块（2025-11-04新增）
 * 功能：管理多个岗位配置，支持AI解析、结构化编辑、一键提取
 */

class JobConfigManager {
  constructor() {
    this.configs = [];  // 所有岗位配置列表
    this.activeConfigId = null;  // 当前激活的配置ID
    this.loadConfigs();
  }

  /**
   * 加载所有配置
   */
  async loadConfigs() {
    try {
      const result = await chrome.storage.local.get('jobConfigs');
      if (result.jobConfigs && result.jobConfigs.length > 0) {
        this.configs = result.jobConfigs;
        // 设置第一个为激活配置
        this.activeConfigId = this.configs[0].id;
      } else {
        // 创建默认配置
        this.createDefaultConfig();
      }
      console.log(`✅ 加载了 ${this.configs.length} 个岗位配置`);
    } catch (error) {
      console.error('加载岗位配置失败:', error);
      this.createDefaultConfig();
    }
  }

  /**
   * 创建默认配置
   */
  createDefaultConfig() {
    const defaultConfig = {
      id: this.generateId(),
      name: '短视频拍摄剪辑运营',
      createdAt: Date.now(),
      updatedAt: Date.now(),

      // 基础要求
      basic: {
        education: '大专',  // 最低学历
        educationStrict: false,  // 是否严格要求（false=大专及以上，true=必须大专）
        experience: 1,  // 最低工作年限
        ageMin: null,
        ageMax: null,
        salaryMin: 8000,
        salaryMax: 12000,
        location: ['温州']  // 期望地点
      },

      // 必备技能（必须匹配）
      requiredSkills: [
        { name: 'PR', weight: 10 },
        { name: '剪映', weight: 10 },
        { name: '视频拍摄', weight: 10 }
      ],

      // 加分技能（有更好）
      bonusSkills: [
        { name: '抖音', weight: 5 },
        { name: '快手', weight: 5 },
        { name: '直播', weight: 5 },
        { name: '剪辑', weight: 5 },
        { name: 'PS', weight: 3 },
        { name: '摄影', weight: 3 }
      ],

      // 排除关键词
      excludeKeywords: ['兼职', '实习', '远程'],

      // 原始文本（用于AI解析的源数据）
      rawText: '',

      // 工作内容描述（用于生成招呼语）
      jobDescription: '负责短视频内容的拍摄、剪辑和运营工作'
    };

    this.configs = [defaultConfig];
    this.activeConfigId = defaultConfig.id;
    this.saveConfigs();
  }

  /**
   * 获取当前激活的配置
   */
  getActiveConfig() {
    return this.configs.find(c => c.id === this.activeConfigId);
  }

  /**
   * 获取所有配置
   */
  getAllConfigs() {
    return this.configs;
  }

  /**
   * 设置激活配置
   */
  setActiveConfig(configId) {
    const config = this.configs.find(c => c.id === configId);
    if (config) {
      this.activeConfigId = configId;
      this.saveConfigs();
      console.log(`✅ 切换到岗位配置: ${config.name}`);
      return true;
    }
    return false;
  }

  /**
   * 创建新配置
   */
  createConfig(configData) {
    const newConfig = {
      id: this.generateId(),
      name: configData.name || '新岗位',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...configData
    };

    this.configs.push(newConfig);
    this.activeConfigId = newConfig.id;
    this.saveConfigs();
    console.log(`✅ 创建新岗位配置: ${newConfig.name}`);
    return newConfig;
  }

  /**
   * 更新配置
   */
  updateConfig(configId, updates) {
    const index = this.configs.findIndex(c => c.id === configId);
    if (index !== -1) {
      this.configs[index] = {
        ...this.configs[index],
        ...updates,
        updatedAt: Date.now()
      };
      this.saveConfigs();
      console.log(`✅ 更新岗位配置: ${this.configs[index].name}`);
      return this.configs[index];
    }
    return null;
  }

  /**
   * 删除配置
   */
  deleteConfig(configId) {
    // 至少保留一个配置
    if (this.configs.length <= 1) {
      console.warn('⚠️ 至少需要保留一个岗位配置');
      return false;
    }

    const index = this.configs.findIndex(c => c.id === configId);
    if (index !== -1) {
      const deletedConfig = this.configs.splice(index, 1)[0];

      // 如果删除的是激活配置，切换到第一个
      if (this.activeConfigId === configId) {
        this.activeConfigId = this.configs[0].id;
      }

      this.saveConfigs();
      console.log(`✅ 删除岗位配置: ${deletedConfig.name}`);
      return true;
    }
    return false;
  }

  /**
   * AI智能解析岗位需求文本
   */
  async parseJobRequirements(rawText) {
    try {
      console.log('🤖 开始AI解析岗位需求...');

      // 检查是否启用AI
      const config = window.configManager?.get();
      if (!config || !config.useAI || !config.apiKey) {
        console.warn('⚠️ AI未启用，使用规则解析');
        return this.ruleBasedParse(rawText);
      }

      // 调用Gemini API解析（使用Header方式传递API Key）
      const apiKey = config.apiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

      const prompt = `请分析以下招聘岗位需求，提取关键信息并以JSON格式返回：

岗位需求：
${rawText}

请提取以下信息（如果文本中没有提及，则设为null）：
1. 岗位名称
2. 最低学历要求（高中/大专/本科/硕士/博士）
3. 最低工作年限（数字）
4. 薪资范围（最低和最高，单位：元/月）
5. 期望工作地点
6. 必备技能列表（最重要的3-5个技能）
7. 加分技能列表（次要的技能）
8. 排除关键词（如"兼职"、"实习"等）
9. 简短的工作内容描述（一句话）

返回格式示例：
{
  "name": "短视频运营",
  "education": "本科",
  "experience": 1,
  "salaryMin": 8000,
  "salaryMax": 12000,
  "location": ["温州"],
  "requiredSkills": ["PR", "剪映", "视频拍摄"],
  "bonusSkills": ["抖音", "快手", "PS"],
  "excludeKeywords": ["兼职", "实习"],
  "jobDescription": "负责短视频内容的拍摄、剪辑和运营工作"
}

只返回JSON，不要其他解释。`;

      // ✅ 使用速率限制器
      if (window.rateLimiter) {
        try {
          console.log('⏳ 检查API速率限制...');
          await window.rateLimiter.waitForSlot();
          window.rateLimiter.recordRequest();

          const stats = window.rateLimiter.getStats();
          console.log(`📊 API使用统计 - 最近1分钟: ${stats.lastMinute}次, 今日: ${stats.lastDay}次, 剩余: ${stats.remainingToday}次`);
        } catch (error) {
          console.error('⚠️ 速率限制检查失败:', error);
          throw error;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey  // Google官方推荐的Header方式
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API请求失败:', response.status, errorText);
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 打印完整返回数据用于调试
      console.log('📦 Gemini API返回数据:', JSON.stringify(data, null, 2));

      // 检查返回数据结构
      if (!data || !data.candidates || !data.candidates[0]) {
        console.error('❌ API返回数据格式错误 - 缺少candidates:', data);
        throw new Error('API返回数据格式错误：缺少candidates');
      }

      const candidate = data.candidates[0];

      if (!candidate.content) {
        console.error('❌ candidate缺少content字段:', candidate);

        // 检查finishReason
        if (candidate.finishReason) {
          console.error(`⚠️ finishReason: ${candidate.finishReason}`);
          throw new Error(`API返回异常：${candidate.finishReason}（可能被安全过滤或其他限制）`);
        }

        throw new Error('API返回数据格式错误：缺少content');
      }

      if (!candidate.content.parts || !candidate.content.parts[0]) {
        console.error('❌ content缺少parts字段:', candidate.content);
        throw new Error('API返回数据格式错误：缺少content.parts');
      }

      const resultText = candidate.content.parts[0].text;

      // 提取JSON（可能包含markdown代码块）
      let jsonText = resultText;
      if (resultText.includes('```json')) {
        jsonText = resultText.match(/```json\n([\s\S]*?)\n```/)?.[1] || resultText;
      } else if (resultText.includes('```')) {
        jsonText = resultText.match(/```\n([\s\S]*?)\n```/)?.[1] || resultText;
      }

      const parsed = JSON.parse(jsonText.trim());

      console.log('✅ AI解析成功:', parsed);

      // 转换为配置格式
      return this.convertParsedToConfig(parsed, rawText);

    } catch (error) {
      console.error('❌ AI解析失败:', error);
      // 降级到规则解析
      return this.ruleBasedParse(rawText);
    }
  }

  /**
   * 规则解析（AI降级方案）
   */
  ruleBasedParse(rawText) {
    console.log('📋 使用规则解析岗位需求...');

    const config = {
      name: '岗位',
      basic: {
        education: null,
        experience: 0,
        salaryMin: null,
        salaryMax: null,
        location: []
      },
      requiredSkills: [],
      bonusSkills: [],
      excludeKeywords: [],
      rawText: rawText,
      jobDescription: ''
    };

    // 提取岗位名称
    const nameMatch = rawText.match(/职位[：:]\s*(.+?)[\n\r]/);
    if (nameMatch) config.name = nameMatch[1].trim();

    // 提取学历
    if (rawText.includes('博士')) {
      config.basic.education = '博士';
    } else if (rawText.includes('硕士')) {
      config.basic.education = '硕士';
    } else if (rawText.includes('本科')) {
      config.basic.education = '本科';
    } else if (rawText.includes('大专')) {
      config.basic.education = '大专';
    }

    // 提取工作年限
    const expMatch = rawText.match(/(\d+)\s*年以上/);
    if (expMatch) {
      config.basic.experience = parseInt(expMatch[1]);
    }

    // 提取薪资
    const salaryMatch = rawText.match(/(\d+)\s*[-~]\s*(\d+)\s*[Kk]/);
    if (salaryMatch) {
      config.basic.salaryMin = parseInt(salaryMatch[1]) * 1000;
      config.basic.salaryMax = parseInt(salaryMatch[2]) * 1000;
    }

    // 提取常见技能
    const commonSkills = ['PR', '剪映', 'PS', 'AE', 'AI', 'CDR', 'Python', 'Java', 'JavaScript',
                         '抖音', '快手', '视频', '摄影', '剪辑', '运营', '策划'];

    commonSkills.forEach(skill => {
      if (rawText.includes(skill)) {
        // 判断是否是必备技能（包含"熟练"、"精通"、"必须"等词）
        const isRequired = rawText.match(new RegExp(`(熟练|精通|必须|掌握|会).{0,10}${skill}`));

        if (isRequired) {
          config.requiredSkills.push({ name: skill, weight: 10 });
        } else {
          config.bonusSkills.push({ name: skill, weight: 5 });
        }
      }
    });

    // 排除关键词
    const excludeWords = ['兼职', '实习', '远程', '在家', '全职妈妈'];
    excludeWords.forEach(word => {
      if (rawText.includes(word)) {
        config.excludeKeywords.push(word);
      }
    });

    console.log('✅ 规则解析完成:', config);
    return config;
  }

  /**
   * 将AI解析结果转换为配置格式
   */
  convertParsedToConfig(parsed, rawText) {
    return {
      name: parsed.name || '岗位',
      basic: {
        education: parsed.education || null,
        educationStrict: false,
        experience: parsed.experience || 0,
        ageMin: null,
        ageMax: null,
        salaryMin: parsed.salaryMin || null,
        salaryMax: parsed.salaryMax || null,
        location: parsed.location || []
      },
      requiredSkills: (parsed.requiredSkills || []).map(skill => ({
        name: skill,
        weight: 10
      })),
      bonusSkills: (parsed.bonusSkills || []).map(skill => ({
        name: skill,
        weight: 5
      })),
      excludeKeywords: parsed.excludeKeywords || [],
      rawText: rawText,
      jobDescription: parsed.jobDescription || ''
    };
  }

  /**
   * 从Boss直聘职位管理页面提取岗位信息
   */
  extractFromJobPage() {
    try {
      console.log('📄 从职位管理页面提取岗位信息...');

      // 查找职位卡片或详情区域
      const selectors = [
        '.job-detail',
        '.job-card',
        '.position-detail',
        '[class*="job"]',
        '[class*="position"]'
      ];

      let jobElement = null;
      for (const selector of selectors) {
        jobElement = document.querySelector(selector);
        if (jobElement) break;
      }

      if (!jobElement) {
        console.warn('⚠️ 未找到职位信息元素');
        return null;
      }

      // 提取文本内容
      const rawText = jobElement.textContent.trim();

      console.log('✅ 提取到职位信息，准备AI解析...');

      return rawText;

    } catch (error) {
      console.error('❌ 提取职位信息失败:', error);
      return null;
    }
  }

  /**
   * 保存所有配置
   */
  async saveConfigs() {
    try {
      await chrome.storage.local.set({
        jobConfigs: this.configs,
        activeConfigId: this.activeConfigId
      });
      console.log('✅ 岗位配置已保存');
    } catch (error) {
      console.error('保存岗位配置失败:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 导出配置（用于备份）
   */
  exportConfigs() {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      configs: this.configs
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入配置
   */
  async importConfigs(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.configs && Array.isArray(data.configs)) {
        this.configs = data.configs;
        this.activeConfigId = this.configs[0]?.id || null;
        await this.saveConfigs();
        console.log(`✅ 导入了 ${this.configs.length} 个岗位配置`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.jobConfigManager = new JobConfigManager();
}
