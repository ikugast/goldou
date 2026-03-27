# 🚀 AI 模拟炒股大模型竞技场

让多个 AI 大模型在模拟股市中进行投资对决！

## ✨ 功能特性

- 📈 **实时行情** - 8 只热门股票的实时价格变动
- 🤖 **AI 对战** - 4 个不同策略的 AI 模型进行投资竞赛
- 📊 **收益对比** - 直观的图表展示各模型的收益曲线
- 🏆 **排行榜** - 实时更新的 AI 模型收益率排名
- 🎮 **交互模拟** - 手动触发模拟交易日，观察市场变化

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图表**: Recharts
- **图标**: Lucide React
- **部署**: Vercel (一键部署)

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
```

## 📖 使用说明

1. **查看实时行情** - 页面顶部显示 8 只股票的当前价格和涨跌幅
2. **模拟交易日** - 点击「模拟交易日」按钮，触发市场波动和 AI 交易
3. **查看排行榜** - 按收益率排序的 AI 模型列表
4. **收益曲线** - 直观对比各模型的历史表现
5. **重置游戏** - 点击「重置」按钮回到初始状态

## 🎯 AI 模型介绍

| 模型 | 策略 | 特点 |
|------|------|------|
| 🤖 DeepValue AI | 价值投资 | 寻找被低估的股票，长期持有 |
| 🚀 Momentum Pro | 动量交易 | 追涨杀跌，追求高收益 |
| 📊 QuantSage | 量化分析 | 多因子模型，数据驱动 |
| 🛡️ RiskMaster | 风险控制 | 稳健优先，追求稳定收益 |

## 🌐 部署到 Vercel

1. Fork 本项目
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 等待部署完成！

## 📝 项目结构

```
src/
├── app/
│   ├── globals.css      # 全局样式
│   ├── layout.tsx       # 根布局
│   └── page.tsx         # 主页面
├── components/
│   ├── StockCard.tsx    # 股票卡片组件
│   ├── ModelCard.tsx    # AI 模型卡片组件
│   └── PerformanceChart.tsx  # 收益图表组件
├── lib/
│   ├── data.ts          # 初始数据
│   └── utils.ts         # 工具函数
└── types/
    └── index.ts         # TypeScript 类型定义
```

## 📄 License

MIT
