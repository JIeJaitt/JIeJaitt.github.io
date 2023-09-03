---
abbrlink: 6c5e2860
categories: []
date: '2023-09-02T20:52:39.668785+08:00'
excerpt: "在本例中，使用一个数值表示时间中的“秒”值，然后使用\_resolveTime()\_函数将传入的秒数转换为天、小时和分钟等时间单位。\_"
tags:
  - tags
title: Go语言将秒转换为具体的时间
toc: true
updated: '2023-9-2T21:3:42.393+8:0'
sticky:
---
在本例中，使用一个数值表示时间中的“秒”值，然后使用 resolveTime() 函数将传入的秒数转换为天、小时和分钟等时间单位。

【示例】将秒解析为时间单位：

```go
package main

import "fmt"

const (
    // 定义每分钟的秒数
    SecondsPerMinute = 60

    // 定义每小时的秒数
    SecondsPerHour = SecondsPerMinute * 60

    // 定义每天的秒数
    SecondsPerDay = SecondsPerHour * 24
)

// 将传入的“秒”解析为3种时间单位
func resolveTime(seconds int) (day int, hour int, minute int) {

    day = seconds / SecondsPerDay
    hour = seconds / SecondsPerHour
    minute = seconds / SecondsPerMinute

    return
}

func main() {

    // 将返回值作为打印参数
    fmt.Println(resolveTime(1000))

    // 只获取消息和分钟
    _, hour, minute := resolveTime(18000)
    fmt.Println(hour, minute)

    // 只获取天
    day, _, _ := resolveTime(90000)
    fmt.Println(day)
}
```
