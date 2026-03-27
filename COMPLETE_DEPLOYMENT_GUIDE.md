# 🚀 AI Trading Arena - 完整部署指南（Vercel + Supabase）

## 📋 目录
1. [准备工作](#1-准备工作)
2. [Supabase数据库设置](#2-supabase数据库设置)
3. [大模型API申请](#3-大模型api申请)
4. [项目配置](#4-项目配置)
5. [部署到Vercel](#5-部署到vercel)
6. [初始化和测试](#6-初始化和测试)
7. [定时任务设置](#7-定时任务设置)

---

## 1. 准备工作

### 1.1 需要的账号
- ✅ GitHub 账号（用于代码托管）
- ✅ Supabase 账号（免费数据库）
- ✅ Vercel 账号（免费托管）
- ✅ 至少一个大模型API账号（豆包或DeepSeek）

### 1.2 项目文件结构
```
project/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/route.ts       # 定时任务API
│   │   │   ├── init/route.ts       # 数据库初始化API
│   │   │   ├── market/route.ts     # 市场数据API
│   │   │   └── trade/route.ts      # 交易执行API
│   │   ├── model/[modelId]/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── aiDecisionGatewayReal.ts  # 真实大模型接入
│   │   ├── marketData.ts             # A股数据获取
│   │   ├── supabase.ts               # Supabase连接
│   │   ├── tradeEngine.ts
│   │   ├── data.ts
│   │   └── utils.ts
│   └── types/
├── .env.example
├── vercel.json
└── package.json
```

---

## 2. Supabase数据库设置

### 2.1 创建Supabase项目
1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 **"Start your project"**
3. 使用GitHub账号登录
4. 点击 **"New Project"**
5. 填写项目信息：
   - Name: `ai-trading-arena`
   - Database Password: 设置一个强密码（请保存好！）
   - Region: 选择离你最近的区域（推荐 `Singapore` 或 `Tokyo`）
6. 点击 **"Create new project"**
7. 等待2-3分钟，项目创建完成

### 2.2 获取连接信息
项目创建后，进入项目设置：
1. 左侧菜单点击 **"Project Settings" → "API"**
2. 复制以下信息保存：
   - `Project URL`（如：`https://xxxxx.supabase.co`）
   - `anon public`（以`eyJ...`开头的长字符串）
   - `service_role secret`（以`eyJ...`开头的另一个长字符串）

### 2.3 创建数据库表
在Supabase项目中：
1. 左侧菜单点击 **"SQL Editor"**
2. 点击 **"New query"**
3. 复制以下SQL并执行：

```sql
-- 游戏状态表
CREATE TABLE IF NOT EXISTS game_state (
  id SERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 1,
  current_session VARCHAR(10) NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI模型表
CREATE TABLE IF NOT EXISTS models (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar VARCHAR(10),
  strategy_type VARCHAR(20) NOT NULL,
  initial_cash DECIMAL(15,2) NOT NULL,
  cash DECIMAL(15,2) NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  return_percent DECIMAL(10,4) NOT NULL,
  win_rate DECIMAL(10,4),
  total_trades INTEGER DEFAULT 0,
  last_thought TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 持仓表
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  shares INTEGER NOT NULL,
  avg_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS trades (
  id VARCHAR(100) PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL,
  shares INTEGER NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  pnl DECIMAL(15,2),
  pnl_percent DECIMAL(10,4),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- NAV历史表
CREATE TABLE IF NOT EXISTS nav_history (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id) ON DELETE CASCADE,
  date VARCHAR(20) NOT NULL,
  nav DECIMAL(15,4) NOT NULL,
  return_percent DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 持仓时间记录表（用于T+1规则）
CREATE TABLE IF NOT EXISTS held_since (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 创建索引以提高查询速度
CREATE INDEX IF NOT EXISTS idx_positions_model_id ON positions(model_id);
CREATE INDEX IF NOT EXISTS idx_trades_model_id ON trades(model_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nav_history_model_id ON nav_history(model_id);
```

4. 点击 **"Run"** 执行SQL
5. 确认所有表创建成功（左侧菜单 **"Table Editor"** 查看）

### 2.4 启用Row Level Security（可选但推荐）
为了安全，我们需要禁用RLS（因为我们使用service key）：
1. 在Table Editor中，对每个表点击右侧的 **"..."**
2. 选择 **"Disable RLS"**
3. 对所有6个表都执行此操作

---

## 3. 大模型API申请

### 3.1 豆包API（推荐，国内速度快）
1. 访问 [火山引擎](https://www.volcengine.com/product/ark)
2. 注册/登录账号
3. 进入 **"控制台" → "方舟"**
4. 创建接入点：
   - 点击 **"创建接入点"**
   - 模型选择：`Doubao-pro-32k` 或 `Doubao-lite-32k`
   - 接入点名称：自定义，如 `ai-trading`
5. 创建后保存：
   - **接入点ID**（如：`ep-202412052xxxxxx`）
6. 获取API Key：
   - 点击右上角账号 → **"API密钥管理"**
   - 创建新的API Key并保存

### 3.2 DeepSeek API（备用）
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com)
2. 注册/登录账号
3. 进入 **"API Keys"**
4. 点击 **"Create"** 创建API Key
5. 保存生成的API Key

---

## 4. 项目配置

### 4.1 准备代码
1. 将项目代码推送到GitHub仓库
2. 确保所有文件都已提交

### 4.2 配置环境变量
在本地项目根目录创建 `.env.local` 文件（不要提交到git）：

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_public_key
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_secret

# 豆包API
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=你的接入点ID

# DeepSeek API (如果使用)
DEEPSEEK_API_KEY=你的DeepSeek密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Cron Secret (随机生成一个长字符串)
CRON_SECRET=生成一个随机的32位字符串
```

**生成CRON_SECRET的方法：**
在终端运行：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. 部署到Vercel

### 5.1 导入项目
1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 **"Add New..." → "Project"**
3. 选择你的GitHub仓库
4. 点击 **"Import"**

### 5.2 配置项目
在配置页面：
1. **Project Name**: `ai-trading-arena`
2. **Framework Preset**: 自动检测为 `Next.js`
3. **Root Directory**: 保持默认
4. **Environment Variables**：
   点击 **"Add"**，将 `.env.local` 中的所有变量逐个添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `DOUBAO_API_KEY`
   - `DOUBAO_BASE_URL`
   - `DOUBAO_MODEL`
   - `CRON_SECRET`

### 5.3 部署
1. 点击 **"Deploy"**
2. 等待1-3分钟，部署完成
3. 部署成功后，你会获得一个URL，如：`https://ai-trading-arena.vercel.app`

---

## 6. 初始化和测试

### 6.1 初始化数据库
部署完成后，我们需要初始化数据库：

**方法一：使用curl（推荐）**
在终端运行（替换为你的域名）：
```bash
curl -X POST https://你的域名.vercel.app/api/init
```

**方法二：使用Postman或浏览器插件**
发送POST请求到 `https://你的域名.vercel.app/api/init`

**成功响应：**
```json
{
  "success": true,
  "message": "数据库初始化成功"
}

### 6.2 验证数据
在Supabase中检查：
1. **"Table Editor" → "models"** - 应该有4条记录
2. **"Table Editor" → "game_state"** - 应该有1条记录
3. **"Table Editor" → "nav_history"** - 应该有4条记录

### 6.3 测试前端
1. 访问你的Vercel域名
2. 应该能看到：
   - 8只A股股票行情
   - 4个AI模型
   - 收益曲线图
3. 点击 **"下一步"** 按钮测试手动交易
4. 点击任意模型卡片进入详情页

### 6.4 测试API
测试市场数据API：
```bash
curl https://你的域名.vercel.app/api/market
```

---

## 7. 定时任务设置

### 7.1 Vercel Cron Jobs（需要Pro计划）

如果你有Vercel Pro计划：

1. **确认vercel.json已配置**（项目根目录应该已有）：
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "30 1 * * 1-5"
    },
    {
      "path": "/api/cron",
      "schedule": "30 2 * * 1-5"
    },
    {
      "path": "/api/cron",
      "schedule": "30 3 * * 1-5"
    },
    {
      "path": "/api/cron",
      "schedule": "0 5 * * 1-5"
    },
    {
      "path": "/api/cron",
      "schedule": "0 6 * * 1-5"
    },
    {
      "path": "/api/cron",
      "schedule": "30 6 * * 1-5"
    }
  ]
}
```

注意：Cron表达式使用UTC时间！
- 北京时间 09:30 = UTC 01:30
- 北京时间 10:30 = UTC 02:30
- 北京时间 11:30 = UTC 03:30
- 北京时间 13:00 = UTC 05:00
- 北京时间 14:00 = UTC 06:00
- 北京时间 14:30 = UTC 06:30

2. **重新部署**
   推送代码到GitHub，Vercel会自动重新部署

3. **查看Cron Job状态**
   - Vercel项目页面 → **"Settings" → "Cron Jobs"**
   - 可以看到所有定时任务

### 7.2 GitHub Actions（免费方案）

如果使用免费方案，我们用GitHub Actions：

在项目中创建 `.github/workflows/trade.yml`：

```yaml
name: AI Trading Bot

on:
  schedule:
    - cron: '30 1 * * 1-5'   # 09:30 北京时间
    - cron: '30 2 * * 1-5'   # 10:30
    - cron: '30 3 * * 1-5'   # 11:30
    - cron: '0 5 * * 1-5'    # 13:00
    - cron: '0 6 * * 1-5'    # 14:00
    - cron: '30 6 * * 1-5'    # 14:30
  workflow_dispatch:  # 允许手动触发

jobs:
  trade:
    runs-on: ubuntu-latest
    steps:
      - name: 触发交易
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://你的域名.vercel.app/api/cron
```

然后：
1. 在GitHub仓库 → **"Settings" → "Secrets and variables" → "Actions"**
2. 点击 **"New repository secret"**
3. Name: `CRON_SECRET`
4. Value: 你的CRON_SECRET值
5. 点击 **"Add secret"**

---

## 8. 日常运营

### 8.1 重置游戏
如果需要重新开始：

```bash
# 清空数据
curl -X DELETE https://你的域名.vercel.app/api/init

# 重新初始化
curl -X POST https://你的域名.vercel.app/api/init
```

### 8.2 查看日志
- Vercel项目 → **"Logs"** 查看运行日志
- Supabase项目 → **"Table Editor"** 查看数据变化

### 8.3 成本估算
- **Supabase**: 免费版足够（500MB存储，2GB带宽）
- **Vercel**: 免费版足够（100GB带宽）
- **大模型API**: 取决于调用量，豆包新用户有免费额度

---

## 9. 故障排查

### 问题1: 数据库初始化失败
- 检查环境变量是否正确
- 确认Supabase表已创建
- 查看Vercel日志

### 问题2: 大模型API报错
- 确认API Key有效
- 确认模型接入点ID正确
- 检查账户余额

### 问题3: 定时任务不触发
- 确认Cron表达式正确（UTC时间）
- GitHub Actions需要等待第一次触发
- 检查CRON_SECRET是否配置

---

## 🎉 恭喜！

你已经成功部署了AI Trading Arena！现在可以：
1. 观察AI模型的实时交易
2. 查看各策略的表现对比
3. 通过详情页了解每个AI的投资逻辑

有问题随时查看本文档或参考代码注释！
