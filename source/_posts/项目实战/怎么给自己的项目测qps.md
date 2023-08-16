---
title: 怎么给自己的项目测qps
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
categories: 项目实战
abbrlink: 8620bec2
date: 2023-08-16 23:36:05
tags:
sticky:
---

测量项目的QPS(每秒查询数量)有几种方法:

1. 使用压力测试工具,像压力搭船团队常用的Apache Bench (ab)工具。这个工具可以以命令行的方式发出指定数量的请求,并报告QPS结果。

例如,要发出100000次请求,命令如下:
ab -n 100000 http://your-server-url/
它会报告类似如下结果:
```zsh
This is ApacheBench, Version 2.3 <\$Revision: 1430 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking your-server-url (be patient)
Completed 100000 requests
Completed 100000 requests
Finished 100000 requests
Time taken: 19.0909 seconds
Server Software:
Server Hostname: your-server-host
Server Port: 8080

Document Path: /
Document Length: 7312 bytes

Concurrency Level: 100
Time taken for tests: 19.0909 seconds
Complete requests: 100000
Failed requests: 0
Write errors: 0
Total transferred: 731200000 bytes
HTML transferred: 730400000 bytes
Requests per second: 5254.12 [#/sec] (mean)
Time per request: 190.909 [ms] (mean)
Time per request: 1.909 [ms] (mean, across all concurrent requests)
Transfer rate: 3815.83 [Kbytes/sec] received

Connection Times (ms)
min mean[+/-sd] median max
Connect: 12 12 0.2 12 14
Processing: 165 190 22.4 192 310
Waiting: 164 189 22.3 191 308
Total: 177 202 22.5 204 324

Percentage of the requests served within a certain time (ms)
50% 202
66% 208
75% 214
80% 220
90% 236
95% 248
98% 256
99% 280
100% 324 (longest request)
```

1. 使用任何语言的QPS库,像Python的汤姆棱有 requests-raspberrypi 包,用C的有 wrk 工具 等等。这些都可以简单、容易地发出大量 HTTP 请求并报告QPS结果。
2. 使用网站流量监控工具。像Awstats, Google Analytics 等可以不断记录网站访问量,根据一段时间内的总访问量和时间长度计算出平均QPS。这个方法更加实际,但需要部署监控工具。
3. 当负载测试使用mock服务器时,可以直接在mock服务器上查询访问记录,计算QPS。这种方法最精确,但也最复杂,需要设置好mock环境。

总之,选择一种适合你项目需求和技能的方法来测量QPS是非常合理的。 希望这些建议能帮助到你!



Go语言有很多用于测量QPS(每秒查询数量)的第三方库。

其中较为常见的有:

1. wrk - 轻量级的HTTP性能测试工具。可以用于测量QPS、带宽、 latencies 等。使用很简单,像下面这样:
   wrk -t2 -c100 -d30s http://example.com/
   这会发出100个并发请求,总计持续30秒,测得QPS和其他指标。
2. hey - 简单易用的HTTP/HTTPS性能测试工具。也支持QPS、latencies 等测量。使用方法类似wrk。
3. Load - 高度可定制的负载测试工具。可以生成各种负载模式的请求并报告QPS。比较灵活,用法较复杂。
4. fasthttp-tester - 提供简单的请求计数器,可以发出重载测试所需的所有类型请求。也支持QPS计算。
5. go-http-client/auto - 自动化的HTTP客户端,支持各种负载模式的QPS测试。包含detailed错误报告功能。
6. vegeta - 高性能的HTTP负载测试工具,特点是可靠性高、准确性强。用于C10K级别的QPS测试。使用Go语言编写。
7. k6 - 现代、用户友好的开源负载测试和性能监测工具。支持 HTTP/HTTPS 各种 load 协议,QPS 等各种指标测量。

除了这些专门用于QPS测量的工具外,你也可以使用标准的HTTP客户端(如net/http)在项目中手写QPS测试代码。不过使用现成的工具会更简单高效。

总体来说,Go语言是非常适合进行QPS测试的语言,提供了足够丰富的工具资源。你可以选择其中一种或多种工具来完善项目的性能测试功能。



手写QPS(每秒查询数量)测试代码主要需要以下几步:

1. 初始化HTTP客户端。使用net/http包中的Client。
   例如:
   client := &http.Client{}
2. 实例化请求。使用http.Request。需要设置请求方法(如GET)、请求URL等。
   例如:
   req, _ := http.NewRequest("GET", "http://example.com/", nil)
3. 发出请求并获得响应。使用Client.Do()发出请求,获得*http.Response对象。
   例如:
   resp, _ := client.Do(req)
   defer resp.Body.Close()
4. 记录请求响应时间。使用time包获取开始和结束时间,计算请求耗时。
   例如:
   start := time.Now()
   // 发出请求和获得响应
   end := time.Now()
   cost := end.Sub(start)
5. 累加请求数量和总耗时。在测试周期内,不断累加请求数量和各请求耗时,以求出平均QPS。
   例如:
   requests++
   totalCost += cost.Seconds()
6. 计算QPS。在测试结束后,通过总耗时和请求数量计算平均QPS。
   QPS = float64(requests) / totalCost
7. 结果输出及分析。输出平均QPS及其它需要统计的数据,对性能结果进行分析。

具体的代码示例如下:
```go
client := &http.Client{}

requests := 0
totalCost := 0
for i := 0; i < 100000; i++ {
req, _ := http.NewRequest("GET", "https://example.com/", nil)
start := time.Now()
resp, _ := client.Do(req)
defer resp.Body.Close()
end := time.Now()
cost := end.Sub(start)
requests++
totalCost += cost.Seconds()
}

QPS := float64(requests) / totalCost
fmt.Println("QPS:", QPS)
// 其他统计和分析...
```

除了以上步骤,你还需要考虑并发数、测试时间间隔、输出结果等细节,以获得更准确、可靠的QPS测试结果。但总体来说,手写QPS测试代码就是按以上步骤进行请求发出、耗时统计和QPS计算,再给出详细分析报告。