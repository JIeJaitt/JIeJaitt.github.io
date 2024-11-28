---
title: scikit-learn选股
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: ceaf427b
toc: true
date: 2024-10-22 12:17:21
categories:
tags:
sticky:
---


## 通过入口决定美股还是港股

### 我现在想要从通过一个参数来控制代码查的是美股还是港股，怎么设置呢

我可以帮你修改代码来支持通过参数控制查询美股或港股。主要需要做以下修改：

```python:engineering/stock_selection/main.py
# ... existing code ...

# 添加市场类型参数
def calculate_indicators(data):
    """
    计算所需的技术指标并添加到DataFrame中
    """
    # ... existing code ...

# 新增市场参数，默认为美股
def analyze_stocks(market_type='US'):
    """
    根据市场类型分析股票
    market_type: 'US' 为美股，'HK' 为港股
    """
    # 定义筛选时间范围（过去5年）
    end_date = datetime.today()
    start_date = end_date - timedelta(days=5*365)

    # 根据市场类型获取股票数据
    if market_type == 'US':
        symbols_and_powers = db.get_all_us_stock_symbols()
        quote_data = get_us_quote_data()
    elif market_type == 'HK':
        symbols_and_powers = db.get_all_hk_stock_symbols()  # 需要实现这个函数
        quote_data = get_hk_quote_data()  # 需要实现这个函数
    else:
        raise ValueError("market_type must be either 'US' or 'HK'")

    symbols_df = pd.DataFrame(symbols_and_powers, columns=['code', 'raw_symbol', 'power'])  
    quotes_df = pd.DataFrame(quote_data)

    # ... rest of your existing code ...

# 在主程序中调用
if __name__ == "__main__":
    market_type = 'US'  # 或者 'HK'
    analyze_stocks(market_type)
```

主要更改说明：
1. 将主要逻辑封装到 `analyze_stocks` 函数中，并添加 `market_type` 参数
2. 根据 `market_type` 参数选择不同的数据获取函数
3. 需要实现对应的港股数据获取函数（`get_all_hk_stock_symbols` 和 `get_hk_quote_data`）

注意事项：
1. 你需要在 `dao` 模块中实现相应的港股数据获取函数
2. 可能需要针对港股数据调整一些指标的计算方式或筛选条件
3. 数据库操作可能需要相应调整以支持港股数据的存储和查询

你需要确保数据库中有相应的港股数据表结构，并实现相应的数据获取函数。如果需要这些具体实现的帮助，请告诉我。


### 这个参数能通过外界来传吗？

是的，可以通过命令行参数来传递。我们可以修改 `test.sh` 和 `main.py` 来支持这个功能。

```bash:engineering/stock_selection/test.sh
#!/bin/bash

# ... existing environment variables ...

# 设置默认市场类型为美股
MARKET_TYPE=${1:-US}  # 如果没有传入参数，默认为US

# 运行主脚本，并传入市场类型参数
python D:/Work/ai-future/engineering/stock_selection/main.py --market ${MARKET_TYPE}
```

然后在 `main.py` 中添加参数解析：

```python:engineering/stock_selection/main.py
import argparse

# ... existing imports ...

if __name__ == "__main__":
    # 创建参数解析器
    parser = argparse.ArgumentParser(description='Stock analysis program')
    parser.add_argument('--market', type=str, default='US',
                       choices=['US', 'HK'],
                       help='Market type: US for US stocks, HK for Hong Kong stocks')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 使用参数运行分析
    analyze_stocks(market_type=args.market)
```

现在你可以通过以下方式运行脚本：
- 分析美股：`./test.sh US` 或直接 `./test.sh`（默认值）
- 分析港股：`./test.sh HK`

如果你直接运行 Python 脚本，也可以这样使用：
```bash
python main.py --market US  # 分析美股
python main.py --market HK  # 分析港股
```

这样就可以通过外部参数来控制要分析的市场类型了。

### 帮我main.py的完整改动写出来



好的，我来帮你写出 `main.py` 的完整改动。主要是添加参数解析和修改主要逻辑以支持不同市场。

```python:engineering/stock_selection/main.py
import argparse
from datetime import datetime, timedelta
# ... (其他现有的 imports 保持不变)

# ... (其他辅助函数保持不变) ...

def get_market_data(market_type='US'):
    """
    根据市场类型获取股票数据
    """
    if market_type == 'US':
        symbols_and_powers = db.get_all_us_stock_symbols()
        quote_data = get_us_quote_data()
    elif market_type == 'HK':
        symbols_and_powers = db.get_all_hk_stock_symbols()
        quote_data = get_hk_quote_data()
    else:
        raise ValueError("market_type must be either 'US' or 'HK'")
    
    return symbols_and_powers, quote_data

def analyze_stocks(market_type='US'):
    """
    根据市场类型分析股票
    market_type: 'US' 为美股，'HK' 为港股
    """
    logger.info(f"开始分析{market_type}市场股票...")
    
    # 定义筛选时间范围（过去5年）
    end_date = datetime.today()
    start_date = end_date - timedelta(days=5*365)
    
    try:
        # 获取市场数据
        symbols_and_powers, quote_data = get_market_data(market_type)
        
        # 转换为DataFrame
        symbols_df = pd.DataFrame(symbols_and_powers, columns=['code', 'raw_symbol', 'power'])
        quotes_df = pd.DataFrame(quote_data)
        
        # 合并数据
        merged_df = pd.merge(symbols_df, quotes_df, on='code', how='inner')
        
        # 计算技术指标
        result_df = calculate_indicators(merged_df)
        
        # 应用筛选条件
        filtered_stocks = apply_filters(result_df)
        
        # 保存结果
        save_results(filtered_stocks, market_type)
        
        logger.info(f"{market_type}市场股票分析完成")
        return filtered_stocks
        
    except Exception as e:
        logger.error(f"分析{market_type}市场股票时发生错误: {str(e)}")
        raise

def save_results(filtered_stocks, market_type):
    """
    保存分析结果，根据市场类型使用不同的表名
    """
    table_name = f"stock_selection_{market_type.lower()}"
    # ... (保存逻辑，根据需要调整表名)

def main():
    """
    主函数，处理命令行参数并执行分析
    """
    # 创建参数解析器
    parser = argparse.ArgumentParser(description='Stock analysis program')
    parser.add_argument('--market', type=str, default='US',
                       choices=['US', 'HK'],
                       help='Market type: US for US stocks, HK for Hong Kong stocks')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    try:
        # 配置日志
        setup_logging()
        
        # 使用参数运行分析
        filtered_stocks = analyze_stocks(market_type=args.market)
        
        # 输出结果统计
        logger.info(f"筛选出 {len(filtered_stocks)} 只符合条件的{args.market}股票")
        
    except Exception as e:
        logger.error(f"程序执行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
```

主要改动说明：
1. 添加了命令行参数解析功能
2. 新增了 `get_market_data` 函数来根据市场类型获取相应的数据
3. 修改了 `analyze_stocks` 函数以支持不同市场类型
4. 添加了 `main` 函数来组织主程序逻辑
5. 在日志和保存结果时加入了市场类型的标识

注意事项：
1. 需要在数据库模块中实现 `get_all_hk_stock_symbols` 和 `get_hk_quote_data` 函数
2. 可能需要针对港股调整一些技术指标的计算方法或筛选条件
3. 数据库表名可能需要根据市场类型做区分
4. 确保数据库中有相应的港股数据表结构

你需要根据实际情况实现相应的数据获取函数和调整具体的筛选逻辑。如果需要这些具体实现的帮助，请告诉我。


## 测试

```py
"""
计算所需的技术指标并添加到DataFrame中
"""
# 成交量因子
data['Volume_MA20'] = data['Volume'].rolling(window=20).mean()
data['Volume_Ratio'] = data['Volume'] / data['Volume_MA20']
    
# KDJ指标（使用 Stochastic Oscillator 近似）
stoch = momentum.StochasticOscillator(
    high=data['High'],
    low=data['Low'],
    close=data['Close'],
    window=14,
    smooth_window=3
)
data['K'] = stoch.stoch()
data['D'] = stoch.stoch_signal()
data['J'] = 3 * data['K'] - 2 * data['D']
    
# 布林带
bb = volatility.BollingerBands(
    close=data['Close'],
    window=20,
    window_dev=2
)
data['Bollinger_High'] = bb.bollinger_hband()
data['Bollinger_Low'] = bb.bollinger_lband()
    
# RSI
rsi = momentum.RSIIndicator(close=data['Close'], window=14)
data['RSI'] = rsi.rsi()

data['SMA_50'] = ta.trend.SMAIndicator(data['Close'], window=50).sma_indicator()
data['SMA_200'] = ta.trend.SMAIndicator(data['Close'], window=200).sma_indicator()
data['RSI'] = ta.momentum.RSIIndicator(data['Close']).rsi()
data['MACD_diff'] = ta.trend.MACD(data['Close']).macd_diff()
data['Momentum'] = ta.momentum.ROCIndicator(data['Close'], window=10).roc()
data['Volume_Change'] = data['Volume'].pct_change()
data['ATR'] = ta.volatility.AverageTrueRange(data['High'], data['Low'], data['Close'], window=14).average_true_range()
data['BB_high'] = ta.volatility.BollingerBands(data['Close'], window=20).bollinger_hband()
data['BB_low'] = ta.volatility.BollingerBands(data['Close'], window=20).bollinger_lband()
data['ADX'] = ta.trend.ADXIndicator(data['High'], data['Low'], data['Close'], window=14).adx()
data['CCI'] = ta.trend.CCIIndicator(data['High'], data['Low'], data['Close'], window=20).cci()

data["alpha_22_corr"] = data['High'].rolling(5).corr(data["Volume"]) # 越大越好
data["alpha_22_corr"] = -1 * (data["alpha_22_corr"] - data["alpha_22_corr"].shift(5)) # 越大越好
data['alpha_22_std'] = data['Close'].rolling(20).std()
data["REV_log"] = abs(np.log(data['Close'] / data["Close"].shift(12)))
data["REV_vol"] = data["Volume"].rolling(10).mean() 
```


这段代码计算了多个技术指标，我会逐一解释 `data` 中的各个列及其含义：

1. 原始数据列：
   - `High`: 股票的最高价
   - `Low`: 股票的最低价
   - `Close`: 股票的收盘价
   - `Volume`: 成交量

2. 计算的指标：

   - `Volume_MA20`: 20日成交量移动平均
   - `Volume_Ratio`: 当前成交量与20日平均成交量的比率

   - `K`: KDJ指标中的K值，表示股票的超买超卖程度
   - `D`: KDJ指标中的D值，K值的移动平均
   - `J`: KDJ指标中的J值，反映股价的波动程度

   - `Bollinger_High`: 布林带上轨
   - `Bollinger_Low`: 布林带下轨

   - `RSI`: 相对强弱指数，衡量价格变动的速度和变化

   - `SMA_50`: 50日简单移动平均线
   - `SMA_200`: 200日简单移动平均线

   - `MACD_diff`: MACD指标的差值，用于判断趋势的强弱和可能的转折点

   - `Momentum`: 动量指标，衡量价格变化的速度

   - `Volume_Change`: 成交量的百分比变化

   - `ATR`: 平均真实范围，衡量市场波动性

   - `BB_high`: 布林带上轨（重复计算）
   - `BB_low`: 布林带下轨（重复计算）

   - `ADX`: 平均趋向指标，用来衡量趋势的强弱

   - `CCI`: 顺势指标，用于判断股价是否超买或超卖

   - `alpha_22_corr`: 一个自定义的 alpha 因子，基于最高价和成交量的相关性
   - `alpha_22_std`: 收盘价的20日标准差

   - `REV_log`: 收盘价12日对数收益的绝对值
   - `REV_vol`: 10日平均成交量

这些指标综合考虑了价格趋势、成交量、波动性和动量等多个方面，用于全面分析股票的技术面情况。每个指标都有其特定的用途和解释方法，通常需要结合多个指标来做出更全面的判断。

在实际应用中，可能并不需要使用所有这些指标。选择最适合你的策略和市场环境的指标子集可能会更有效。此外，有些指标（如布林带）被重复计算，可以考虑删除重复的计算以提高效率。


## 代码分析

### 计算简单移动平均线

```py
data['SMA_50'] = ta.trend.SMAIndicator(data['Close'], window=50).sma_indicator()
data['SMA_200'] = ta.trend.SMAIndicator(data['Close'], window=200).sma_indicator()
```

这两行代码是计算股票的简单移动平均线（Simple Moving Average, SMA）。让我详细解释一下：

1. `data['SMA_50'] = ta.trend.SMAIndicator(data['Close'], window=50).sma_indicator()`

   - 这行代码计算了50日简单移动平均线。
   - `ta.trend.SMAIndicator` 是来自 `ta` (Technical Analysis) 库的函数，用于创建 SMA 指标对象。
   - `data['Close']` 是输入数据，表示使用收盘价来计算 SMA。
   - `window=50` 设置了移动窗口的大小为50天。
   - `.sma_indicator()` 方法实际计算并返回 SMA 值。
   - 结果被存储在 `data` DataFrame 的新列 `'SMA_50'` 中。

2. `data['SMA_200'] = ta.trend.SMAIndicator(data['Close'], window=200).sma_indicator()`

   - 这行代码计算了200日简单移动平均线。
   - 原理与上面相同，只是将窗口大小改为了200天。
   - 结果被存储在 `data` DataFrame 的新列 `'SMA_200'` 中。

简单移动平均线的意义：

1. SMA_50（50日均线）：
   - 反映股票中期趋势。
   - 常用于判断中期支撑和阻力位。
   - 股价在50日均线之上通常被视为中期上升趋势，反之则为下降趋势。

2. SMA_200（200日均线）：
   - 反映股票长期趋势。
   - 常被视为重要的长期支撑和阻力位。
   - 股价在200日均线之上通常被视为长期牛市，反之则为熊市。

3. SMA_50 和 SMA_200 的交叉：
   - 当50日均线从下向上穿过200日均线时，被称为"金叉"，通常被视为买入信号。
   - 当50日均线从上向下穿过200日均线时，被称为"死叉"，通常被视为卖出信号。

这两个移动平均线的计算和比较可以帮助投资者判断股票的整体趋势和可能的转折点。然而，像所有技术指标一样，它们应该与其他分析方法结合使用，而不是单独依赖。