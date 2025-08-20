import { Anthropic } from '@anthropic-ai/sdk'
import { OpenAI } from 'openai'

/**
 * Claude 到 OpenAI 的工具函数集合
 * 按照请求转换、响应转换、内容转换进行分组
 */

// ==================== 请求转换 (Request Conversion) ====================

/**
 * 将 Claude 的 TextBlockParam 转换为 OpenAI 的文本内容
 * 用于请求中的 system 消息和普通文本块
 */
export function convertClaudeTextBlock(
  block: Anthropic.Messages.TextBlockParam
): OpenAI.Chat.ChatCompletionContentPartText {
  return {
    type: 'text',
    text: block.text
  }
}

/**
 * 将 Claude 的 ImageBlockParam 转换为 OpenAI 的图片内容
 * 支持 URL 和 Base64 两种格式
 */
export function convertClaudeImageBlock(
  block: Anthropic.Messages.ImageBlockParam
): OpenAI.Chat.ChatCompletionContentPartImage {
  const source = block.source
  
  if (source.type === 'url') {
    return {
      type: 'image_url',
      image_url: {
        url: source.url
      }
    }
  }
  
  return {
    type: 'image_url',
    image_url: {
      url: `data:${source.media_type};base64,${source.data}`
    }
  }
}

/**
 * 将 Claude 的 DocumentBlockParam 转换为文本占位符
 * OpenAI 不直接支持文档，转换为描述性文本
 */
export function convertClaudeDocumentBlock(
  block: Anthropic.Messages.DocumentBlockParam
): OpenAI.Chat.ChatCompletionContentPartText {
  const mediaType = block.source.media_type
  return {
    type: 'text',
    text: `[Document: ${mediaType}]`
  }
}

/**
 * 将 Claude 的 ToolUseBlockParam 转换为 OpenAI 的工具调用
 * 用于请求中的工具使用块
 */
export function convertClaudeToolUseBlock(
  block: Anthropic.Messages.ToolUseBlockParam
): OpenAI.Chat.ChatCompletionMessageToolCall {
  return {
    id: block.id,
    type: 'function',
    function: {
      name: block.name,
      arguments: JSON.stringify(block.input)
    }
  }
}

/**
 * 将 Claude 的 ToolResultBlockParam 内容转换为字符串
 * 用于工具结果消息
 */
export function convertClaudeToolResultContent(
  content?: string | Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam>
): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  
  return content
    .map(block => block.type === 'text' ? block.text : '[Image]')
    .join('\n')
}

/**
 * 将 Claude 的 tool_choice 参数转换为 OpenAI 格式
 * Claude: { type: 'auto' | 'any' | 'tool', name?: string }
 * OpenAI: 'none' | 'auto' | 'required' | { type: 'function', function: { name: string } }
 */
export function convertClaudeToolChoice(
  toolChoice?: Anthropic.Messages.MessageCreateParams['tool_choice']
): OpenAI.Chat.ChatCompletionCreateParams['tool_choice'] {
  if (!toolChoice) return undefined
  
  if (toolChoice.type === 'tool' && toolChoice.name) {
    return {
      type: 'function',
      function: { name: toolChoice.name }
    }
  }
  
  if (toolChoice.type === 'any' || toolChoice.type === 'auto') {
    return 'auto'
  }
  
  return undefined
}

// ==================== 响应转换 (Response Conversion) ====================

/**
 * 将 OpenAI 的完成原因转换为 Claude 的停止原因
 * 用于响应的 stop_reason 字段
 */
export function convertOpenAIFinishReason(
  finishReason: string | null
): Anthropic.Messages.Message['stop_reason'] {
  switch (finishReason) {
    case 'stop': return 'end_turn'
    case 'length': return 'max_tokens'
    case 'function_call':
    case 'tool_calls': return 'tool_use'
    case 'content_filter': return 'stop_sequence'
    default: return 'end_turn'
  }
}

/**
 * 将 OpenAI 的 usage 统计转换为 Claude 格式
 * @param openaiUsage OpenAI 的使用统计
 * @param partial 控制哪些字段返回 null（用于流式响应的增量更新）
 */
export function convertOpenAIUsage(
  openaiUsage?: OpenAI.CompletionUsage | null,
  partial?: { input?: boolean; output?: boolean }
): any {
  return {
    input_tokens: partial?.input === false ? null : (openaiUsage?.prompt_tokens || 0),
    output_tokens: partial?.output === false ? null : (openaiUsage?.completion_tokens || 0),
    cache_creation_input_tokens: null,
    cache_read_input_tokens: null,
    server_tool_use: null,
    service_tier: null
  }
}

