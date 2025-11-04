/**
 * 候选人列表管理面板 - 显示所有已分析的候选人
 */

class CandidateListManager {
  constructor() {
    this.candidates = []; // 存储所有分析过的候选人
    this.maxCandidates = 100; // 最多保存100个
    this.panelVisible = false;
    this.loadFromStorage();
  }

  /**
   * 初始化
   */
  async init() {
    console.log('候选人列表管理器已启动');

    // 创建悬浮按钮
    this.createFloatingButton();

    // 定期保存到本地存储
    setInterval(() => {
      this.saveToStorage();
    }, 30000); // 每30秒保存一次
  }

  /**
   * 添加候选人到列表
   */
  addCandidate(candidateInfo, analysis) {
    try {
      console.log('正在添加候选人到列表:', candidateInfo);

      // 检查是否已存在
      const existingIndex = this.candidates.findIndex(c =>
        c.name === candidateInfo.name && c.position === candidateInfo.position
      );

      // 处理教育背景信息
      let educationText = '';
      if (candidateInfo.education) {
        educationText = candidateInfo.education;
      } else if (candidateInfo.educationHistory && candidateInfo.educationHistory.length > 0) {
        const edu = candidateInfo.educationHistory[0];
        educationText = `${edu.school || ''} ${edu.degree || ''}`.trim();
      }

      // 处理工作经验信息
      let experienceText = '';
      if (candidateInfo.experience) {
        experienceText = candidateInfo.experience;
      } else if (candidateInfo.workHistory && candidateInfo.workHistory.length > 0) {
        experienceText = `${candidateInfo.workHistory.length}段工作经历`;
      }

      const candidate = {
        id: candidateInfo.id || Date.now().toString(),
        name: candidateInfo.name || '未知姓名',
        position: candidateInfo.position || '未知职位',
        score: analysis.matchScore || 0,
        level: analysis.level || 'low',
        age: candidateInfo.age || '',
        education: educationText,
        experience: experienceText,
        salary: candidateInfo.salary || '',
        status: candidateInfo.status || '',
        skills: candidateInfo.skills || [],
        workHistory: candidateInfo.workHistory || [],
        educationHistory: candidateInfo.educationHistory || [],
        advantages: candidateInfo.advantages || [],
        pros: analysis.pros || [],
        cons: analysis.cons || [],
        recommendation: analysis.recommendation || '',
        addedAt: Date.now(),
        url: window.location.href
      };

      console.log('准备添加候选人，完整数据:', {
        name: candidate.name,
        position: candidate.position,
        score: candidate.score,
        education: candidate.education,
        experience: candidate.experience
      });

      if (existingIndex !== -1) {
        // 更新已存在的候选人
        this.candidates[existingIndex] = candidate;
        console.log('候选人信息已更新:', candidate.name);
      } else {
        // 添加新候选人
        this.candidates.unshift(candidate); // 新的放在最前面
        console.log('✅ 新候选人已添加:', candidate.name, '当前列表总数:', this.candidates.length);
      }

      // 限制列表长度
      if (this.candidates.length > this.maxCandidates) {
        this.candidates = this.candidates.slice(0, this.maxCandidates);
      }

      // 更新浮动按钮徽章
      this.updateBadge();

      // 保存到存储
      this.saveToStorage();

      // 如果面板打开，刷新显示
      if (this.panelVisible) {
        this.refreshPanelContent();
      }

      return candidate;
    } catch (error) {
      console.error('添加候选人失败:', error);
    }
  }

  /**
   * 更新浮动按钮徽章
   */
  updateBadge() {
    const badge = document.getElementById('candidateCountBadge');
    if (badge) {
      badge.textContent = this.candidates.length;
    }
  }

  /**
   * 创建悬浮按钮
   */
  createFloatingButton() {
    const button = document.createElement('button');
    button.id = 'boss-candidate-list-btn';
    button.innerHTML = `
      <div class="btn-icon">📋</div>
      <div class="btn-text">候选人列表</div>
      <div class="btn-badge" id="candidateCountBadge">${this.candidates.length}</div>
    `;

    button.onclick = () => this.togglePanel();

    // 添加样式
    this.injectButtonStyles();

    document.body.appendChild(button);
  }

  /**
   * 注入按钮样式
   */
  injectButtonStyles() {
    if (document.getElementById('boss-candidate-list-btn-styles')) return;

    const style = document.createElement('style');
    style.id = 'boss-candidate-list-btn-styles';
    style.textContent = `
      #boss-candidate-list-btn {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        cursor: pointer;
        z-index: 999997;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      #boss-candidate-list-btn:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5);
      }

      #boss-candidate-list-btn .btn-icon {
        font-size: 24px;
        line-height: 1;
      }

      #boss-candidate-list-btn .btn-text {
        font-size: 9px;
        margin-top: 2px;
        white-space: nowrap;
      }

      #boss-candidate-list-btn .btn-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4d4f;
        color: white;
        font-size: 11px;
        font-weight: bold;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 切换面板显示/隐藏
   */
  togglePanel() {
    if (this.panelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  /**
   * 显示候选人列表面板
   */
  showPanel() {
    // 移除旧面板
    const oldPanel = document.querySelector('.boss-candidate-list-panel');
    if (oldPanel) oldPanel.remove();

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'boss-candidate-list-panel';
    panel.innerHTML = `
      <div class="candidate-list-header">
        <div class="header-title">
          <span class="title-icon">📋</span>
          <span class="title-text">已分析候选人列表</span>
          <span class="title-count">(${this.candidates.length})</span>
        </div>
        <div class="header-actions">
          <button class="header-btn" id="candidateListRefresh" title="刷新">🔄</button>
          <button class="header-btn" id="candidateListExport" title="导出">📥</button>
          <button class="header-btn" id="candidateListClear" title="清空">🗑️</button>
          <button class="header-btn" id="candidateListClose" title="关闭">×</button>
        </div>
      </div>

      <div class="candidate-list-filters">
        <button class="filter-btn active" data-filter="all">全部 (${this.candidates.length})</button>
        <button class="filter-btn" data-filter="high">高匹配 (${this.getCountByLevel('high')})</button>
        <button class="filter-btn" data-filter="medium">中匹配 (${this.getCountByLevel('medium')})</button>
        <button class="filter-btn" data-filter="low">低匹配 (${this.getCountByLevel('low')})</button>
      </div>

      <div class="candidate-list-body" id="candidateListBody">
        ${this.renderCandidateList('all')}
      </div>
    `;

    // 添加样式
    this.injectPanelStyles();

    document.body.appendChild(panel);
    this.panelVisible = true;

    // 绑定事件
    this.bindPanelEvents(panel);

    // 显示动画
    setTimeout(() => panel.classList.add('show'), 100);
  }

  /**
   * 隐藏面板
   */
  hidePanel() {
    const panel = document.querySelector('.boss-candidate-list-panel');
    if (panel) {
      panel.classList.remove('show');
      setTimeout(() => {
        panel.remove();
        this.panelVisible = false;
      }, 300);
    }
  }

  /**
   * 刷新面板内容
   */
  refreshPanelContent() {
    const body = document.getElementById('candidateListBody');
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';

    if (body) {
      body.innerHTML = this.renderCandidateList(filter);
    }

    // 更新计数
    document.querySelectorAll('.filter-btn').forEach(btn => {
      const filterType = btn.getAttribute('data-filter');
      const count = filterType === 'all' ? this.candidates.length : this.getCountByLevel(filterType);

      if (filterType === 'all') {
        btn.textContent = `全部 (${count})`;
      } else {
        const label = filterType === 'high' ? '高匹配' : filterType === 'medium' ? '中匹配' : '低匹配';
        btn.textContent = `${label} (${count})`;
      }
    });

    // 更新标题计数
    const titleCount = document.querySelector('.title-count');
    if (titleCount) {
      titleCount.textContent = `(${this.candidates.length})`;
    }

    // 更新浮动按钮徽章
    const badge = document.getElementById('candidateCountBadge');
    if (badge) {
      badge.textContent = this.candidates.length;
    }
  }

  /**
   * 渲染候选人列表
   */
  renderCandidateList(filter = 'all') {
    let filteredCandidates = this.candidates;

    if (filter !== 'all') {
      filteredCandidates = this.candidates.filter(c => c.level === filter);
    }

    if (filteredCandidates.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">暂无候选人数据</div>
          <div class="empty-hint">浏览候选人详情页时会自动分析并添加到列表</div>
        </div>
      `;
    }

    return filteredCandidates.map((candidate, index) => {
      const levelColor = candidate.score >= 80 ? '#52c41a' :
                         candidate.score >= 60 ? '#faad14' : '#ff4d4f';
      const levelText = candidate.score >= 80 ? '高匹配' :
                        candidate.score >= 60 ? '中匹配' : '低匹配';
      const stars = '⭐'.repeat(Math.ceil(candidate.score / 20));
      const timeAgo = this.getTimeAgo(candidate.addedAt);

      return `
        <div class="candidate-item" data-index="${index}">
          <div class="candidate-item-header">
            <div class="candidate-name-row">
              <span class="candidate-name">${candidate.name}</span>
              <span class="candidate-score" style="color: ${levelColor};">${candidate.score}分</span>
            </div>
            <div class="candidate-level" style="background: ${levelColor}20; color: ${levelColor};">
              ${levelText} ${stars}
            </div>
          </div>

          <div class="candidate-item-body">
            <div class="candidate-info-row">
              <span class="info-label">应聘职位:</span>
              <span class="info-value">${candidate.position}</span>
            </div>
            ${candidate.age || candidate.experience ? `
              <div class="candidate-info-row">
                <span class="info-label">基本信息:</span>
                <span class="info-value">${[candidate.age, candidate.experience].filter(Boolean).join(' / ')}</span>
              </div>
            ` : ''}
            ${candidate.education ? `
              <div class="candidate-info-row">
                <span class="info-label">学历:</span>
                <span class="info-value">${candidate.education}</span>
              </div>
            ` : ''}
            ${candidate.salary ? `
              <div class="candidate-info-row">
                <span class="info-label">期望薪资:</span>
                <span class="info-value">${candidate.salary}</span>
              </div>
            ` : ''}
            ${candidate.skills && candidate.skills.length > 0 ? `
              <div class="candidate-info-row">
                <span class="info-label">技能:</span>
                <span class="info-value">${candidate.skills.slice(0, 3).join(', ')}${candidate.skills.length > 3 ? '...' : ''}</span>
              </div>
            ` : ''}
            ${candidate.status ? `
              <div class="candidate-info-row">
                <span class="info-label">求职状态:</span>
                <span class="info-value">${candidate.status}</span>
              </div>
            ` : ''}
            <div class="candidate-time">
              <span>分析于 ${timeAgo}</span>
            </div>
          </div>

          <div class="candidate-item-actions">
            <button class="candidate-action-btn" onclick="window.candidateListManager.viewCandidate(${index})">
              👁️ 查看详情
            </button>
            <button class="candidate-action-btn" onclick="window.candidateListManager.deleteCandidate(${index})">
              🗑️ 删除
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 获取时间差
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }

  /**
   * 获取指定级别的候选人数量
   */
  getCountByLevel(level) {
    return this.candidates.filter(c => c.level === level).length;
  }

  /**
   * 查看候选人详情
   */
  viewCandidate(index) {
    const candidate = this.candidates[index];
    if (!candidate) return;

    // 显示候选人详情弹窗
    this.showCandidateDetail(candidate);
  }

  /**
   * 显示候选人详情弹窗
   */
  showCandidateDetail(candidate) {
    const levelColor = candidate.score >= 80 ? '#52c41a' :
                       candidate.score >= 60 ? '#faad14' : '#ff4d4f';

    const modal = document.createElement('div');
    modal.className = 'boss-candidate-detail-modal';
    modal.innerHTML = `
      <div class="candidate-detail-overlay"></div>
      <div class="candidate-detail-content">
        <div class="detail-header">
          <h3>${candidate.name} - ${candidate.position}</h3>
          <button class="detail-close-btn">×</button>
        </div>
        <div class="detail-body">
          <div class="detail-score-section">
            <div class="detail-score" style="color: ${levelColor};">
              ${candidate.score}分
            </div>
            <div class="detail-recommendation">${candidate.recommendation}</div>
          </div>

          <!-- 基本信息 -->
          ${candidate.age || candidate.experience || candidate.education || candidate.salary ? `
            <div class="detail-section">
              <h4>📋 基本信息</h4>
              <div class="detail-info-grid">
                ${candidate.age ? `<div class="detail-info-item"><strong>年龄:</strong> ${candidate.age}</div>` : ''}
                ${candidate.experience ? `<div class="detail-info-item"><strong>经验:</strong> ${candidate.experience}</div>` : ''}
                ${candidate.education ? `<div class="detail-info-item"><strong>学历:</strong> ${candidate.education}</div>` : ''}
                ${candidate.salary ? `<div class="detail-info-item"><strong>期望薪资:</strong> ${candidate.salary}</div>` : ''}
                ${candidate.status ? `<div class="detail-info-item"><strong>求职状态:</strong> ${candidate.status}</div>` : ''}
              </div>
            </div>
          ` : ''}

          ${candidate.pros && candidate.pros.length > 0 ? `
            <div class="detail-section">
              <h4>✅ 亮点优势</h4>
              <ul>
                ${candidate.pros.map(pro => `<li>${pro}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${candidate.cons && candidate.cons.length > 0 ? `
            <div class="detail-section">
              <h4>⚠️ 需要关注</h4>
              <ul>
                ${candidate.cons.map(con => `<li>${con}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${candidate.workHistory && candidate.workHistory.length > 0 ? `
            <div class="detail-section">
              <h4>💼 工作经历</h4>
              <div class="work-history-list">
                ${candidate.workHistory.map(work => `
                  <div class="work-history-item">
                    ${work.time ? `<div class="work-time">${work.time}</div>` : ''}
                    ${work.company ? `<div class="work-company">${work.company}</div>` : ''}
                    ${work.position ? `<div class="work-position">${work.position}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${candidate.educationHistory && candidate.educationHistory.length > 0 ? `
            <div class="detail-section">
              <h4>🎓 教育背景</h4>
              <div class="education-list">
                ${candidate.educationHistory.map(edu => `
                  <div class="education-item">
                    ${edu.time ? `<div class="edu-time">${edu.time}</div>` : ''}
                    ${edu.school ? `<div class="edu-school">${edu.school}</div>` : ''}
                    ${edu.major || edu.degree ? `<div class="edu-major">${[edu.major, edu.degree].filter(Boolean).join(' · ')}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${candidate.skills && candidate.skills.length > 0 ? `
            <div class="detail-section">
              <h4>🔧 技能标签</h4>
              <div class="skill-tags">
                ${candidate.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${candidate.advantages && candidate.advantages.length > 0 ? `
            <div class="detail-section">
              <h4>💡 个人优势</h4>
              <div class="advantages-text">
                ${candidate.advantages.map(adv => `<p>${adv}</p>`).join('')}
              </div>
            </div>
          ` : ''}

          ${candidate.url ? `
            <div class="detail-actions">
              <a href="${candidate.url}" target="_blank" class="detail-action-btn">
                🔗 打开原页面
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 关闭按钮
    modal.querySelector('.detail-close-btn').onclick = () => modal.remove();
    modal.querySelector('.candidate-detail-overlay').onclick = () => modal.remove();

    // 显示动画
    setTimeout(() => modal.classList.add('show'), 100);
  }

  /**
   * 删除候选人
   */
  deleteCandidate(index) {
    if (confirm('确定要删除这个候选人吗？')) {
      this.candidates.splice(index, 1);
      this.saveToStorage();
      this.refreshPanelContent();
      this.showToast('已删除候选人');
    }
  }

  /**
   * 清空所有候选人
   */
  clearAll() {
    if (confirm('确定要清空所有候选人数据吗？此操作不可恢复！')) {
      this.candidates = [];
      this.saveToStorage();
      this.refreshPanelContent();
      this.showToast('已清空所有数据');
    }
  }

  /**
   * 导出候选人数据
   */
  exportCandidates() {
    const data = JSON.stringify(this.candidates, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boss候选人数据_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('✅ 数据已导出');
  }

  /**
   * 绑定面板事件
   */
  bindPanelEvents(panel) {
    // 关闭按钮
    panel.querySelector('#candidateListClose').onclick = () => this.hidePanel();

    // 刷新按钮
    panel.querySelector('#candidateListRefresh').onclick = () => {
      this.refreshPanelContent();
      this.showToast('已刷新');
    };

    // 导出按钮
    panel.querySelector('#candidateListExport').onclick = () => this.exportCandidates();

    // 清空按钮
    panel.querySelector('#candidateListClear').onclick = () => this.clearAll();

    // 筛选按钮
    panel.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        // 切换active状态
        panel.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 应用筛选
        const filter = btn.getAttribute('data-filter');
        const body = document.getElementById('candidateListBody');
        body.innerHTML = this.renderCandidateList(filter);
      };
    });
  }

  /**
   * 注入面板样式
   */
  injectPanelStyles() {
    if (document.getElementById('boss-candidate-list-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'boss-candidate-list-panel-styles';
    style.textContent = `
      .boss-candidate-list-panel {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 450px;
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 999998;
        opacity: 0;
        transform: translateX(30px);
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .boss-candidate-list-panel.show {
        opacity: 1;
        transform: translateX(0);
      }

      .candidate-list-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 16px 16px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: bold;
      }

      .title-count {
        font-size: 14px;
        opacity: 0.9;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      .header-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.2s;
      }

      .header-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      .candidate-list-filters {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid #e8e8e8;
        background: #f8f9fa;
        flex-wrap: wrap;
      }

      .filter-btn {
        padding: 6px 12px;
        border: 1px solid #d9d9d9;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .filter-btn:hover {
        border-color: #667eea;
        color: #667eea;
      }

      .filter-btn.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      .candidate-list-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .candidate-item {
        background: #f8f9ff;
        border: 1px solid #e8e8ff;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.2s;
      }

      .candidate-item:hover {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
      }

      .candidate-item-header {
        margin-bottom: 12px;
      }

      .candidate-name-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .candidate-name {
        font-size: 16px;
        font-weight: bold;
        color: #333;
      }

      .candidate-score {
        font-size: 18px;
        font-weight: bold;
      }

      .candidate-level {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .candidate-item-body {
        margin-bottom: 12px;
      }

      .candidate-info-row {
        display: flex;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 13px;
      }

      .info-label {
        color: #666;
        min-width: 70px;
      }

      .info-value {
        color: #333;
        flex: 1;
      }

      .candidate-time {
        margin-top: 8px;
        font-size: 11px;
        color: #999;
      }

      .candidate-item-actions {
        display: flex;
        gap: 8px;
      }

      .candidate-action-btn {
        flex: 1;
        padding: 8px;
        border: 1px solid #667eea;
        background: white;
        color: #667eea;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .candidate-action-btn:hover {
        background: #667eea;
        color: white;
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
      }

      .empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-text {
        font-size: 16px;
        color: #666;
        margin-bottom: 8px;
      }

      .empty-hint {
        font-size: 13px;
        color: #999;
      }

      /* 详情弹窗样式 */
      .boss-candidate-detail-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .boss-candidate-detail-modal.show {
        opacity: 1;
      }

      .candidate-detail-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
      }

      .candidate-detail-content {
        position: relative;
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 12px 48px rgba(0,0,0,0.3);
      }

      .detail-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e8e8e8;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .detail-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      .detail-close-btn {
        background: #f0f0f0;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
      }

      .detail-body {
        padding: 24px;
      }

      .detail-score-section {
        text-align: center;
        padding: 20px;
        background: #f8f9ff;
        border-radius: 12px;
        margin-bottom: 20px;
      }

      .detail-score {
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 12px;
      }

      .detail-recommendation {
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }

      .detail-section {
        margin-bottom: 20px;
      }

      .detail-section h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        color: #333;
      }

      .detail-section ul {
        margin: 0;
        padding-left: 20px;
      }

      .detail-section li {
        margin-bottom: 8px;
        font-size: 13px;
        color: #555;
        line-height: 1.5;
      }

      .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .skill-tag {
        padding: 6px 12px;
        background: #e8f4ff;
        color: #1890ff;
        border-radius: 16px;
        font-size: 12px;
      }

      .detail-actions {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e8e8e8;
      }

      .detail-action-btn {
        display: block;
        width: 100%;
        padding: 12px;
        background: #667eea;
        color: white;
        text-align: center;
        text-decoration: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }

      .detail-action-btn:hover {
        background: #5568d3;
      }

      /* 基本信息网格 */
      .detail-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .detail-info-item {
        font-size: 13px;
        color: #555;
        line-height: 1.6;
      }

      .detail-info-item strong {
        color: #333;
        margin-right: 4px;
      }

      /* 工作经历列表 */
      .work-history-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .work-history-item {
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 3px solid #667eea;
      }

      .work-time {
        font-size: 12px;
        color: #999;
        margin-bottom: 4px;
      }

      .work-company {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        margin-bottom: 2px;
      }

      .work-position {
        font-size: 13px;
        color: #666;
      }

      /* 教育背景列表 */
      .education-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .education-item {
        padding: 12px;
        background: #f0f9ff;
        border-radius: 8px;
        border-left: 3px solid #1890ff;
      }

      .edu-time {
        font-size: 12px;
        color: #999;
        margin-bottom: 4px;
      }

      .edu-school {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        margin-bottom: 2px;
      }

      .edu-major {
        font-size: 13px;
        color: #666;
      }

      /* 个人优势 */
      .advantages-text {
        font-size: 13px;
        line-height: 1.8;
        color: #555;
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
      }

      .advantages-text p {
        margin: 0 0 8px 0;
      }

      .advantages-text p:last-child {
        margin-bottom: 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 保存到本地存储
   */
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        'candidateList': this.candidates
      });
      console.log('候选人列表已保存到本地');
    } catch (error) {
      console.error('保存候选人列表失败:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get('candidateList');
      if (result.candidateList && Array.isArray(result.candidateList)) {
        this.candidates = result.candidateList;
        console.log(`从本地加载了 ${this.candidates.length} 个候选人`);
      }
    } catch (error) {
      console.error('加载候选人列表失败:', error);
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
  window.candidateListManager = new CandidateListManager();
}
