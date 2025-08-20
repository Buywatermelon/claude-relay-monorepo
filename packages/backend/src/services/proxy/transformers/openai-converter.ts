import { Anthropic } from '@anthropic-ai/sdk'
import { OpenAI } from 'openai'
import { 
  convertClaudeTextBlock,
  convertClaudeImageBlock,
  convertClaudeDocumentBlock,
  convertClaudeToolUseBlock,
  convertClaudeToolResultContent,
  convertClaudeToolChoice,
  convertOpenAIFinishReason,
  convertOpenAIUsage
} from './openai-utils'
import { IConverter } from './interfaces'

type ClaudeRequest = Anthropic.Messages.MessageCreateParams
type ClaudeResponse = Anthropic.Messages.Message
type OpenAIRequest = OpenAI.Chat.ChatCompletionCreateParams
type OpenAIResponse = OpenAI.Chat.ChatCompletion

/**
 * OpenAI 格式转换器
 * 处理 Claude 与 OpenAI 格式之间的双向转换
 */
class OpenAIConverter implements IConverter<OpenAIRequest, OpenAIResponse> {
  // 流式响应的状态管理
  private messageStarted = false           // 标记是否已发送 message_start 事件
  private contentIndex = 0                 // 当前 content block 的索引
  private toolCallBuffer = new Map<number, string>()  // 缓存工具调用的部分参数

  /**
   * 将 Claude 请求格式转换为 OpenAI 请求格式
   */
  request(claude: ClaudeRequest, model: string): OpenAIRequest {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
    
    // 将 Claude 的系统提示词转换为 OpenAI 的第一条 system 消息
    if (claude.system) {
      messages.push({
        role: 'system',
        content: typeof claude.system === 'string'
          ? claude.system
          : claude.system.filter(b => b.type === 'text').map(convertClaudeTextBlock)
      })
    }
    
    // 转换所有消息
    // 注意：一个 Claude 消息可能生成多个 OpenAI 消息（如 tool_result）
    for (const msg of claude.messages) {
      messages.push(...this.mapMessage(msg))
    }

    const tool_choice = convertClaudeToolChoice(claude.tool_choice)
    
    return {
      model,  // 使用传入的模型参数
      messages,
      max_completion_tokens: claude.max_tokens,  // 使用新的参数名
      temperature: claude.temperature,
      top_p: claude.top_p,
      stream: claude.stream,
      stop: claude.stop_sequences,
      tools: claude.tools?.map(tool => this.mapTool(tool)).filter(Boolean),
      tool_choice
    }
  }
  
  /**
   * 将 OpenAI 响应格式转换为 Claude 响应格式
   * @param openai OpenAI 的响应
   * @param request 原始的 Claude 请求，用于获取模型信息
   */
  response(openai: OpenAIResponse, request: ClaudeRequest): ClaudeResponse {
    const content: Anthropic.Messages.ContentBlock[] = []
    const choice = openai.choices[0]
    
    // 转换文本内容
    // OpenAI 可能返回文本内容（即使同时有工具调用）
    if (choice.message.content) {
      const textBlock: Anthropic.Messages.TextBlock = {
        type: 'text',
        text: choice.message.content,
        citations: null
      }
      content.push(textBlock)
    }
    
    // 转换工具调用
    if (choice.message.tool_calls) {
      for (const call of choice.message.tool_calls) {
        // 使用工具函数进行反向转换（OpenAI -> Claude）
        let input: any
        try {
          input = JSON.parse(call.function.arguments)
        } catch {
          // 如果 JSON 解析失败，使用原始字符串
          input = call.function.arguments
        }
        
        const toolUseBlock: Anthropic.Messages.ToolUseBlock = {
          type: 'tool_use',
          id: call.id,
          name: call.function.name,
          input
        }
        content.push(toolUseBlock)
      }
    }
    
    
    return {
      id: openai.id.startsWith('msg_') ? openai.id : `msg_${openai.id}`,
      type: 'message',
      role: 'assistant',
      model: request.model,
      content,
      stop_reason: convertOpenAIFinishReason(choice.finish_reason),
      stop_sequence: null,
      usage: convertOpenAIUsage(openai.usage)
    }
  }
  
  /**
   * 将 Claude 的 Tool 定义转换为 OpenAI 的 ChatCompletionTool
   * 只处理标准 Tool，忽略 Computer Use 等特殊工具
   */
  private mapTool(tool: Anthropic.Messages.ToolUnion): OpenAI.Chat.ChatCompletionTool {
    // 只转换标准 Tool 类型（有 input_schema 的）
    if ('input_schema' in tool) {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema
        }
      }
    }
    
    // 忽略特殊工具（Computer Use 等）
    return null as any
  }
  
  /**
   * 将 OpenAI 的流式响应转换为 Claude 的 SSE 格式
   * 使用生成器函数处理异步流
   */
  async *stream(chunks: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>): AsyncGenerator<string> {
    for await (const chunk of chunks) {
      yield this.chunkToSSE(chunk)
    }
  }

  /**
   * 转换单个消息，处理多种内容类型
   * 一个 Claude 消息可能映射到多个 OpenAI 消息
   */
  private mapMessage(msg: Anthropic.Messages.MessageParam): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
    
    // 简单字符串内容直接转换
    if (typeof msg.content === 'string') {
      return [{ 
        role: msg.role === 'user' ? 'user' : 'assistant', 
        content: msg.content 
      }]
    }
    
    // 处理复杂内容块
    const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = []
    const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = []
    
    for (const block of msg.content) {
      switch (block.type) {
        case 'text':
          contentParts.push(convertClaudeTextBlock(block))
          break
          
        case 'image':
          contentParts.push(convertClaudeImageBlock(block))
          break
          
        case 'document':
          contentParts.push(convertClaudeDocumentBlock(block))
          break
          
        case 'thinking':
        case 'redacted_thinking':
          // 过滤思考内容
          break
          
        case 'tool_use':
          toolCalls.push(convertClaudeToolUseBlock(block))
          break
          
        case 'tool_result':
          // 工具结果创建独立的 tool 消息
          messages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: convertClaudeToolResultContent(block.content)
          })
          break
          
        case 'server_tool_use':
        case 'web_search_tool_result':
          // 暂时忽略这些特殊类型
          break
      }
    }
    
    // 组装主消息
    if (contentParts.length > 0 || toolCalls.length > 0) {
      // 根据角色处理内容
      if (msg.role === 'user') {
        // user 消息：直接使用所有内容，不能有 tool_calls
        const content = contentParts.length === 1 && contentParts[0].type === 'text'
          ? contentParts[0].text
          : contentParts.length > 0 
            ? contentParts 
            : ''
        
        messages.push({
          role: 'user' as const,
          content
        })
      } else {
        // assistant 消息：只能包含文本内容，可以有 tool_calls
        const textOnly = contentParts.filter(p => p.type === 'text') as OpenAI.Chat.ChatCompletionContentPartText[]
        const content = textOnly.length === 1 
          ? textOnly[0].text
          : textOnly.length > 0 
            ? textOnly 
            : undefined
        
        messages.push({
          role: 'assistant' as const,
          content,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined
        })
      }
    }
    
    return messages
  }


  /**
   * 将 OpenAI 的流式 chunk 转换为 Claude 的 SSE 事件序列
   * 维护必要的状态以正确生成事件顺序
   */
  private chunkToSSE(chunk: OpenAI.Chat.ChatCompletionChunk): string {
    const events: string[] = []
    const delta = chunk.choices[0]?.delta
    
    // 第一个 chunk：发送 message_start 事件
    // 包含消息元数据和初始 usage 统计
    if (!this.messageStarted) {
      this.messageStarted = true
      const messageStartEvent: Anthropic.Messages.RawMessageStartEvent = {
        type: 'message_start',
        message: {
          id: `msg_${chunk.id}`,
          type: 'message',
          role: 'assistant',
          model: chunk.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: convertOpenAIUsage()
        }
      }
      events.push(this.formatSSE('message_start', messageStartEvent))
    }
    
    // 处理文本内容增量
    if (delta?.content) {
      // 只在第一次接收到文本内容时发送 content_block_start
      // contentIndex === 0 表示还没有创建过任何 content block
      if (this.contentIndex === 0) {
        const blockStartEvent: Anthropic.Messages.RawContentBlockStartEvent = {
          type: 'content_block_start',
          index: this.contentIndex++,  // 使用 0，然后递增到 1
          content_block: { 
            type: 'text', 
            text: '',
            citations: null
          }
        }
        events.push(this.formatSSE('content_block_start', blockStartEvent))
      }
      
      // 发送文本增量
      // 使用 contentIndex - 1 因为上面已经递增了
      const blockDeltaEvent: Anthropic.Messages.RawContentBlockDeltaEvent = {
        type: 'content_block_delta',
        index: this.contentIndex - 1,
        delta: { type: 'text_delta', text: delta.content }
      }
      events.push(this.formatSSE('content_block_delta', blockDeltaEvent))
    }
    
    // 处理工具调用增量
    if (delta?.tool_calls) {
      // 如果有文本块正在进行中，需要先关闭它
      if (this.contentIndex > 0 && !this.toolCallBuffer.size) {
        const blockStopEvent: Anthropic.Messages.RawContentBlockStopEvent = {
          type: 'content_block_stop',
          index: this.contentIndex - 1
        }
        events.push(this.formatSSE('content_block_stop', blockStopEvent))
      }
      
      for (const toolCall of delta.tool_calls) {
        const idx = toolCall.index
        
        // 新的工具调用：发送 content_block_start
        // 使用 buffer 跟踪已开始的工具调用
        if (!this.toolCallBuffer.has(idx)) {
          const toolBlockStartEvent: Anthropic.Messages.RawContentBlockStartEvent = {
            type: 'content_block_start',
            index: this.contentIndex++,
            content_block: {
              type: 'tool_use',
              id: toolCall.id!,
              name: toolCall.function?.name || '',
              input: {}
            }
          }
          events.push(this.formatSSE('content_block_start', toolBlockStartEvent))
          this.toolCallBuffer.set(idx, '')
        }
        
        // 累积并发送工具参数的增量
        // OpenAI 可能分多个 chunk 发送 JSON 参数
        if (toolCall.function?.arguments) {
          this.toolCallBuffer.set(idx, this.toolCallBuffer.get(idx)! + toolCall.function.arguments)
          const toolDeltaEvent: Anthropic.Messages.RawContentBlockDeltaEvent = {
            type: 'content_block_delta',
            index: this.contentIndex - 1,
            delta: { type: 'input_json_delta', partial_json: toolCall.function.arguments }
          }
          events.push(this.formatSSE('content_block_delta', toolDeltaEvent))
        }
      }
    }
    
    // 处理响应结束
    if (chunk.choices[0]?.finish_reason) {
      // 停止当前 content block
      if (this.contentIndex > 0) {
        const blockStopEvent: Anthropic.Messages.RawContentBlockStopEvent = {
          type: 'content_block_stop',
          index: this.contentIndex - 1
        }
        events.push(this.formatSSE('content_block_stop', blockStopEvent))
      }
      
      // 发送 message_delta，包含停止原因和最终 token 统计
      const messageDeltaEvent: Anthropic.Messages.RawMessageDeltaEvent = {
        type: 'message_delta',
        delta: { 
          stop_reason: convertOpenAIFinishReason(chunk.choices[0].finish_reason),
          stop_sequence: null
        },
        usage: convertOpenAIUsage(chunk.usage, { input: false })
      }
      events.push(this.formatSSE('message_delta', messageDeltaEvent))
      
      // 消息结束事件
      const messageStopEvent: Anthropic.Messages.RawMessageStopEvent = {
        type: 'message_stop'
      }
      events.push(this.formatSSE('message_stop', messageStopEvent))
      
      // 重置所有状态，为下一条消息做准备
      this.messageStarted = false
      this.contentIndex = 0
      this.toolCallBuffer.clear()
    }
    
    return events.join('')
  }

  /**
   * 格式化 SSE 事件
   * SSE 格式：event: 事件名\ndata: JSON数据\n\n
   */
  private formatSSE(event: string, data: Anthropic.Messages.RawMessageStreamEvent): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  }
}

export default OpenAIConverter