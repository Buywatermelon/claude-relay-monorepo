/**
 * 准备权限测试所需的用户
 * 创建 owner、admin、member 三个测试用户
 */

const API_BASE = 'http://localhost:8787';

const TEST_USERS = [
  { email: 'owner@example.com', password: 'password123' },
  { email: 'admin@example.com', password: 'password123' },
  { email: 'member@example.com', password: 'password123' }
];

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
  
  return { response, data };
}

async function createTestUsers() {
  console.log('=== 创建测试用户 ===\n');
  
  for (const user of TEST_USERS) {
    console.log(`创建用户: ${user.email}`);
    const { response, data } = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    
    if (response.ok) {
      console.log(`✓ ${user.email} 创建成功`);
    } else {
      console.log(`✗ ${user.email} 创建失败:`, data.error || data.message);
    }
  }
  
  console.log('\n测试用户准备完成！');
}

createTestUsers();