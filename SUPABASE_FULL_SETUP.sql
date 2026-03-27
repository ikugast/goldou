-- ==========================================
-- 金豆芽实验室 - Supabase 完整数据库设置
-- ==========================================
-- 使用说明：直接执行这个完整脚本即可
-- 它会先清理旧表，然后创建新表并插入数据
-- ==========================================

-- 1. 清理旧表（如果存在）
-- ==========================================

DROP TABLE IF EXISTS held_since CASCADE;
DROP TABLE IF EXISTS nav_history CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS stock_pool CASCADE;
DROP TABLE IF EXISTS game_state CASCADE;
DROP TABLE IF EXISTS models CASCADE;

-- 2. 创建所有数据库表
-- ==========================================

-- 创建模型表
CREATE TABLE models (
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
CREATE TABLE positions (
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
CREATE TABLE trades (
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
CREATE TABLE nav_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    date VARCHAR(20) NOT NULL,
    nav NUMERIC(15, 2) NOT NULL,
    return_percent NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建股票池表
CREATE TABLE stock_pool (
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
CREATE TABLE game_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,
    current_day INTEGER DEFAULT 1,
    current_session VARCHAR(10) DEFAULT '09:30',
    is_running BOOLEAN DEFAULT false,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建持仓时间表
CREATE TABLE held_since (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引
-- ==========================================

CREATE INDEX idx_positions_model_id ON positions(model_id);
CREATE INDEX idx_trades_model_id ON trades(model_id);
CREATE INDEX idx_nav_history_model_id ON nav_history(model_id);
CREATE INDEX idx_stock_pool_symbol ON stock_pool(symbol);
CREATE INDEX idx_held_since_symbol ON held_since(symbol);

-- 4. 启用 Row Level Security (RLS)
-- ==========================================

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_since ENABLE ROW LEVEL SECURITY;

-- 5. 创建RLS策略（允许服务角色完全访问）
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

-- 6. 插入初始数据
-- ==========================================

-- 插入初始模型（不指定ID，让数据库自动生成）
INSERT INTO models (name, description, avatar, strategy_type, initial_cash, cash, total_value) VALUES
('DeepValue AI', '价值投资策略，寻找被低估的股票', '🤖', 'value', 1000000.00, 1000000.00, 1000000.00),
('Momentum Pro', '动量交易策略，追涨杀跌', '🚀', 'momentum', 1000000.00, 1000000.00, 1000000.00),
('QuantSage', '量化分析，多因子模型', '📊', 'quant', 1000000.00, 1000000.00, 1000000.00),
('RiskMaster', '风险控制优先，稳健增长', '🛡️', 'risk', 1000000.00, 1000000.00, 1000000.00);

-- 插入初始净值历史（通过名称关联模型）
WITH model_ids AS (
    SELECT id, name FROM models
)
INSERT INTO nav_history (model_id, date, nav, return_percent)
SELECT id, 'Day 1', 100, 0 FROM model_ids;

-- 插入初始游戏状态
INSERT INTO game_state (start_date, current_day, current_session) VALUES
(CURRENT_DATE, 1, '09:30');

-- 插入初始股票池（85只股票）
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
('603236', '移远通信', 125.00, 122.00, 128.00, 121.00, 1200000),
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

-- ==========================================
-- 数据库设置完成！
-- ==========================================

