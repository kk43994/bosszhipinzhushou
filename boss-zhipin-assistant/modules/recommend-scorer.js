/**
 * 推荐牛人智能评分模块（2025-11-04新增）
 * 功能：分析牛人卡片信息，计算匹配度评分
 */

class RecommendScorer {
  constructor() {
    this.selectors = CONFIG.SELECTORS.recommend;
    this.processedNiuren = new Set();  // 已处理的牛人ID
    this.scores = new Map();  // 存储评分结果
    this.useAI = false;  // 是否使用AI评分（从配置加载）
    this.aiProvider = 'gemini';  // AI提供商
    this.geminiApiKey = '';  // Gemini API密钥
    this.zhipuApiKey = '';   // 智谱AI API密钥
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.local.get('config');
      const config = result.config || {};
      this.useAI = config.useAI || false;
      this.aiProvider = config.aiProvider || 'gemini';
      this.geminiApiKey = config.geminiApiKey || '';
      this.zhipuApiKey = config.zhipuApiKey || '';

      // ✅ 向后兼容：如果有旧的apiKey，迁移到geminiApiKey
      if (config.apiKey && !this.geminiApiKey) {
        this.geminiApiKey = config.apiKey;
      }

      const currentApiKey = this.aiProvider === 'gemini' ? this.geminiApiKey : this.zhipuApiKey;
      const providerName = this.aiProvider === 'gemini' ? 'Gemini' : '智谱AI';
      const apiKeyStatus = currentApiKey ? '已配置' : '未配置';
      console.log(`📋 评分配置: ${this.useAI ? `AI模式(${providerName})` : '规则模式'}, API密钥: ${apiKeyStatus}`);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  /**
   * 初始化 - 扫描页面所有牛人卡片并评分
   */
  async init() {
    console.log('✅ 推荐牛人智能评分模块已启动');

    // 加载配置
    await this.loadConfig();

    // 等待iframe加载完成
    this.waitForIframe(() => {
      this.scanAndScoreCards();

      // 监听页面滚动和新卡片加载
      this.observeNewCards();
    });
  }

  /**
   * 等待iframe加载（推荐页面在iframe中）
   */
  waitForIframe(callback) {
    const checkIframe = () => {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        console.log('✅ 找到推荐页面iframe');
        callback();
      } else {
        // 可能页面不在iframe中，直接尝试
        const cardList = document.querySelector(this.selectors.cardList);
        if (cardList) {
          console.log('✅ 找到推荐牛人卡片列表（非iframe）');
          callback();
        } else {
          setTimeout(checkIframe, 1000);
        }
      }
    };
    checkIframe();
  }

  /**
   * 扫描并评分所有卡片
   */
  scanAndScoreCards() {
    try {
      // 尝试从iframe或主文档获取卡片列表
      let doc = document;
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        doc = iframe.contentDocument;
      }

      const cardList = doc.querySelector(this.selectors.cardList);
      if (!cardList) {
        console.warn('⚠️ 未找到牛人卡片列表');
        return;
      }

      const cards = cardList.querySelectorAll(this.selectors.cardItem);
      console.log(`📊 扫描到 ${cards.length} 个牛人卡片`);

      cards.forEach((card, index) => {
        this.analyzeAndScoreCard(card, index);
      });

    } catch (error) {
      console.error('❌ 扫描卡片失败:', error);
    }
  }

  /**
   * 分析单个卡片并评分
   */
  async analyzeAndScoreCard(cardElement, index) {
    try {
      // 提取牛人信息
      const niurenInfo = this.extractCardInfo(cardElement);
      if (!niurenInfo) return;

      // 检查是否已处理
      const cardId = this.generateCardId(niurenInfo);
      if (this.processedNiuren.has(cardId)) return;

      this.processedNiuren.add(cardId);

      // 计算评分（支持AI评分，可能需要等待）
      const score = await this.calculateScore(niurenInfo);
      this.scores.set(cardId, score);

      console.log(`✅ 评分完成: ${niurenInfo.name} - ${score}分`);

      // 显示评分徽章
      this.showScoreBadge(cardElement, score, niurenInfo);

      // 如果高匹配，增强打招呼按钮
      if (score >= 75) {
        this.enhanceGreetButton(cardElement, niurenInfo, score);
      }

    } catch (error) {
      console.error('❌ 分析卡片失败:', error);
    }
  }

  /**
   * 从卡片提取牛人信息
   */
  extractCardInfo(card) {
    try {
      const info = {
        element: card,

        // 姓名
        name: card.querySelector(this.selectors.name)?.textContent.trim() || '未知',

        // 活跃状态
        activeStatus: card.querySelector(this.selectors.activeStatus)?.textContent.trim() || '',

        // 基本信息（年龄、经验、学历）
        baseInfo: card.querySelector(this.selectors.baseInfo)?.textContent.trim() || '',

        // 期望信息
        expectation: Array.from(card.querySelectorAll(this.selectors.expectation))
          .map(el => el.textContent.trim()).join(' '),

        // 优势描述
        advantage: card.querySelector(this.selectors.advantage)?.textContent.trim() || '',

        // 技能标签
        tags: Array.from(card.querySelectorAll(this.selectors.tags))
          .map(tag => tag.textContent.trim()).filter(Boolean),

        // 是否有亮点标记
        hasHighlight: !!card.querySelector(this.selectors.highlight),

        // 工作经历
        experiences: Array.from(card.querySelectorAll(this.selectors.experience))
          .map(exp => exp.textContent.trim()),
      };

      // 解析基本信息
      this.parseBaseInfo(info);

      return info;
    } catch (error) {
      console.error('提取卡片信息失败:', error);
      return null;
    }
  }

  /**
   * 解析基本信息（年龄、经验、学历）
   */
  parseBaseInfo(info) {
    const baseInfo = info.baseInfo;

    // 提取年龄
    const ageMatch = baseInfo.match(/(\d+)岁/);
    info.age = ageMatch ? parseInt(ageMatch[1]) : null;

    // 提取工作年限
    const expMatch = baseInfo.match(/(\d+)年/);
    info.workYears = expMatch ? parseInt(expMatch[1]) : 0;

    // 提取学历
    if (baseInfo.includes('博士')) {
      info.education = '博士';
    } else if (baseInfo.includes('硕士')) {
      info.education = '硕士';
    } else if (baseInfo.includes('本科')) {
      info.education = '本科';
    } else if (baseInfo.includes('大专')) {
      info.education = '大专';
    } else if (baseInfo.includes('高中')) {
      info.education = '高中';
    } else {
      info.education = '未知';
    }

    // 提取求职状态
    if (baseInfo.includes('离职')) {
      info.jobStatus = '离职';
    } else if (baseInfo.includes('在职')) {
      info.jobStatus = '在职';
    } else {
      info.jobStatus = '未知';
    }
  }

  /**
   * 调用AI API进行评分（支持Gemini和智谱AI）
   */
  async callGeminiForScore(niurenInfo) {
    const currentApiKey = this.aiProvider === 'gemini' ? this.geminiApiKey : this.zhipuApiKey;

    if (!currentApiKey) {
      console.warn('⚠️ 未配置API密钥，降级为规则评分');
      return null;
    }

    try {
      const jobConfig = this.getJobConfig();
      const jobName = jobConfig?.name || '招聘岗位';

      // 构建prompt
      const prompt = `你是专业的招聘助手。请评估以下牛人（候选人）与岗位的匹配度。

## 牛人信息
- 姓名：${niurenInfo.name || '未知'}
- 学历：${niurenInfo.education || '未知'}
- 工作年限：${niurenInfo.workYears || 0}年
- 活跃状态：${niurenInfo.activeStatus || '未知'}
- 期望职位：${niurenInfo.expectation || '未知'}
- 技能标签：${niurenInfo.tags.join('、') || '无'}
- 个人优势：${niurenInfo.advantage || '无'}

## 岗位要求
- 岗位名称：${jobName}
${jobConfig ? `- 最低学历：${jobConfig.education || '不限'}
- 最低年限：${jobConfig.experience || 0}年
- 必备技能：${jobConfig.requiredSkills?.join('、') || '无'}
- 加分技能：${jobConfig.bonusSkills?.join('、') || '无'}
- 排除关键词：${jobConfig.excludeKeywords?.join('、') || '无'}` : '- 未配置详细要求'}

## 评分要求
请按0-100分评估匹配度，并说明理由。返回JSON格式：
{
  "score": 85,
  "reason": "简短说明匹配/不匹配的原因",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1"]
}

只返回JSON，不要其他文字。`;

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

      // 调用Gemini API（使用Header方式传递API Key）
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': currentApiKey  // ✅ 使用当前选择的API密钥
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

      // 提取JSON（可能包含在markdown代码块中）
      let jsonText = resultText;
      if (resultText.includes('```json')) {
        jsonText = resultText.match(/```json\n([\s\S]*?)\n```/)?.[1] || resultText;
      } else if (resultText.includes('```')) {
        jsonText = resultText.match(/```\n([\s\S]*?)\n```/)?.[1] || resultText;
      }

      const result = JSON.parse(jsonText.trim());
      console.log(`🤖 AI评分完成: ${niurenInfo.name} = ${result.score}分`);

      return result;

    } catch (error) {
      console.error('❌ AI评分失败:', error);
      return null;
    }
  }

  /**
   * 计算匹配度评分（0-100分）
   * 优先使用AI评分，失败时降级为规则评分
   */
  async calculateScore(niurenInfo) {
    // 如果启用了AI评分，尝试使用AI
    if (this.useAI) {
      const aiResult = await this.callGeminiForScore(niurenInfo);
      if (aiResult && aiResult.score) {
        return aiResult.score;
      }
      console.warn('⚠️ AI评分失败，降级为规则评分');
    }

    // 降级为规则评分
    return this.calculateScoreByRules(niurenInfo);
  }

  /**
   * 基于规则的评分（备用方案）
   */
  calculateScoreByRules(niurenInfo) {
    let score = 50; // 基础分

    // 1. 学历评分（最高+20）
    const educationScore = {
      '博士': 20,
      '硕士': 20,
      '本科': 15,
      '大专': 10,
      '高中': 5,
      '未知': 0
    };
    score += educationScore[niurenInfo.education] || 0;

    // 2. 工作年限评分（最高+15）
    if (niurenInfo.workYears >= 5) {
      score += 15;
    } else if (niurenInfo.workYears >= 3) {
      score += 12;
    } else if (niurenInfo.workYears >= 1) {
      score += 8;
    } else if (niurenInfo.workYears > 0) {
      score += 5;
    }

    // 3. 技能标签匹配（最高+20，2025-11-04优化）
    // 获取岗位配置
    const jobConfig = this.getJobConfig();
    let requiredSkillMatches = 0;
    let bonusSkillMatches = 0;

    if (jobConfig) {
      niurenInfo.tags.forEach(tag => {
        const lowerTag = tag.toLowerCase();

        // 匹配必备技能（每个+10分）
        if (jobConfig.requiredSkills) {
          for (const skill of jobConfig.requiredSkills) {
            const skillName = (typeof skill === 'string' ? skill : skill.name).toLowerCase();
            if (lowerTag.includes(skillName) || skillName.includes(lowerTag)) {
              const weight = typeof skill === 'object' ? skill.weight : 10;
              requiredSkillMatches += weight;
              break;
            }
          }
        }

        // 匹配加分技能（每个+5分）
        if (jobConfig.bonusSkills) {
          for (const skill of jobConfig.bonusSkills) {
            const skillName = (typeof skill === 'string' ? skill : skill.name).toLowerCase();
            if (lowerTag.includes(skillName) || skillName.includes(lowerTag)) {
              const weight = typeof skill === 'object' ? skill.weight : 5;
              bonusSkillMatches += weight;
              break;
            }
          }
        }
      });

      // 排除关键词检测（扣分）
      if (jobConfig.excludeKeywords) {
        const fullText = (niurenInfo.expectation + ' ' + niurenInfo.advantage).toLowerCase();
        for (const keyword of jobConfig.excludeKeywords) {
          if (fullText.includes(keyword.toLowerCase())) {
            score -= 20; // 每个排除关键词扣20分
          }
        }
      }
    }

    // 技能匹配得分（最高+30）
    score += Math.min(30, requiredSkillMatches + bonusSkillMatches);

    // 4. 活跃度评分（最高+15）
    if (niurenInfo.activeStatus.includes('刚刚活跃')) {
      score += 15;
    } else if (niurenInfo.activeStatus.includes('今天活跃')) {
      score += 10;
    } else if (niurenInfo.activeStatus.includes('本周活跃')) {
      score += 5;
    }

    // 5. 求职状态评分（最高+10）
    if (niurenInfo.jobStatus === '离职') {
      score += 10;  // 离职求职者可能更积极
    } else if (niurenInfo.jobStatus === '在职') {
      score += 5;   // 在职看机会
    }

    // 6. Boss亮点标记（+10）
    if (niurenInfo.hasHighlight) {
      score += 10;
    }

    // 7. 工作经历丰富度（最高+10）
    if (niurenInfo.experiences.length >= 3) {
      score += 10;
    } else if (niurenInfo.experiences.length >= 2) {
      score += 6;
    } else if (niurenInfo.experiences.length >= 1) {
      score += 3;
    }

    // 扣分项
    // 频繁跳槽检测（如果有多段短期经历）
    // TODO: 需要更详细的经历时间解析

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 获取岗位配置（2025-11-04优化 - 使用结构化配置）
   */
  getJobConfig() {
    try {
      return window.jobConfigManager?.getActiveConfig() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 技能匹配检测（2025-11-04优化 - 使用结构化配置）
   */
  isSkillMatch(tag, jobConfig) {
    if (!jobConfig) return false;

    const lowerTag = tag.toLowerCase();

    // 检查必备技能
    if (jobConfig.requiredSkills) {
      for (const skill of jobConfig.requiredSkills) {
        const skillName = (typeof skill === 'string' ? skill : skill.name).toLowerCase();
        if (lowerTag.includes(skillName) || skillName.includes(lowerTag)) {
          return true;
        }
      }
    }

    // 检查加分技能
    if (jobConfig.bonusSkills) {
      for (const skill of jobConfig.bonusSkills) {
        const skillName = (typeof skill === 'string' ? skill : skill.name).toLowerCase();
        if (lowerTag.includes(skillName) || skillName.includes(lowerTag)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 显示评分徽章
   */
  showScoreBadge(cardElement, score, niurenInfo) {
    // 移除旧徽章
    const oldBadge = cardElement.querySelector('.boss-score-badge');
    if (oldBadge) oldBadge.remove();

    // 创建新徽章
    const badge = document.createElement('div');
    badge.className = 'boss-score-badge';

    // 根据分数确定颜色和星级
    let color, stars, label;
    if (score >= 80) {
      color = '#52c41a';  // 绿色 - 高匹配
      stars = '⭐⭐⭐⭐⭐';
      label = '高匹配';
    } else if (score >= 60) {
      color = '#faad14';  // 橙色 - 中等匹配
      stars = '⭐⭐⭐';
      label = '中等';
    } else {
      color = '#999';     // 灰色 - 低匹配
      stars = '⭐';
      label = '低匹配';
    }

    badge.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: ${color};
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    badge.innerHTML = `<span>${score}分</span><span style="font-size: 10px;">${label}</span>`;

    // 确保卡片有相对定位
    cardElement.style.position = 'relative';
    cardElement.appendChild(badge);
  }

  /**
   * 增强打招呼按钮（高匹配牛人）
   */
  enhanceGreetButton(cardElement, niurenInfo, score) {
    const greetBtn = cardElement.querySelector(this.selectors.greetButton);
    if (!greetBtn) return;

    // 修改按钮样式
    greetBtn.style.background = '#52c41a';
    greetBtn.style.borderColor = '#52c41a';
    greetBtn.style.animation = 'pulse 2s infinite';
    greetBtn.title = `高匹配牛人（${score}分）- 推荐打招呼`;

    // 添加脉冲动画样式（如果还没有）
    if (!document.getElementById('boss-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'boss-pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(82, 196, 26, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    // 绑定智能打招呼功能
    greetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showSmartGreetPanel(niurenInfo, score);
    });
  }

  /**
   * 显示智能打招呼面板
   */
  showSmartGreetPanel(niurenInfo, score) {
    // 移除旧面板
    const oldPanel = document.querySelector('.boss-smart-greet-panel');
    if (oldPanel) oldPanel.remove();

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'boss-smart-greet-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 10000;
      min-width: 500px;
      max-width: 700px;
    `;

    panel.innerHTML = `
      <div class="boss-greet-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="font-size: 18px; font-weight: bold;">🎯 高匹配牛人 - ${niurenInfo.name}</div>
        <button class="boss-close-btn" style="border: none; background: none; font-size: 28px; cursor: pointer; color: #999;">×</button>
      </div>

      <div class="boss-greet-info" style="padding: 16px; background: #f5f7fa; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 6px 0;"><strong style="color: #52c41a;">匹配度：${score}分 ⭐⭐⭐⭐⭐</strong></p>
        <p style="margin: 6px 0;">学历：${niurenInfo.education} | 工作年限：${niurenInfo.workYears}年</p>
        <p style="margin: 6px 0;">技能：${niurenInfo.tags.slice(0, 5).join('、')}</p>
        <p style="margin: 6px 0;">活跃：${niurenInfo.activeStatus}</p>
      </div>

      <div class="boss-greet-suggestions">
        <p style="font-weight: bold; margin-bottom: 16px; font-size: 15px;">💬 建议招呼语：</p>
        <div class="boss-greet-options">
          ${this.generateGreetingOptions(niurenInfo).map((opt, idx) => `
            <div class="boss-greet-option" style="margin-bottom: 12px; padding: 14px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                 onmouseenter="this.style.backgroundColor='#f5f7fa'; this.style.borderColor='#52c41a';"
                 onmouseleave="this.style.backgroundColor='white'; this.style.borderColor='#e0e0e0';">
              <div style="font-size: 12px; color: #999; margin-bottom: 8px;">${opt.label}</div>
              <div class="boss-greet-text" style="margin-bottom: 10px; color: #333; line-height: 1.6;">${opt.text}</div>
              <button class="boss-use-greet-btn" data-text="${this.escapeHtml(opt.text)}"
                      style="padding: 8px 16px; background: #52c41a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
                      onmouseenter="this.style.background='#45a818';"
                      onmouseleave="this.style.background='#52c41a';">
                使用此招呼语
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 关闭按钮
    panel.querySelector('.boss-close-btn').onclick = () => panel.remove();

    // 使用按钮
    panel.querySelectorAll('.boss-use-greet-btn').forEach(btn => {
      btn.onclick = () => {
        const text = btn.getAttribute('data-text');
        // 调用推荐打招呼模块的功能
        if (window.recommendGreeter) {
          window.recommendGreeter.sendGreeting(niurenInfo, text);
        }
        panel.remove();
      };
    });

    // 点击外部关闭
    panel.onclick = (e) => {
      if (e.target === panel) panel.remove();
    };
  }

  /**
   * 生成招呼语选项
   */
  generateGreetingOptions(niurenInfo) {
    const options = [
      {
        label: '📋 正式风格',
        text: `您好${niurenInfo.name}！看到您有${niurenInfo.workYears}年相关经验，与我们的岗位非常匹配，欢迎进一步沟通。`
      },
      {
        label: '😊 友好风格',
        text: `Hi ${niurenInfo.name}！您的简历很不错，${niurenInfo.tags.slice(0, 2).join('、')}这些技能正是我们需要的，期待和您聊聊~`
      },
      {
        label: '⚡ 简洁风格',
        text: `您好！您的背景与我们岗位高度匹配，方便详细了解一下吗？`
      }
    ];

    return options;
  }

  /**
   * 监听新卡片加载（滚动加载更多）
   */
  observeNewCards() {
    // 使用MutationObserver监听新卡片
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches && node.matches(this.selectors.cardItem)) {
            this.analyzeAndScoreCard(node);
          }
        });
      });
    });

    // 观察卡片列表容器
    const cardList = document.querySelector(this.selectors.cardList);
    if (cardList) {
      observer.observe(cardList, {
        childList: true,
        subtree: true
      });
      console.log('✅ 开始监听新卡片加载');
    }
  }

  /**
   * 生成卡片ID
   */
  generateCardId(info) {
    return `${info.name}_${info.age}_${info.education}`;
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.recommendScorer = new RecommendScorer();
}
