import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { OpenAIProcessor } from '../../src/services/proxy/transformers/openai-processor'
import { MockOpenAIServer } from './utils/mock-server'
import * as fixtures from './fixtures/claude-requests'
import type { Anthropic } from '@anthropic-ai/sdk'

describe('OpenAIProcessor Integration Tests', () => {
  let mockServer: MockOpenAIServer
  let processor: OpenAIProcessor
  const mockBaseURL = 'https://api.openai.com'
  
  beforeAll(async () => {
    mockServer = new MockOpenAIServer({ baseURL: mockBaseURL })
    await mockServer.start()
  })
  
  afterAll(async () => {
    await mockServer.stop()
  })
  
  beforeEach(() => {
    processor = new OpenAIProcessor('test-api-key', mockBaseURL)
    mockServer.reset()
  })
  
  describe('Synchronous Requests', () => {
    it('should process simple text request', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.id).toBeDefined()
      expect(response.type).toBe('message')
      expect(response.role).toBe('assistant')
      expect(response.content).toBeDefined()
      expect(response.content[0]).toHaveProperty('type', 'text')
      expect(response.model).toBe('claude-3-5-haiku-20241022')
      expect(response.usage).toBeDefined()
    })
    
    it('should handle system prompts correctly', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.systemPromptRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.content[0]).toHaveProperty('text')
    })
    
    it('should convert tool calls properly', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.toolUseRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.content).toBeInstanceOf(Array)
      expect(response.content.length).toBeGreaterThan(0)
      
      const toolUseContent = response.content.find(c => c.type === 'tool_use')
      if (toolUseContent && toolUseContent.type === 'tool_use') {
        expect(toolUseContent.name).toBe('get_weather')
        expect(toolUseContent.input).toEqual({ location: 'San Francisco' })
      }
      
      expect(response.stop_reason).toBe('tool_use')
    })
    
    it('should preserve temperature and top_p settings', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.temperatureRequest,
        'gpt-4o-mini-2024-07-18'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
    })
  })
  
  describe('Streaming Requests', () => {
    it('should handle streaming responses', async () => {
      mockServer.setScenario('stream')
      
      const stream = await processor.process(
        fixtures.streamRequest,
        'gpt-4o-2024-11-20'
      ) as AsyncGenerator<string>
      
      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      
      expect(chunks.length).toBeGreaterThan(0)
      
      // Parse first chunk to verify structure
      const firstChunk = JSON.parse(chunks[0].replace('data: ', ''))
      expect(firstChunk.type).toBe('message_start')
      expect(firstChunk.message).toBeDefined()
      
      // Find content chunks
      const contentChunks = chunks.filter(c => c.includes('content_block_delta'))
      expect(contentChunks.length).toBeGreaterThan(0)
      
      // Verify final chunk
      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk).toContain('message_stop')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockServer.setScenario('error')
      
      await expect(processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      )).rejects.toThrow()
    })
    
    it('should handle rate limit errors', async () => {
      mockServer.setScenario('rate_limit')
      
      await expect(processor.process(
        fixtures.simpleTextRequest,
        'gpt-4o-2024-11-20'
      )).rejects.toThrow()
    })
  })
  
  describe('Complex Content', () => {
    it('should handle multi-modal content with images', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.complexContentRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(response.content[0]).toHaveProperty('type', 'text')
    })
    
    it('should handle multi-turn conversations', async () => {
      mockServer.setScenario('success')
      
      const response = await processor.process(
        fixtures.multiTurnRequest,
        'gpt-4o-2024-11-20'
      ) as Anthropic.Messages.Message
      
      expect(response).toBeDefined()
      expect(response.content).toBeDefined()
      expect(response.role).toBe('assistant')
    })
  })
  
  describe('Model Mapping', () => {
    const modelMappings = [
      { openai: 'gpt-4o-2024-11-20', expected: 'gpt-4o-2024-11-20' },
      { openai: 'gpt-4o-mini-2024-07-18', expected: 'gpt-4o-mini-2024-07-18' },
      { openai: 'gpt-4-turbo-2024-04-09', expected: 'gpt-4-turbo-2024-04-09' },
      { openai: 'o1-preview-2024-09-12', expected: 'o1-preview-2024-09-12' },
      { openai: 'o1-mini-2024-09-12', expected: 'o1-mini-2024-09-12' }
    ]
    
    modelMappings.forEach(({ openai, expected }) => {
      it(`should correctly use model ${openai}`, async () => {
        mockServer.setScenario('success')
        
        const response = await processor.process(
          fixtures.simpleTextRequest,
          openai
        ) as Anthropic.Messages.Message
        
        expect(response).toBeDefined()
        expect(response.model).toBe('claude-3-5-haiku-20241022')
      })
    })
  })
})