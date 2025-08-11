# 从 CLI 到 Web：Claude Code OAuth 认证的演进之路

## 引言：一个关于"拼车"的故事

项目源于一个朴素的想法：想和小伙伴"拼车"使用 Claude Code。
200刀的max订阅着实不便宜，我一个人也没有这么大的用量，拼车即能合理的分摊成本，又能和好友共享这个目前（我认为）最强大的 AI 编程工具。

但是，要实现需求，首要解决的一个核心问题：**Claude Code 是如何与 Anthropic 的 API 进行安全认证的？**

具体来说，我们需要弄清楚两个关键问题：
- Claude Code 客户端如何对用户账号进行认证？
- 认证成功后，如何向 API 发起请求？

只有深入理解了 Claude Code 的认证机制，我们才能构建一个安全可靠的 API 网关，在保护用户隐私的前提下实现"拼车"共享。

这篇文章将带你从 Claude Code CLI 的原生认证流程开始，一步步了解 OAuth 2.0 + PKCE 的实现细节，并展示如何将这套机制迁移到 Web 环境中。

## CLI 认证流程：跟着操作学 OAuth

### 步骤一：启动认证命令
```bash
$ claude auth login
```
**这里发生了什么？**
- [ ] OAuth 2.0 授权码模式介绍
- [ ] 为什么不直接用 API Key？
- [ ] Claude 选择 OAuth 的原因

### 步骤二：选择或添加账号
```
? Select an account:
  > Personal Account
    Work Account
    + Add new account
```
**多账号管理的设计思路**
- [ ] CLI 本地存储结构
- [ ] 账号隔离和切换机制
- [ ] 配置文件的组织方式

### 步骤三：生成授权链接
```
Opening browser to complete authentication...
Please visit: https://claude.ai/oauth/authorize?client_id=...&code_challenge=...
```
**PKCE 安全机制详解**
- [ ] 什么是 PKCE？为什么需要它？
- [ ] code_verifier 和 code_challenge 的生成过程
- [ ] State 参数的作用（防 CSRF）

### 步骤四：用户浏览器授权
```
Browser opened successfully.
Waiting for authorization...
```
**浏览器中发生了什么？**
- [ ] 授权页面的构成
- [ ] 用户同意授权后的跳转
- [ ] 授权码的返回机制

### 步骤五：获取授权码
```
Please enter the authorization code from your browser: 
> [用户粘贴授权码]
```
**从回调页面到 CLI**
- [ ] 回调页面的设计
- [ ] 用户手动复制授权码的交互
- [ ] 授权码的有效期和安全性

### 步骤六：交换访问令牌
```
✓ Successfully authenticated!
Tokens saved to ~/.claude/config.json
```
**Token 交换的技术细节**
- [ ] 授权码换取 access_token 的请求构造
- [ ] PKCE 验证过程
- [ ] refresh_token 的获取和作用

### 步骤七：令牌存储和使用
```json
{
  "accounts": {
    "personal": {
      "access_token": "sk-...",
      "refresh_token": "rt-...",
      "expires_at": "2024-01-01T00:00:00Z"
    }
  }
}
```
**本地令牌管理**
- [ ] 令牌的安全存储
- [ ] 自动刷新机制
- [ ] 过期处理和重新认证