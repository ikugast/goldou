import { Stock, Model, GameState } from '@/types';

const INITIAL_CASH = 1000000;

function createStock(symbol: string, name: string, basePrice: number): Stock {
  const volatility = 0.02;
  const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
  const price = Math.max(basePrice + change, 1);
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol,
    name,
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
    high: parseFloat((price * 1.02).toFixed(2)),
    low: parseFloat((price * 0.98).toFixed(2)),
    volume: Math.floor(1000000 + Math.random() * 5000000),
  };
}

export const initialStocks: Stock[] = [
  createStock('301196', '唯科科技', 45.80),
  createStock('688143', '长盈通', 68.50),
  createStock('300666', '江丰电子', 85.20),
  createStock('688019', '安集科技', 225.00),
  createStock('688325', '赛微微电', 128.00),
  createStock('688582', '芯动联科', 98.60),
  createStock('688347', '华虹公司', 52.30),
  createStock('688521', '芯原股份', 78.90),
  createStock('002049', '紫光国微', 156.00),
  createStock('300672', '国科微', 112.50),
  createStock('603019', '中科曙光', 58.00),
  createStock('603228', '景旺电子', 35.60),
  createStock('002916', '深南电路', 96.80),
  createStock('603083', '剑桥科技', 42.30),
  createStock('300913', '兆龙互连', 38.50),
  createStock('688313', '仕佳光子', 25.80),
  createStock('300757', '罗博特科', 68.00),
  createStock('688498', '源杰科技', 185.00),
  createStock('301308', '江波龙', 78.00),
  createStock('688596', '正帆科技', 45.00),
  createStock('688401', '路维光电', 56.00),
  createStock('300476', '胜宏科技', 28.50),
  createStock('002463', '沪电股份', 32.80),
  createStock('688662', '富信科技', 48.00),
  createStock('301519', '长芯博创', 62.00),
  createStock('601869', '长飞光纤', 42.00),
  createStock('300570', '太辰光', 38.00),
  createStock('002156', '通富微电', 22.50),
  createStock('002281', '光迅科技', 35.00),
  createStock('688608', '恒玄科技', 168.00),
  createStock('688629', '华丰科技', 28.00),
  createStock('603236', '移远通信', 125.00),
  createStock('300236', '上海新阳', 45.00),
  createStock('688183', '生益电子', 18.00),
  createStock('600183', '生益科技', 22.00),
  createStock('688008', '澜起科技', 85.00),
  createStock('688391', '海博思创', 58.00),
  createStock('001333', '广合科技', 42.00),
  createStock('688048', '长光华芯', 128.00),
  createStock('688981', '中芯国际', 52.00),
  createStock('688256', '寒武纪', 185.00),
  createStock('002371', '北方华创', 285.00),
  createStock('601138', '工业富联', 28.00),
  createStock('300308', '中际旭创', 128.00),
  createStock('300502', '新易盛', 95.00),
  createStock('002396', '锐捷网络', 82.00),
  createStock('688072', '拓荆科技', 325.00),
  createStock('600602', '云赛智联', 15.00),
  createStock('600863', '华能蒙电', 8.50),
  createStock('600011', '华能国际', 7.80),
  createStock('301031', '中熔电气', 85.00),
  createStock('601985', '中国核电', 7.50),
  createStock('600875', '东方电气', 18.00),
  createStock('300153', '科泰电源', 22.00),
  createStock('300068', '南都电源', 18.00),
  createStock('300274', '阳光电源', 95.00),
  createStock('300499', '高澜股份', 12.00),
  createStock('002925', '明阳电气', 28.00),
  createStock('002837', '英维克', 42.00),
  createStock('300750', '宁德时代', 185.00),
  createStock('002364', '中恒电气', 12.00),
  createStock('300990', '同飞股份', 68.00),
  createStock('300748', '金力永磁', 45.00),
  createStock('001267', '汇绿生态', 8.50),
  createStock('000066', '中国长城', 12.00),
  createStock('300953', '震裕科技', 85.00),
  createStock('300812', '富特科技', 45.00),
  createStock('000880', '潍柴重机', 15.00),
  createStock('000539', '联合动力', 6.80),
  createStock('300820', '欧陆通', 58.00),
  createStock('300866', '安克创新', 85.00),
  createStock('300992', '千里科技', 42.00),
  createStock('688065', '凯赛生物', 95.00),
  createStock('002179', '中航光电', 68.00),
  createStock('300394', '天孚通信', 78.00),
  createStock('603986', '兆易创新', 125.00),
  createStock('002409', '雅克科技', 85.00),
  createStock('300475', '香农芯创', 45.00),
  createStock('688676', '金盘科技', 42.00),
  createStock('002851', '麦格米特', 52.00),
  createStock('002192', '融捷股份', 85.00),
  createStock('002902', '铭普光磁', 32.00),
  createStock('000722', '湖南发展', 12.00),
  createStock('000720', '新能泰山', 8.50),
  createStock('002222', '福晶科技', 48.00),
];

export const createInitialModel = (
  id: string,
  name: string,
  description: string,
  avatar: string,
  strategyType: 'value' | 'momentum' | 'quant' | 'risk'
): Model => {
  return {
    id,
    name,
    description,
    avatar,
    strategyType,
    initialCash: INITIAL_CASH,
    cash: INITIAL_CASH,
    positions: [],
    trades: [],
    totalValue: INITIAL_CASH,
    returnPercent: 0,
    navHistory: [{ date: 'Day 1', nav: 100, returnPercent: 0 }],
    winRate: 0,
    totalTrades: 0,
    lastThought: '等待市场开盘...',
    isActive: true,
  };
};

export const initialModels: Model[] = [
  createInitialModel(
    'model-1',
    'DeepValue AI',
    '价值投资策略，寻找被低估的股票',
    '🤖',
    'value'
  ),
  createInitialModel(
    'model-2',
    'Momentum Pro',
    '动量交易策略，追涨杀跌',
    '🚀',
    'momentum'
  ),
  createInitialModel(
    'model-3',
    'QuantSage',
    '量化分析，多因子模型',
    '📊',
    'quant'
  ),
  createInitialModel(
    'model-4',
    'RiskMaster',
    '风险控制优先，稳健增长',
    '🛡️',
    'risk'
  ),
];

export const initialGameState: GameState = {
  startDate: new Date().toISOString().split('T')[0],
  currentDay: 1,
  currentSession: '09:30',
  isRunning: false,
  lastUpdate: new Date(),
};

