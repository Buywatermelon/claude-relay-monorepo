export default defineNuxtConfig({
  // 兼容性日期
  compatibilityDate: '2025-07-27',
  
  // 仅在开发模式启用devtools
  devtools: { enabled: false },  // 生产环境禁用
  
  // 精简的模块配置
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  
  // CSS 配置
  css: ['~/assets/css/main.css'],
  
  // Vite 配置优化
  vite: {
    build: {
      // 启用CSS代码分割以优化加载性能
      cssCodeSplit: true,
      // 配置chunk分割策略
      rollupOptions: {
        output: {
          manualChunks: {
            // 更细粒度的vendor分割
            'vue-vendor': ['vue', 'vue-router'],
            'pinia': ['pinia']
          }
        }
      },
      // 减少chunk大小阈值
      chunkSizeWarningLimit: 1500,
      // 压缩配置
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // 生产环境移除console
          drop_debugger: true
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia']
    }
  },
  
  // 静态部署配置 - 适配 Workers Assets
  nitro: {
    preset: 'static',  // 生成纯静态文件，不生成 _worker.js
    output: {
      dir: 'dist',
      publicDir: 'dist'
    },
    // 压缩
    compressPublicAssets: true,
    // 预渲染静态管理页面
    prerender: {
      crawlLinks: false,
      routes: [
        '/',
        '/admin',
        '/admin/add-provider',
        '/admin/add-route-config'
        // 注意：/admin/key-pool/[providerId] 是动态路由，无法预渲染
      ]
    },
    // 路由缓存规则
    routeRules: {
      // 首页预渲染，构建时生成静态HTML
      '/': { 
        prerender: true,
        headers: { 'cache-control': 's-maxage=86400' }  // CDN缓存1天
      },
      // 管理页面不缓存
      '/admin/**': { 
        headers: { 'cache-control': 'no-cache, no-store, must-revalidate' }
      },
      // 静态资源长期缓存
      '/_nuxt/**': { 
        headers: { 'cache-control': 'public, max-age=31536000, immutable' }
      },
      // 图片等资源缓存
      '/images/**': { 
        headers: { 'cache-control': 'public, max-age=86400' }
      }
    }
  },
  
  // 环境变量配置
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Claude Relay Frontend',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0'
    }
  },
  
  // Tailwind CSS 配置
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    config: {
      content: []  // 使用默认配置
    }
  },
  
  // TypeScript 配置
  typescript: {
    strict: true,
    shim: false  // 不需要shim，减少构建开销
  },
  
  // 实验性功能
  experimental: {
    payloadExtraction: false,  // 禁用payload提取，减少构建体积
    viewTransition: false      // 禁用视图过渡
  }
})