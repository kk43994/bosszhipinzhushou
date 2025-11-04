/**
 * 推荐牛人智能分析面板
 * 功能：自动扫描页面所有牛人，显示分析表格，支持批量打招呼
 * 创建时间：2025-11-04
 */

(function() {
  'use strict';

  window.recommendDashboard = {
    // 配置
    config: {
      autoShow: true,           // 是否自动显示
      minScoreForGreet: 75,     // 打招呼最低分数
      batchGreetCount: 20,      // 批量打招呼数量
      greetDelay: 3000,         // 打招呼间隔(ms)
    },

    // 状态
    state: {
      niurenList: [],           // 牛人列表
      greetHistory: new Set(),  // 已打招呼的牛人
      isProcessing: false,      // 是否正在处理
      panel: null,              // 面板DOM
    },

    // 选择器
    selectors: {
      niurenCards: '.geek-card, .recommend-card, [class*="card"]',
      niurenName: '.geek-name, .name, [class*="name"]',
      greetButton: 'button:contains("打招呼"), .greet-btn',
    },

    /**
     * 初始化
     */
    init() {
      console.log('🎯 初始化推荐牛人智能分析面板...');

      // 延迟启动，等待页面加载
      setTimeout(() => {
        this.loadGreetHistory();
        this.scanNiurenList();

        if (this.config.autoShow) {
          this.showDashboard();
        }

        // 监听页面变化
        this.observePageChanges();
      }, 2000);
    },

    /**
     * 监听页面变化（滚动加载更多牛人）
     */
    observePageChanges() {
      const observer = new MutationObserver(() => {
        // 防抖：500ms后重新扫描
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
          this.scanNiurenList(true); // 增量扫描
          this.updateDashboard();
        }, 500);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    /**
     * 扫描牛人列表
     */
    async scanNiurenList(incremental = false) {
      console.log('🔍 扫描牛人列表...');

      // 如果是增量扫描，保留原列表
      if (!incremental) {
        this.state.niurenList = [];
      }

      // 获取所有牛人卡片
      const cards = this.findNiurenCards();
      console.log(`找到 ${cards.length} 个牛人卡片`);

      for (const [index, card] of cards.entries()) {
        try {
          const niurenInfo = await this.extractNiurenInfo(card);
          if (niurenInfo && !this.isDuplicate(niurenInfo)) {
            niurenInfo.index = this.state.niurenList.length + 1;
            niurenInfo.cardElement = card;
            this.state.niurenList.push(niurenInfo);
          }
        } catch (error) {
          console.error('提取牛人信息失败:', error);
        }
      }

      // 排序：按评分从高到低
      this.state.niurenList.sort((a, b) => b.score - a.score);

      // 重新编号
      this.state.niurenList.forEach((niuren, i) => {
        niuren.index = i + 1;
      });

      console.log(`✅ 扫描完成，共 ${this.state.niurenList.length} 人`);
      return this.state.niurenList;
    },

    /**
     * 查找牛人卡片（智能匹配）
     */
    findNiurenCards() {
      // 尝试多个选择器
      const selectors = [
        '.recommend-card-wrapper',
        '.geek-card',
        '[class*="recommend"][class*="card"]',
        '[class*="geek"][class*="item"]',
      ];

      for (const selector of selectors) {
        const cards = Array.from(document.querySelectorAll(selector));
        if (cards.length > 0) {
          console.log(`使用选择器: ${selector}, 找到 ${cards.length} 张卡片`);
          return cards;
        }
      }

      console.warn('⚠️ 未找到牛人卡片，使用备用方案');
      return [];
    },

    /**
     * 提取牛人信息
     */
    async extractNiurenInfo(cardElement) {
      const info = {
        name: '',
        age: '',
        experience: '',
        education: '',
        status: '',
        expectation: '',
        advantage: '',
        tags: [],
        company: '',
        position: '',
        score: 0,
        cardElement: cardElement,
      };

      // 提取文本内容
      const text = cardElement.textContent;

      // 姓名
      const nameMatch = text.match(/^([^\d]{2,4})\s/);
      if (nameMatch) info.name = nameMatch[1].trim();

      // 学历
      const eduMatch = text.match(/(博士|硕士|本科|大专|高中|中专)/);
      if (eduMatch) info.education = eduMatch[1];

      // 工作年限
      const expMatch = text.match(/(\d+)年/);
      if (expMatch) info.experience = expMatch[1] + '年';

      // 状态
      if (text.includes('刚刚活跃')) info.status = '刚刚活跃';
      else if (text.includes('今日活跃')) info.status = '今日活跃';
      else if (text.includes('3日内活跃')) info.status = '3日内活跃';
      else if (text.includes('本周活跃')) info.status = '本周活跃';

      // 期望职位
      const expectMatch = text.match(/期望[：:]\s*([^\n]+)/);
      if (expectMatch) info.expectation = expectMatch[1].trim();

      // 优势
      const advMatch = text.match(/优势[：:]\s*([^\n]+)/);
      if (advMatch) info.advantage = advMatch[1].trim().substring(0, 100);

      // 提取所有可能的技能标签（查找常见关键词）
      const skillKeywords = [
        'PS', 'PR', 'AI', 'AE', 'CDR', 'CAD', '剪映', 'Final Cut',
        'Python', 'Java', 'JavaScript', 'Vue', 'React',
        '抖音', '快手', '小红书', '视频', '运营', '设计',
        'photoshop', '电商', '美工', '摄影', '修图'
      ];

      skillKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          if (!info.tags.includes(keyword)) {
            info.tags.push(keyword);
          }
        }
      });

      // 使用评分器计算分数（支持AI评分）
      if (window.recommendScorer) {
        info.score = await window.recommendScorer.calculateScore(info);
      } else {
        // 简单评分
        info.score = this.simpleScore(info);
      }

      return info;
    },

    /**
     * 简单评分（备用）
     */
    simpleScore(niurenInfo) {
      let score = 50; // 基础分

      // 学历加分
      const eduScores = { '博士': 20, '硕士': 15, '本科': 10, '大专': 5 };
      score += eduScores[niurenInfo.education] || 0;

      // 经验加分
      const expYears = parseInt(niurenInfo.experience);
      if (expYears >= 3) score += 15;
      else if (expYears >= 1) score += 10;

      // 活跃度加分
      if (niurenInfo.status.includes('刚刚')) score += 15;
      else if (niurenInfo.status.includes('今日')) score += 10;
      else if (niurenInfo.status.includes('3日')) score += 5;

      // 技能加分
      score += Math.min(niurenInfo.tags.length * 3, 20);

      return Math.min(100, score);
    },

    /**
     * 检查是否重复
     */
    isDuplicate(niurenInfo) {
      return this.state.niurenList.some(n =>
        n.name === niurenInfo.name &&
        n.education === niurenInfo.education
      );
    },

    /**
     * 显示分析面板
     */
    showDashboard() {
      if (this.state.panel) {
        this.state.panel.style.display = 'block';
        return;
      }

      const panel = document.createElement('div');
      panel.id = 'boss-recommend-dashboard';
      panel.className = 'boss-dashboard';
      panel.innerHTML = this.getDashboardHTML();

      document.body.appendChild(panel);
      this.state.panel = panel;

      // 绑定事件
      this.bindDashboardEvents();

      // 使面板可拖动
      this.makeDraggable(panel);

      console.log('✅ 分析面板已显示');
    },

    /**
     * 获取面板HTML
     */
    getDashboardHTML() {
      const totalCount = this.state.niurenList.length;
      const highMatchCount = this.state.niurenList.filter(n => n.score >= this.config.minScoreForGreet).length;
      const greetedCount = this.state.greetHistory.size;

      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <span class="title-icon">🤖</span>
            <span class="title-text">智能推荐分析面板</span>
          </div>
          <div class="dashboard-controls">
            <button class="btn-minimize" title="最小化">−</button>
            <button class="btn-close" title="关闭">×</button>
          </div>
        </div>

        <div class="dashboard-stats">
          <div class="stat-box">
            <div class="stat-label">总计</div>
            <div class="stat-value">${totalCount}人</div>
          </div>
          <div class="stat-box highlight">
            <div class="stat-label">高匹配</div>
            <div class="stat-value">${highMatchCount}人</div>
          </div>
          <div class="stat-box success">
            <div class="stat-label">已打招呼</div>
            <div class="stat-value">${greetedCount}人</div>
          </div>
        </div>

        <div class="dashboard-actions">
          <button class="btn-action btn-refresh" id="btnRefresh">
            <span>🔄</span> 刷新
          </button>
          <button class="btn-action btn-primary" id="btnBatchGreet">
            <span>⚡</span> 批量打招呼Top${this.config.batchGreetCount}
          </button>
          <button class="btn-action btn-secondary" id="btnExport">
            <span>📊</span> 导出Excel
          </button>
        </div>

        <div class="dashboard-table-wrapper">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th width="50">排名</th>
                <th width="80">姓名</th>
                <th width="60">评分</th>
                <th width="60">学历</th>
                <th width="60">经验</th>
                <th width="80">活跃度</th>
                <th width="200">优势</th>
                <th width="80">状态</th>
                <th width="100">操作</th>
              </tr>
            </thead>
            <tbody id="dashboardTableBody">
              ${this.getTableRowsHTML()}
            </tbody>
          </table>
        </div>

        <div class="dashboard-footer">
          <div class="footer-info">
            匹配标准：≥${this.config.minScoreForGreet}分 |
            批量间隔：${this.config.greetDelay/1000}秒 |
            安全模式
          </div>
        </div>
      `;
    },

    /**
     * 获取表格行HTML
     */
    getTableRowsHTML() {
      if (this.state.niurenList.length === 0) {
        return '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #999;">暂无数据，请点击刷新</td></tr>';
      }

      return this.state.niurenList.map(niuren => {
        const isHighMatch = niuren.score >= this.config.minScoreForGreet;
        const hasGreeted = this.state.greetHistory.has(niuren.name);

        const scoreClass = niuren.score >= 85 ? 'score-excellent' :
                          niuren.score >= 75 ? 'score-good' :
                          niuren.score >= 60 ? 'score-medium' : 'score-low';

        const statusClass = hasGreeted ? 'status-greeted' :
                           isHighMatch ? 'status-recommend' : 'status-normal';

        const statusText = hasGreeted ? '已打招呼' :
                          isHighMatch ? '推荐' : '待评估';

        return `
          <tr data-name="${niuren.name}" class="${isHighMatch ? 'row-highlight' : ''}">
            <td class="rank">${niuren.index}</td>
            <td class="name">${niuren.name || '未知'}</td>
            <td class="score ${scoreClass}">${niuren.score}分</td>
            <td class="education">${niuren.education || '-'}</td>
            <td class="experience">${niuren.experience || '-'}</td>
            <td class="status">${niuren.status || '-'}</td>
            <td class="advantage" title="${niuren.advantage}">${niuren.advantage.substring(0, 30)}...</td>
            <td class="greet-status ${statusClass}">${statusText}</td>
            <td class="actions">
              ${hasGreeted ?
                '<span class="text-muted">已沟通</span>' :
                `<button class="btn-greet" data-index="${niuren.index - 1}">打招呼</button>`
              }
            </td>
          </tr>
        `;
      }).join('');
    },

    /**
     * 绑定面板事件
     */
    bindDashboardEvents() {
      const panel = this.state.panel;

      // 最小化
      panel.querySelector('.btn-minimize').onclick = () => {
        panel.classList.toggle('minimized');
      };

      // 关闭
      panel.querySelector('.btn-close').onclick = () => {
        panel.style.display = 'none';
      };

      // 刷新
      panel.querySelector('#btnRefresh').onclick = () => {
        this.scanNiurenList();
        this.updateDashboard();
        this.showToast('✅ 刷新完成');
      };

      // 批量打招呼
      panel.querySelector('#btnBatchGreet').onclick = () => {
        this.batchGreet();
      };

      // 导出
      panel.querySelector('#btnExport').onclick = () => {
        this.exportToExcel();
      };

      // 单个打招呼按钮
      panel.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-greet')) {
          const index = parseInt(e.target.dataset.index);
          const niuren = this.state.niurenList[index];
          if (niuren) {
            this.greetSingleNiuren(niuren);
          }
        }
      });
    },

    /**
     * 更新面板
     */
    updateDashboard() {
      if (!this.state.panel) return;

      // 更新统计
      const totalCount = this.state.niurenList.length;
      const highMatchCount = this.state.niurenList.filter(n => n.score >= this.config.minScoreForGreet).length;
      const greetedCount = this.state.greetHistory.size;

      const statBoxes = this.state.panel.querySelectorAll('.stat-value');
      if (statBoxes[0]) statBoxes[0].textContent = `${totalCount}人`;
      if (statBoxes[1]) statBoxes[1].textContent = `${highMatchCount}人`;
      if (statBoxes[2]) statBoxes[2].textContent = `${greetedCount}人`;

      // 更新表格
      const tbody = this.state.panel.querySelector('#dashboardTableBody');
      if (tbody) {
        tbody.innerHTML = this.getTableRowsHTML();
      }
    },

    /**
     * 批量打招呼Top20
     */
    async batchGreet() {
      if (this.state.isProcessing) {
        this.showToast('⚠️ 正在处理中，请稍候...');
        return;
      }

      // 筛选高匹配且未打招呼的牛人
      const candidates = this.state.niurenList
        .filter(n => n.score >= this.config.minScoreForGreet && !this.state.greetHistory.has(n.name))
        .slice(0, this.config.batchGreetCount);

      if (candidates.length === 0) {
        this.showToast('⚠️ 没有符合条件的牛人');
        return;
      }

      const confirmed = confirm(`准备给 ${candidates.length} 位高匹配牛人打招呼，确认继续？\n\n（每次间隔${this.config.greetDelay/1000}秒，安全模式）`);
      if (!confirmed) return;

      this.state.isProcessing = true;
      const btnBatchGreet = this.state.panel.querySelector('#btnBatchGreet');
      btnBatchGreet.disabled = true;
      btnBatchGreet.textContent = '处理中...';

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < candidates.length; i++) {
        const niuren = candidates[i];

        try {
          // 显示进度
          this.showToast(`[${i + 1}/${candidates.length}] 正在给 ${niuren.name} 打招呼...`);

          // 执行打招呼
          await this.greetSingleNiuren(niuren, true);
          successCount++;

          // 延迟（除了最后一个）
          if (i < candidates.length - 1) {
            await this.delay(this.config.greetDelay);
          }

        } catch (error) {
          console.error(`打招呼失败: ${niuren.name}`, error);
          failCount++;
        }
      }

      this.state.isProcessing = false;
      btnBatchGreet.disabled = false;
      btnBatchGreet.innerHTML = '<span>⚡</span> 批量打招呼Top' + this.config.batchGreetCount;

      this.updateDashboard();
      this.showToast(`✅ 批量打招呼完成！成功：${successCount}，失败：${failCount}`);
    },

    /**
     * 给单个牛人打招呼
     */
    async greetSingleNiuren(niuren, silent = false) {
      // 调用推荐打招呼模块
      if (window.recommendGreeter) {
        // 生成招呼语
        const greetText = this.generateGreetingText(niuren);

        // 适配recommend-greet.js需要的niurenInfo格式
        const niurenInfo = {
          ...niuren,
          element: niuren.cardElement  // recommend-greet.js需要element属性
        };

        await window.recommendGreeter.sendGreeting(niurenInfo, greetText);
      } else {
        // 备用方案：直接点击打招呼按钮
        const greetBtn = niuren.cardElement.querySelector('button');
        if (greetBtn && greetBtn.textContent.includes('打招呼')) {
          greetBtn.click();
        }
      }

      // 记录到历史
      this.state.greetHistory.add(niuren.name);
      this.saveGreetHistory();

      if (!silent) {
        this.showToast(`✅ 已给 ${niuren.name} 打招呼`);
        this.updateDashboard();
      }
    },

    /**
     * 生成招呼语
     */
    generateGreetingText(niuren) {
      const jobConfig = window.jobConfigManager?.getActiveConfig();
      const jobName = jobConfig?.name || '职位';

      const templates = [
        `您好！看到您的简历非常匹配我们的${jobName}岗位，期待与您进一步沟通。`,
        `您好！您${niuren.experience || '丰富'}的工作经验很符合我们的需求，诚邀您了解${jobName}岗位。`,
        `您好！看到您擅长${niuren.tags.slice(0, 3).join('、')}，我们正在招聘${jobName}，希望能与您聊聊。`
      ];

      // 随机选择一个模板
      return templates[Math.floor(Math.random() * templates.length)];
    },

    /**
     * 导出Excel
     */
    exportToExcel() {
      // 生成CSV格式
      let csv = '排名,姓名,评分,学历,经验,活跃度,期望职位,优势,状态\n';

      this.state.niurenList.forEach(niuren => {
        const hasGreeted = this.state.greetHistory.has(niuren.name);
        const status = hasGreeted ? '已打招呼' : niuren.score >= this.config.minScoreForGreet ? '推荐' : '待评估';

        csv += [
          niuren.index,
          niuren.name || '未知',
          niuren.score + '分',
          niuren.education || '-',
          niuren.experience || '-',
          niuren.status || '-',
          niuren.expectation || '-',
          '"' + (niuren.advantage || '-').replace(/"/g, '""') + '"',
          status
        ].join(',') + '\n';
      });

      // 下载
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Boss直聘牛人分析_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      this.showToast('✅ 已导出Excel文件');
    },

    /**
     * 加载打招呼历史
     */
    async loadGreetHistory() {
      try {
        const result = await chrome.storage.local.get('greetHistory');
        if (result.greetHistory) {
          this.state.greetHistory = new Set(result.greetHistory);
          console.log(`加载了 ${this.state.greetHistory.size} 条打招呼历史`);
        }
      } catch (error) {
        console.error('加载历史失败:', error);
      }
    },

    /**
     * 保存打招呼历史
     */
    async saveGreetHistory() {
      try {
        await chrome.storage.local.set({
          greetHistory: Array.from(this.state.greetHistory)
        });
      } catch (error) {
        console.error('保存历史失败:', error);
      }
    },

    /**
     * 使面板可拖动
     */
    makeDraggable(element) {
      const header = element.querySelector('.dashboard-header');
      let isDragging = false;
      let startX, startY, startLeft, startTop;

      header.style.cursor = 'move';

      header.onmousedown = (e) => {
        if (e.target.classList.contains('btn-minimize') || e.target.classList.contains('btn-close')) {
          return;
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
      };

      document.onmousemove = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        element.style.left = (startLeft + dx) + 'px';
        element.style.top = (startTop + dy) + 'px';
      };

      document.onmouseup = () => {
        isDragging = false;
      };
    },

    /**
     * 显示提示
     */
    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'boss-dashboard-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    /**
     * 延迟函数
     */
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

  };

})();
