# 金豆芽实验室 - Cloudflare + Supabase 部署指南

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [前置准备](#前置准备)
4. [Supabase 配置](#supabase-配置)
5. [Cloudflare Pages 部署](#cloudflare-pages-部署)
6. [环境变量配置](#环境变量配置)
7. [大模型 API 配置](#大模型-api-配置)
8. [搜索 API 配置](#搜索-api-配置)
9. [验证部署](#验证部署)
10. [常见问题](#常见问题)

---

## 项目概述

金豆芽实验室是一个基于 AI 的 A 股模拟交易平台，包含：

- AI 模型排行榜
- 金豆看盘（AI 大盘走势预判）
- 金豆研报（AI 股票分析研报）
- 金豆财讯（AI 财经资讯）
- 管理后台（密码保护，访问密码：zt1998）

---

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **数据库**: Supabase (PostgreSQL)
- **部署平台**: Cloudflare Pages
- **大模型 API**: 豆包 / DeepSeek / OpenAI (兼容 OpenAI SDK)
- **搜索 API**: Tavily / SerpAPI

---

## 前置准备

在开始部署前，请确保您已拥有：

1. [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
2. [Supabase 账户](https://supabase.com/dashboard)
3. GitHub/GitLab 仓库（用于代码托管）
4. 至少一个大模型 API 密钥（推荐豆包或 DeepSeek）
5. 搜索 API 密钥（可选，推荐 Tavily）

---

## Supabase 配置

### 1. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **New Project**
3. 填写项目信息：
   - Name: `jindou-lab`（或您喜欢的名称）
   - Database Password: 强密码（请妥善保存）
   - Region: 选择离您最近的区域（推荐新加坡或东京）
4. 点击 **Create new project**，等待 1-2 分钟

### 2. 创建数据库表

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 创建模型表
CREATE TABLE IF NOT EXISTS models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(50),
    strategy_type VARCHAR(50) NOT NULL,
    initial_cash NUMERIC(15, 2) DEFAULT 1000000.00,
    cash NUMERIC(15, 2) DEFAULT 1000000.00,
    total_value NUMERIC(15, 2) DEFAULT 1000000.00,
    return_percent NUMERIC(10, 4) DEFAULT 0.00,
    win_rate NUMERIC(10, 4) DEFAULT 0.00,
    total_trades INTEGER DEFAULT 0,
    last_thought TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建持仓表
CREATE TABLE IF NOT EXISTS positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    shares INTEGER NOT NULL DEFAULT 0,
    avg_price NUMERIC(15, 2) NOT NULL,
    current_price NUMERIC(15, 2) NOT NULL,
    unrealized_pnl NUMERIC(15, 2) DEFAULT 0,
    unrealized_pnl_percent NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL,
    shares INTEGER NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    pnl NUMERIC(15, 2) DEFAULT 0,
    pnl_percent NUMERIC(10, 4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建净值历史表
CREATE TABLE IF NOT EXISTS nav_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    date VARCHAR(20) NOT NULL,
    nav NUMERIC(15, 2) NOT NULL,
    return_percent NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建股票池表
CREATE TABLE IF NOT EXISTS stock_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    change NUMERIC(15, 2) DEFAULT 0,
    change_percent NUMERIC(10, 4) DEFAULT 0,
    open NUMERIC(15, 2),
    high NUMERIC(15, 2),
    low NUMERIC(15, 2),
    volume BIGINT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建游戏状态表
CREATE TABLE IF NOT EXISTS game_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    current_day INTEGER DEFAULT 1,
    current_session VARCHAR(10) DEFAULT '09:30',
    is_running BOOLEAN DEFAULT false,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建持仓时间表
CREATE TABLE IF NOT EXISTS held_since (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_positions_model_id ON positions(model_id);
CREATE INDEX IF NOT EXISTS idx_trades_model_id ON trades(model_id);
CREATE INDEX IF NOT EXISTS idx_nav_history_model_id ON nav_history(model_id);
CREATE INDEX IF NOT EXISTS idx_stock_pool_symbol ON stock_pool(symbol);
CREATE INDEX IF NOT EXISTS idx_held_since_symbol ON held_since(symbol);

-- 启用 Row Level Security (RLS)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_since ENABLE ROW LEVEL SECURITY;

-- 创建策略（允许服务角色完全访问）
CREATE POLICY "Service role can do anything" ON models
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON positions
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON trades
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON nav_history
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON stock_pool
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON game_state
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON held_since
    FOR ALL USING (true) WITH CHECK (true);
```

### 3. 初始化数据

在 Supabase SQL Editor 中继续执行：

```sql
-- 插入初始模型
INSERT INTO models (id, name, description, avatar, strategy_type, initial_cash, cash, total_value) VALUES
('model-1', 'DeepValue AI', '价值投资策略，寻找被低估的股票', '🤖', 'value', 1000000.00, 1000000.00, 1000000.00),
('model-2', 'Momentum Pro', '动量交易策略，追涨杀跌', '🚀', 'momentum', 1000000.00, 1000000.00, 1000000.00),
('model-3', 'QuantSage', '量化分析，多因子模型', '📊', 'quant', 1000000.00, 1000000.00, 1000000.00),
('model-4', 'RiskMaster', '风险控制优先，稳健增长', '🛡️', 'risk', 1000000.00, 1000000.00, 1000000.00);

-- 插入初始游戏状态
INSERT INTO game_state (start_date, current_day, current_session) VALUES
(CURRENT_DATE, 1, '09:30');

-- 插入初始股票（85只股票池）
INSERT INTO stock_pool (symbol, name, price, open, high, low, volume) VALUES
('301196', '唯科科技', 45.80, 45.00, 46.80, 44.50, 2000000),
('688143', '长盈通', 68.50, 67.50, 69.80, 66.80, 1500000),
('300666', '江丰电子', 85.20, 84.00, 87.00, 83.00, 3000000),
('688019', '安集科技', 225.00, 220.00, 230.00, 218.00, 800000),
('688325', '赛微微电', 128.00, 125.00, 130.00, 124.00, 1200000),
('688582', '芯动联科', 98.60, 96.00, 100.00, 95.00, 1000000),
('688347', '华虹公司', 52.30, 51.00, 54.00, 50.00, 2500000),
('688521', '芯原股份', 78.90, 77.00, 80.00, 76.00, 1800000),
('002049', '紫光国微', 156.00, 152.00, 160.00, 150.00, 1500000),
('300672', '国科微', 112.50, 110.00, 115.00, 108.00, 1200000),
('603019', '中科曙光', 58.00, 56.00, 60.00, 55.00, 3000000),
('603228', '景旺电子', 35.60, 34.50, 37.00, 34.00, 2500000),
('002916', '深南电路', 96.80, 94.00, 100.00, 92.00, 1500000),
('603083', '剑桥科技', 42.30, 41.00, 44.00, 40.00, 2800000),
('300913', '兆龙互连', 38.50, 37.00, 40.00, 36.00, 2000000),
('688313', '仕佳光子', 25.80, 25.00, 27.00, 24.50, 2200000),
('300757', '罗博特科', 68.00, 66.00, 70.00, 65.00, 1500000),
('688498', '源杰科技', 185.00, 180.00, 190.00, 178.00, 800000),
('301308', '江波龙', 78.00, 76.00, 80.00, 75.00, 1800000),
('688596', '正帆科技', 45.00, 43.50, 46.50, 43.00, 2000000),
('688401', '路维光电', 56.00, 54.00, 58.00, 53.00, 1500000),
('300476', '胜宏科技', 28.50, 27.50, 29.50, 27.00, 3000000),
('002463', '沪电股份', 32.80, 31.80, 34.00, 31.00, 2800000),
('688662', '富信科技', 48.00, 46.50, 49.50, 46.00, 1800000),
('301519', '长芯博创', 62.00, 60.00, 64.00, 59.00, 1600000),
('601869', '长飞光纤', 42.00, 40.80, 43.50, 40.00, 2500000),
('300570', '太辰光', 38.00, 37.00, 39.50, 36.50, 2000000),
('002156', '通富微电', 22.50, 21.80, 23.50, 21.50, 3500000),
('002281', '光迅科技', 35.00, 34.00, 36.50, 33.50, 2200000),
('688608', '恒玄科技', 168.00, 165.00, 172.00, 163.00, 800000),
('688629', '华丰科技', 28.00, 27.20, 29.00, 26.80, 2500000),
('603236', '移远通信', 125.00, 122.00, 128.00, 120.00, 1200000),
('300236', '上海新阳', 45.00, 43.80, 46.50, 43.00, 1800000),
('688183', '生益电子', 18.00, 17.50, 18.80, 17.20, 3000000),
('600183', '生益科技', 22.00, 21.40, 23.00, 21.00, 2800000),
('688008', '澜起科技', 85.00, 83.00, 87.50, 82.00, 1500000),
('688391', '海博思创', 58.00, 56.50, 59.80, 56.00, 1600000),
('001333', '广合科技', 42.00, 41.00, 43.50, 40.50, 1800000),
('688048', '长光华芯', 128.00, 125.00, 132.00, 123.00, 1000000),
('688981', '中芯国际', 52.00, 50.50, 53.80, 50.00, 3000000),
('688256', '寒武纪', 185.00, 180.00, 190.00, 178.00, 1200000),
('002371', '北方华创', 285.00, 280.00, 292.00, 278.00, 1500000),
('601138', '工业富联', 28.00, 27.30, 28.80, 27.00, 5000000),
('300308', '中际旭创', 128.00, 125.00, 132.00, 123.00, 2000000),
('300502', '新易盛', 95.00, 92.50, 98.00, 91.50, 1800000),
('002396', '锐捷网络', 82.00, 80.00, 84.50, 79.00, 1500000),
('688072', '拓荆科技', 325.00, 320.00, 332.00, 318.00, 600000),
('600602', '云赛智联', 15.00, 14.60, 15.50, 14.40, 4000000),
('600863', '华能蒙电', 8.50, 8.20, 8.80, 8.10, 3500000),
('600011', '华能国际', 7.80, 7.50, 8.10, 7.40, 5000000),
('301031', '中熔电气', 85.00, 82.50, 87.50, 81.50, 1200000),
('601985', '中国核电', 7.50, 7.30, 7.80, 7.20, 6000000),
('600875', '东方电气', 18.00, 17.50, 18.60, 17.20, 3000000),
('300153', '科泰电源', 22.00, 21.40, 22.80, 21.20, 2500000),
('300068', '南都电源', 18.00, 17.50, 18.70, 17.30, 3000000),
('300274', '阳光电源', 95.00, 92.50, 98.00, 91.50, 2500000),
('300499', '高澜股份', 12.00, 11.70, 12.40, 11.50, 2000000),
('002925', '明阳电气', 28.00, 27.30, 28.80, 27.00, 2500000),
('002837', '英维克', 42.00, 41.00, 43.50, 40.50, 1800000),
('300750', '宁德时代', 185.00, 180.00, 192.00, 178.00, 3000000),
('002364', '中恒电气', 12.00, 11.70, 12.40, 11.50, 2000000),
('300990', '同飞股份', 68.00, 66.00, 70.50, 65.50, 1200000),
('300748', '金力永磁', 45.00, 43.80, 46.50, 43.20, 2000000),
('001267', '汇绿生态', 8.50, 8.20, 8.80, 8.10, 2500000),
('000066', '中国长城', 12.00, 11.70, 12.40, 11.50, 3000000),
('300953', '震裕科技', 85.00, 82.50, 87.50, 81.50, 1200000),
('300812', '富特科技', 45.00, 43.80, 46.50, 43.20, 1500000),
('000880', '潍柴重机', 15.00, 14.60, 15.50, 14.40, 2000000),
('000539', '联合动力', 6.80, 6.60, 7.10, 6.50, 3000000),
('300820', '欧陆通', 58.00, 56.50, 60.00, 55.80, 1500000),
('300866', '安克创新', 85.00, 82.50, 87.50, 81.50, 1800000),
('300992', '千里科技', 42.00, 41.00, 43.50, 40.50, 1600000),
('688065', '凯赛生物', 95.00, 92.50, 98.00, 91.50, 1200000),
('002179', '中航光电', 68.00, 66.00, 70.50, 65.50, 2000000),
('300394', '天孚通信', 78.00, 76.00, 80.50, 75.50, 1800000),
('603986', '兆易创新', 125.00, 122.00, 128.50, 121.00, 1500000),
('002409', '雅克科技', 85.00, 82.50, 87.50, 81.50, 1600000),
('300475', '香农芯创', 45.00, 43.80, 46.50, 43.20, 2000000),
('688676', '金盘科技', 42.00, 41.00, 43.50, 40.50, 1800000),
('002851', '麦格米特', 52.00, 50.50, 54.00, 50.00, 1600000),
('002192', '融捷股份', 85.00, 82.50, 87.50, 81.50, 1500000),
('002902', '铭普光磁', 32.00, 31.00, 33.20, 30.50, 2000000),
('000722', '湖南发展', 12.00, 11.70, 12.40, 11.50, 2500000),
('000720', '新能泰山', 8.50, 8.20, 8.80, 8.10, 2800000),
('002222', '福晶科技', 48.00, 46.50, 49.50, 46.00, 1800000);
```

### 4. 获取 Supabase 连接信息

1. 在 Supabase 项目中，点击左侧菜单的 **Settings** → **API**
2. 复制以下信息：
   - `Project URL`（项目 URL）
   - `anon public` API Key（匿名密钥）
   - `service_role` API Key（服务角色密钥）

---

## Cloudflare Pages 部署

### 1. 准备代码仓库

确保您的代码已推送到 GitHub/GitLab 仓库。

### 2. 创建 Cloudflare Pages 项目

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 **Workers & Pages** → **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**
5. 选择您的 GitHub/GitLab 仓库
6. 点击 **Begin setup**

### 3. 配置构建设置

在 **Build settings** 中配置：

- **Project name**: `jindou-lab`（或您喜欢的名称）
- **Production branch**: `main`（或 `master`）
- **Framework preset**: 选择 `Next.js`
- **Build command**: `npm run build`
- **Build output directory**: 留空（Next.js 会自动检测）

### 4. 配置环境变量

在 **Environment variables** 中添加以下变量（后面会详细说明）：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-pro-32k
TAVILY_API_KEY=your_tavily_api_key
DEFAULT_LLM_PROVIDER=doubao
CRON_SECRET=your_random_secret_string
```

### 5. 部署

点击 **Save and Deploy**，等待 3-5 分钟完成部署。

---

## 环境变量配置

### Supabase 环境变量

```env
# Supabase 项目 URL（从 Settings → API 获取）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase 匿名密钥（从 Settings → API 获取）
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx

# Supabase 服务角色密钥（从 Settings → API 获取）
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 大模型 API 环境变量（选择一个即可）

#### 选项 1：豆包（推荐）

```env
# 豆包 API 密钥（从火山引擎控制台获取）
DOUBAO_API_KEY=your_doubao_api_key

# 豆包 API 地址
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# 模型名称（接入点ID）
DOUBAO_MODEL=your_endpoint_id

# 默认使用豆包
DEFAULT_LLM_PROVIDER=doubao
```

#### 选项 2：DeepSeek

```env
# DeepSeek API 密钥
DEEPSEEK_API_KEY=your_deepseek_api_key

# DeepSeek API 地址
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 模型名称
DEEPSEEK_MODEL=deepseek-chat

# 默认使用 DeepSeek
DEFAULT_LLM_PROVIDER=deepseek
```

#### 选项 3：OpenAI

```env
# OpenAI API 密钥
OPENAI_API_KEY=your_openai_api_key

# 模型名称
OPENAI_MODEL=gpt-4-turbo

# 默认使用 OpenAI
DEFAULT_LLM_PROVIDER=openai
```

### 搜索 API 环境变量（可选）

#### 选项 1：Tavily（推荐）

```env
# Tavily API 密钥（从 https://tavily.com 获取）
TAVILY_API_KEY=your_tavily_api_key
```

#### 选项 2：SerpAPI

```env
# SerpAPI 密钥（从 https://serpapi.com 获取）
SERPAPI_KEY=your_serpapi_key
```

### 其他环境变量

```env
# Cron Secret（用于保护定时任务API，随机生成的密钥字符串）
CRON_SECRET=your_random_secret_string
```

---

## 大模型 API 配置

### 豆包 API 配置（推荐）

1. 访问 [火山引擎控制台](https://console.volcengine.com)
2. 注册/登录账号
3. 进入 **机器学习平台** → **方舟**
4. 创建 API Key
5. 在 **模型推理** 中创建接入点，选择 `doubao-pro-32k` 模型
6. 获取接入点 ID 作为 `DOUBAO_MODEL` 环境变量

### DeepSeek API 配置

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 注册/登录账号
3. 在 **API Keys** 中创建新的 API Key

### OpenAI API 配置

1. 访问 [OpenAI Platform](https://platform.openai.com)
2. 注册/登录账号
3. 在 **API keys** 中创建新的 Secret Key

---

## 搜索 API 配置

### Tavily 配置（推荐）

1. 访问 [Tavily](https://tavily.com)
2. 注册账号
3. 获取 API Key
4. 免费版每天有搜索次数限制

### SerpAPI 配置

1. 访问 [SerpAPI](https://serpapi.com)
2. 注册账号
3. 获取 API Key
4. 免费版每月有 100 次搜索限制

---

## 验证部署

### 1. 访问网站

部署完成后，Cloudflare Pages 会提供一个访问地址，如：
`https://jindou-lab.pages.dev`

### 2. 测试功能

- **首页导航**：测试排行榜、金豆看盘、金豆研报、金豆财讯
- **管理后台**：访问 `/admin/login`，使用密码 `zt1998` 登录
- **股票池管理**：在管理后台测试添加、删除、搜索股票
- **触发交易**：在管理后台测试手工触发 AI 决策交易
- **重置功能**：在管理后台测试重置模拟交易

### 3. 检查日志

在 Cloudflare Pages 中：
1. 进入您的项目
2. 点击 **Functions** → **Logs**
3. 查看实时日志和错误信息

---

## 常见问题

### Q: 构建失败怎么办？

A: 检查以下几点：
1. Node.js 版本是否为 18.x 或更高
2. 所有依赖是否正确安装
3. 环境变量是否正确配置
4. 查看构建日志中的错误信息

### Q: API 调用失败怎么办？

A: 检查以下几点：
1. API Key 是否正确配置
2. API 提供商是否有余额或额度
3. 网络连接是否正常（可能需要配置代理）
4. 查看 Functions 日志中的错误信息

### Q: 数据库连接失败怎么办？

A: 检查以下几点：
1. Supabase URL 是否正确
2. Service Role Key 是否正确
3. Supabase 项目是否正常运行
4. 数据库表是否正确创建

### Q: 如何自定义域名？

A: 在 Cloudflare Pages 中：
1. 进入项目设置
2. 点击 **Custom domains**
3. 添加您的域名
4. 按照提示配置 DNS 记录

### Q: 如何配置自动部署？

A: Cloudflare Pages 默认会在您推送到 Git 仓库时自动部署。您可以在项目设置中配置：
- 部署分支
- 预览部署
- 生产部署

### Q: 管理后台访问密码是什么？

A: 管理后台的访问密码是：`zt1998`。您可以在 `/admin/login` 页面使用该密码登录。

---

## 技术支持

如有问题，请：
1. 查看本文档的常见问题部分
2. 检查 Cloudflare Pages 日志
3. 检查 Supabase 日志
4. 确认所有 API 密钥和配置正确

---

**祝您部署顺利！** 🎉
