/**
 * 数据提取模块 - 从Boss直聘页面提取候选人信息
 */

class CandidateExtractor {
  constructor() {
    this.selectors = CONFIG.SELECTORS;
  }

  /**
   * 提取候选人基本信息
   */
  extractCandidateInfo(element) {
    try {
      const info = {
        id: this.generateId(element),
        extractedAt: Date.now(),
        name: null,
        position: null,
        education: null,
        experience: [],
        skills: [],
        status: null,
        salary: null,
        location: null
      };

      // 提取姓名
      const nameEl = element.querySelector('.geek-name, .name, [class*="name"]');
      if (nameEl) {
        info.name = nameEl.textContent.trim();
      }

      // 提取求职意向/应聘岗位
      const positionEl = element.querySelector('.geek-position, .position, [class*="position"]');
      if (positionEl) {
        info.position = positionEl.textContent.trim();
      }

      // 提取教育背景
      const educationEl = element.querySelector('.education, [class*="education"]');
      if (educationEl) {
        info.education = this.parseEducation(educationEl);
      }

      // 提取工作经验
      const experienceEls = element.querySelectorAll('.experience-item, [class*="experience"]');
      if (experienceEls.length > 0) {
        info.experience = Array.from(experienceEls).map(el => this.parseExperience(el));
      }

      // 提取技能标签
      const skillEls = element.querySelectorAll('.tag, .skill-tag, [class*="tag"]');
      if (skillEls.length > 0) {
        info.skills = Array.from(skillEls).map(el => el.textContent.trim()).filter(Boolean);
      }

      // 提取在线状态
      const statusEl = element.querySelector('.geek-status, [class*="status"], [class*="active"]');
      if (statusEl) {
        info.status = statusEl.textContent.trim();
      }

      // 提取期望薪资
      const salaryEl = element.querySelector('.geek-salary, [class*="salary"], [class*="expect"]');
      if (salaryEl) {
        info.salary = salaryEl.textContent.trim();
      }

      // 提取工作地点
      const locationEl = element.querySelector('.geek-location, [class*="location"], [class*="city"]');
      if (locationEl) {
        info.location = locationEl.textContent.trim();
      }

      return info;
    } catch (error) {
      console.error('提取候选人信息失败:', error);
      return null;
    }
  }

  /**
   * 解析教育背景
   */
  parseEducation(element) {
    const text = element.textContent.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    return {
      raw: text,
      school: lines[1] || '',
      degree: lines[0] || '',  // 本科/大专等
      major: lines[2] || '',
      period: lines[3] || ''
    };
  }

  /**
   * 解析工作经验
   */
  parseExperience(element) {
    const text = element.textContent.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    return {
      raw: text,
      period: lines[0] || '',      // 2025.05-2025.09
      company: lines[1] || '',     // 公司名称
      position: lines[2] || '',    // 职位名称
      description: lines.slice(3).join(' ')
    };
  }

  /**
   * 从右侧详情卡片提取当前对话的牛人信息（2025-11-04新增）
   */
  extractCurrentCandidate() {
    try {
      const card = document.querySelector(this.selectors.candidateCard); // .base-info-content
      if (!card) {
        console.warn('未找到候选人详情卡片');
        return null;
      }

      const candidate = {
        id: this.generateId(card),
        source: 'current_chat',
        extractedAt: Date.now(),

        // 姓名
        name: card.querySelector(this.selectors.candidateName)?.textContent.trim() || '未知',

        // 工作经历
        experience: Array.from(card.querySelectorAll(this.selectors.candidateExperience)).map(exp => ({
          text: exp.textContent.trim()
        })),

        // 工作详情
        workDetail: card.querySelector(this.selectors.candidateWorkDetail)?.textContent.trim() || '',

        // 教育背景
        education: {
          text: card.querySelector('.education-info, .work-content')?.textContent.trim() || ''
        },

        // 从聊天记录中提取应聘职位
        position: this.extractPositionFromChat(),

        // DOM元素引用
        element: card
      };

      console.log('✅ 提取当前候选人:', candidate.name, candidate.position || '');
      return candidate;
    } catch (error) {
      console.error('提取当前候选人失败:', error);
      return null;
    }
  }

  /**
   * 从聊天记录中提取应聘职位
   */
  extractPositionFromChat() {
    try {
      // 查找消息中的"沟通的职位-XXX"
      const messages = document.querySelectorAll(this.selectors.messageItem);
      for (const msg of messages) {
        const text = msg.textContent;
        const match = text.match(/沟通的职位[：:-]\s*(.+?)(?:\s|$)/);
        if (match) {
          return match[1].trim();
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 从聊天列表提取候选人 - 使用真实DOM选择器（2025-11-04优化）
   */
  extractFromChatList() {
    try {
      // 使用真实的聊天列表选择器
      const chatList = document.querySelector(this.selectors.chatList); // .user-list
      if (!chatList) {
        console.warn('未找到聊天列表容器');
        return [];
      }

      const items = chatList.querySelectorAll(this.selectors.chatItem); // .geek-item
      console.log(`找到 ${items.length} 个聊天项`);

      const candidates = [];

      items.forEach((item, index) => {
        try {
          // 提取姓名
          let name = null;
          const nameEl = item.querySelector('.geek-name') ||
                        item.querySelector('[class*="name"]');
          if (nameEl) {
            name = nameEl.textContent.trim();
          }

          // 如果没有找到姓名，跳过
          if (!name || name.length < 2) {
            return;
          }

          const info = {
            id: this.generateId(item),
            source: 'chat_list',
            extractedAt: Date.now(),
            name: name,
            element: item
          };

          // 提取职位
          const posEl = item.querySelector('.source-job') ||
                       item.querySelector('[class*="position"]');
          if (posEl) {
            info.position = posEl.textContent.trim();
          }

          // 提取最新消息
          const msgEl = item.querySelector(this.selectors.lastMessage) ||
                       item.querySelector('[class*="last-msg"]');
          if (msgEl) {
            info.lastMessage = msgEl.textContent.trim();
          }

          // 提取时间
          const timeEl = item.querySelector('.time') ||
                        item.querySelector('[class*="time"]');
          if (timeEl) {
            info.messageTime = timeEl.textContent.trim();
          }

          // 提取在线状态
          const statusEl = item.querySelector('[class*="active"]') ||
                          item.querySelector('[class*="status"]');
          if (statusEl) {
            info.status = statusEl.textContent.trim();
          }

          candidates.push(info);

        } catch (itemError) {
          console.warn('提取单个候选人失败:', itemError);
        }
      });

      console.log(`✅ 成功提取 ${candidates.length} 个候选人`);
      return candidates;

    } catch (error) {
      console.error('提取候选人列表失败:', error);
      return [];
    }
  }

  /**
   * 从搜索/推荐页面提取候选人（2025-11-04新增）
   */
  extractFromSearchPage() {
    try {
      // 推荐牛人页面通常用卡片布局
      const cards = document.querySelectorAll('.recommend-card, .geek-card, [class*="recommend"]');
      if (cards.length === 0) {
        console.warn('未找到候选人卡片');
        return [];
      }

      const candidates = [];
      cards.forEach((card) => {
        const candidate = this.extractCandidateInfo(card);
        if (candidate && candidate.name) {
          candidates.push(candidate);
        }
      });

      console.log(`✅ 提取 ${candidates.length} 个推荐候选人`);
      return candidates;
    } catch (error) {
      console.error('提取搜索页候选人失败:', error);
      return [];
    }
  }

  /**
   * 从候选人详情页提取完整信息
   */
  extractFromDetailPage() {
    try {
      const container = document.querySelector('.geek-detail, .user-card, [class*="detail"]');
      if (!container) {
        console.log('未找到候选人详情容器');
        return null;
      }

      return this.extractCandidateInfo(container);
    } catch (error) {
      console.error('提取详情页信息失败:', error);
      return null;
    }
  }

  /**
   * 智能提取 - 根据当前页面自动选择提取方式
   */
  async smartExtract() {
    const url = window.location.href;

    // 判断页面类型
    if (url.includes('/web/chat')) {
      // 聊天页面
      return {
        type: 'chat',
        data: this.extractFromChatList()
      };
    } else if (url.includes('/web/geek')) {
      // 候选人搜索/推荐页面
      return {
        type: 'search',
        data: this.extractFromSearchPage()
      };
    } else {
      console.log('未识别的页面类型');
      return {
        type: 'unknown',
        data: null
      };
    }
  }

  /**
   * 提取简历文本（用于AI分析）
   */
  extractResumeText(element) {
    if (!element) {
      element = document.querySelector('.geek-detail, .resume-container, [class*="resume"]');
    }

    if (!element) return '';

    // 移除不需要的元素
    const clone = element.cloneNode(true);
    const toRemove = clone.querySelectorAll('script, style, [class*="btn"], button');
    toRemove.forEach(el => el.remove());

    return clone.textContent.trim();
  }

  /**
   * 生成候选人ID
   */
  generateId(element) {
    // 尝试从元素属性获取ID
    const dataId = element.getAttribute('data-id') ||
                   element.getAttribute('data-uid') ||
                   element.getAttribute('data-geek-id');

    if (dataId) return dataId;

    // 否则生成哈希ID
    const text = element.textContent.trim();
    return this.hashCode(text).toString();
  }

  /**
   * 简单哈希函数
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.candidateExtractor = new CandidateExtractor();
}
