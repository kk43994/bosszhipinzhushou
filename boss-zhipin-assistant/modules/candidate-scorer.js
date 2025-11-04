/**
 * 候选人详情页自动打分评价模块
 */

class CandidateScorer {
  constructor() {
    this.currentCandidate = null;
    this.scoringInProgress = false;
    this.lastScoredUrl = null; // 记录最后一次打分的URL
    this.cardVisible = false; // 跟踪卡片显示状态
  }

  /**
   * 初始化 - 监听页面变化
   */
  init() {
    console.log('候选人打分模块已启动');

    // 立即检查当前页面
    this.checkAndScorePage();

    // 监听URL变化（单页应用）
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.checkAndScorePage();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 定期检查（防止遗漏）
    setInterval(() => {
      this.checkAndScorePage();
    }, 3000);
  }

  /**
   * 检查并对当前页面打分
   */
  async checkAndScorePage() {
    const currentUrl = window.location.href;

    // 检查是否在候选人详情页
    if (!this.isDetailPage()) {
      // 只有在URL改变时才删除卡片
      if (this.lastScoredUrl && currentUrl !== this.lastScoredUrl) {
        this.removeScoreCard();
        this.lastScoredUrl = null;
      }
      return;
    }

    // 检查是否已经在打分中
    if (this.scoringInProgress) return;

    // 检查是否已经为当前URL打过分
    if (this.lastScoredUrl === currentUrl && this.cardVisible) {
      console.log('当前页面已打分，跳过');
      return;
    }

    // 检查是否已经显示了评分卡片
    if (document.querySelector('.boss-score-card')) {
      console.log('评分卡片已存在，跳过');
      return;
    }

    // 开始打分
    await this.scoreCurrentCandidate();
    this.lastScoredUrl = currentUrl;
  }

  /**
   * 判断是否在候选人详情页
   */
  isDetailPage() {
    const url = window.location.href;

    // 推荐牛人页面（展开详情）
    if (url.includes('/web/geek/recommend') || url.includes('/web/geek/chat')) {
      // 检查是否有详情容器
      const detailContainer = document.querySelector('.geek-detail, .user-detail, [class*="detail-container"]');
      return !!detailContainer;
    }

    return false;
  }

  /**
   * 对当前候选人打分
   */
  async scoreCurrentCandidate() {
    try {
      this.scoringInProgress = true;

      // 提取候选人信息
      const candidateInfo = this.extractCandidateFromPage();

      if (!candidateInfo) {
        console.log('未能提取候选人信息');
        return;
      }

      console.log('开始分析候选人:', candidateInfo.name);

      // 获取配置
      const config = await this.getConfig();

      // 进行评分
      let analysis;
      if (config.useAI && config.apiKey && window.aiAnalyzer) {
        // 使用AI评分
        console.log('使用AI分析候选人...');
        analysis = await window.aiAnalyzer.analyzeCandidate(candidateInfo);
      } else {
        // 使用规则评分
        console.log('使用规则引擎评分...');
        analysis = this.ruleBasedScoring(candidateInfo, config);
      }

      // 显示评分卡片
      this.showScoreCard(candidateInfo, analysis);

      // 自动添加到候选人列表
      if (window.candidateListManager) {
        window.candidateListManager.addCandidate(candidateInfo, analysis);
        console.log('✅ 候选人已添加到列表:', candidateInfo.name);
      }

    } catch (error) {
      console.error('打分失败:', error);
    } finally {
      this.scoringInProgress = false;
    }
  }

  /**
   * 从页面提取候选人信息
   */
  extractCandidateFromPage() {
    try {
      const info = {
        id: Date.now().toString(),
        name: null,
        position: null,
        age: null,
        experience: null,
        education: null,
        salary: null,
        status: null,
        skills: [],
        workHistory: [],
        educationHistory: [],
        advantages: [],
        fullText: ''
      };

      // 查找详情容器（右侧面板或详情区域）
      const detailContainer = document.querySelector(
        '.geek-detail-panel, .geek-detail, .user-card, [class*="detail-panel"], [class*="geek-detail"]'
      );

      if (!detailContainer) {
        console.log('未找到候选人详情容器');
        return null;
      }

      // 提取姓名 - 使用多个选择器
      const nameSelectors = [
        '.geek-header .name',
        '.name',
        '.geek-name',
        '[class*="geek-name"]',
        'h1',
        'h2'
      ];
      for (const selector of nameSelectors) {
        const nameEl = detailContainer.querySelector(selector);
        if (nameEl && nameEl.textContent.trim().length > 0 && nameEl.textContent.trim().length < 20) {
          info.name = nameEl.textContent.trim();
          console.log('提取到姓名:', info.name);
          break;
        }
      }

      // 提取基本信息标签（年龄、学历、经验年限）
      const infoTags = detailContainer.querySelectorAll('.info-tags span, .geek-info-item, .info-item, [class*="info"] span');
      infoTags.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('岁')) info.age = text;
        if (text.includes('年') && !text.includes('岁')) info.experience = text;
        if (text.includes('大专') || text.includes('本科') || text.includes('硕士') || text.includes('博士')) {
          info.education = text;
        }
      });

      // 提取求职状态
      const statusEl = detailContainer.querySelector('[class*="status"], [class*="active"]');
      if (statusEl) {
        info.status = statusEl.textContent.trim();
      }

      // 提取期望职位和薪资
      const expectInfo = detailContainer.querySelector('.expect-info, [class*="expect"]');
      if (expectInfo) {
        const expectText = expectInfo.textContent;
        // 从期望信息中提取职位和薪资
        const parts = expectText.split('·');
        parts.forEach(part => {
          const trimmed = part.trim();
          if (trimmed.includes('K')) {
            info.salary = trimmed;
          } else if (!trimmed.includes('温州') && !trimmed.includes('北京') && trimmed.length > 2) {
            info.position = trimmed;
          }
        });
      }

      // 提取沟通职位（备用）
      if (!info.position) {
        const posSelectors = [
          '.position',
          '.expect-position',
          '[class*="position"]'
        ];
        for (const selector of posSelectors) {
          const posEl = detailContainer.querySelector(selector);
          if (posEl) {
            info.position = posEl.textContent.trim();
            break;
          }
        }
      }

      // 提取工作经历
      const workItems = detailContainer.querySelectorAll('.work-experience .exp-item, .experience-item, [class*="work"] [class*="item"]');
      workItems.forEach((item) => {
        const timeEl = item.querySelector('.time, [class*="time"]');
        const companyEl = item.querySelector('.company, [class*="company"]');
        const positionEl = item.querySelector('.position, [class*="position"]');

        if (timeEl || companyEl || positionEl) {
          const exp = {
            time: timeEl ? timeEl.textContent.trim() : '',
            company: companyEl ? companyEl.textContent.trim() : '',
            position: positionEl ? positionEl.textContent.trim() : ''
          };
          info.workHistory.push(exp);
        }
      });

      // 提取教育经历
      const eduItems = detailContainer.querySelectorAll('.education .edu-item, .education-item, [class*="education"] [class*="item"]');
      eduItems.forEach((item) => {
        const timeEl = item.querySelector('.time, [class*="time"]');
        const schoolEl = item.querySelector('.school, [class*="school"]');
        const majorEl = item.querySelector('.major, [class*="major"]');
        const degreeEl = item.querySelector('.degree, [class*="degree"]');

        if (timeEl || schoolEl) {
          const edu = {
            time: timeEl ? timeEl.textContent.trim() : '',
            school: schoolEl ? schoolEl.textContent.trim() : '',
            major: majorEl ? majorEl.textContent.trim() : '',
            degree: degreeEl ? degreeEl.textContent.trim() : ''
          };
          info.educationHistory.push(edu);
        }
      });

      // 提取技能标签
      const skillTags = detailContainer.querySelectorAll('.tag, .skill-tag, [class*="tag"]:not([class*="info"])');
      skillTags.forEach(tag => {
        const skill = tag.textContent.trim();
        // 过滤掉明显不是技能的标签
        if (skill.length > 0 && skill.length < 30 &&
            !skill.includes('岁') &&
            !skill.includes('年') &&
            !skill.includes('K')) {
          info.skills.push(skill);
        }
      });

      // 提取个人优势
      const advantageSelectors = [
        '.advantage',
        '.self-intro',
        '[class*="advantage"]',
        '[class*="intro"]',
        '[class*="desc"]'
      ];
      for (const selector of advantageSelectors) {
        const advantageEl = detailContainer.querySelector(selector);
        if (advantageEl) {
          const text = advantageEl.textContent.trim();
          if (text.length > 10) {
            info.advantages.push(text);
            break;
          }
        }
      }

      // 获取整个简历的文本（用于AI分析）
      info.fullText = detailContainer.textContent.trim();

      console.log('✅ 提取的候选人信息:', info);
      return info;

    } catch (error) {
      console.error('提取候选人信息失败:', error);
      return null;
    }
  }

  /**
   * 规则引擎评分（不使用AI）
   */
  ruleBasedScoring(candidate, config) {
    let score = 50; // 基础分
    const pros = [];
    const cons = [];

    console.log('开始评分候选人:', candidate.name);

    // 1. 学历评分 (最高20分)
    if (candidate.education) {
      if (candidate.education.includes('硕士') || candidate.education.includes('博士')) {
        score += 20;
        pros.push(`学历优秀：${candidate.education}`);
      } else if (candidate.education.includes('本科')) {
        score += 15;
        pros.push(`本科学历：${candidate.education}`);
      } else if (candidate.education.includes('大专')) {
        score += 10;
        pros.push(`大专学历：${candidate.education}`);
      }
    } else {
      cons.push('学历信息未填写');
    }

    // 2. 工作经验评分 (最高20分)
    if (candidate.workHistory && candidate.workHistory.length > 0) {
      const expCount = candidate.workHistory.length;
      if (expCount >= 3) {
        score += 20;
        pros.push(`工作经验丰富：${expCount}段工作经历`);
      } else if (expCount >= 2) {
        score += 15;
        pros.push(`有一定工作经验：${expCount}段工作经历`);
      } else {
        score += 10;
        pros.push(`有${expCount}段工作经历`);
      }

      // 添加最近的工作经历详情
      if (candidate.workHistory[0]) {
        const latest = candidate.workHistory[0];
        if (latest.company && latest.position) {
          pros.push(`最近任职：${latest.company} - ${latest.position}`);
        }
      }
    } else {
      cons.push('工作经验较少或未填写');
    }

    // 3. 技能匹配 (最高20分)
    if (candidate.skills && candidate.skills.length > 0) {
      const skillCount = candidate.skills.length;
      if (skillCount >= 5) {
        score += 20;
        pros.push(`技能标签丰富：${skillCount}项技能（${candidate.skills.slice(0, 3).join('、')}等）`);
      } else if (skillCount >= 3) {
        score += 15;
        pros.push(`掌握多项技能：${candidate.skills.join('、')}`);
      } else if (skillCount > 0) {
        score += 10;
        pros.push(`掌握技能：${candidate.skills.join('、')}`);
      }
    } else {
      cons.push('未填写技能标签');
    }

    // 4. 教育背景 (最高10分)
    if (candidate.educationHistory && candidate.educationHistory.length > 0) {
      score += 10;
      const edu = candidate.educationHistory[0];
      if (edu.school) {
        pros.push(`教育背景：${edu.school}`);
      }
    }

    // 5. 个人优势 (最高10分)
    if (candidate.advantages && candidate.advantages.length > 0) {
      score += 10;
      pros.push('有详细的个人优势描述');
    }

    // 6. 简历完整度 (最高10分)
    let completeness = 0;
    if (candidate.name) completeness++;
    if (candidate.education) completeness++;
    if (candidate.workHistory && candidate.workHistory.length > 0) completeness++;
    if (candidate.skills && candidate.skills.length > 0) completeness++;
    if (candidate.advantages && candidate.advantages.length > 0) completeness++;

    const completenessScore = completeness * 2;
    score += completenessScore;

    if (completeness >= 4) {
      pros.push(`简历信息完整（${completeness}/5项）`);
    } else {
      cons.push(`简历信息不够完整（仅${completeness}/5项）`);
    }

    // 7. 求职状态加分
    if (candidate.status) {
      if (candidate.status.includes('随时到岗')) {
        score += 5;
        pros.push('可随时到岗');
      } else if (candidate.status.includes('月内到岗')) {
        score += 3;
        pros.push('可月内到岗');
      }
    }

    // 确保分数在0-100之间
    score = Math.max(0, Math.min(100, score));

    // 生成建议
    let recommendation;
    let suggestedAction;
    let level;

    if (score >= 80) {
      level = 'high';
      recommendation = `${candidate.name || '该候选人'}综合素质优秀，强烈推荐进一步沟通。` +
                       (candidate.experience ? `拥有${candidate.experience}工作经验，` : '') +
                       (candidate.education ? `${candidate.education}学历，` : '') +
                       '匹配度高。';
      suggestedAction = '强烈推荐约面试';
    } else if (score >= 60) {
      level = 'medium';
      recommendation = `${candidate.name || '该候选人'}基本符合要求，可以进一步了解。` +
                       (cons.length > 0 ? `需要关注：${cons[0]}` : '建议详细沟通后决定。');
      suggestedAction = '可继续沟通了解';
    } else {
      level = 'low';
      recommendation = `${candidate.name || '该候选人'}匹配度较低，建议谨慎考虑。` +
                       (cons.length > 0 ? `主要问题：${cons.slice(0, 2).join('、')}` : '');
      suggestedAction = '谨慎评估';
    }

    console.log('评分完成:', { score, level, pros: pros.length, cons: cons.length });

    return {
      matchScore: score,
      level: level,
      pros: pros,
      cons: cons,
      recommendation: recommendation,
      suggestedAction: suggestedAction
    };
  }

  /**
   * 显示评分卡片
   */
  showScoreCard(candidate, analysis) {
    // 移除旧卡片
    this.removeScoreCard();

    // 创建评分卡片
    const card = document.createElement('div');
    card.className = 'boss-score-card';

    const levelColor = analysis.matchScore >= 80 ? '#52c41a' :
                       analysis.matchScore >= 60 ? '#faad14' : '#ff4d4f';

    const stars = '⭐'.repeat(Math.ceil(analysis.matchScore / 20));

    card.innerHTML = `
      <div class="score-card-header">
        <div class="score-title">🤖 AI智能评分${candidate.name ? ' - ' + candidate.name : ''}</div>
        <button class="score-close-btn">×</button>
      </div>

      <div class="score-card-body">
        <!-- 综合评分 -->
        <div class="score-main">
          <div class="score-circle" style="border-color: ${levelColor};">
            <div class="score-number" style="color: ${levelColor};">${analysis.matchScore}</div>
            <div class="score-label">综合匹配度</div>
          </div>
          <div class="score-stars">${stars}</div>
        </div>

        <!-- 评级 -->
        <div class="score-level" style="background: ${levelColor}20; color: ${levelColor}; border: 1px solid ${levelColor};">
          ${analysis.suggestedAction}
        </div>

        <!-- 优点 -->
        ${analysis.pros && analysis.pros.length > 0 ? `
          <div class="score-section">
            <div class="score-section-title">✅ 亮点优势</div>
            <ul class="score-list">
              ${analysis.pros.map(pro => `<li>${pro}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- 不足 -->
        ${analysis.cons && analysis.cons.length > 0 ? `
          <div class="score-section">
            <div class="score-section-title">⚠️ 需关注</div>
            <ul class="score-list score-list-warning">
              ${analysis.cons.map(con => `<li>${con}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- AI建议 -->
        <div class="score-section">
          <div class="score-section-title">💡 综合建议</div>
          <div class="score-recommendation">
            ${analysis.recommendation}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="score-actions">
          <button class="score-action-btn score-btn-primary" id="scoreActionChat">
            💬 立即沟通
          </button>
          <button class="score-action-btn score-btn-secondary" id="scoreActionSave">
            ⭐ 收藏候选人
          </button>
        </div>
      </div>
    `;

    // 添加样式
    this.injectScoreCardStyles();

    // 添加到页面
    document.body.appendChild(card);

    // 绑定事件
    card.querySelector('.score-close-btn').onclick = () => {
      this.removeScoreCard();
      this.lastScoredUrl = null; // 清除URL记录，允许重新打分
    };

    // 立即沟通按钮
    const chatBtn = card.querySelector('#scoreActionChat');
    if (chatBtn) {
      chatBtn.onclick = () => {
        const greetBtn = document.querySelector('.start-chat-btn, [class*="greet"], [class*="chat"]');
        if (greetBtn) {
          greetBtn.click();
          this.showToast('✅ 已触发打招呼按钮');
        } else {
          this.showToast('⚠️ 未找到打招呼按钮，请手动操作');
        }
      };
    }

    // 收藏按钮
    const saveBtn = card.querySelector('#scoreActionSave');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const collectBtn = document.querySelector('[class*="collect"], [class*="favor"]');
        if (collectBtn) {
          collectBtn.click();
          this.showToast('✅ 已收藏候选人');
        } else {
          this.showToast('⚠️ 未找到收藏按钮，请手动操作');
        }
      };
    }

    // 显示动画
    setTimeout(() => card.classList.add('show'), 100);

    // 设置卡片可见标志
    this.cardVisible = true;

    console.log('✅ 评分卡片已显示');
  }

  /**
   * 移除评分卡片
   */
  removeScoreCard() {
    const oldCard = document.querySelector('.boss-score-card');
    if (oldCard) {
      oldCard.remove();
      this.cardVisible = false;
      console.log('评分卡片已移除');
    }
  }

  /**
   * 注入评分卡片样式
   */
  injectScoreCardStyles() {
    if (document.getElementById('boss-score-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'boss-score-card-styles';
    style.textContent = `
      .boss-score-card {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 360px;
        max-height: calc(100vh - 140px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        z-index: 999998;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .boss-score-card.show {
        opacity: 1;
        transform: translateX(0);
      }

      .score-card-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .score-title {
        font-size: 16px;
        font-weight: bold;
      }

      .score-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        transition: background 0.2s;
      }

      .score-close-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      .score-card-body {
        padding: 24px 20px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }

      .score-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
      }

      .score-circle {
        width: 140px;
        height: 140px;
        border: 6px solid #52c41a;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }

      .score-number {
        font-size: 48px;
        font-weight: bold;
        line-height: 1;
      }

      .score-label {
        font-size: 13px;
        color: #666;
        margin-top: 6px;
      }

      .score-stars {
        font-size: 24px;
      }

      .score-level {
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 20px;
      }

      .score-section {
        margin-bottom: 20px;
      }

      .score-section-title {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
      }

      .score-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .score-list li {
        padding: 8px 12px;
        background: #f0f9ff;
        border-left: 3px solid #52c41a;
        border-radius: 4px;
        margin-bottom: 8px;
        font-size: 13px;
        color: #333;
      }

      .score-list-warning li {
        background: #fff7e6;
        border-left-color: #faad14;
      }

      .score-recommendation {
        padding: 12px;
        background: #f6f8fa;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.6;
        color: #555;
      }

      .score-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e8e8e8;
      }

      .score-action-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .score-btn-primary {
        background: #667eea;
        color: white;
      }

      .score-btn-primary:hover {
        background: #5568d3;
        transform: translateY(-2px);
      }

      .score-btn-secondary {
        background: white;
        color: #667eea;
        border: 1px solid #667eea;
      }

      .score-btn-secondary:hover {
        background: #f6f8fa;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 获取配置
   */
  async getConfig() {
    try {
      const result = await chrome.storage.local.get('config');
      return result.config || {
        useAI: false,
        apiKey: '',
        filterCriteria: {}
      };
    } catch (error) {
      return { useAI: false, apiKey: '' };
    }
  }

  /**
   * 显示提示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'boss-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.candidateScorer = new CandidateScorer();
}
