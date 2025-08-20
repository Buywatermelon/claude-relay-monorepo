import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import app from '../../src/index'
import { getSupabaseAdmin } from '../../src/lib/supabase'

// 测试数据
const testUser = {
  email: 'test-provider@example.com',
  password: 'TestPassword123!'
}

const testWorkspace = {
  name: 'Test Provider Workspace',
  description: 'Workspace for provider testing'
}

let authToken: string
let workspaceId: string
let providerId: string

describe('Provider API', () => {
  const supabase = getSupabaseAdmin()
  
  beforeAll(async () => {
    // 创建测试用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    })
    
    if (authError) throw authError
    authToken = authData.session!.access_token
    
    // 创建测试工作空间
    const createResponse = await app.fetch(
      new Request('http://localhost/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(testWorkspace)
      })
    )
    
    const workspaceData = await createResponse.json()
    workspaceId = workspaceData.data.id
  })

  afterAll(async () => {
    // 清理测试数据
    if (workspaceId) {
      await supabase.from('workspaces').delete().eq('id', workspaceId)
    }
    
    // 删除测试用户
    const { data: { user } } = await supabase.auth.getUser(authToken)
    if (user) {
      await supabase.auth.admin.deleteUser(user.id)
    }
  })

  test('创建供应商', async () => {
    const providerData = {
      name: 'OpenAI Test',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1',
      config: {
        auth_method: 'api_key'
      },
      models: ['gpt-4', 'gpt-3.5-turbo'],
      description: '测试 OpenAI 供应商',
      icon: 'openai'
    }

    const response = await app.fetch(
      new Request('http://localhost/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Workspace-Slug': workspaceId
        },
        body: JSON.stringify(providerData)
      })
    )

    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result.data).toMatchObject({
      name: providerData.name,
      type: providerData.type,
      endpoint: providerData.endpoint
    })
    
    providerId = result.data.id
  })

  test('获取供应商列表', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/providers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Workspace-Slug': workspaceId
        }
      })
    )

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
  })

  test('获取单个供应商', async () => {
    const response = await app.fetch(
      new Request(`http://localhost/api/providers/${providerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Workspace-Slug': workspaceId
        }
      })
    )

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.data.id).toBe(providerId)
  })

  test('更新供应商', async () => {
    const updateData = {
      name: 'OpenAI Updated',
      models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-vision-preview']
    }

    const response = await app.fetch(
      new Request(`http://localhost/api/providers/${providerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Workspace-Slug': workspaceId
        },
        body: JSON.stringify(updateData)
      })
    )

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.data.name).toBe(updateData.name)
    expect(result.data.models).toEqual(updateData.models)
  })

  test('删除供应商', async () => {
    const response = await app.fetch(
      new Request(`http://localhost/api/providers/${providerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Workspace-Slug': workspaceId
        }
      })
    )

    expect(response.status).toBe(200)
  })

  test('成员权限限制 - 不能创建供应商', async () => {
    // TODO: 创建一个 member 角色的用户来测试权限
    // 当前测试用户是 workspace owner，需要额外的逻辑来测试 member 权限
  })
})