/**
 * AI分析模块 - 候选人智能评分与回复生成
 * 支持 Claude 和 Gemini API
 */

class AIAnalyzer {
  constructor() {
    this.config = window.configManager;
  }

  /**
   * 分析牛人匹配度
   */
  async analyzeCandidate(candidateInfo) {
    try {
      // 获取岗位需求配置
      const jobRequirements = this.config.get('jobRequirements');

      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(candidateInfo, jobRequirements);

      // 调用AI分析
      const result = await this.callAI(prompt);

      // 解析AI返回的评分
      const analysis = this.parseAnalysisResult(result);

      // 保存分析结果
      await storageManager.saveAnalysis(candidateInfo.id, analysis);

      console.log(`✅ AI分析完成 - ${candidateInfo.name}: ${analysis.matchScore}分`);
      return analysis;
    } catch (error) {
      console.error('AI分析失败:', error);
      // 如果AI失败，使用降级分析
      return this.fallbackAnalysis(candidateInfo);
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(candidate, jobRequirements) {
    return `你是一个专业的招聘助手，请分析以下牛人（候选人）是否符合岗位要求。

## 牛人信息
姓名: ${candidate.name || '未知'}
应聘职位: ${candidate.position || '未知'}
学历: ${candidate.education?.degree || '未知'} - ${candidate.education?.school || ''}
专业: ${candidate.education?.major || '未知'}

工作经验:
${candidate.experience?.map(exp => `- ${exp.period} ${exp.company} ${exp.position}`).join('\n') || '无'}

技能标签: ${candidate.skills?.join(', ') || '无'}

期望薪资: ${candidate.salary || '未知'}

在线状态: ${candidate.status || '未知'}

## 岗位要求
${jobRequirements || '未配置具体要求，请根据牛人的整体素质进行评估'}

## 请按以下JSON格式返回分析结果:
{
  "matchScore": 85,           // 匹配度分数 0-100
  "level": "high",            // 评级: high/medium/low
  "pros": ["优点1", "优点2"],   // 亮点
  "cons": ["不足1"],           // 不足
  "recommendation": "推荐理由",
  "suggestedAction": "建议操作: 约面试/继续沟通/不合适"
}`;
  }

  /**
   * 调用AI API（支持Gemini和智谱AI）
   */
  async callAI(prompt) {
    const provider = this.config.get('aiProvider') || 'gemini';
    const apiKey = provider === 'gemini' ? this.config.get('geminiApiKey') : this.config.get('zhipuApiKey');

    if (!apiKey) {
      const providerName = provider === 'gemini' ? 'Gemini' : '智谱AI';
      throw new Error(`未配置${providerName} API密钥，请在插件设置中配置`);
    }

    if (provider === 'gemini') {
      return await this.callGemini(prompt, apiKey);
    } else {
      return await this.callZhipuAI(prompt, apiKey);
    }
  }

  /**
   * 调用Gemini API（带速率限制和重试）
   * 官方文档: https://ai.google.dev/gemini-api/docs/quickstart?hl=zh-cn
   */
  async callGemini(prompt, apiKey, retries = 3) {
    // 使用 gemini-2.5-flash 模型（用户确认此模型可用）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    console.log('🤖 调用Gemini API...');

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

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey  // Google推荐的header方式
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,        // 平衡创造性和准确性
              maxOutputTokens: 2048,   // 增加到2048以支持更长回复
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

        // 处理429错误（请求频率超限）
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

          console.warn(`⚠️ API请求频率超限 (429)，第 ${attempt + 1}/${retries + 1} 次重试，等待 ${waitTime/1000} 秒...`);

          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // 重试
          } else {
            throw new Error('API请求频率超限，请稍后再试。建议：\n1. 减少同时发送的消息数量\n2. 等待1分钟后再使用\n3. 考虑升级到Gemini付费版');
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Gemini API调用失败 (${response.status})`;

          // 解析常见错误
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            errorMessage += `: ${errorText.substring(0, 200)}`;
          }

          // 特殊错误提示
          if (response.status === 400) {
            errorMessage = 'API请求参数错误，请检查配置';
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = 'API密钥无效或权限不足，请检查API Key';
          } else if (response.status === 500) {
            errorMessage = 'Gemini服务器错误，请稍后重试';
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();

        // 提取生成的文本
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const result = data.candidates[0].content.parts[0].text;
          console.log('✅ Gemini API调用成功');
          return result;
        } else {
          console.error('Gemini返回数据:', JSON.stringify(data));
          throw new Error('Gemini API返回格式异常，请检查API配置');
        }
      } catch (error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('网络错误：无法连接到Gemini API，请检查网络连接');
        }

        // 如果不是429错误，直接抛出
        if (!error.message.includes('429') && !error.message.includes('频率超限')) {
          throw error;
        }

        // 429错误已在上面处理，如果到这里说明重试次数用完了
        if (attempt >= retries) {
          throw error;
        }
      }
    }
  }

  /**
   * 调用智谱AI GLM-4（带速率限制和重试）
   * 官方文档: https://docs.bigmodel.cn/cn/guide/models/text/glm-4
   */
  async callZhipuAI(prompt, apiKey, retries = 3) {
    const url = `https://open.bigmodel.cn/api/paas/v4/chat/completions`;

    console.log('🤖 调用智谱AI GLM-4 API...');

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

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'glm-4-flash',  // 使用免费的glm-4-flash模型
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2048
          })
        });

        // 处理429错误（请求频率超限）
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

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `智谱AI API调用失败 (${response.status})`;

          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            errorMessage += `: ${errorText.substring(0, 200)}`;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();

        // 提取生成的文本（OpenAI兼容格式）
        if (data.choices && data.choices[0]?.message?.content) {
          const result = data.choices[0].message.content;
          console.log('✅ 智谱AI API调用成功');
          return result;
        } else {
          console.error('智谱AI返回数据:', JSON.stringify(data));
          throw new Error('智谱AI API返回格式异常');
        }
      } catch (error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('网络错误：无法连接到智谱AI API，请检查网络连接');
        }

        if (!error.message.includes('429') && !error.message.includes('频率超限')) {
          throw error;
        }

        if (attempt >= retries) {
          throw error;
        }
      }
    }
  }

  // Claude API支持已移除，将来如需支持可重新添加

  /**
   * 解析AI返回结果
   */
  parseAnalysisResult(aiResponse) {
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果没有JSON，返回默认结构
      return {
        matchScore: 50,
        level: 'medium',
        pros: [],
        cons: [],
        recommendation: aiResponse,
        suggestedAction: '需要进一步评估'
      };
    } catch (error) {
      console.error('解析AI结果失败:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 降级分析（不使用AI）
   */
  fallbackAnalysis(candidate) {
    const criteria = this.config.get('filterCriteria');
    let score = 50; // 基础分

    // 学历评分
    const educationLevels = ['高中', '中专', '大专', '本科', '硕士', '博士'];
    const candidateEduLevel = educationLevels.indexOf(candidate.education?.degree || '');
    const requiredEduLevel = educationLevels.indexOf(criteria.minEducation);
    if (candidateEduLevel >= requiredEduLevel) {
      score += 15;
    }

    // 经验评分
    const yearsOfExp = this.calculateExperience(candidate.experience);
    if (yearsOfExp >= criteria.minExperience) {
      score += 20;
    }

    // 技能匹配
    const matchedSkills = candidate.skills?.filter(skill =>
      criteria.requiredSkills.some(req => skill.includes(req))
    );
    if (matchedSkills && matchedSkills.length > 0) {
      score += matchedSkills.length * 5;
    }

    // 排除关键词检查
    const hasExcluded = criteria.excludeKeywords.some(keyword =>
      JSON.stringify(candidate).includes(keyword)
    );
    if (hasExcluded) {
      score -= 30;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      matchScore: score,
      level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
      pros: matchedSkills || [],
      cons: hasExcluded ? ['包含排除关键词'] : [],
      recommendation: `匹配度: ${score}分`,
      suggestedAction: score >= 80 ? '建议约面试' : score >= 60 ? '可继续沟通' : '不推荐'
    };
  }

  /**
   * 计算工作年限
   */
  calculateExperience(experiences) {
    if (!experiences || experiences.length === 0) return 0;

    let totalMonths = 0;
    experiences.forEach(exp => {
      const match = exp.period?.match(/(\d{4})\.(\d{2})-(\d{4})\.(\d{2})/);
      if (match) {
        const startYear = parseInt(match[1]);
        const startMonth = parseInt(match[2]);
        const endYear = parseInt(match[3]);
        const endMonth = parseInt(match[4]);

        totalMonths += (endYear - startYear) * 12 + (endMonth - startMonth);
      }
    });

    return Math.floor(totalMonths / 12);
  }

  /**
   * 生成智能回复
   */
  async generateReply(candidateInfo, messageContext) {
    try {
      // 获取岗位需求
      const jobRequirements = this.config.get('jobRequirements');

      const prompt = this.buildReplyPrompt(candidateInfo, messageContext, jobRequirements);
      const aiResponse = await this.callAI(prompt);

      return this.parseReplyOptions(aiResponse);
    } catch (error) {
      console.error('生成回复失败:', error);
      return this.getDefaultReplies(messageContext);
    }
  }

  /**
   * 构建回复生成提示词 - 加入岗位需求
   */
  buildReplyPrompt(candidate, context, jobRequirements) {
    return `你是一位友好专业的招聘PM，牛人（候选人）${candidate.name || '对方'}刚发来消息，请根据岗位要求和牛人情况生成3种不同风格的回复选项。

## 牛人信息
姓名: ${candidate.name || '未知'}
应聘职位: ${candidate.position || '未知'}
学历: ${candidate.education?.degree || '未知'}
工作经验: ${candidate.experience?.length || 0}段
匹配度评分: ${candidate.analysis?.matchScore || '未评估'}分
期望薪资: ${candidate.salary || '未知'}

## 岗位需求
${jobRequirements || '未配置具体岗位要求'}

## 牛人发来的消息
"${context.lastMessage}"

## 回复要求
1. **生成3个回复选项**：正式、友好、简洁
2. **针对性回复**：
   - 如果牛人问薪资：根据岗位需求的薪资范围回答，或建议面聊详谈
   - 如果牛人问岗位职责：结合岗位需求简要介绍，突出吸引力
   - 如果牛人问工作地点/福利：根据岗位需求如实回答
   - 如果是自我介绍：表示认可优点，结合岗位需求回应
3. **语气**：专业、热情、真诚
4. **长度**：每个回复50-150字

请按以下JSON格式返回:
{
  "options": [
    {"style": "formal", "text": "正式回复内容"},
    {"style": "friendly", "text": "友好回复内容"},
    {"style": "brief", "text": "简洁回复内容"}
  ]
}`;
  }

  /**
   * 解析回复选项
   */
  parseReplyOptions(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.options || [];
      }
      return this.getDefaultReplies({});
    } catch (error) {
      return this.getDefaultReplies({});
    }
  }

  /**
   * 默认回复选项
   */
  getDefaultReplies(context) {
    return [
      {
        style: 'formal',
        text: '您好！感谢您对我们岗位的关注，请问有什么可以帮您的吗？'
      },
      {
        style: 'friendly',
        text: 'Hi！看到您的简历了，很不错呢！有什么想了解的随时问我~'
      },
      {
        style: 'brief',
        text: '您好！我们可以进一步沟通一下。'
      }
    ];
  }

  /**
   * 生成打招呼语
   */
  async generateGreeting(candidateInfo) {
    try {
      const prompt = `你是招聘PM，发现了一位匹配的候选人，请生成一条吸引人的招呼语。

## 候选人信息
姓名: ${candidateInfo.name}
职位: ${candidateInfo.position}
工作经验: ${candidateInfo.experience?.map(e => e.position).join(', ') || '应届生'}
匹配度: ${candidateInfo.analysis?.matchScore}分

## 要求
1. 50字以内
2. 提到候选人的亮点
3. 简要介绍岗位吸引力
4. 友好专业的语气

只返回招呼语文本即可，不需要JSON格式。`;

      const greeting = await this.callAI(prompt);
      return greeting.trim();
    } catch (error) {
      console.error('生成招呼语失败:', error);
      return `您好！看到您的简历与我们的${candidateInfo.position}岗位高度匹配，欢迎进一步沟通。`;
    }
  }

  /**
   * 默认分析结果
   */
  getDefaultAnalysis() {
    return {
      matchScore: 50,
      level: 'medium',
      pros: [],
      cons: [],
      recommendation: '待进一步评估',
      suggestedAction: '需要人工判断'
    };
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.aiAnalyzer = new AIAnalyzer();
}
