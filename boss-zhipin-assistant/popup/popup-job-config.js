/**
 * 岗位配置管理UI逻辑（2025-11-04新增）
 * 处理popup界面中岗位配置部分的所有交互
 */

class JobConfigUI {
  constructor() {
    this.currentConfig = null;
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    await this.loadJobConfigs();
    this.bindEvents();
  }

  /**
   * 加载所有岗位配置
   */
  async loadJobConfigs() {
    try {
      // 等待background页面的jobConfigManager加载
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 发送消息获取配置
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAllJobConfigs' });

      if (response && response.configs) {
        this.populateJobSelect(response.configs, response.activeConfigId);

        // 加载当前激活的配置
        const activeConfig = response.configs.find(c => c.id === response.activeConfigId);
        if (activeConfig) {
          this.loadConfigToUI(activeConfig);
        }
      }
    } catch (error) {
      console.error('加载岗位配置失败:', error);
      // 使用本地storage作为备用
      await this.loadConfigsFromStorage();
    }
  }

  /**
   * 从storage直接加载（备用方案）
   */
  async loadConfigsFromStorage() {
    const result = await chrome.storage.local.get(['jobConfigs', 'activeConfigId']);
    if (result.jobConfigs) {
      this.populateJobSelect(result.jobConfigs, result.activeConfigId);
      const activeConfig = result.jobConfigs.find(c => c.id === result.activeConfigId);
      if (activeConfig) {
        this.loadConfigToUI(activeConfig);
      }
    }
  }

  /**
   * 填充岗位选择下拉框
   */
  populateJobSelect(configs, activeConfigId) {
    const select = document.getElementById('jobConfigSelect');
    select.innerHTML = '';

    configs.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = config.name;
      if (config.id === activeConfigId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  /**
   * 加载配置到UI
   */
  loadConfigToUI(config) {
    this.currentConfig = config;

    // 加载到快速模式
    const rawTextarea = document.getElementById('jobRequirementsRaw');
    if (rawTextarea && config.rawText) {
      rawTextarea.value = config.rawText;
    }

    // 加载到结构化模式
    if (config.basic) {
      // 基础要求
      const educationSelect = document.getElementById('educationLevel');
      if (educationSelect && config.basic.education) {
        educationSelect.value = config.basic.education;
      }

      const expInput = document.getElementById('minExperience');
      if (expInput && config.basic.experience !== undefined) {
        expInput.value = config.basic.experience;
      }

      const salaryMinInput = document.getElementById('salaryMin');
      const salaryMaxInput = document.getElementById('salaryMax');
      if (salaryMinInput && config.basic.salaryMin) {
        salaryMinInput.value = config.basic.salaryMin;
      }
      if (salaryMaxInput && config.basic.salaryMax) {
        salaryMaxInput.value = config.basic.salaryMax;
      }
    }

    // 加载必备技能
    this.renderSkillsList('requiredSkillsList', config.requiredSkills || [], 'required');

    // 加载加分技能
    this.renderSkillsList('bonusSkillsList', config.bonusSkills || [], 'bonus');

    // 加载排除关键词
    this.renderSkillsList('excludeKeywordsList', config.excludeKeywords || [], 'exclude');

    // 加载工作描述
    const descTextarea = document.getElementById('jobDescription');
    if (descTextarea && config.jobDescription) {
      descTextarea.value = config.jobDescription;
    }
  }

  /**
   * 渲染技能列表
   */
  renderSkillsList(containerId, skills, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const skillArray = type === 'exclude' ? skills : skills;

    skillArray.forEach(skill => {
      const skillName = typeof skill === 'string' ? skill : skill.name;
      const tag = document.createElement('div');
      tag.className = `skill-tag ${type}`;
      tag.innerHTML = `
        <span>${skillName}</span>
        <span class="remove-btn" data-skill="${skillName}" data-type="${type}">×</span>
      `;
      container.appendChild(tag);
    });

    // 绑定删除按钮
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = () => {
        const skillName = btn.getAttribute('data-skill');
        const skillType = btn.getAttribute('data-type');
        this.removeSkill(skillType, skillName);
      };
    });
  }

  /**
   * 删除技能
   */
  removeSkill(type, skillName) {
    if (!this.currentConfig) return;

    if (type === 'required') {
      this.currentConfig.requiredSkills = this.currentConfig.requiredSkills.filter(
        s => (typeof s === 'string' ? s : s.name) !== skillName
      );
      this.renderSkillsList('requiredSkillsList', this.currentConfig.requiredSkills, 'required');
    } else if (type === 'bonus') {
      this.currentConfig.bonusSkills = this.currentConfig.bonusSkills.filter(
        s => (typeof s === 'string' ? s : s.name) !== skillName
      );
      this.renderSkillsList('bonusSkillsList', this.currentConfig.bonusSkills, 'bonus');
    } else if (type === 'exclude') {
      this.currentConfig.excludeKeywords = this.currentConfig.excludeKeywords.filter(k => k !== skillName);
      this.renderSkillsList('excludeKeywordsList', this.currentConfig.excludeKeywords, 'exclude');
    }
  }

  /**
   * 绑定所有事件
   */
  bindEvents() {
    // 岗位选择切换
    document.getElementById('jobConfigSelect')?.addEventListener('change', (e) => {
      this.switchJobConfig(e.target.value);
    });

    // 新建岗位配置
    document.getElementById('newJobConfig')?.addEventListener('click', () => {
      this.createNewJobConfig();
    });

    // 删除岗位配置
    document.getElementById('deleteJobConfig')?.addEventListener('click', () => {
      this.deleteJobConfig();
    });

    // 模式切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.getAttribute('data-mode');
        this.switchMode(mode);
      });
    });

    // AI解析按钮
    document.getElementById('aiParseBtn')?.addEventListener('click', () => {
      this.aiParseJobRequirements();
    });

    // 从职位页面提取
    document.getElementById('extractFromJobPage')?.addEventListener('click', () => {
      this.extractFromJobPage();
    });

    // 添加必备技能
    document.getElementById('addRequiredSkill')?.addEventListener('click', () => {
      this.addSkill('required');
    });

    // 添加加分技能
    document.getElementById('addBonusSkill')?.addEventListener('click', () => {
      this.addSkill('bonus');
    });

    // 添加排除关键词
    document.getElementById('addExcludeKeyword')?.addEventListener('click', () => {
      this.addSkill('exclude');
    });

    // 保存配置
    document.getElementById('saveJobConfig')?.addEventListener('click', () => {
      this.saveJobConfig();
    });

    // 测试匹配
    document.getElementById('testJobConfig')?.addEventListener('click', () => {
      this.testJobConfig();
    });

    // 导出配置
    document.getElementById('exportConfigs')?.addEventListener('click', () => {
      this.exportConfigs();
    });

    // 导入配置
    document.getElementById('importConfigs')?.addEventListener('click', () => {
      this.importConfigs();
    });

    // 回车键添加技能
    ['newRequiredSkill', 'newBonusSkill', 'newExcludeKeyword'].forEach(id => {
      document.getElementById(id)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const type = id === 'newRequiredSkill' ? 'required' :
                       id === 'newBonusSkill' ? 'bonus' : 'exclude';
          this.addSkill(type);
        }
      });
    });
  }

  /**
   * 切换岗位配置
   */
  async switchJobConfig(configId) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'setActiveJobConfig',
        configId: configId
      });

      // 重新加载配置
      await this.loadJobConfigs();

      this.showToast('✅ 已切换岗位配置');
    } catch (error) {
      console.error('切换配置失败:', error);
      this.showToast('❌ 切换失败: ' + error.message);
    }
  }

  /**
   * 创建新岗位配置
   */
  async createNewJobConfig() {
    const name = prompt('请输入新岗位名称:', '新岗位');
    if (!name) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'createJobConfig',
        configData: { name }
      });

      await this.loadJobConfigs();
      this.showToast('✅ 新岗位配置已创建');
    } catch (error) {
      console.error('创建配置失败:', error);
      this.showToast('❌ 创建失败: ' + error.message);
    }
  }

  /**
   * 删除岗位配置
   */
  async deleteJobConfig() {
    const select = document.getElementById('jobConfigSelect');
    const configId = select.value;
    const configName = select.options[select.selectedIndex].text;

    if (!confirm(`确定要删除"${configName}"吗？`)) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'deleteJobConfig',
        configId: configId
      });

      await this.loadJobConfigs();
      this.showToast('✅ 岗位配置已删除');
    } catch (error) {
      console.error('删除配置失败:', error);
      this.showToast('❌ 删除失败: ' + error.message);
    }
  }

  /**
   * 切换配置模式
   */
  switchMode(mode) {
    // 更新tab按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      }
    });

    // 切换显示内容
    const quickMode = document.getElementById('quickMode');
    const structuredMode = document.getElementById('structuredMode');

    if (mode === 'quick') {
      quickMode.style.display = 'block';
      structuredMode.style.display = 'none';
    } else {
      quickMode.style.display = 'none';
      structuredMode.style.display = 'block';
    }
  }

  /**
   * AI解析岗位需求
   */
  async aiParseJobRequirements() {
    const textarea = document.getElementById('jobRequirementsRaw');
    const rawText = textarea.value.trim();

    if (!rawText) {
      this.showToast('⚠️ 请先粘贴岗位需求文本');
      return;
    }

    // 显示加载状态
    const statusDiv = document.getElementById('parseStatus');
    const parseBtn = document.getElementById('aiParseBtn');
    statusDiv.style.display = 'flex';
    parseBtn.disabled = true;
    parseBtn.textContent = '🤖 解析中...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'parseJobRequirements',
        rawText: rawText
      });

      if (response && response.config) {
        // 更新当前配置
        this.currentConfig = { ...this.currentConfig, ...response.config };

        // 切换到结构化模式显示解析结果
        this.switchMode('structured');
        this.loadConfigToUI(this.currentConfig);

        this.showToast('✅ AI解析完成！请检查并保存');
      }
    } catch (error) {
      console.error('AI解析失败:', error);
      this.showToast('❌ 解析失败: ' + error.message);
    } finally {
      statusDiv.style.display = 'none';
      parseBtn.disabled = false;
      parseBtn.textContent = '🤖 AI智能解析';
    }
  }

  /**
   * 从职位管理页面提取
   */
  async extractFromJobPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractFromJobPage'
      });

      if (response && response.rawText) {
        // 填充到快速模式文本框
        document.getElementById('jobRequirementsRaw').value = response.rawText;

        // 自动触发AI解析
        this.showToast('✅ 已提取职位信息，正在AI解析...');
        await this.aiParseJobRequirements();
      } else {
        this.showToast('⚠️ 未找到职位信息，请确保在职位详情页');
      }
    } catch (error) {
      console.error('提取职位失败:', error);
      this.showToast('❌ 提取失败，请确保在职位管理或详情页');
    }
  }

  /**
   * 添加技能
   */
  addSkill(type) {
    const inputId = type === 'required' ? 'newRequiredSkill' :
                    type === 'bonus' ? 'newBonusSkill' : 'newExcludeKeyword';

    const input = document.getElementById(inputId);
    const skillName = input.value.trim();

    if (!skillName) return;

    if (!this.currentConfig) {
      this.currentConfig = { requiredSkills: [], bonusSkills: [], excludeKeywords: [] };
    }

    if (type === 'required') {
      this.currentConfig.requiredSkills = this.currentConfig.requiredSkills || [];
      this.currentConfig.requiredSkills.push({ name: skillName, weight: 10 });
      this.renderSkillsList('requiredSkillsList', this.currentConfig.requiredSkills, 'required');
    } else if (type === 'bonus') {
      this.currentConfig.bonusSkills = this.currentConfig.bonusSkills || [];
      this.currentConfig.bonusSkills.push({ name: skillName, weight: 5 });
      this.renderSkillsList('bonusSkillsList', this.currentConfig.bonusSkills, 'bonus');
    } else if (type === 'exclude') {
      this.currentConfig.excludeKeywords = this.currentConfig.excludeKeywords || [];
      this.currentConfig.excludeKeywords.push(skillName);
      this.renderSkillsList('excludeKeywordsList', this.currentConfig.excludeKeywords, 'exclude');
    }

    input.value = '';
  }

  /**
   * 保存岗位配置
   */
  async saveJobConfig() {
    try {
      // 从UI收集所有数据
      const configData = this.collectConfigFromUI();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateJobConfig',
        configId: this.currentConfig.id,
        updates: configData
      });

      this.showToast('✅ 配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      this.showToast('❌ 保存失败: ' + error.message);
    }
  }

  /**
   * 从UI收集配置数据
   */
  collectConfigFromUI() {
    const config = {
      basic: {
        education: document.getElementById('educationLevel')?.value || null,
        experience: parseInt(document.getElementById('minExperience')?.value) || 0,
        salaryMin: parseInt(document.getElementById('salaryMin')?.value) || null,
        salaryMax: parseInt(document.getElementById('salaryMax')?.value) || null,
      },
      requiredSkills: this.currentConfig.requiredSkills || [],
      bonusSkills: this.currentConfig.bonusSkills || [],
      excludeKeywords: this.currentConfig.excludeKeywords || [],
      jobDescription: document.getElementById('jobDescription')?.value || '',
      rawText: document.getElementById('jobRequirementsRaw')?.value || ''
    };

    return config;
  }

  /**
   * 测试匹配
   */
  testJobConfig() {
    this.showToast('🧪 测试功能开发中...');
  }

  /**
   * 导出配置
   */
  async exportConfigs() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'exportJobConfigs'
      });

      if (response && response.data) {
        // 下载JSON文件
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boss-job-configs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('✅ 配置已导出');
      }
    } catch (error) {
      console.error('导出配置失败:', error);
      this.showToast('❌ 导出失败: ' + error.message);
    }
  }

  /**
   * 导入配置
   */
  importConfigs() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
          action: 'importJobConfigs',
          data: text
        });

        await this.loadJobConfigs();
        this.showToast('✅ 配置已导入');
      } catch (error) {
        console.error('导入配置失败:', error);
        this.showToast('❌ 导入失败: ' + error.message);
      }
    };
    input.click();
  }

  /**
   * 显示提示消息
   */
  showToast(message) {
    // 简单实现，可以后续优化
    console.log(message);
    alert(message);
  }
}

// 初始化
if (typeof window !== 'undefined') {
  window.jobConfigUI = new JobConfigUI();
}
