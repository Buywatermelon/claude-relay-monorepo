import type { OpenAI } from 'openai'

export const simpleTextResponse: OpenAI.Chat.ChatCompletion = {
  id: 'chatcmpl-abc123',
  object: 'chat.completion',
  created: 1234567890,
  model: 'gpt-4o-2024-11-20',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content: 'I am doing well, thank you for asking!'
    },
    finish_reason: 'stop'
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 15,
    total_tokens: 25
  }
}

export const toolCallResponse: OpenAI.Chat.ChatCompletion = {
  id: 'chatcmpl-tool123',
  object: 'chat.completion',
  created: 1234567890,
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
          arguments: JSON.stringify({
            location: 'San Francisco, CA'
          })
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

export const errorResponse = {
  error: {
    message: 'The model `invalid-model` does not exist',
    type: 'invalid_request_error',
    param: 'model',
    code: 'model_not_found'
  }
}

export const rateLimitResponse = {
  error: {
    message: 'Rate limit reached for gpt-4',
    type: 'rate_limit_error',
    param: null,
    code: 'rate_limit_exceeded'
  }
}

export const streamChunks: OpenAI.Chat.ChatCompletionChunk[] = [
  {
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1234567890,
    model: 'gpt-4o-2024-11-20',
    choices: [{
      index: 0,
      delta: { role: 'assistant', content: '' },
      finish_reason: null
    }]
  },
  {
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1234567890,
    model: 'gpt-4o-2024-11-20',
    choices: [{
      index: 0,
      delta: { content: 'Once ' },
      finish_reason: null
    }]
  },
  {
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1234567890,
    model: 'gpt-4o-2024-11-20',
    choices: [{
      index: 0,
      delta: { content: 'upon ' },
      finish_reason: null
    }]
  },
  {
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1234567890,
    model: 'gpt-4o-2024-11-20',
    choices: [{
      index: 0,
      delta: { content: 'a time.' },
      finish_reason: null
    }]
  },
  {
    id: 'chatcmpl-stream',
    object: 'chat.completion.chunk',
    created: 1234567890,
    model: 'gpt-4o-2024-11-20',
    choices: [{
      index: 0,
      delta: {},
      finish_reason: 'stop'
    }]
  }
]