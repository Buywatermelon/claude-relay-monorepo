import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import OpenAIConverter from './openai-converter'
import type { IAPIProcessor } from './interfaces'

/**
 * OpenAI API 转换器
 * 负责将 Claude 请求转换并转发到 OpenAI API
 */
export class OpenAITransformer implements IAPIProcessor {
  private converter = new OpenAIConverter()
  private client: OpenAI
  
  constructor(apiKey: string, endpoint?: string) {
    // 处理 OpenAI 兼容的 endpoint
    let baseURL: string | undefined
    if (endpoint) {
      // 移除 /chat/completions 后缀，因为 OpenAI SDK 会自动添加
      baseURL = endpoint.replace(/\/chat\/completions$/, '')
    }
    
    this.client = new OpenAI({ 
      apiKey,
      baseURL
    })
  }
  
  /**
   * 处理 Claude 格式的请求，转发到 OpenAI
   */
  async process(
    request: Anthropic.Messages.MessageCreateParams,
    model: string
  ): Promise<Anthropic.Messages.Message | AsyncGenerator<string>> {
    // 转换请求格式
    const openaiRequest = this.converter.request(request, model)
    
    if (request.stream) {
      // 流式响应处理
      return this.processStream(openaiRequest, request)
    } else {
      // 同步响应处理
      return this.processSync(openaiRequest, request)
    }
  }
  
  /**
   * 处理同步请求
   */
  private async processSync(
    openaiRequest: OpenAI.Chat.ChatCompletionCreateParams,
    claudeRequest: Anthropic.Messages.MessageCreateParams
  ): Promise<Anthropic.Messages.Message> {
    // 明确指定不使用流式响应，确保返回类型是 ChatCompletion
    const response = await this.client.chat.completions.create({
      ...openaiRequest,
      stream: false
    }) as OpenAI.Chat.ChatCompletion
    return this.converter.response(response, claudeRequest)
  }
  
  /**
   * 处理流式请求
   */
  private async processStream(
    openaiRequest: OpenAI.Chat.ChatCompletionCreateParams,
    claudeRequest: Anthropic.Messages.MessageCreateParams
  ): Promise<AsyncGenerator<string>> {
    const stream = await this.client.chat.completions.create({
      ...openaiRequest,
      stream: true
    })
    
    return this.converter.stream(stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>)
  }
}

export default OpenAITransformer