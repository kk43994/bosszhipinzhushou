/**
 * Popup - 面试地址模板管理脚本（新增2025-11-04）
 */

(function() {
  'use strict';

  let templates = [];

  // 初始化
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('📍 初始化面试地址模板管理...');

    await loadTemplates();
    renderTemplatePreview();
    bindEvents();
  });

  /**
   * 加载模板
   */
  async function loadTemplates() {
    try {
      const result = await chrome.storage.local.get('interviewTemplates');
      templates = result.interviewTemplates || [];
      console.log(`📍 加载了 ${templates.length} 个面试地址模板`);
    } catch (error) {
      console.error('加载面试地址模板失败:', error);
      templates = [];
    }
  }

  /**
   * 渲染模板预览
   */
  function renderTemplatePreview() {
    const previewBox = document.getElementById('interviewTemplatePreview');
    if (!previewBox) return;

    if (templates.length === 0) {
      previewBox.innerHTML = '<div class="loading-text">暂无面试地址模板<br>点击下方"新建"按钮添加</div>';
      return;
    }

    const html = templates.map(template => `
      <div class="template-preview-item ${template.isDefault ? 'default' : ''}" data-template-id="${template.id}">
        <div class="template-preview-header">
          <span class="template-preview-icon">${template.isDefault ? '⭐' : '📍'}</span>
          <span class="template-preview-name">${template.name}</span>
          ${template.isDefault ? '<span class="template-default-badge">默认</span>' : ''}
        </div>
        <div class="template-preview-address">${template.address || '未设置地址'}</div>
      </div>
    `).join('');

    previewBox.innerHTML = html;
  }

  /**
   * 绑定事件
   */
  function bindEvents() {
    // 管理模板按钮
    const manageBtn = document.getElementById('manageInterviewTemplates');
    if (manageBtn) {
      manageBtn.onclick = () => {
        console.log('打开面试地址模板管理器...');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'openInterviewTemplateManager'
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                alert('请先打开Boss直聘网站页面');
              } else if (response?.success) {
                console.log('✅ 模板管理器已打开');
                window.close(); // 关闭popup
              }
            });
          }
        });
      };
    }

    // 新建模板按钮
    const addBtn = document.getElementById('addInterviewTemplate');
    if (addBtn) {
      addBtn.onclick = () => {
        console.log('创建新面试地址模板...');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'addNewInterviewTemplate'
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                alert('请先打开Boss直聘网站页面');
              } else if (response?.success) {
                console.log('✅ 新建模板编辑器已打开');
                window.close();
              }
            });
          }
        });
      };
    }

    // 模板预览项点击 - 切换默认模板
    const previewBox = document.getElementById('interviewTemplatePreview');
    if (previewBox) {
      previewBox.addEventListener('click', async (e) => {
        const item = e.target.closest('.template-preview-item');
        if (!item) return;

        const templateId = item.dataset.templateId;
        if (!templateId) return;

        // 设置为默认模板
        templates.forEach(t => {
          t.isDefault = (t.id === templateId);
        });

        await chrome.storage.local.set({ interviewTemplates: templates });
        renderTemplatePreview();

        const template = templates.find(t => t.id === templateId);
        console.log(`✅ 已设置默认模板: ${template?.name}`);
      });
    }
  }

  // 监听存储变化，实时更新
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.interviewTemplates) {
      console.log('📍 检测到面试地址模板变化，重新加载');
      await loadTemplates();
      renderTemplatePreview();
    }
  });

})();
