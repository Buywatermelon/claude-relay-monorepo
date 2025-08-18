import { Anthropic } from '@anthropic-ai/sdk'

/**
 * 转换器基础接口
 * 定义所有格式转换器必须实现的方法
 */
export interface IConverter<TRequest, TResponse> {
  /**
   * 转换请求格式
   * @param claudeRequest Claude 格式的请求
   * @param model 目标模型名称
   * @returns 转换后的请求格式
   */
  request(claudeRequest: Anthropic.Messages.MessageCreateParams, model: string): TRequest
  
  /**
   * 转换响应格式
   * @param response 第三方 API 响应
   * @param claudeRequest 原始 Claude 请求（用于获取上下文信息）
   * @returns Claude 格式的响应
   */
  response(response: TResponse, claudeRequest: Anthropic.Messages.MessageCreateParams): Anthropic.Messages.Message
  
  /**
   * 转换流式响应
   * @param chunks 第三方 API 的流式响应
   * @returns Claude SSE 格式的流式响应
   */
  stream(chunks: AsyncIterable<any>): AsyncGenerator<string>
}

/**
 * API 处理器接口
 * 负责实际的 API 调用和转换器协调
 */
export interface IAPIProcessor {
  /**
   * 处理 Claude 格式的请求
   * @param request Claude 请求
   * @param model 目标模型
   * @returns Claude 格式的响应或流式响应
   */
  process(
    request: Anthropic.Messages.MessageCreateParams,
    model: string
  ): Promise<Anthropic.Messages.Message | AsyncGenerator<string>>
}