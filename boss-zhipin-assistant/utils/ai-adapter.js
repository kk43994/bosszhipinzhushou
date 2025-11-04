/**
 * AI适配器 - 统一的AI API调用接口
 * 支持多种AI提供商，易于扩展
 *
 * 当前支持：
 * - Google Gemini
 * - 智谱AI GLM-4
 *
 * 计划支持：
 * - 百度文心一言
 * - 阿里通义千问
 * - Moonshot Kimi
 * - DeepSeek
 * - 其他OpenAI兼容API
 */

class AIAdapter {
  constructor() {
    this.config = null;
    this.rateLimiter = window.rateLimiter;
  }

  /**
   * 初始化：加载配置
   */
  async init(config) {
    this.config = config;
  }

  /**
   * 统一的AI调用接口
   * @param {string} prompt - 提示词
   * @param {object} options - 可选参数
   * @returns {Promise<string>} - AI生成的文本
   */
  async call(prompt, options = {}) {
    const provider = this.config.aiProvider || 'gemini';

    // 获取对应提供商的适配器
    const adapter = this.getAdapter(provider);

    // 使用速率限制器
    if (this.rateLimiter && options.useRateLimiter !== false) {
      await this.rateLimiter.waitForSlot();
      this.rateLimiter.recordRequest();

      const stats = this.rateLimiter.getStats();
      console.log(`📊 API使用统计 - 最近1分钟: ${stats.lastMinute}次, 今日: ${stats.lastDay}次, 剩余: ${stats.remainingToday}次`);
    }

    // 调用对应的适配器
    return await adapter.call(prompt, options);
  }

  /**
   * 获取对应提供商的适配器
   */
  getAdapter(provider) {
    switch (provider) {
      case 'gemini':
        return new GeminiAdapter(this.config);
      case 'zhipu':
        return new ZhipuAdapter(this.config);
      // 预留接口：未来添加更多提供商
      case 'wenxin':
        return new WenxinAdapter(this.config);
      case 'tongyi':
        return new TongyiAdapter(this.config);
      case 'kimi':
        return new KimiAdapter(this.config);
      case 'deepseek':
        return new DeepSeekAdapter(this.config);
      case 'openai':
        return new OpenAIAdapter(this.config);
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 获取所有支持的AI提供商列表
   */
  static getSupportedProviders() {
    return [
      {
        id: 'gemini',
        name: 'Google Gemini',
        icon: '🔷',
        status: 'active',
        description: '需要科学上网，每天1500次请求',
        models: ['gemini-2.5-flash', 'gemini-2.0-flash-exp'],
        apiKeyFormat: 'AIza开头',
        apiKeyUrl: 'https://aistudio.google.com/app/apikey'
      },
      {
        id: 'zhipu',
        name: '智谱AI GLM-4',
        icon: '🇨🇳',
        status: 'active',
        description: '国内直接访问，每年500万token',
        models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
        apiKeyFormat: '32位字符串',
        apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
      },
      {
        id: 'wenxin',
        name: '百度文心一言',
        icon: '🔵',
        status: 'planned',
        description: '国内大厂，免费额度',
        models: ['ERNIE-4.0-Turbo', 'ERNIE-3.5-8K'],
        apiKeyFormat: 'API Key + Secret Key',
        apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application'
      },
      {
        id: 'tongyi',
        name: '阿里通义千问',
        icon: '🟠',
        status: 'planned',
        description: '阿里云模型服务',
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
        apiKeyFormat: 'API Key',
        apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey'
      },
      {
        id: 'kimi',
        name: 'Moonshot Kimi',
        icon: '🌙',
        status: 'planned',
        description: '超长上下文，20万字',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
        apiKeyFormat: 'API Key',
        apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys'
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        icon: '🤖',
        status: 'planned',
        description: '高性价比，0.1元/百万token',
        models: ['deepseek-chat', 'deepseek-coder'],
        apiKeyFormat: 'API Key',
        apiKeyUrl: 'https://platform.deepseek.com/api_keys'
      },
      {
        id: 'openai',
        name: 'OpenAI兼容API',
        icon: '🔌',
        status: 'planned',
        description: '支持任何OpenAI兼容的API',
        models: ['custom'],
        apiKeyFormat: '自定义',
        apiKeyUrl: ''
      }
    ];
  }
}

// ============================================
// 基础适配器接口
// ============================================

class BaseAdapter {
  constructor(config) {
    this.config = config;
  }

  /**
   * 子类必须实现的方法
   */
  async call(prompt, options) {
    throw new Error('子类必须实现call方法');
  }

  /**
   * 通用的429错误重试逻辑
   */
  async retryOnRateLimit(fetchFn, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchFn();

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

          console.warn(`⚠️ API请求频率超限 (429)，第 ${attempt + 1}/${retries + 1} 次重试，等待 ${waitTime/1000} 秒...`);

          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            throw new Error('API请求频率超限，请稍后再试');
          }
        }

        return response;
      } catch (error) {
        if (attempt >= retries || !error.message.includes('429')) {
          throw error;
        }
      }
    }
  }
}

// ============================================
// Google Gemini 适配器
// ============================================

class GeminiAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    const apiKey = this.config.geminiApiKey;
    if (!apiKey) {
      throw new Error('未配置Gemini API密钥');
    }

    const model = options.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log('🤖 调用Gemini API...');

    const response = await this.retryOnRateLimit(async () => {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2048,
            topK: options.topK || 40,
            topP: options.topP || 0.95
          },
          safetySettings: options.safetySettings || [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        })
      });
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API调用失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      console.log('✅ Gemini API调用成功');
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Gemini API返回格式异常');
    }
  }
}

// ============================================
// 智谱AI GLM-4 适配器
// ============================================

class ZhipuAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    const apiKey = this.config.zhipuApiKey;
    if (!apiKey) {
      throw new Error('未配置智谱AI API密钥');
    }

    const model = options.model || 'glm-4-flash';
    const url = `https://open.bigmodel.cn/api/paas/v4/chat/completions`;

    console.log('🤖 调用智谱AI GLM-4 API...');

    const response = await this.retryOnRateLimit(async () => {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048
        })
      });
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`智谱AI API调用失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      console.log('✅ 智谱AI API调用成功');
      return data.choices[0].message.content;
    } else {
      throw new Error('智谱AI API返回格式异常');
    }
  }
}

// ============================================
// 预留接口：百度文心一言适配器
// ============================================

class WenxinAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    // TODO: 实现百度文心一言API调用
    // 文档: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2

    throw new Error('百度文心一言适配器尚未实现，敬请期待');

    /*
    const apiKey = this.config.wenxinApiKey;
    const secretKey = this.config.wenxinSecretKey;

    // Step 1: 获取access_token
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
    const tokenResponse = await fetch(tokenUrl, { method: 'POST' });
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: 调用文心一言API
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_output_tokens: options.maxTokens || 2048
      })
    });

    const data = await response.json();
    return data.result;  // 百度返回格式
    */
  }
}

// ============================================
// 预留接口：阿里通义千问适配器
// ============================================

class TongyiAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    // TODO: 实现阿里通义千问API调用
    // 文档: https://help.aliyun.com/zh/dashscope/developer-reference/api-details

    throw new Error('阿里通义千问适配器尚未实现，敬请期待');

    /*
    const apiKey = this.config.tongyiApiKey;
    const url = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: {
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048
        }
      })
    });

    const data = await response.json();
    return data.output.text;  // 通义千问返回格式
    */
  }
}

// ============================================
// 预留接口：Moonshot Kimi 适配器
// ============================================

class KimiAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    // TODO: 实现Moonshot Kimi API调用
    // 文档: https://platform.moonshot.cn/docs/api-reference

    throw new Error('Moonshot Kimi适配器尚未实现，敬请期待');

    /*
    const apiKey = this.config.kimiApiKey;
    const url = `https://api.moonshot.cn/v1/chat/completions`;

    // Kimi使用OpenAI兼容格式
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
    */
  }
}

// ============================================
// 预留接口：DeepSeek 适配器
// ============================================

class DeepSeekAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    // TODO: 实现DeepSeek API调用
    // 文档: https://platform.deepseek.com/api-docs/

    throw new Error('DeepSeek适配器尚未实现，敬请期待');

    /*
    const apiKey = this.config.deepseekApiKey;
    const url = `https://api.deepseek.com/v1/chat/completions`;

    // DeepSeek使用OpenAI兼容格式
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
    */
  }
}

// ============================================
// 预留接口：OpenAI兼容API 适配器
// ============================================

class OpenAIAdapter extends BaseAdapter {
  async call(prompt, options = {}) {
    // TODO: 实现通用OpenAI兼容API调用
    // 支持用户自定义endpoint和API Key

    throw new Error('OpenAI兼容API适配器尚未实现，敬请期待');

    /*
    const apiKey = this.config.openaiApiKey;
    const endpoint = this.config.openaiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const model = options.model || this.config.openaiModel || 'gpt-3.5-turbo';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
    */
  }
}

// ============================================
// 导出
// ============================================

if (typeof window !== 'undefined') {
  window.AIAdapter = AIAdapter;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAdapter;
}
