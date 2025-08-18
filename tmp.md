# OpenAI 消息类型参考

| 消息类型 | 角色标识 | 描述 | 使用场景 |
|---------|---------|------|---------|
| **ChatCompletionDeveloperMessageParam** | `developer` | 开发者提供的指令，模型必须遵循，不受用户消息影响 | o1 模型及更新版本中替代 system 消息，具有最高优先级 |
| **ChatCompletionSystemMessageParam** | `system` | 系统级指令，设定模型行为和角色 | 在非 o1 模型中使用，定义助手的整体行为和上下文 |
| **ChatCompletionUserMessageParam** | `user` | 用户发送的消息 | 用户的问题、请求或指令 |
| **ChatCompletionAssistantMessageParam** | `assistant` | 助手的回复消息 | 模型生成的响应，或历史对话中的助手回复 |
| **ChatCompletionToolMessageParam** | `tool` | 工具调用的返回结果 | 函数/工具执行后返回给模型的结果 |

## 重要说明

- **优先级**: `developer` > `system` > `user`
- **消息顺序**: 通常为 developer/system → user → assistant → tool → assistant
- **版本兼容**: o1 模型使用 `developer`，其他模型使用 `system`

## Developer vs System 消息的区别

### 请求格式对比

**System 消息（传统模型）**:
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that speaks like Shakespeare."
    },
    {
      "role": "user",
      "content": "Tell me about the weather"
    }
  ]
}
```

**Developer 消息（o1 模型）**:
```json
{
  "model": "o1-preview",
  "messages": [
    {
      "role": "developer",
      "content": "You are a helpful assistant that speaks like Shakespeare."
    },
    {
      "role": "user",
      "content": "Tell me about the weather"
    }
  ]
}
```

### 主要区别

| 特性 | System 消息 | Developer 消息 |
|-----|------------|--------------|
| **支持的模型** | GPT-3.5, GPT-4, GPT-4 Turbo 等 | o1, o1-preview, o1-mini 等 |
| **优先级** | 高于用户消息 | 最高优先级，不可被覆盖 |
| **可修改性** | 用户可能通过提示词影响 | 用户无法通过任何方式覆盖 |
| **使用场景** | 设定助手角色和行为规范 | 强制执行开发者的安全和行为准则 |
| **安全性** | 中等 | 最高 |

### 实际应用差异

1. **System 消息**：用户可能通过巧妙的提示词绕过或修改系统指令
2. **Developer 消息**：无论用户输入什么，模型都会严格遵守开发者指令，提供更强的安全保障