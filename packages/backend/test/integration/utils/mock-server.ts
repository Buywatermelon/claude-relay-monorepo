import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { OpenAI } from 'openai'

export type MockScenario = 'success' | 'error' | 'rate_limit' | 'timeout' | 'stream'

interface MockServerOptions {
  baseURL?: string
  scenario?: MockScenario
  customResponse?: any
}

export class MockOpenAIServer {
  private server: ReturnType<typeof setupServer>
  private baseURL: string
  private scenario: MockScenario
  
  constructor(options: MockServerOptions = {}) {
    this.baseURL = options.baseURL || 'https://api.openai.com'
    this.scenario = options.scenario || 'success'
    this.server = setupServer(...this.createHandlers())
  }
  
  private createHandlers() {
    return [
      http.post(`${this.baseURL}/v1/chat/completions`, async ({ request }) => {
        const body = await request.json() as OpenAI.Chat.ChatCompletionCreateParams
        
        switch (this.scenario) {
          case 'success':
            return HttpResponse.json(this.createSuccessResponse(body))
          
          case 'stream':
            return this.createStreamResponse(body)
          
          case 'error':
            return HttpResponse.json(
              { error: { message: 'Internal Server Error', type: 'server_error', code: 500 } },
              { status: 500 }
            )
          
          case 'rate_limit':
            return HttpResponse.json(
              { error: { message: 'Rate limit exceeded', type: 'rate_limit_error', code: 429 } },
              { status: 429 }
            )
          
          case 'timeout':
            await new Promise(resolve => setTimeout(resolve, 30000))
            return HttpResponse.json({})
          
          default:
            return HttpResponse.json(this.createSuccessResponse(body))
        }
      })
    ]
  }
  
  private createSuccessResponse(request: OpenAI.Chat.ChatCompletionCreateParams): OpenAI.Chat.ChatCompletion {
    const hasTools = request.tools && request.tools.length > 0
    
    return {
      id: 'chatcmpl-test123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        message: hasTools ? {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_test123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: JSON.stringify({ location: 'San Francisco' })
            }
          }]
        } : {
          role: 'assistant',
          content: 'This is a test response from the mock OpenAI API.'
        },
        finish_reason: hasTools ? 'tool_calls' : 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    }
  }
  
  private createStreamResponse(request: OpenAI.Chat.ChatCompletionCreateParams) {
    const chunks = [
      'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
      'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"This "},"finish_reason":null}]}\n\n',
      'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"is "},"finish_reason":null}]}\n\n',
      'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"streaming."},"finish_reason":null}]}\n\n',
      'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n'
    ]
    
    return new HttpResponse(
      new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk))
            await new Promise(resolve => setTimeout(resolve, 10))
          }
          controller.close()
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    )
  }
  
  setScenario(scenario: MockScenario) {
    this.scenario = scenario
  }
  
  async start() {
    this.server.listen({ onUnhandledRequest: 'bypass' })
    // Reset handlers with current scenario
    this.server.resetHandlers(...this.createHandlers())
  }
  
  async stop() {
    this.server.close()
  }
  
  reset() {
    this.server.resetHandlers(...this.createHandlers())
  }
}