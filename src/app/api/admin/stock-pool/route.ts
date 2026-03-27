import { NextResponse } from 'next/server';
import { initialStocks } from '@/lib/data';
import { Stock } from '@/types';

let currentStockPool: Stock[] = [...initialStocks];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        stocks: currentStockPool,
      },
    });
  } catch (error) {
    console.error('获取股票池失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { stocks } = await request.json();

    if (!stocks || !Array.isArray(stocks)) {
      return NextResponse.json({
        success: false,
        error: '无效的股票数据',
      }, { status: 400 });
    }

    currentStockPool = stocks;

    return NextResponse.json({
      success: true,
      data: {
        stocks: currentStockPool,
      },
    });
  } catch (error) {
    console.error('更新股票池失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { action, stock } = await request.json();

    if (action === 'add') {
      if (!stock || !stock.symbol || !stock.name) {
        return NextResponse.json({
          success: false,
          error: '缺少必要的股票信息',
        }, { status: 400 });
      }

      const basePrice = stock.price || 50;
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
      const price = Math.max(basePrice + change, 1);
      const changePercent = (change / basePrice) * 100;

      const newStock: Stock = {
        symbol: stock.symbol,
        name: stock.name,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        open: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
        high: parseFloat((price * 1.02).toFixed(2)),
        low: parseFloat((price * 0.98).toFixed(2)),
        volume: Math.floor(1000000 + Math.random() * 5000000),
      };

      currentStockPool.push(newStock);

      return NextResponse.json({
        success: true,
        data: {
          stocks: currentStockPool,
        },
      });
    }

    if (action === 'remove') {
      if (!stock || !stock.symbol) {
        return NextResponse.json({
          success: false,
          error: '缺少股票代码',
        }, { status: 400 });
      }

      currentStockPool = currentStockPool.filter(s => s.symbol !== stock.symbol);

      return NextResponse.json({
        success: true,
        data: {
          stocks: currentStockPool,
        },
      });
    }

    if (action === 'reset') {
      currentStockPool = [...initialStocks];
      return NextResponse.json({
        success: true,
        data: {
          stocks: currentStockPool,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: '无效的操作',
    }, { status: 400 });
  } catch (error) {
    console.error('操作股票池失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
