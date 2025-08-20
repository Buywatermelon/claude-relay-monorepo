/**
 * Claude 官方 API Engine
 */

import type { Engine } from './types'
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { ClaudeToken } from '../../../types/proxy'
import { HTTPException } from 'hono/http-exception'
import { TokenExpiredError } from '../../../utils/errors'

export class ClaudeEngine implements Engine {
  constructor(private workspaceId: string) {}
  
  async processRequest(request: MessageCreateParamsBase): Promise<Response> {
    // 1. 获取 token
    const token = await this.getValidToken()
    if (!token) {
      throw new TokenExpiredError('No valid Claude token available')
    }
    
    // 2. 转发请求
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
      },
      body: JSON.stringify(request)
    })
    
    // 3. 处理响应
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Claude API error: ${response.status}`, errorText)
      
      // 将Claude API错误转换为HTTPException
      throw new HTTPException(response.status as any, { 
        message: `Claude API error: ${errorText}` 
      })
    }
    
    // 4. 返回响应（支持流式和非流式）
    const contentType = response.headers.get('Content-Type')
    const isStream = contentType?.includes('text/event-stream')
    
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        ...(isStream && {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        })
      }
    })
  }
  
  private async getValidToken(): Promise<ClaudeToken | null> {
    // 获取所有Claude 账号
    const accountIdsData = await this.kv.get('claude_account_ids')
    if (!accountIdsData) return null
    
    const accountIds: string[] = JSON.parse(accountIdsData)
    
    // 找到第一个有效的 token
    for (const accountId of accountIds) {
      const tokenData = await this.kv.get(`claude_account_token:${accountId}`)
      if (!tokenData) continue
      
      const token: ClaudeToken = JSON.parse(tokenData)
      
      // 检查token 是否过期
      if (Date.now() > token.expires_at) {
        console.log(`Claude account ${accountId} token expired`)
        continue
      }
      
      console.log(`Using Claude account ${accountId} token`)
      return token
    }
    
    return null
  }
  
}
