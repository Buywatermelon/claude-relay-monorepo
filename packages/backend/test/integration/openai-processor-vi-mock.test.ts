import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIProcessor } from '../../src/services/proxy/transformers/openai-processor'
import * as fixtures from './fixtures/claude-requests'
import type { Anthropic } from '@anthropic-ai/sdk'
import { OpenAI } from 'openai'

// Mock OpenAI module
vi.mock('openai', () => {
  const OpenAIMock = vi.fn().mockImplementation(function(this: any, config: any) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL
    
    this.chat = {
      completions: {
        create: vi.fn()
      }
    }
  })
  
  return { OpenAI: OpenAIMock }
})

describe('OpenAIProcessor Integration Tests with vi.mock', () => {
  let processor: OpenAIProcessor
  let mockCreate: ReturnType<typeof vi.fn>
  
  beforeEach(() => {
    vi.clearAllMocks()
    processor = new OpenAIProcessor('test-api-key', 'https://api.openai.com')
    // Get the mock instance
    const OpenAIMockInstance = (OpenAI as any).mock.results[0].value
    mockCreate = OpenAIMockInstance.chat.completions.create
  })
  
  describe('Synchronous Requests', () => {
    it('should process simple text request', async () => {
      const mockResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-11-20',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a test response.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockResponse)
      
      const response = await processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      // Verify OpenAI was called correctly
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-2024-11-20',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello, how are you?'
            })
          ]),
          stream: false
        })
      )
      
      // Verify response conversion
      expect(response).toBeDefined()
      expect(response.id).toBeDefined()
      expect(response.type).toBe('message')
      expect(response.role).toBe('assistant')
      expect(response.content).toHaveLength(1)
      expect(response.content[0]).toMatchObject({
        type: 'text',
        text: 'This is a test response.'
      })
      expect(response.model).toBe('claude-3-5-haiku-20241022')
      expect(response.usage).toBeDefined()
      expect(response.usage.input_tokens).toBe(10)
      expect(response.usage.output_tokens).toBe(20)
    })
    
    it('should handle system prompts correctly', async () => {
      const mockResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-system',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-11-20',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Paris is the capital of France.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockResponse)
      
      const response = await processor.process(
        fixtures.systemPromptRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      // Verify system message was added
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are a helpful assistant.'
            }),
            expect.objectContaining({
              role: 'user',
              content: 'What is the capital of France?'
            })
          ])
        })
      )
      
      expect(response.content[0]).toMatchObject({
        type: 'text',
        text: 'Paris is the capital of France.'
      })
    })
    
    it('should convert tool calls properly', async () => {
      const mockResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-tool',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-11-20',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_abc123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'San Francisco' })
              }
            }]
          },
          finish_reason: 'tool_calls'
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 30,
          total_tokens: 50
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockResponse)
      
      const response = await processor.process(
        fixtures.toolUseRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      // Verify tools were converted
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({
                name: 'get_weather',
                description: 'Get the current weather in a given location'
              })
            })
          ])
        })
      )
      
      // Verify tool call in response
      expect(response.content).toHaveLength(1)
      expect(response.content[0].type).toBe('tool_use')
      if (response.content[0].type === 'tool_use') {
        expect(response.content[0].name).toBe('get_weather')
        expect(response.content[0].input).toEqual({ location: 'San Francisco' })
      }
      expect(response.stop_reason).toBe('tool_use')
    })
  })
  
  describe('Streaming Requests', () => {
    it('should handle streaming responses', async () => {
      // Create mock stream
      const chunks = [
        { id: 'chunk1', object: 'chat.completion.chunk', created: Date.now(), model: 'gpt-4o-2024-11-20',
          choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] },
        { id: 'chunk2', object: 'chat.completion.chunk', created: Date.now(), model: 'gpt-4o-2024-11-20',
          choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] },
        { id: 'chunk3', object: 'chat.completion.chunk', created: Date.now(), model: 'gpt-4o-2024-11-20',
          choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }] },
        { id: 'chunk4', object: 'chat.completion.chunk', created: Date.now(), model: 'gpt-4o-2024-11-20',
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }
      ]
      
      // Create async generator
      async function* mockStream() {
        for (const chunk of chunks) {
          yield chunk
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockStream())
      
      const stream = await processor.process(
        fixtures.streamRequest,
        'gpt-4o-2024-11-20'
      ) as AsyncGenerator<string>
      
      // Verify stream was requested
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true
        })
      )
      
      // Collect stream chunks
      const collectedChunks: string[] = []
      for await (const chunk of stream) {
        collectedChunks.push(chunk)
      }
      
      // Verify stream output format (Claude SSE format)
      expect(collectedChunks.length).toBeGreaterThan(0)
      
      // Verify the stream contains expected event types
      const fullStream = collectedChunks.join('')
      expect(fullStream).toContain('event: message_start')
      expect(fullStream).toContain('event: content_block_start')
      expect(fullStream).toContain('event: content_block_delta')
      expect(fullStream).toContain('event: message_stop')
      
      // Verify content was streamed
      expect(fullStream).toContain('Hello')
      expect(fullStream).toContain('world')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('Internal Server Error')
      mockCreate.mockRejectedValueOnce(error)
      
      await expect(processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      )).rejects.toThrow('Internal Server Error')
    })
    
    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      mockCreate.mockRejectedValueOnce(rateLimitError)
      
      await expect(processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      )).rejects.toThrow('Rate limit exceeded')
    })
  })
  
  describe('Complex Content', () => {
    it('should handle multi-modal content with images', async () => {
      const mockResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-image',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-11-20',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'I can see an image.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10,
          total_tokens: 110
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockResponse)
      
      const response = await processor.process(
        fixtures.complexContentRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      // Verify image was converted
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'text', text: 'Describe this image:' }),
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: expect.stringContaining('data:image/jpeg;base64,')
                  })
                })
              ])
            })
          ])
        })
      )
      
      expect(response.content[0]).toMatchObject({
        type: 'text',
        text: 'I can see an image.'
      })
    })
    
    it('should handle multi-turn conversations', async () => {
      const mockResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-multi',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-11-20',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'The population is about 2.2 million.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 15,
          total_tokens: 65
        }
      }
      
      mockCreate.mockResolvedValueOnce(mockResponse)
      
      const response = await processor.process(
        fixtures.multiTurnRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      // Verify conversation history was preserved
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Tell me about Paris.' }),
            expect.objectContaining({ role: 'assistant', content: 'Paris is the capital and largest city of France.' }),
            expect.objectContaining({ role: 'user', content: 'What is its population?' })
          ])
        })
      )
      
      expect(response.role).toBe('assistant')
      expect(response.content[0]).toMatchObject({
        type: 'text',
        text: 'The population is about 2.2 million.'
      })
    })
  })
})