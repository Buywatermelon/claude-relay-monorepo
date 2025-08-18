import type { Anthropic } from '@anthropic-ai/sdk'

export const simpleTextRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Hello, how are you?'
    }
  ]
}

export const systemPromptRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  system: 'You are a helpful assistant.',
  messages: [
    {
      role: 'user',
      content: 'What is the capital of France?'
    }
  ]
}

export const multiTurnRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Tell me about Paris.'
    },
    {
      role: 'assistant',
      content: 'Paris is the capital and largest city of France.'
    },
    {
      role: 'user',
      content: 'What is its population?'
    }
  ]
}

export const toolUseRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'What is the weather in San Francisco?'
    }
  ],
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather in a given location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          }
        },
        required: ['location']
      }
    }
  ]
}

export const streamRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  stream: true,
  messages: [
    {
      role: 'user',
      content: 'Write a short story.'
    }
  ]
}

export const complexContentRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Describe this image:'
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: 'base64_encoded_image_data'
          }
        }
      ]
    }
  ]
}

export const temperatureRequest: Anthropic.Messages.MessageCreateParams = {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  temperature: 0.8,
  top_p: 0.9,
  messages: [
    {
      role: 'user',
      content: 'Write a creative poem.'
    }
  ]
}