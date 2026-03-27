-- ==========================================
-- 金豆芽实验室 - Supabase 数据库完整设置脚本
-- ==========================================

-- 1. 创建所有数据库表
-- ==========================================

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

-- 2. 创建索引
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_positions_model_id ON positions(model_id);
CREATE INDEX IF NOT EXISTS idx_trades_model_id ON trades(model_id);
CREATE INDEX IF NOT EXISTS idx_nav_history_model_id ON nav_history(model_id);
CREATE INDEX IF NOT EXISTS idx_stock_pool_symbol ON stock_pool(symbol);
CREATE INDEX IF NOT EXISTS idx_held_since_symbol ON held_since(symbol);

-- 3. 启用 Row Level Security (RLS)
-- ==========================================

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_since ENABLE ROW LEVEL SECURITY;

-- 4. 创建RLS策略（允许服务角色完全访问）
-- ==========================================

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

-- ==========================================
-- 数据库表创建完成！
-- 接下来请执行初始化数据脚本
-- ==========================================

