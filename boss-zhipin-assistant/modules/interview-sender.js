/**
 * 一键发送面试地址模块
 * 功能：快速发送面试邀请和地址信息
 */

class InterviewSender {
  constructor() {
    this.templates = [];
    this.defaultTemplateId = null;
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    console.log('📍 一键发送面试地址模块初始化...');
    await this.loadTemplates();
    this.injectUI();
    console.log('✅ 面试地址发送器已就绪');
  }

  /**
   * 加载面试地址模板
   */
  async loadTemplates() {
    try {
      const result = await chrome.storage.local.get('interviewTemplates');
      this.templates = result.interviewTemplates || [];

      if (this.templates.length === 0) {
        // 创建默认模板
        this.templates = [
          {
            id: this.generateId(),
            name: '公司面试',
            address: '浙江省温州市XX区XX路XX号',
            contactPerson: 'HR李女士',
            contactPhone: '138****8888',
            transportation: '地铁1号线XX站，A出口步行5分钟',
            parkingInfo: '公司提供免费停车位',
            buildingInfo: 'XX大厦12楼',
            interviewTime: '工作日 09:00-18:00',
            notes: '请携带简历，提前10分钟到达',
            isDefault: true
          }
        ];
        this.defaultTemplateId = this.templates[0].id;
        await this.saveTemplates();
      } else {
        const defaultTemplate = this.templates.find(t => t.isDefault);
        this.defaultTemplateId = defaultTemplate?.id || this.templates[0]?.id;
      }

      console.log(`📍 加载了 ${this.templates.length} 个面试地址模板`);
    } catch (error) {
      console.error('加载面试地址模板失败:', error);
    }
  }

  /**
   * 保存模板
   */
  async saveTemplates() {
    try {
      await chrome.storage.local.set({ interviewTemplates: this.templates });
      console.log('✅ 面试地址模板已保存');
    } catch (error) {
      console.error('保存面试地址模板失败:', error);
    }
  }

  /**
   * 注入UI
   */
  injectUI() {
    // 检查是否在沟通页面
    const isInChatPage = window.location.href.includes('/web/chat');
    if (!isInChatPage) {
      console.log('⚠️ 不在沟通页面，跳过UI注入');
      return;
    }

    // 查找聊天输入框区域
    const chatInputArea = this.findChatInputArea();
    if (!chatInputArea) {
      console.warn('⚠️ 未找到聊天输入框区域');
      return;
    }

    // 创建面试地址快捷按钮
    this.createInterviewButton(chatInputArea);
  }

  /**
   * 查找聊天输入框区域
   */
  findChatInputArea() {
    const selectors = [
      '.chat-input',
      '.message-input',
      '[class*="chat"][class*="input"]',
      '[class*="message"][class*="input"]',
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="输入"]',
      '.input-area',
      '.chat-editor'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // 找到输入框，返回其父容器
        return element.closest('.chat-conversation') ||
               element.closest('.chat-window') ||
               element.parentElement;
      }
    }

    return null;
  }

  /**
   * 创建面试邀请按钮
   */
  createInterviewButton(container) {
    // 避免重复创建
    if (document.getElementById('boss-interview-btn')) return;

    const button = document.createElement('button');
    button.id = 'boss-interview-btn';
    button.className = 'boss-interview-btn';
    button.innerHTML = `
      <span class="btn-icon">📍</span>
      <span class="btn-text">发送面试地址</span>
    `;

    button.onclick = () => this.showTemplateSelector();

    // 尝试找到合适的插入位置
    const toolbar = container.querySelector('.chat-toolbar') ||
                    container.querySelector('.input-toolbar') ||
                    container.querySelector('[class*="toolbar"]');

    if (toolbar) {
      toolbar.appendChild(button);
    } else {
      // 如果找不到工具栏，就创建一个浮动按钮
      button.style.position = 'fixed';
      button.style.bottom = '80px';
      button.style.right = '30px';
      button.style.zIndex = '9999';
      document.body.appendChild(button);
    }

    console.log('✅ 面试地址按钮已创建');
  }

  /**
   * 显示模板选择器
   */
  showTemplateSelector() {
    // 避免重复创建
    if (document.getElementById('boss-interview-selector')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'boss-interview-selector';
    panel.className = 'boss-interview-selector';

    panel.innerHTML = `
      <div class="interview-selector-content">
        <div class="selector-header">
          <h3>选择面试地址模板</h3>
          <button class="selector-close" id="closeSelectorBtn">×</button>
        </div>
        <div class="selector-body">
          ${this.renderTemplateList()}
        </div>
        <div class="selector-footer">
          <button class="btn-manage" id="manageTemplatesBtn">
            <span>⚙️</span> 管理模板
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 绑定事件
    document.getElementById('closeSelectorBtn').onclick = () => this.closeSelector();
    document.getElementById('manageTemplatesBtn').onclick = () => this.openTemplateManager();

    // 绑定模板选择事件
    panel.querySelectorAll('.template-item').forEach(item => {
      item.onclick = () => {
        const templateId = item.dataset.templateId;
        this.sendInterviewInfo(templateId);
      };
    });

    console.log('✅ 模板选择器已显示');
  }

  /**
   * 渲染模板列表
   */
  renderTemplateList() {
    if (this.templates.length === 0) {
      return '<div class="no-templates">暂无面试地址模板，请先添加</div>';
    }

    return this.templates.map(template => `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-icon">${template.isDefault ? '⭐' : '📍'}</div>
        <div class="template-info">
          <div class="template-name">${template.name}</div>
          <div class="template-address">${template.address}</div>
        </div>
        <div class="template-action">
          <span class="action-arrow">→</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * 关闭选择器
   */
  closeSelector() {
    const panel = document.getElementById('boss-interview-selector');
    if (panel) {
      panel.remove();
    }
  }

  /**
   * 打开模板管理器
   */
  openTemplateManager() {
    this.closeSelector();

    // 创建模板管理面板
    const managerPanel = document.createElement('div');
    managerPanel.id = 'boss-interview-manager';
    managerPanel.className = 'boss-interview-manager';

    managerPanel.innerHTML = `
      <div class="interview-manager-content">
        <div class="manager-header">
          <h3>面试地址模板管理</h3>
          <button class="manager-close" id="closeManagerBtn">×</button>
        </div>
        <div class="manager-body">
          <div class="template-list">
            ${this.renderTemplateManager()}
          </div>
        </div>
        <div class="manager-footer">
          <button class="btn-add-template" id="addTemplateBtn">
            <span>➕</span> 添加新模板
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(managerPanel);

    // 绑定事件
    document.getElementById('closeManagerBtn').onclick = () => this.closeManager();
    document.getElementById('addTemplateBtn').onclick = () => this.addNewTemplate();

    // 绑定编辑和删除事件
    managerPanel.querySelectorAll('.btn-edit-template').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const templateId = btn.dataset.templateId;
        this.editTemplate(templateId);
      };
    });

    managerPanel.querySelectorAll('.btn-delete-template').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const templateId = btn.dataset.templateId;
        this.deleteTemplate(templateId);
      };
    });

    managerPanel.querySelectorAll('.btn-set-default').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const templateId = btn.dataset.templateId;
        this.setDefaultTemplate(templateId);
      };
    });
  }

  /**
   * 渲染模板管理器
   */
  renderTemplateManager() {
    if (this.templates.length === 0) {
      return '<div class="no-templates">暂无模板</div>';
    }

    return this.templates.map(template => `
      <div class="manager-template-item">
        <div class="template-header">
          <div class="template-title">
            ${template.isDefault ? '<span class="default-badge">默认</span>' : ''}
            ${template.name}
          </div>
          <div class="template-actions">
            ${!template.isDefault ? `<button class="btn-set-default" data-template-id="${template.id}" title="设为默认">⭐</button>` : ''}
            <button class="btn-edit-template" data-template-id="${template.id}" title="编辑">✏️</button>
            <button class="btn-delete-template" data-template-id="${template.id}" title="删除">🗑️</button>
          </div>
        </div>
        <div class="template-preview">
          <div class="preview-field"><strong>地址：</strong>${template.address}</div>
          <div class="preview-field"><strong>联系人：</strong>${template.contactPerson || '未设置'}</div>
          <div class="preview-field"><strong>交通：</strong>${template.transportation || '未设置'}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 关闭管理器
   */
  closeManager() {
    const panel = document.getElementById('boss-interview-manager');
    if (panel) {
      panel.remove();
    }
  }

  /**
   * 添加新模板
   */
  addNewTemplate() {
    const newTemplate = {
      id: this.generateId(),
      name: '新面试地点',
      address: '',
      contactPerson: '',
      contactPhone: '',
      transportation: '',
      parkingInfo: '',
      buildingInfo: '',
      interviewTime: '',
      notes: '',
      isDefault: false
    };

    this.editTemplate(null, newTemplate);
  }

  /**
   * 编辑模板
   */
  editTemplate(templateId, newTemplate = null) {
    const template = newTemplate || this.templates.find(t => t.id === templateId);
    if (!template && !newTemplate) return;

    this.closeManager();

    const editorPanel = document.createElement('div');
    editorPanel.id = 'boss-interview-editor';
    editorPanel.className = 'boss-interview-editor';

    editorPanel.innerHTML = `
      <div class="interview-editor-content">
        <div class="editor-header">
          <h3>${newTemplate ? '添加' : '编辑'}面试地址模板</h3>
          <button class="editor-close" id="closeEditorBtn">×</button>
        </div>
        <div class="editor-body">
          <div class="form-group">
            <label>模板名称 *</label>
            <input type="text" id="templateName" value="${template.name}" placeholder="例如：公司面试、线上面试" />
          </div>
          <div class="form-group">
            <label>面试地址 *</label>
            <input type="text" id="templateAddress" value="${template.address}" placeholder="详细地址" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>联系人</label>
              <input type="text" id="templateContact" value="${template.contactPerson || ''}" placeholder="例如：HR李女士" />
            </div>
            <div class="form-group">
              <label>联系电话</label>
              <input type="text" id="templatePhone" value="${template.contactPhone || ''}" placeholder="138****8888" />
            </div>
          </div>
          <div class="form-group">
            <label>交通方式</label>
            <input type="text" id="templateTransport" value="${template.transportation || ''}" placeholder="地铁/公交指引" />
          </div>
          <div class="form-group">
            <label>停车信息</label>
            <input type="text" id="templateParking" value="${template.parkingInfo || ''}" placeholder="停车位情况" />
          </div>
          <div class="form-group">
            <label>楼栋信息</label>
            <input type="text" id="templateBuilding" value="${template.buildingInfo || ''}" placeholder="例如：XX大厦12楼" />
          </div>
          <div class="form-group">
            <label>面试时间</label>
            <input type="text" id="templateTime" value="${template.interviewTime || ''}" placeholder="例如：工作日 09:00-18:00" />
          </div>
          <div class="form-group">
            <label>备注说明</label>
            <textarea id="templateNotes" rows="3" placeholder="其他需要提醒候选人的事项">${template.notes || ''}</textarea>
          </div>
        </div>
        <div class="editor-footer">
          <button class="btn-cancel" id="cancelEditorBtn">取消</button>
          <button class="btn-save" id="saveEditorBtn">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(editorPanel);

    // 绑定事件
    document.getElementById('closeEditorBtn').onclick = () => this.closeEditor();
    document.getElementById('cancelEditorBtn').onclick = () => this.closeEditor();
    document.getElementById('saveEditorBtn').onclick = () => this.saveEditedTemplate(template.id, newTemplate !== null);
  }

  /**
   * 保存编辑的模板
   */
  async saveEditedTemplate(templateId, isNew) {
    const name = document.getElementById('templateName').value.trim();
    const address = document.getElementById('templateAddress').value.trim();

    if (!name || !address) {
      alert('请填写模板名称和面试地址');
      return;
    }

    const updatedTemplate = {
      id: templateId || this.generateId(),
      name: name,
      address: address,
      contactPerson: document.getElementById('templateContact').value.trim(),
      contactPhone: document.getElementById('templatePhone').value.trim(),
      transportation: document.getElementById('templateTransport').value.trim(),
      parkingInfo: document.getElementById('templateParking').value.trim(),
      buildingInfo: document.getElementById('templateBuilding').value.trim(),
      interviewTime: document.getElementById('templateTime').value.trim(),
      notes: document.getElementById('templateNotes').value.trim(),
      isDefault: false
    };

    if (isNew) {
      this.templates.push(updatedTemplate);
      console.log(`✅ 新增面试地址模板: ${updatedTemplate.name}`);
    } else {
      const index = this.templates.findIndex(t => t.id === templateId);
      if (index !== -1) {
        updatedTemplate.isDefault = this.templates[index].isDefault;
        this.templates[index] = updatedTemplate;
        console.log(`✅ 更新面试地址模板: ${updatedTemplate.name}`);
      }
    }

    await this.saveTemplates();
    this.closeEditor();
    this.openTemplateManager();
  }

  /**
   * 关闭编辑器
   */
  closeEditor() {
    const panel = document.getElementById('boss-interview-editor');
    if (panel) {
      panel.remove();
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId) {
    if (!confirm('确定要删除这个面试地址模板吗？')) {
      return;
    }

    const index = this.templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
      const deletedTemplate = this.templates.splice(index, 1)[0];

      // 如果删除的是默认模板，设置第一个为默认
      if (deletedTemplate.isDefault && this.templates.length > 0) {
        this.templates[0].isDefault = true;
        this.defaultTemplateId = this.templates[0].id;
      }

      await this.saveTemplates();
      console.log(`✅ 删除面试地址模板: ${deletedTemplate.name}`);

      // 刷新管理器
      this.closeManager();
      this.openTemplateManager();
    }
  }

  /**
   * 设置默认模板
   */
  async setDefaultTemplate(templateId) {
    this.templates.forEach(t => {
      t.isDefault = (t.id === templateId);
    });

    this.defaultTemplateId = templateId;
    await this.saveTemplates();

    const template = this.templates.find(t => t.id === templateId);
    console.log(`✅ 设置默认面试地址: ${template?.name}`);

    // 刷新管理器
    this.closeManager();
    this.openTemplateManager();
  }

  /**
   * 发送面试信息
   */
  async sendInterviewInfo(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      console.error('模板不存在');
      return;
    }

    // 生成面试邀请文本
    const message = this.formatInterviewMessage(template);

    // 查找聊天输入框
    const inputBox = this.findChatInputBox();
    if (!inputBox) {
      console.error('未找到聊天输入框');
      alert('未找到聊天输入框，请确认您在聊天页面');
      return;
    }

    // 填充文本到输入框
    this.fillInputBox(inputBox, message);

    // 关闭选择器
    this.closeSelector();

    // 提示用户
    this.showToast('✅ 面试地址已填充到输入框，请检查后点击发送');

    console.log(`✅ 已填充面试邀请: ${template.name}`);
  }

  /**
   * 格式化面试邀请消息
   */
  formatInterviewMessage(template) {
    let message = `【面试邀请】\n\n`;
    message += `您好！我们诚邀您来参加面试。\n\n`;
    message += `📍 面试地址：${template.address}\n`;

    if (template.buildingInfo) {
      message += `🏢 楼栋信息：${template.buildingInfo}\n`;
    }

    if (template.contactPerson || template.contactPhone) {
      message += `👤 联系方式：${template.contactPerson || ''}${template.contactPhone ? ' ' + template.contactPhone : ''}\n`;
    }

    if (template.interviewTime) {
      message += `⏰ 面试时间：${template.interviewTime}\n`;
    }

    if (template.transportation) {
      message += `🚇 交通方式：${template.transportation}\n`;
    }

    if (template.parkingInfo) {
      message += `🅿️ 停车信息：${template.parkingInfo}\n`;
    }

    if (template.notes) {
      message += `\n📋 温馨提示：${template.notes}\n`;
    }

    message += `\n期待与您见面！`;

    return message;
  }

  /**
   * 查找聊天输入框
   */
  findChatInputBox() {
    const selectors = [
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="输入"]',
      '.chat-input textarea',
      '.message-input textarea',
      '[class*="chat"][class*="input"] textarea',
      '[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return null;
  }

  /**
   * 填充输入框
   */
  fillInputBox(inputBox, text) {
    if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
      inputBox.value = text;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));
      inputBox.focus();
    } else if (inputBox.contentEditable === 'true') {
      inputBox.textContent = text;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.focus();
    }
  }

  /**
   * 显示提示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'boss-interview-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return 'interview_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.interviewSender = new InterviewSender();

  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openInterviewTemplateManager') {
      console.log('📍 收到打开模板管理器请求');
      if (window.interviewSender) {
        window.interviewSender.openTemplateManager();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '面试地址模块未初始化' });
      }
      return true;
    }

    if (request.action === 'addNewInterviewTemplate') {
      console.log('📍 收到新建模板请求');
      if (window.interviewSender) {
        window.interviewSender.addNewTemplate();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '面试地址模块未初始化' });
      }
      return true;
    }
  });
}
