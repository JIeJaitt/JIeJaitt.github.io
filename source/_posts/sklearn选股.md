---
title: scikit-learn选股
date: 2024-10-22T20:17:21+08:00
categories: 
tags: 
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---

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