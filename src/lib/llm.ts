import OpenAI from 'openai';

export interface LLMConfig {
  provider: 'doubao' | 'deepseek' | 'openai';
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[^\x00-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getModelForProvider(provider: string): string {
  switch (provider) {
    case 'doubao':
      return process.env.DOUBAO_MODEL || 'doubao-pro-32k';
    case 'deepseek':
      return process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    default:
      return process.env.OPENAI_MODEL || 'gpt-4';
  }
}

export async function callLLM(
  userPrompt: string,
  config?: Partial<LLMConfig>
): Promise<string> {
  const provider = (config?.provider || process.env.DEFAULT_LLM_PROVIDER || 'doubao') as any;
  const cleanedSystemPrompt = cleanText(config?.systemPrompt || '你是一个专业的金融分析师助手。');
  const cleanedUserPrompt = cleanText(userPrompt);
  
  const fullConfig: LLMConfig = {
    provider: provider,
    model: config?.model || getModelForProvider(provider),
    systemPrompt: cleanedSystemPrompt,
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens ?? 2000,
  };

  console.log('LLM配置:', {
    provider: fullConfig.provider,
    model: fullConfig.model,
    hasDOUBAO_API_KEY: !!process.env.DOUBAO_API_KEY,
    hasOPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    hasDEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
  });

  try {
    const client = createClient(fullConfig.provider);
    
    const response = await client.chat.completions.create({
      model: fullConfig.model,
      messages: [
        { role: 'system', content: fullConfig.systemPrompt },
        { role: 'user', content: cleanedUserPrompt }
      ],
      temperature: fullConfig.temperature,
      max_tokens: fullConfig.maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    return content;
    
  } catch (error) {
    console.error('LLM调用失败:', error);
    throw new Error(`LLM服务暂时不可用: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

function createClient(provider: 'doubao' | 'deepseek' | 'openai') {
  switch (provider) {
    case 'doubao':
      return new OpenAI({
        apiKey: process.env.DOUBAO_API_KEY || '',
        baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
      });
    case 'deepseek':
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
      });
    default:
      return new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || '' 
      });
  }
}

export async function callLLMWithJSON<T>(
  userPrompt: string,
  config?: Partial<LLMConfig>
): Promise<T> {
  const jsonPrompt = `
${userPrompt}

请只输出JSON格式，不要任何其他文字或markdown标记。确保JSON格式正确，可以被直接解析。
`;

  const response = await callLLM(jsonPrompt, config);
  
  const jsonMatch = response.match(/\{[\s\S]*\}/) || response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (e) {
      console.error('JSON解析失败:', e, '原始响应:', response);
      throw new Error('无法解析LLM返回的JSON');
    }
  }
  
  throw new Error('LLM未返回有效的JSON格式');
}
