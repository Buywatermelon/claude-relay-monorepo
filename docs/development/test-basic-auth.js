/**
 * 基础认证和工作空间测试
 * 测试用户注册、登录和基本的工作空间操作
 */

const API_BASE = 'http://localhost:8787';

// 生成随机邮箱避免冲突
const randomId = Date.now();
const testUser = {
  email: `test${randomId}@example.com`,
  password: 'Test123456!',
  token: null
};

// HTTP 请求辅助函数
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  console.log(`\n→ ${options.method || 'GET'} ${path}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  
  console.log(`← Status: ${response.status}`);
  if (data) {
    console.log('← Response:', JSON.stringify(data, null, 2));
  }
  
  return { response, data };
}

// 测试流程
async function runTests() {
  console.log('=== 基础功能测试 ===');
  console.log('API 地址:', API_BASE);
  console.log('测试用户:', testUser.email);
  
  try {
    // 1. 健康检查
    console.log('\n--- 1. 健康检查 ---');
    const { response: healthResponse } = await request('/health');
    console.log(healthResponse.ok ? '✓ 服务正常' : '✗ 服务异常');
    
    // 2. 用户注册
    console.log('\n--- 2. 用户注册 ---');
    const { response: registerResponse, data: registerData } = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (registerResponse.ok) {
      console.log('✓ 注册成功');
      // 注册后需要登录获取 token
    } else {
      console.log('✗ 注册失败');
      return;
    }
    
    // 2.5 用户登录
    console.log('\n--- 2.5 用户登录 ---');
    const { response: loginResponse, data: loginData } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (loginResponse.ok && loginData.session?.access_token) {
      console.log('✓ 登录成功');
      testUser.token = loginData.session.access_token;
    } else {
      console.log('✗ 登录失败');
      return;
    }
    
    // 3. 获取会话信息
    console.log('\n--- 3. 获取会话信息 ---');
    const { response: sessionResponse } = await request('/auth/session', {
      headers: {
        'Authorization': `Bearer ${testUser.token}`
      }
    });
    console.log(sessionResponse.ok ? '✓ 会话有效' : '✗ 会话无效');
    
    // 4. 创建工作空间
    console.log('\n--- 4. 创建工作空间 ---');
    const { response: createWsResponse, data: workspace } = await request('/workspaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`
      },
      body: JSON.stringify({
        name: `测试工作空间 ${randomId}`,
        description: '这是一个测试工作空间'
      })
    });
    
    if (createWsResponse.ok) {
      console.log('✓ 工作空间创建成功');
      console.log(`  ID: ${workspace.id}`);
      console.log(`  Slug: ${workspace.slug}`);
      console.log(`  加入码: ${workspace.join_code}`);
    } else {
      console.log('✗ 创建失败');
      return;
    }
    
    // 5. 获取我的工作空间列表
    console.log('\n--- 5. 获取我的工作空间列表 ---');
    const { response: listResponse, data: workspaces } = await request('/workspaces/mine', {
      headers: {
        'Authorization': `Bearer ${testUser.token}`
      }
    });
    
    if (listResponse.ok) {
      console.log(`✓ 获取成功，共 ${workspaces.length} 个工作空间`);
      workspaces.forEach(ws => {
        console.log(`  - ${ws.name} (${ws.role})`);
      });
    }
    
    // 6. 测试成员 API（需要工作空间上下文）
    console.log('\n--- 6. 测试成员 API ---');
    const { response: membersResponse } = await request('/api/members', {
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'X-Workspace-Slug': workspace.slug
      }
    });
    
    if (membersResponse.ok) {
      console.log('✓ 成员 API 访问成功');
    } else {
      console.log('✗ 成员 API 访问失败');
    }
    
    // 7. 测试权限拒绝（删除工作空间，作为 member 应该失败）
    console.log('\n--- 7. 测试权限系统 ---');
    
    // 作为 owner 应该可以删除
    const { response: deleteResponse } = await request(`/workspaces/${workspace.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testUser.token}`
      }
    });
    
    if (deleteResponse.ok) {
      console.log('✓ Owner 成功删除工作空间');
    } else {
      console.log('✗ 删除失败');
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('\n测试出错:', error.message);
    console.error(error.stack);
  }
}

// 执行测试
runTests();