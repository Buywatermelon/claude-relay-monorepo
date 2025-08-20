/**
 * OpenAIConverter 单元测试
 * 测试 Claude API 到 OpenAI API 的转换逻辑
 */

import { describe, test, expect, beforeEach } from 'vitest'
import OpenAIConverter from '../../../../../src/services/proxy/transformers/openai-converter'
import { Anthropic } from '@anthropic-ai/sdk'
import { OpenAI } from 'openai'

describe('OpenAIConverter', () => {
  let converter: OpenAIConverter

  beforeEach(() => {
    converter = new OpenAIConverter()
  })

  describe('请求转换 (request)', () => {
    describe('基础消息转换', () => {
      test('应正确转换纯文本消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'user', content: 'Hello, how are you?' }
          ],
          max_tokens: 1000
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.model).toBe('gpt-4')
        expect(openAIRequest.messages).toHaveLength(1)
        expect(openAIRequest.messages[0]).toEqual({
          role: 'user',
          content: 'Hello, how are you?'
        })
        expect(openAIRequest.max_completion_tokens).toBe(1000)
      })

      test('应正确处理系统消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          system: 'You are a helpful assistant.',
          messages: [
            { role: 'user', content: 'What is 2+2?' }
          ],
          max_tokens: 100
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.messages).toHaveLength(2)
        expect(openAIRequest.messages[0]).toEqual({
          role: 'system',
          content: 'You are a helpful assistant.'
        })
        expect(openAIRequest.messages[1]).toEqual({
          role: 'user',
          content: 'What is 2+2?'
        })
      })

      test('应正确转换包含图片的消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What is in this image?' },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: 'base64data...'
                  }
                }
              ]
            }
          ],
          max_tokens: 200
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4-vision-preview')

        expect(openAIRequest.messages[0]).toEqual({
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,base64data...'
              }
            }
          ]
        })
      })

      test('应正确转换助手消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there! How can I help you today?' }
          ],
          max_tokens: 100
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.messages).toHaveLength(2)
        expect(openAIRequest.messages[1]).toEqual({
          role: 'assistant',
          content: 'Hi there! How can I help you today?'
        })
      })
    })

    describe('工具调用转换', () => {
      test('应正确转换工具定义', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'user', content: 'What is the weather in Tokyo?' }
          ],
          max_tokens: 100,
          tools: [
            {
              name: 'get_weather',
              description: 'Get the current weather in a location',
              input_schema: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                  unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
                },
                required: ['location']
              }
            }
          ]
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.tools).toHaveLength(1)
        expect(openAIRequest.tools![0]).toEqual({
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the current weather in a location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
                unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
              },
              required: ['location']
            }
          }
        })
      })

      test('应正确转换工具使用消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'user', content: 'What is the weather in Tokyo?' },
            {
              role: 'assistant',
              content: [
                { type: 'text', text: 'I\'ll check the weather for you.' },
                {
                  type: 'tool_use',
                  id: 'tool_123',
                  name: 'get_weather',
                  input: { location: 'Tokyo', unit: 'celsius' }
                }
              ]
            }
          ],
          max_tokens: 100
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.messages).toHaveLength(2)
        const assistantMsg = openAIRequest.messages[1] as OpenAI.Chat.ChatCompletionAssistantMessageParam
        expect(assistantMsg.role).toBe('assistant')
        expect(assistantMsg.content).toBe('I\'ll check the weather for you.')
        expect(assistantMsg.tool_calls).toHaveLength(1)
        expect(assistantMsg.tool_calls![0]).toEqual({
          id: 'tool_123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: JSON.stringify({ location: 'Tokyo', unit: 'celsius' })
          }
        })
      })

      test('应正确转换工具结果消息', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'user', content: 'What is the weather?' },
            {
              role: 'assistant',
              content: [
                {
                  type: 'tool_use',
                  id: 'tool_123',
                  name: 'get_weather',
                  input: { location: 'Tokyo' }
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: 'tool_123',
                  content: 'The weather in Tokyo is 25°C and sunny.'
                }
              ]
            }
          ],
          max_tokens: 100
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.messages).toHaveLength(3)
        const toolMsg = openAIRequest.messages[2] as OpenAI.Chat.ChatCompletionToolMessageParam
        expect(toolMsg.role).toBe('tool')
        expect(toolMsg.tool_call_id).toBe('tool_123')
        expect(toolMsg.content).toBe('The weather in Tokyo is 25°C and sunny.')
      })
    })

    describe('参数映射', () => {
      test('应正确映射所有参数', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          stop_sequences: ['END', 'STOP'],
          stream: true
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.model).toBe('gpt-4')
        expect(openAIRequest.max_completion_tokens).toBe(500)
        expect(openAIRequest.temperature).toBe(0.7)
        expect(openAIRequest.top_p).toBe(0.9)
        expect(openAIRequest.stop).toEqual(['END', 'STOP'])
        expect(openAIRequest.stream).toBe(true)
      })

      test('应处理 tool_choice 参数', () => {
        const claudeRequest: Anthropic.Messages.MessageCreateParams = {
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Use the tool' }],
          max_tokens: 100,
          tool_choice: { type: 'tool', name: 'get_weather' }
        }

        const openAIRequest = converter.request(claudeRequest, 'gpt-4')

        expect(openAIRequest.tool_choice).toEqual({
          type: 'function',
          function: { name: 'get_weather' }
        })
      })
    })
  })

  describe('响应转换 (response)', () => {
    test('应正确转换纯文本响应', () => {
      const openAIResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I can help you with that.',
              refusal: null
            },
            finish_reason: 'stop',
            logprobs: null
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }

      const mockRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
        max_tokens: 100
      }
      const claudeResponse = converter.response(openAIResponse, mockRequest)

      expect(claudeResponse.id).toBe('msg_chatcmpl-123')
      expect(claudeResponse.type).toBe('message')
      expect(claudeResponse.role).toBe('assistant')
      expect(claudeResponse.content).toHaveLength(1)
      expect(claudeResponse.content[0]).toEqual({
        type: 'text',
        text: 'Hello! I can help you with that.',
        citations: null
      })
      expect(claudeResponse.stop_reason).toBe('end_turn')
      expect(claudeResponse.usage).toEqual({
        input_tokens: 10,
        output_tokens: 20,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        server_tool_use: null,
        service_tier: null
      })
    })

    test('应正确转换工具调用响应', () => {
      const openAIResponse: OpenAI.Chat.ChatCompletion = {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Let me check the weather for you.',
              refusal: null,
              tool_calls: [
                {
                  id: 'call_789',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"Tokyo","unit":"celsius"}'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls',
            logprobs: null
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40
        }
      }

      const mockRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
        max_tokens: 100
      }
      const claudeResponse = converter.response(openAIResponse, mockRequest)

      expect(claudeResponse.content).toHaveLength(2)
      expect(claudeResponse.content[0]).toEqual({
        type: 'text',
        text: 'Let me check the weather for you.',
        citations: null
      })
      expect(claudeResponse.content[1]).toEqual({
        type: 'tool_use',
        id: 'call_789',
        name: 'get_weather',
        input: { location: 'Tokyo', unit: 'celsius' }
      })
      expect(claudeResponse.stop_reason).toBe('tool_use')
    })

    test('应正确映射 finish_reason', () => {
      const testCases = [
        { openai: 'stop', claude: 'end_turn' },
        { openai: 'length', claude: 'max_tokens' },
        { openai: 'tool_calls', claude: 'tool_use' },
        { openai: 'content_filter', claude: 'stop_sequence' }
      ]

      for (const { openai, claude } of testCases) {
        const openAIResponse: OpenAI.Chat.ChatCompletion = {
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'test', refusal: null },
              finish_reason: openai as any,
              logprobs: null
            }
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        }

        const mockRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
        max_tokens: 100
      }
      const claudeResponse = converter.response(openAIResponse, mockRequest)
        expect(claudeResponse.stop_reason).toBe(claude)
      }
    })
  })

  describe('流式响应转换 (stream)', () => {
    test('应正确转换流式文本块', async () => {
      const openAIChunk: OpenAI.Chat.ChatCompletionChunk = {
        id: 'stream-123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {
              content: 'Hello, '
            },
            finish_reason: null
          }
        ]
      }

      // 创建一个异步可迭代对象
      async function* createChunks() {
        yield openAIChunk
      }

      // 收集流式响应
      const events: string[] = []
      for await (const event of converter.stream(createChunks())) {
        events.push(event)
      }

      // 第一个块应包含 message_start 和 content_block_start
      const allEvents = events.join('\n')
      expect(allEvents).toContain('event: message_start')
      expect(allEvents).toContain('"type":"message"')
      expect(allEvents).toContain('event: content_block_start')
      expect(allEvents).toContain('event: content_block_delta')
      expect(allEvents).toContain('"text":"Hello, "')
    })

    test('应正确处理流式工具调用', async () => {
      // 第一个块：工具调用开始
      const chunk1: OpenAI.Chat.ChatCompletionChunk = {
        id: 'stream-456',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: ''
                  }
                }
              ]
            },
            finish_reason: null
          }
        ]
      }

      async function* createChunks1() {
        yield chunk1
      }
      const events1: string[] = []
      for await (const event of converter.stream(createChunks1())) {
        events1.push(event)
      }
      const allEvents1 = events1.join('\n')
      expect(allEvents1).toContain('event: content_block_start')
      expect(allEvents1).toContain('"type":"tool_use"')
      expect(allEvents1).toContain('"name":"get_weather"')

      // 第二个块：工具参数
      const chunk2: OpenAI.Chat.ChatCompletionChunk = {
        id: 'stream-456',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: {
                    arguments: '{"location":'
                  }
                }
              ]
            },
            finish_reason: null
          }
        ]
      }

      async function* createChunks2() {
        yield chunk2
      }
      const events2: string[] = []
      for await (const event of converter.stream(createChunks2())) {
        events2.push(event)
      }
      const allEvents2 = events2.join('\n')
      expect(allEvents2).toContain('event: content_block_delta')
      expect(allEvents2).toContain('"partial_json":"{\\"location\\":')
    })

    test('应正确处理流式结束', async () => {
      // 先发送一些内容
      const chunk1: OpenAI.Chat.ChatCompletionChunk = {
        id: 'stream-end',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: { content: 'Final text' },
            finish_reason: null
          }
        ]
      }

      // 先发送一些内容
      async function* createInitChunks() {
        yield chunk1
      }
      for await (const event of converter.stream(createInitChunks())) {
        // 只是执行以初始化状态
      }

      // 发送结束块
      const chunk2: OpenAI.Chat.ChatCompletionChunk = {
        id: 'stream-end',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }
        ]
      }

      async function* createEndChunks() {
        yield chunk2
      }
      const events: string[] = []
      for await (const event of converter.stream(createEndChunks())) {
        events.push(event)
      }
      const allEvents = events.join('\n')
      expect(allEvents).toContain('event: content_block_stop')
      expect(allEvents).toContain('event: message_delta')
      expect(allEvents).toContain('"stop_reason":"end_turn"')
      expect(allEvents).toContain('event: message_stop')
    })

    test('应处理混合内容流（文本+工具）', async () => {
      // 文本内容
      const chunk1: OpenAI.Chat.ChatCompletionChunk = {
        id: 'mixed',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: { content: 'Let me help you. ' },
            finish_reason: null
          }
        ]
      }

      // 工具调用
      const chunk2: OpenAI.Chat.ChatCompletionChunk = {
        id: 'mixed',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_mixed',
                  type: 'function',
                  function: {
                    name: 'search',
                    arguments: '{"query":"test"}'
                  }
                }
              ]
            },
            finish_reason: null
          }
        ]
      }

      // 创建一个包含两个 chunks 的流
      async function* createMixedChunks() {
        yield chunk1
        yield chunk2
      }

      const events: string[] = []
      for await (const event of converter.stream(createMixedChunks())) {
        events.push(event)
      }
      
      const allEvents = events.join('\n')
      
      // 第一个块是文本
      expect(allEvents).toContain('event: content_block_start')
      expect(allEvents).toContain('"index":0')
      expect(allEvents).toContain('"type":"text"')
      
      // 应该先停止文本块，再开始工具块
      expect(allEvents).toContain('event: content_block_stop')
      
      // 第二个块是工具
      expect(allEvents).toContain('"index":1')
      expect(allEvents).toContain('"type":"tool_use"')
    })
  })

  describe('边界情况处理', () => {
    test('应处理空消息列表', () => {
      const claudeRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
        max_tokens: 100
      }

      const openAIRequest = converter.request(claudeRequest, 'gpt-4')
      expect(openAIRequest.messages).toHaveLength(0)
    })

    test('应处理复杂的多模态消息', () => {
      const claudeRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze these:' },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'image1data'
                }
              },
              { type: 'text', text: 'And also this:' },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: 'pdfdata'
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }

      const openAIRequest = converter.request(claudeRequest, 'gpt-4-vision')

      const content = openAIRequest.messages[0].content as any[]
      expect(content).toHaveLength(4)
      expect(content[0].type).toBe('text')
      expect(content[1].type).toBe('image_url')
      expect(content[2].type).toBe('text')
      expect(content[3].type).toBe('text')  // PDF 转换为文本描述
      expect(content[3].text).toContain('[Document: application/pdf]')
    })

    test('应处理格式错误的工具参数', () => {
      const openAIResponse: OpenAI.Chat.ChatCompletion = {
        id: 'error-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              refusal: null,
              tool_calls: [
                {
                  id: 'call_bad',
                  type: 'function',
                  function: {
                    name: 'bad_tool',
                    arguments: 'not-valid-json'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls',
            logprobs: null
          }
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      }

      const mockRequest: Anthropic.Messages.MessageCreateParams = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
        max_tokens: 100
      }
      const claudeResponse = converter.response(openAIResponse, mockRequest)
      
      // 应该优雅地处理，将无效 JSON 作为字符串
      expect(claudeResponse.content).toHaveLength(1)
      expect(claudeResponse.content[0].type).toBe('tool_use')
      expect((claudeResponse.content[0] as any).input).toBe('not-valid-json')
    })
  })
})