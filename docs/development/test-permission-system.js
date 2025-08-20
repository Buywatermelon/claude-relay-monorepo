/**
 * 权限系统集成测试脚本
 * 测试工作空间和成员管理的权限控制
 */

const API_BASE = 'http://localhost:8787';

// 测试用户凭证（需要根据实际情况修改）
const TEST_USERS = {
  owner: {
    email: 'owner@example.com',
    password: 'password123',
    token: null,
    role: 'owner'
  },
  admin: {
    email: 'admin@example.com', 
    password: 'password123',
    token: null,
    role: 'admin'
  },
  member: {
    email: 'member@example.com',
    password: 'password123', 
    token: null,
    role: 'member'
  }
};

// 测试数据
let testWorkspaceId = null;
let testWorkspaceSlug = null;
let testMembershipId = null;

// HTTP 请求辅助函数
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  console.log(`${options.method || 'GET'} ${path} - Status: ${response.status}`);
  
  if (!response.ok) {
    console.error('Error:', data);
  }
  
  return { response, data };
}

// 1. 用户登录
async function loginUsers() {
  console.log('\n=== 1. 用户登录 ===');
  
  for (const [key, user] of Object.entries(TEST_USERS)) {
    const { data } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });
    
    if (data.session?.access_token) {
      user.token = data.session.access_token;
      console.log(`✓ ${key} 登录成功`);
    } else {
      console.log(`✗ ${key} 登录失败`);
    }
  }
}

// 2. Owner 创建工作空间
async function createWorkspace() {
  console.log('\n=== 2. Owner 创建工作空间 ===');
  
  const { data } = await request('/workspaces', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.owner.token}`
    },
    body: JSON.stringify({
      name: 'Test Workspace',
      description: '权限测试工作空间'
    })
  });
  
  if (data.id) {
    testWorkspaceId = data.id;
    testWorkspaceSlug = data.slug;
    console.log(`✓ 工作空间创建成功: ${testWorkspaceSlug}`);
  }
}

// 3. 其他用户加入工作空间
async function joinWorkspace() {
  console.log('\n=== 3. 用户加入工作空间 ===');
  
  // 获取加入码
  const { data: workspace } = await request(`/workspaces/${testWorkspaceId}`, {
    headers: {
      'Authorization': `Bearer ${TEST_USERS.owner.token}`
    }
  });
  
  const joinCode = workspace.join_code;
  console.log(`加入码: ${joinCode}`);
  
  // Admin 和 Member 申请加入
  for (const [key, user] of Object.entries(TEST_USERS)) {
    if (key === 'owner') continue;
    
    const { data } = await request('/workspaces/join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ join_code: joinCode })
    });
    
    console.log(`✓ ${key} 申请加入工作空间`);
  }
}

// 4. 测试成员管理权限
async function testMemberPermissions() {
  console.log('\n=== 4. 测试成员管理权限 ===');
  
  // 4.1 获取待审批成员列表
  console.log('\n--- 4.1 获取待审批成员 ---');
  const { data: pendingMembers } = await request('/api/members?status=pending', {
    headers: {
      'Authorization': `Bearer ${TEST_USERS.owner.token}`,
      'X-Workspace-Slug': testWorkspaceSlug
    }
  });
  
  console.log(`待审批成员数: ${pendingMembers.length}`);
  
  // 4.2 Owner 审批成员
  console.log('\n--- 4.2 Owner 审批成员 ---');
  for (const member of pendingMembers) {
    const { response } = await request(`/api/members/${member.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_USERS.owner.token}`,
        'X-Workspace-Slug': testWorkspaceSlug
      }
    });
    
    if (response.ok) {
      console.log(`✓ 审批通过: ${member.user?.email}`);
      if (member.user?.email === TEST_USERS.admin.email) {
        testMembershipId = member.id;
      }
    }
  }
  
  // 4.3 测试 Member 角色权限（应该失败）
  console.log('\n--- 4.3 测试 Member 权限限制 ---');
  
  // Member 尝试查看成员列表（应该成功）
  const { response: readResponse } = await request('/api/members', {
    headers: {
      'Authorization': `Bearer ${TEST_USERS.member.token}`,
      'X-Workspace-Slug': testWorkspaceSlug
    }
  });
  console.log(`Member 查看成员列表: ${readResponse.ok ? '✓ 成功' : '✗ 失败'}`);
  
  // Member 尝试审批（应该失败）
  const { response: approveResponse } = await request(`/api/members/${testMembershipId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.member.token}`,
      'X-Workspace-Slug': testWorkspaceSlug
    }
  });
  console.log(`Member 尝试审批: ${approveResponse.status === 403 ? '✓ 正确拒绝' : '✗ 错误'}`);
  
  // 4.4 Owner 修改成员角色
  console.log('\n--- 4.4 Owner 修改成员角色 ---');
  const { response: updateResponse } = await request(`/api/members/${testMembershipId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.owner.token}`,
      'X-Workspace-Slug': testWorkspaceSlug
    },
    body: JSON.stringify({ role: 'admin' })
  });
  console.log(`修改角色为 admin: ${updateResponse.ok ? '✓ 成功' : '✗ 失败'}`);
}

// 5. 测试工作空间删除权限
async function testWorkspaceDeletePermission() {
  console.log('\n=== 5. 测试工作空间删除权限 ===');
  
  // Admin 尝试删除（应该失败）
  const { response: adminDelete } = await request(`/workspaces/${testWorkspaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.admin.token}`
    }
  });
  console.log(`Admin 尝试删除工作空间: ${adminDelete.status === 403 ? '✓ 正确拒绝' : '✗ 错误'}`);
  
  // Member 尝试删除（应该失败）
  const { response: memberDelete } = await request(`/workspaces/${testWorkspaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.member.token}`
    }
  });
  console.log(`Member 尝试删除工作空间: ${memberDelete.status === 403 ? '✓ 正确拒绝' : '✗ 错误'}`);
  
  // Owner 删除（应该成功）
  const { response: ownerDelete } = await request(`/workspaces/${testWorkspaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TEST_USERS.owner.token}`
    }
  });
  console.log(`Owner 删除工作空间: ${ownerDelete.ok ? '✓ 成功' : '✗ 失败'}`);
}

// 运行所有测试
async function runTests() {
  console.log('=== 权限系统集成测试 ===');
  console.log('API 基础地址:', API_BASE);
  
  try {
    // 注意：需要先在数据库中创建测试用户
    console.log('\n提示：请确保已创建测试用户账号');
    console.log('- owner@example.com (password123)');
    console.log('- admin@example.com (password123)');
    console.log('- member@example.com (password123)');
    
    await loginUsers();
    await createWorkspace();
    await joinWorkspace();
    await testMemberPermissions();
    await testWorkspaceDeletePermission();
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('\n测试失败:', error);
  }
}

// 执行测试
runTests();