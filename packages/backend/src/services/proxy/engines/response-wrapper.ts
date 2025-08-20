/**
 * 响应包装器
 * 负责将转换器的输出包装为标准的 HTTP Response
 */

import type { Message } from '@anthropic-ai/sdk/resources/messages'

export class ResponseWrapper {
  /**
   * 包装转换器的输出为 HTTP Response
   */
  static wrap(result: Message | AsyncGenerator<string>): Response {
    // 检查是否为 AsyncGenerator（流式响应）
    if (this.isAsyncGenerator(result)) {
      // 将 AsyncGenerator 转换为 ReadableStream
      const stream = this.createReadableStream(result)
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    } else {
      // 普通响应
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    }
  }
  
  /**
   * 检查是否为 AsyncGenerator
   */
  private static isAsyncGenerator(obj: any): obj is AsyncGenerator<string> {
    return obj && typeof obj[Symbol.asyncIterator] === 'function'
  }
  
  /**
   * 将 AsyncGenerator 转换为 ReadableStream
   */
  private static createReadableStream(generator: AsyncGenerator<string>): ReadableStream {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      }
    })
  }
}