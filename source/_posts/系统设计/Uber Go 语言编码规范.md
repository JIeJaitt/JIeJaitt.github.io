---
title: Uber Go 语言编码规范
date: 2024-09-14T10:53:48+08:00
categories: 编程语言
tags: Go
abbrlink: 
toc: true 
sticky: 
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [cloud.tencent.com](https://cloud.tencent.com/developer/article/2295672)

样式 (style) 是支配我们代码的惯例。术语`样式`有点用词不当，因为这些约定涵盖的范围不限于由 gofmt 替我们处理的源文件格式。

本指南的目的是通过详细描述在 Uber 编写 Go 代码的注意事项来管理这种复杂性。这些规则的存在是为了使代码库易于管理，同时仍然允许工程师更有效地使用 Go 语言功能。

<!-- more -->

该指南最初由 [Prashant Varanasi](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fprashantv&source=article&objectId=2295672) 和 [Simon Newton](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fnomis52&source=article&objectId=2295672) 编写，目的是使一些同事能快速使用 Go。多年来，该指南已根据其他人的反馈进行了修改。

本文档记录了我们在 Uber 遵循的 Go 代码中的惯用约定。其中许多是 Go 的通用准则，而其他扩展准则依赖于下面外部的指南：

1.  [Effective Go](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html&source=article&objectId=2295672)
2.  [Go Common Mistakes](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FCommonMistakes&source=article&objectId=2295672)
3.  [Go Code Review Comments](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FCodeReviewComments&source=article&objectId=2295672)

所有代码都应该通过`golint`和`go vet`的检查并无错误。我们建议您将编辑器设置为：

*   保存时运行 `goimports`
*   运行 `golint` 和 `go vet` 检查错误

您可以在以下 Go 编辑器工具支持页面中找到更为详细的信息： [https://github.com/golang/go/wiki/IDEsAndTextEditorPlugins](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FIDEsAndTextEditorPlugins&source=article&objectId=2295672)

### 指导原则

#### 指向 interface 的指针

您几乎不需要指向接口类型的指针。您应该将接口作为值进行传递，在这样的传递过程中，实质上传递的底层数据仍然可以是指针。

接口实质上在底层用两个字段表示：

1.  一个指向某些特定类型信息的指针。您可以将其视为 "type"。
2.  数据指针。如果存储的数据是指针，则直接存储。如果存储的数据是一个值，则存储指向该值的指针。

如果希望接口方法修改基础数据，则必须使用指针传递 (将对象指针赋值给接口变量)。

```
1type F interface {
 2  f()
 3}
 5type S1 struct{}
 7func (s S1) f() {}
 9type S2 struct{}
11func (s *S2) f() {}
13// f1.f()无法修改底层数据
14// f2.f() 可以修改底层数据,给接口变量f2赋值时使用的是对象指针
15var f1 F = S1{}
16var f2 F = &S2{}
```

#### Interface 合理性验证

在编译时验证接口的符合性。这包括：

*   将实现特定接口的导出类型作为接口 API 的一部分进行检查
*   实现同一接口的 (导出和非导出) 类型属于实现类型的集合
*   任何违反接口合理性检查的场景, 都会终止编译, 并通知给用户

补充: 上面 3 条是编译器对接口的检查机制, 大体意思是错误使用接口会在编译期报错. 所以可以利用这个机制让部分问题在编译期暴露.

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// 如果 Handler 没有实现 http.Handler, 会在运行时报错 2type Handler struct { 3 // ... 4} 5func (h *Handler) ServeHTTP( 6 w http.ResponseWriter, 7 r *http.Request, 8) { 9 ... 10}</p></td><td><p>1type Handler struct { 2 // ... 3} 4// 用于触发编译期的接口的合理性检查机制 5// 如果 Handler 没有实现 http.Handler, 会在编译期报错 6var _ http.Handler = (*Handler)(nil) 7func (h *Handler) ServeHTTP( 8 w http.ResponseWriter, 9 r *http.Request, 10) { 11 // ... 12}</p></td></tr></tbody></table>

如果 `*Handler` 与 `http.Handler` 的接口不匹配, 那么语句 `var _ http.Handler = (*Handler)(nil)` 将无法编译通过.

赋值的右边应该是断言类型的零值。 对于指针类型（如 `*Handler`）、切片和映射，这是 `nil`； 对于结构类型，这是空结构。

```
1type LogHandler struct {
 2  h   http.Handler
 3  log *zap.Logger
 4}
 5var _ http.Handler = LogHandler{}
 6func (h LogHandler) ServeHTTP(
 7  w http.ResponseWriter,
 8  r *http.Request,
 9) {
10  // ...
11}
```

#### 接收器 (receiver) 与接口

使用值接收器的方法既可以通过值调用，也可以通过指针调用。

带指针接收器的方法只能通过指针或 [addressable values](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec%23Method_values&source=article&objectId=2295672) 调用.

例如，

```
1type S struct {
 2  data string
 3}
 5func (s S) Read() string {
 6  return s.data
 7}
 9func (s *S) Write(str string) {
10  s.data = str
11}
13sVals := map[int]S{1: {"A"}}
15// 你只能通过值调用 Read
16sVals[1].Read()
18// 这不能编译通过：
19//  sVals[1].Write("test")
21sPtrs := map[int]*S{1: {"A"}}
23// 通过指针既可以调用 Read，也可以调用 Write 方法
24sPtrs[1].Read()
25sPtrs[1].Write("test")
```

类似的, 即使方法有了值接收器, 也同样可以用指针接收器来满足接口.

```
1type F interface {
 2  f()
 3}
 5type S1 struct{}
 7func (s S1) f() {}
 9type S2 struct{}
11func (s *S2) f() {}
13s1Val := S1{}
14s1Ptr := &S1{}
15s2Val := S2{}
16s2Ptr := &S2{}
18var i F
19i = s1Val
20i = s1Ptr
21i = s2Ptr
23//  下面代码无法通过编译。因为 s2Val 是一个值，而 S2 的 f 方法中没有使用值接收器
24//   i = s2Val
```

[Effective Go](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html&source=article&objectId=2295672) 中有一段关于 [pointers vs. values](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html%23pointers_vs_values&source=article&objectId=2295672) 的精彩讲解。

补充:

*   一个类型可以有值接收器方法集和指针接收器方法集
    *   值接收器方法集是指针接收器方法集的子集, 反之不是
*   规则
    *   值对象只可以使用值接收器方法集
    *   指针对象可以使用 值接收器方法集 + 指针接收器方法集
*   接口的匹配 (或者叫实现)
    *   类型实现了接口的所有方法, 叫匹配
    *   具体的讲, 要么是类型的值方法集匹配接口, 要么是指针方法集匹配接口

具体的匹配分两种:

*   值方法集和接口匹配
    *   给接口变量赋值的不管是值还是指针对象, 都 ok, 因为都包含值方法集
*   指针方法集和接口匹配
    *   只能将指针对象赋值给接口变量, 因为只有指针方法集和接口匹配
    *   如果将值对象赋值给接口变量, 会在编译期报错 (会触发接口合理性检查机制)

为啥 i = s2Val 会报错, 因为值方法集和接口不匹配.

#### 零值 Mutex 是有效的

零值 `sync.Mutex` 和 `sync.RWMutex` 是有效的。所以指向 mutex 的指针基本是不必要的。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1mu := new(sync.Mutex) 2mu.Lock()</p></td><td><p>1var mu sync.Mutex 2mu.Lock()</p></td></tr></tbody></table>

如果你使用结构体指针，mutex 应该作为结构体的非指针字段。即使该结构体不被导出，也不要直接把 mutex 嵌入到结构体中。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type SMap struct { 2 sync.Mutex 3 4 data map[string]string 5} 6 7func NewSMap() *SMap { 8 return &amp;SMap{ 9 data: make(map[string]string), 10 } 11} 12 13func (m *SMap) Get(k string) string { 14 m.Lock() 15 defer m.Unlock() 16 17 return m.data[k] 18}</p></td><td><p>1type SMap struct { 2 mu sync.Mutex 3 4 data map[string]string 5} 6 7func NewSMap() *SMap { 8 return &amp;SMap{ 9 data: make(map[string]string), 10 } 11} 12 13func (m *SMap) Get(k string) string { 14 m.mu.Lock() 15 defer m.mu.Unlock() 16 17 return m.data[k] 18}</p></td></tr><tr><td><p>Mutex 字段， Lock 和 Unlock 方法是 SMap 导出的 API 中不刻意说明的一部分。</p></td><td><p>mutex 及其方法是 SMap 的实现细节，对其调用者不可见。</p></td></tr></tbody></table>

#### 在边界处拷贝 Slices 和 Maps

slices 和 maps 包含了指向底层数据的指针，因此在需要复制它们时要特别注意。

##### 接收 Slices 和 Maps

请记住，当 map 或 slice 作为函数参数传入时，如果您存储了对它们的引用，则用户可以对其进行修改。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func (d *Driver) SetTrips(trips []Trip) { 2 d.trips = trips 3} 4 5trips := ... 6d1.SetTrips(trips) 7 8// 你是要修改 d1.trips 吗？ 9trips[0] = ...</p></td><td><p>1func (d *Driver) SetTrips(trips []Trip) { 2 d.trips = make([]Trip, len(trips)) 3 copy(d.trips, trips) 4} 5 6trips := ... 7d1.SetTrips(trips) 8 9// 这里我们修改 trips[0]，但不会影响到 d1.trips 10trips[0] = ...</p></td></tr></tbody></table>

##### 返回 slices 或 maps

同样，请注意用户对暴露内部状态的 map 或 slice 的修改。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type Stats struct { 2 mu sync.Mutex 3 4 counters map[string]int 5} 6 7// Snapshot 返回当前状态。 8func (s *Stats) Snapshot() map[string]int { 9 s.mu.Lock() 10 defer s.mu.Unlock() 11 12 return s.counters 13} 14 15// snapshot 不再受互斥锁保护 16// 因此对 snapshot 的任何访问都将受到数据竞争的影响 17// 影响 stats.counters 18snapshot := stats.Snapshot()</p></td><td><p>1type Stats struct { 2 mu sync.Mutex 3 4 counters map[string]int 5} 6 7func (s *Stats) Snapshot() map[string]int { 8 s.mu.Lock() 9 defer s.mu.Unlock() 10 11 result := make(map[string]int, len(s.counters)) 12 for k, v := range s.counters { 13 result[k] = v 14 } 15 return result 16} 17 18// snapshot 现在是一个拷贝 19snapshot := stats.Snapshot()</p></td></tr></tbody></table>

#### 使用 defer 释放资源

使用 defer 释放资源，诸如文件和锁。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1p.Lock() 2if p.count &lt; 10 {3 p.Unlock() 4 return p.count 5} 6 7p.count++ 8newCount := p.count 9p.Unlock() 10 11return newCount 12 13// 当有多个 return 分支时，很容易遗忘 unlock</p></td><td><p>1p.Lock() 2defer p.Unlock() 3 4if p.count &lt; 10 { 5 return p.count 6} 7 8p.count++ 9return p.count 10 11// 更可读</p></td></tr></tbody></table>

Defer 的开销非常小，只有在您可以证明函数执行时间处于纳秒级的程度时，才应避免这样做。使用 defer 提升可读性是值得的，因为使用它们的成本微不足道。尤其适用于那些不仅仅是简单内存访问的较大的方法，在这些方法中其他计算的资源消耗远超过 `defer`。

#### Channel 的 size 要么是 1，要么是无缓冲的

channel 通常 size 应为 1 或是无缓冲的。默认情况下，channel 是无缓冲的，其 size 为零。任何其他尺寸都必须经过严格的审查。我们需要考虑如何确定大小，考虑是什么阻止了 channel 在高负载下和阻塞写时的写入，以及当这种情况发生时系统逻辑有哪些变化。(翻译解释：按照原文意思是需要界定通道边界，竞态条件，以及逻辑上下文梳理)

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// 应该足以满足任何情况！ 2c := make(chan int, 64)</p></td><td><p>1// 大小：1 2c := make(chan int, 1) // 或者 3// 无缓冲 channel，大小为 0 4c := make(chan int)</p></td></tr></tbody></table>

#### 枚举从 1 开始

在 Go 中引入枚举的标准方法是声明一个自定义类型和一个使用了 iota 的 const 组。由于变量的默认值为 0，因此通常应以非零值开头枚举。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type Operation int 2 3const ( 4 Add Operation = iota 5 Subtract 6 Multiply 7) 8 9// Add=0, Subtract=1, Multiply=2</p></td><td><p>1type Operation int 2 3const ( 4 Add Operation = iota + 1 5 Subtract 6 Multiply 7) 8 9// Add=1, Subtract=2, Multiply=3</p></td></tr></tbody></table>

在某些情况下，使用零值是有意义的（枚举从零开始），例如，当零值是理想的默认行为时。

```
1type LogOutput int
3const (
4  LogToStdout LogOutput = iota
5  LogToFile
6  LogToRemote
7)
9// LogToStdout=0, LogToFile=1, LogToRemote=2
```

#### 使用 time 处理时间

时间处理很复杂。关于时间的错误假设通常包括以下几点。

1.  一天有 24 小时
2.  一小时有 60 分钟
3.  一周有七天
4.  一年 365 天
5.  [还有更多](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Finfiniteundo.com%2Fpost%2F25326999628%2Ffalsehoods-programmers-believe-about-time&source=article&objectId=2295672)

例如，_1_ 表示在一个时间点上加上 24 小时并不总是产生一个新的日历日。

因此，在处理时间时始终使用 [`"time"`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F&source=article&objectId=2295672) 包，因为它有助于以更安全、更准确的方式处理这些不正确的假设。

##### 使用 `time.Time` 表达瞬时时间

在处理时间的瞬间时使用 [`time.Time`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Time&source=article&objectId=2295672)，在比较、添加或减去时间时使用 `time.Time` 中的方法。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func isActive(now, start, stop int) bool { 2 return start &lt;= now &amp;&amp; now &lt; stop 3}</p></td><td><p>1func isActive(now, start, stop time.Time) bool { 2 return (start.Before(now) || start.Equal(now)) &amp;&amp; now.Before(stop) 3}</p></td></tr></tbody></table>

##### 使用 `time.Duration` 表达时间段

在处理时间段时使用 [`time.Duration`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Duration&source=article&objectId=2295672) .

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func poll(delay int) { 2 for { 3 // ... 4 time.Sleep(time.Duration(delay) * time.Millisecond) 5 } 6} 7poll(10) // 是几秒钟还是几毫秒?</p></td><td><p>1func poll(delay time.Duration) { 2 for { 3 // ... 4 time.Sleep(delay) 5 } 6} 7poll(10*time.Second)</p></td></tr></tbody></table>

回到第一个例子，在一个时间瞬间加上 24 小时，我们用于添加时间的方法取决于意图。如果我们想要下一个日历日 (当前天的下一天) 的同一个时间点，我们应该使用 [`Time.AddDate`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Time.AddDate&source=article&objectId=2295672)。但是，如果我们想保证某一时刻比前一时刻晚 24 小时，我们应该使用 [`Time.Add`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Time.Add&source=article&objectId=2295672)。

```
1newDay := t.AddDate(0 /* years */, 0 /* months */, 1 /* days */)
2maybeNewDay := t.Add(24 * time.Hour)
```

##### 对外部系统使用 `time.Time` 和 `time.Duration`

尽可能在与外部系统的交互中使用 `time.Duration` 和 `time.Time` 例如 :

*   Command-line 标志: [`flag`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fflag%2F&source=article&objectId=2295672) 通过 [`time.ParseDuration`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23ParseDuration&source=article&objectId=2295672) 支持 `time.Duration`
*   JSON: [`encoding/json`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fencoding%2Fjson%2F&source=article&objectId=2295672) 通过其 [`UnmarshalJSON` method](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Time.UnmarshalJSON&source=article&objectId=2295672) 方法支持将 `time.Time` 编码为 [RFC 3339](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Ftools.ietf.org%2Fhtml%2Frfc3339&source=article&objectId=2295672) 字符串
*   SQL: [`database/sql`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fdatabase%2Fsql%2F&source=article&objectId=2295672) 支持将 `DATETIME` 或 `TIMESTAMP` 列转换为 `time.Time`，如果底层驱动程序支持则返回
*   YAML: [`gopkg.in/yaml.v2`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgopkg.in%2Fyaml.v2&source=article&objectId=2295672) 支持将 `time.Time` 作为 [RFC 3339](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Ftools.ietf.org%2Fhtml%2Frfc3339&source=article&objectId=2295672) 字符串，并通过 [`time.ParseDuration`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23ParseDuration&source=article&objectId=2295672) 支持 `time.Duration`。

当不能在这些交互中使用 `time.Duration` 时，请使用 `int` 或 `float64`，并在字段名称中包含单位。

例如，由于 `encoding/json` 不支持 `time.Duration`，因此该单位包含在字段的名称中。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// {"interval": 2} 2type Config struct { 3 Interval int `json:"interval"` 4}</p></td><td><p>1// {"intervalMillis": 2000} 2type Config struct { 3 IntervalMillis int `json:"intervalMillis"` 4}</p></td></tr></tbody></table>

当在这些交互中不能使用 `time.Time` 时，除非达成一致，否则使用 `string` 和 [RFC 3339](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Ftools.ietf.org%2Fhtml%2Frfc3339&source=article&objectId=2295672) 中定义的格式时间戳。默认情况下，[`Time.UnmarshalText`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23Time.UnmarshalText&source=article&objectId=2295672) 使用此格式，并可通过 [`time.RFC3339`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ftime%2F%23RFC3339&source=article&objectId=2295672) 在 `Time.Format` 和 `time.Parse` 中使用。

尽管这在实践中并不成问题，但请记住，`"time"` 包不支持解析闰秒时间戳（[8728](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fissues%2F8728&source=article&objectId=2295672)），也不在计算中考虑闰秒（[15190](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fissues%2F15190&source=article&objectId=2295672)）。如果您比较两个时间瞬间，则差异将不包括这两个瞬间之间可能发生的闰秒。

#### 错误类型

Go 中有多种声明错误（Error) 的选项：

*   [`errors.New`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ferrors%2F%23New&source=article&objectId=2295672) 对于简单静态字符串的错误
*   [`fmt.Errorf`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ffmt%2F%23Errorf&source=article&objectId=2295672) 用于格式化的错误字符串
*   实现 `Error()` 方法的自定义类型
*   用 [`"pkg/errors".Wrap`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgithub.com%2Fpkg%2Ferrors%23Wrap&source=article&objectId=2295672) 的 Wrapped errors

返回错误时，请考虑以下因素以确定最佳选择：

*   这是一个不需要额外信息的简单错误吗？如果是这样，[`errors.New`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ferrors%2F%23New&source=article&objectId=2295672) 足够了。
*   客户需要检测并处理此错误吗？如果是这样，则应使用自定义类型并实现该 `Error()` 方法。
*   您是否正在传播下游函数返回的错误？如果是这样，请查看本文后面有关错误包装 [section on error wrapping](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23%25E9%2594%2599%25E8%25AF%25AF%25E5%258C%2585%25E8%25A3%2585&source=article&objectId=2295672) 部分的内容。
*   否则 [`fmt.Errorf`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ffmt%2F%23Errorf&source=article&objectId=2295672) 就可以了。

如果客户端需要检测错误，并且您已使用创建了一个简单的错误 [`errors.New`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ferrors%2F%23New&source=article&objectId=2295672)，请使用一个错误变量。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// package foo 2 3func Open() error {4 return errors.New("could not open") 5} 6 7// package bar 8 9func use() { 10 if err := foo.Open(); err != nil { 11 if err.Error() == "could not open" { 12 // handle 13 } else { 14 panic("unknown error") 15 } 16 } 17}</p></td><td><p>1// package foo 2 3var ErrCouldNotOpen = errors.New("could not open") 4 5func Open() error { 6 return ErrCouldNotOpen 7} 8 9// package bar 10 11if err := foo.Open(); err != nil { 12 if errors.Is(err, foo.ErrCouldNotOpen) { 13 // handle 14 } else { 15 panic("unknown error") 16 } 17}</p></td></tr></tbody></table>

如果您有可能需要客户端检测的错误，并且想向其中添加更多信息（例如，它不是静态字符串），则应使用自定义类型。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func open(file string) error { 2 return fmt.Errorf("file %q not found", file) 3} 4 5func use() { 6 if err := open("testfile.txt"); err != nil { 7 if strings.Contains(err.Error(), "not found") { 8 // handle 9 } else { 10 panic("unknown error") 11 } 12 } 13}</p></td><td><p>1type errNotFound struct { 2 file string 3} 4 5func (e errNotFound) Error() string { 6 return fmt.Sprintf("file %q not found", e.file) 7} 8 9func open(file string) error { 10 return errNotFound{file: file} 11} 12 13func use() { 14 if err := open("testfile.txt"); err != nil { 15 if _, ok := err.(errNotFound); ok { 16 // handle 17 } else { 18 panic("unknown error") 19 } 20 } 21}</p></td></tr></tbody></table>

直接导出自定义错误类型时要小心，因为它们已成为程序包公共 API 的一部分。最好公开匹配器功能以检查错误。

```
1// package foo
 3type errNotFound struct {
 4  file string
 5}
 7func (e errNotFound) Error() string {
 8  return fmt.Sprintf("file %q not found", e.file)
 9}
11func IsNotFoundError(err error) bool {
12  _, ok := err.(errNotFound)
13  return ok
14}
16func Open(file string) error {
17  return errNotFound{file: file}
18}
20// package bar
22if err := foo.Open("foo"); err != nil {
23  if foo.IsNotFoundError(err) {
24    // handle
25  } else {
26    panic("unknown error")
27  }
28}
```

#### 错误包装 (Error Wrapping)

一个（函数 / 方法）调用失败时，有三种主要的错误传播方式：

*   如果没有要添加的其他上下文，并且您想要维护原始错误类型，则返回原始错误。
*   添加上下文，使用 [`"pkg/errors".Wrap`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgithub.com%2Fpkg%2Ferrors%23Wrap&source=article&objectId=2295672) 以便错误消息提供更多上下文 ,[`"pkg/errors".Cause`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgithub.com%2Fpkg%2Ferrors%23Cause&source=article&objectId=2295672) 可用于提取原始错误。
*   如果调用者不需要检测或处理的特定错误情况，使用 [`fmt.Errorf`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Ffmt%2F%23Errorf&source=article&objectId=2295672)。

建议在可能的地方添加上下文，以使您获得诸如 “调用服务 foo：连接被拒绝” 之类的更有用的错误，而不是诸如 “连接被拒绝” 之类的模糊错误。

在将上下文添加到返回的错误时，请避免使用 “failed to” 之类的短语以保持上下文简洁，这些短语会陈述明显的内容，并随着错误在堆栈中的渗透而逐渐堆积：

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1s, err := store.New() 2if err != nil { 3 return fmt.Errorf(4 "failed to create new store: %v", err) 5}</p></td><td><p>1s, err := store.New() 2if err != nil { 3 return fmt.Errorf(4 "new store: %v", err) 5}</p></td></tr><tr><td><p>1failed to x: failed to y: failed to create new store: the error</p></td><td><p>1x: y: new store: the error</p></td></tr></tbody></table>

但是，一旦将错误发送到另一个系统，就应该明确消息是错误消息（例如使用`err`标记，或在日志中以”Failed” 为前缀）。

另请参见 [Don’t just check errors, handle them gracefully](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fdave.cheney.net%2F2016%2F04%2F27%2Fdont-just-check-errors-handle-them-gracefully&source=article&objectId=2295672). 不要只是检查错误，要优雅地处理错误

#### 处理类型断言失败

[type assertion](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec%23Type_assertions&source=article&objectId=2295672) 的单个返回值形式针对不正确的类型将产生 panic。因此，请始终使用 “comma ok” 的惯用法。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1t := i.(string)</p></td><td><p>1t, ok := i.(string) 2if !ok { 3 // 优雅地处理错误 4}</p></td></tr></tbody></table>

#### 不要 panic

在生产环境中运行的代码必须避免出现 panic。panic 是 [cascading failures](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FCascading_failure&source=article&objectId=2295672) 级联失败的主要根源 。如果发生错误，该函数必须返回错误，并允许调用方决定如何处理它。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func run(args []string) { 2 if len(args) == 0 { 3 panic("an argument is required") 4 } 5 // ... 6} 7 8func main() { 9 run(os.Args[1:]) 10}</p></td><td><p>1func run(args []string) error { 2 if len(args) == 0 { 3 return errors.New("an argument is required") 4 } 5 // ... 6 return nil 7} 8 9func main() { 10 if err := run(os.Args[1:]); err != nil { 11 fmt.Fprintln(os.Stderr, err) 12 os.Exit(1) 13 } 14}</p></td></tr></tbody></table>

panic/recover 不是错误处理策略。仅当发生不可恢复的事情（例如：nil 引用）时，程序才必须 panic。程序初始化是一个例外：程序启动时应使程序中止的不良情况可能会引起 panic。

```
1var _statusTemplate = template.Must(template.New("name").Parse("_statusHTML"))
```

即使在测试代码中，也优先使用`t.Fatal`或者`t.FailNow`而不是 panic 来确保失败被标记。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// func TestFoo(t *testing.T) 2 3f, err := ioutil.TempFile("","test") 4if err != nil { 5 panic("failed to set up test") 6}</p></td><td><p>1// func TestFoo(t *testing.T) 2 3f, err := ioutil.TempFile("","test") 4if err != nil { 5 t.Fatal("failed to set up test") 6}</p></td></tr></tbody></table>

#### 使用 go.uber.org/atomic

使用 [sync/atomic](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fsync%2Fatomic%2F&source=article&objectId=2295672) 包的原子操作对原始类型 (`int32`, `int64`等）进行操作，因为很容易忘记使用原子操作来读取或修改变量。

[go.uber.org/atomic](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgo.uber.org%2Fatomic&source=article&objectId=2295672) 通过隐藏基础类型为这些操作增加了类型安全性。此外，它包括一个方便的`atomic.Bool`类型。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type foo struct { 2 running int32 // atomic 3} 4 5func (f* foo) start() { 6 if atomic.SwapInt32(&amp;f.running, 1) == 1 { 7 // already running… 8 return 9 } 10 // start the Foo 11} 12 13func (f *foo) isRunning() bool { 14 return f.running == 1 // race! 15}</p></td><td><p>1type foo struct { 2 running atomic.Bool 3} 4 5func (f *foo) start() { 6 if f.running.Swap(true) { 7 // already running… 8 return 9 } 10 // start the Foo 11} 12 13func (f *foo) isRunning() bool { 14 return f.running.Load() 15}</p></td></tr></tbody></table>

#### 避免可变全局变量

使用选择依赖注入方式避免改变全局变量。 既适用于函数指针又适用于其他值类型

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// sign.go 2var _timeNow = time.Now 3func sign(msg string) string { 4 now := _timeNow() 5 return signWithTime(msg, now) 6}</p></td><td><p>1// sign.go 2type signer struct {3 now func() time.Time 4} 5func newSigner() *signer { 6 return &amp;signer{ 7 now: time.Now, 8 } 9} 10func (s *signer) Sign(msg string) string { 11 now := s.now() 12 return signWithTime(msg, now) 13}</p></td></tr><tr><td><p>1// sign_test.go 2func TestSign(t *testing.T) { 3 oldTimeNow := _timeNow 4 _timeNow = func() time.Time { 5 return someFixedTime 6 } 7 defer func() { _timeNow = oldTimeNow }() 8 assert.Equal(t, want, sign(give)) 9}</p></td><td><p>1// sign_test.go 2func TestSigner(t *testing.T) { 3 s := newSigner() 4 s.now = func() time.Time { 5 return someFixedTime 6 } 7 assert.Equal(t, want, s.Sign(give)) 8}</p></td></tr></tbody></table>

#### 避免在公共结构中嵌入类型

这些嵌入的类型泄漏实现细节、禁止类型演化和模糊的文档。

假设您使用共享的 `AbstractList` 实现了多种列表类型，请避免在具体的列表实现中嵌入 `AbstractList`。 相反，只需手动将方法写入具体的列表，该列表将委托给抽象列表。

```
1type AbstractList struct {}
2// 添加将实体添加到列表中。
3func (l *AbstractList) Add(e Entity) {
4  // ...
5}
6// 移除从列表中移除实体。
7func (l *AbstractList) Remove(e Entity) {
8  // ...
9}
```

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// ConcreteList 是一个实体列表。 2type ConcreteList struct { 3 *AbstractList 4}</p></td><td><p>1// ConcreteList 是一个实体列表。 2type ConcreteList struct { 3 list *AbstractList 4} 5// 添加将实体添加到列表中。 6func (l *ConcreteList) Add(e Entity) { 7 l.list.Add(e) 8} 9// 移除从列表中移除实体。 10func (l *ConcreteList) Remove(e Entity) { 11 l.list.Remove(e) 12}</p></td></tr></tbody></table>

Go 允许 [类型嵌入](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html%23embedding&source=article&objectId=2295672) 作为继承和组合之间的折衷。 外部类型获取嵌入类型的方法的隐式副本。 默认情况下，这些方法委托给嵌入实例的同一方法。

结构还获得与类型同名的字段。 所以，如果嵌入的类型是 public，那么字段是 public。为了保持向后兼容性，外部类型的每个未来版本都必须保留嵌入类型。

很少需要嵌入类型。 这是一种方便，可以帮助您避免编写冗长的委托方法。

即使嵌入兼容的抽象列表 _interface_，而不是结构体，这将为开发人员提供更大的灵活性来改变未来，但仍然泄露了具体列表使用抽象实现的细节。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// AbstractList 是各种实体列表的通用实现。 2type AbstractList interface {3 Add(Entity) 4 Remove(Entity) 5} 6// ConcreteList 是一个实体列表。 7type ConcreteList struct { 8 AbstractList 9}</p></td><td><p>1// ConcreteList 是一个实体列表。 2type ConcreteList struct { 3 list AbstractList 4} 5// 添加将实体添加到列表中。 6func (l *ConcreteList) Add(e Entity) { 7 l.list.Add(e) 8} 9// 移除从列表中移除实体。 10func (l *ConcreteList) Remove(e Entity) { 11 l.list.Remove(e) 12}</p></td></tr></tbody></table>

无论是使用嵌入式结构还是使用嵌入式接口，嵌入式类型都会限制类型的演化.

*   向嵌入式接口添加方法是一个破坏性的改变。
*   删除嵌入类型是一个破坏性的改变。
*   即使使用满足相同接口的替代方法替换嵌入类型，也是一个破坏性的改变。

尽管编写这些委托方法是乏味的，但是额外的工作隐藏了实现细节，留下了更多的更改机会，还消除了在文档中发现完整列表接口的间接性操作。

#### 避免使用内置名称

Go 语言规范 [language specification](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec&source=article&objectId=2295672) 概述了几个内置的， 不应在 Go 项目中使用的名称标识 [predeclared identifiers](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec%23Predeclared_identifiers&source=article&objectId=2295672)。

根据上下文的不同，将这些标识符作为名称重复使用， 将在当前作用域（或任何嵌套作用域）中隐藏原始标识符，或者混淆代码。 在最好的情况下，编译器会报错；在最坏的情况下，这样的代码可能会引入潜在的、难以恢复的错误。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1var error string 2// `error` 作用域隐式覆盖 3 4// or 5 6func handleErrorMessage(error string) { 7 // `error` 作用域隐式覆盖 8}</p></td><td><p>1var errorMessage string 2// `error` 指向内置的非覆盖 3 4// or 5 6func handleErrorMessage(msg string) { 7 // `error` 指向内置的非覆盖 8}</p></td></tr><tr><td><p>1type Foo struct { 2 // 虽然这些字段在技术上不构成阴影，但 `error` 或 `string` 字符串的重映射现在是不明确的。 3 error error 4 string string 5} 6 7func (f Foo) Error() error { 8 // `error` 和 `f.error` 在视觉上是相似的 9 return f.error 10} 11 12func (f Foo) String() string { 13 // `string` and `f.string` 在视觉上是相似的 14 return f.string 15}</p></td><td><p>1type Foo struct { 2 // `error` and `string` 现在是明确的。 3 err error 4 str string 5} 6 7func (f Foo) Error() error { 8 return f.err 9} 10 11func (f Foo) String() string { 12 return f.str 13}</p></td></tr></tbody></table>

注意，编译器在使用预先分隔的标识符时不会生成错误， 但是诸如`go vet`之类的工具会正确地指出这些和其他情况下的隐式问题。

#### 避免使用 `init()`

尽可能避免使用`init()`。当`init()`是不可避免或可取的，代码应先尝试：

1.  无论程序环境或调用如何，都要完全确定。
2.  避免依赖于其他`init()`函数的顺序或副作用。虽然`init()`顺序是明确的，但代码可以更改， 因此`init()`函数之间的关系可能会使代码变得脆弱和容易出错。
3.  避免访问或操作全局或环境状态，如机器信息、环境变量、工作目录、程序参数 / 输入等。
4.  避免`I/O`，包括文件系统、网络和系统调用。

不能满足这些要求的代码可能属于要作为`main()`调用的一部分（或程序生命周期中的其他地方）， 或者作为`main()`本身的一部分写入。特别是，打算由其他程序使用的库应该特别注意完全确定性， 而不是执行 “init magic”

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type Foo struct { 2 // ... 3} 4var _defaultFoo Foo 5func init() { 6 _defaultFoo = Foo{ 7 // ... 8 } 9}</p></td><td><p>1var _defaultFoo = Foo{ 2 // ... 3} 4// or, 为了更好的可测试性: 5var _defaultFoo = defaultFoo() 6func defaultFoo() Foo { 7 return Foo{ 8 // ... 9 } 10}</p></td></tr><tr><td><p>1type Config struct { 2 // ... 3} 4var _config Config 5func init() { 6 // Bad: 基于当前目录 7 cwd, _ := os.Getwd() 8 // Bad: I/O 9 raw, _ := ioutil.ReadFile(10 path.Join(cwd, "config", "config.yaml"), 11 ) 12 yaml.Unmarshal(raw, &amp;_config) 13}</p></td><td><p>1type Config struct { 2 // ... 3} 4func loadConfig() Config {5 cwd, err := os.Getwd() 6 // handle err 7 raw, err := ioutil.ReadFile( 8 path.Join(cwd, "config", "config.yaml"), 9 ) 10 // handle err 11 var config Config 12 yaml.Unmarshal(raw, &amp;config) 13 return config 14}</p></td></tr></tbody></table>

考虑到上述情况，在某些情况下，`init()`可能更可取或是必要的，可能包括：

*   不能表示为单个赋值的复杂表达式。
*   可插入的钩子，如`database/sql`、编码类型注册表等。
*   对 Google Cloud Functions 和其他形式的确定性预计算的优化。

#### 追加时优先指定切片容量

追加时优先指定切片容量

在尽可能的情况下，在初始化要追加的切片时为`make()`提供一个容量值。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1for n := 0; n &lt; b.N; n++ {2 data := make([]int, 0) 3 for k := 0; k &lt; size; k++{ 4 data = append(data, k) 5 } 6}</p></td><td><p>1for n := 0; n &lt; b.N; n++ {2 data := make([]int, 0, size) 3 for k := 0; k &lt; size; k++{ 4 data = append(data, k) 5 } 6}</p></td></tr><tr><td><p>1BenchmarkBad-4 100000000 2.48s</p></td><td><p>1BenchmarkGood-4 100000000 0.21s</p></td></tr></tbody></table>

#### 主函数退出方式 (Exit)

Go 程序使用 [`os.Exit`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fos%2F%23Exit&source=article&objectId=2295672) 或者 [`log.Fatal*`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fpkg%2Flog%2F%23Fatal&source=article&objectId=2295672) 立即退出 (使用`panic`不是退出程序的好方法，请 [don’t panic](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23%25E4%25B8%258D%25E8%25A6%2581-panic&source=article&objectId=2295672).)

** 仅在`main（）`** 中调用其中一个 `os.Exit` 或者 `log.Fatal*`。所有其他函数应将错误返回到信号失败中。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func main() {2 body := readFile(path) 3 fmt.Println(body) 4} 5func readFile(path string) string { 6 f, err := os.Open(path) 7 if err != nil { 8 log.Fatal(err) 9 } 10 b, err := ioutil.ReadAll(f) 11 if err != nil { 12 log.Fatal(err) 13 } 14 return string(b) 15}</p></td><td><p>1func main() {2 body, err := readFile(path) 3 if err != nil { 4 log.Fatal(err) 5 } 6 fmt.Println(body) 7} 8func readFile(path string) (string, error) { 9 f, err := os.Open(path) 10 if err != nil { 11 return "", err 12 } 13 b, err := ioutil.ReadAll(f) 14 if err != nil { 15 return "", err 16 } 17 return string(b), nil 18}</p></td></tr></tbody></table>

原则上：退出的具有多种功能的程序存在一些问题：

*   不明显的控制流：任何函数都可以退出程序，因此很难对控制流进行推理。
*   难以测试：退出程序的函数也将退出调用它的测试。这使得函数很难测试，并引入了跳过 `go test` 尚未运行的其他测试的风险。
*   跳过清理：当函数退出程序时，会跳过已经进入`defer`队列里的函数调用。这增加了跳过重要清理任务的风险。

##### 一次性退出

如果可能的话，你的`main（）`函数中**最多一次** 调用 `os.Exit`或者`log.Fatal`。如果有多个错误场景停止程序执行，请将该逻辑放在单独的函数下并从中返回错误。 这会缩短 `main()`函数，并将所有关键业务逻辑放入一个单独的、可测试的函数中。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1package main 2func main() {3 args := os.Args[1:] 4 if len(args) != 1 { 5 log.Fatal("missing file") 6 } 7 name := args[0] 8 f, err := os.Open(name) 9 if err != nil { 10 log.Fatal(err) 11 } 12 defer f.Close() 13 // 如果我们调用 log.Fatal 在这条线之后 14 // f.Close 将会被执行. 15 b, err := ioutil.ReadAll(f) 16 if err != nil { 17 log.Fatal(err) 18 } 19 // ... 20}</p></td><td><p>1package main 2func main() {3 if err := run(); err != nil { 4 log.Fatal(err) 5 } 6} 7func run() error { 8 args := os.Args[1:] 9 if len(args) != 1 { 10 return errors.New("missing file") 11 } 12 name := args[0] 13 f, err := os.Open(name) 14 if err != nil { 15 return err 16 } 17 defer f.Close() 18 b, err := ioutil.ReadAll(f) 19 if err != nil { 20 return err 21 } 22 // ... 23}</p></td></tr></tbody></table>

### 性能

性能方面的特定准则只适用于高频场景。

#### 优先使用 strconv 而不是 fmt

将原语转换为字符串或从字符串转换时，`strconv`速度比`fmt`快。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1for i := 0; i &lt; b.N; i++ {2 s := fmt.Sprint(rand.Int()) 3}</p></td><td><p>1for i := 0; i &lt; b.N; i++ {2 s := strconv.Itoa(rand.Int()) 3}</p></td></tr><tr><td><p>1BenchmarkFmtSprint-4 143 ns/op 2 allocs/op</p></td><td><p>1BenchmarkStrconv-4 64.2 ns/op 1 allocs/op</p></td></tr></tbody></table>

#### 避免字符串到字节的转换

不要反复从固定字符串创建字节 slice。相反，请执行一次转换并捕获结果。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1for i := 0; i &lt; b.N; i++ {2 w.Write([]byte("Hello world")) 3}</p></td><td><p>1data := []byte("Hello world") 2for i := 0; i &lt; b.N; i++ { 3 w.Write(data) 4}</p></td></tr><tr><td><p>1BenchmarkBad-4 50000000 22.2 ns/op</p></td><td><p>1BenchmarkGood-4 500000000 3.25 ns/op</p></td></tr></tbody></table>

#### 指定容器容量

尽可能指定[容器](https://cloud.tencent.com/product/tke?from_column=20065&from=20065)容量，以便为容器预先分配内存。这将在添加元素时最小化后续分配（通过复制和调整容器大小）。

##### 指定 Map 容量提示

在尽可能的情况下，在使用 `make()` 初始化的时候提供容量信息

向`make()`提供容量提示会在初始化时尝试调整 map 的大小，这将减少在将元素添加到 map 时为 map 重新分配内存。

注意，与 slices 不同。map capacity 提示并不保证完全的抢占式分配，而是用于估计所需的 hashmap bucket 的数量。 因此，在将元素添加到 map 时，甚至在指定 map 容量时，仍可能发生分配。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1m := make(map[string]os.FileInfo) 2 3files, _ := ioutil.ReadDir("./files") 4for _, f := range files { 5 m[f.Name()] = f 6}</p></td><td><p>1 2files, _ := ioutil.ReadDir("./files") 3 4m := make(map[string]os.FileInfo, len(files)) 5for _, f := range files { 6 m[f.Name()] = f 7}</p></td></tr><tr><td><p>m 是在没有大小提示的情况下创建的； 在运行时可能会有更多分配。</p></td><td><p>m 是有大小提示创建的；在运行时可能会有更少的分配。</p></td></tr></tbody></table>

##### 指定切片容量

在尽可能的情况下，在使用`make()`初始化切片时提供容量信息，特别是在追加切片时。

```
1make(map[T1]T2, hint)
```

与 maps 不同，slice capacity 不是一个提示：编译器将为提供给`make()`的 slice 的容量分配足够的内存， 这意味着后续的 append()` 操作将导致零分配（直到 slice 的长度与容量匹配，在此之后，任何 append 都可能调整大小以容纳其他元素）。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1for n := 0; n &lt; b.N; n++ {2 data := make([]int, 0) 3 for k := 0; k &lt; size; k++{ 4 data = append(data, k) 5 } 6}</p></td><td><p>1for n := 0; n &lt; b.N; n++ {2 data := make([]int, 0, size) 3 for k := 0; k &lt; size; k++{ 4 data = append(data, k) 5 } 6}</p></td></tr><tr><td><p>1BenchmarkBad-4 100000000 2.48s</p></td><td><p>1BenchmarkGood-4 100000000 0.21s</p></td></tr></tbody></table>

### 规范

#### 一致性

本文中概述的一些标准都是客观性的评估，是根据场景、上下文、或者主观性的判断；

但是最重要的是，**保持一致**.

一致性的代码更容易维护、是更合理的、需要更少的学习成本、并且随着新的约定出现或者出现错误后更容易迁移、更新、修复 bug

相反，在一个代码库中包含多个完全不同或冲突的代码风格会导致维护成本开销、不确定性和认知偏差。所有这些都会直接导致速度降低、代码审查痛苦、而且增加 bug 数量。

将这些标准应用于代码库时，建议在 package（或更大）级别进行更改，子包级别的应用程序通过将多个样式引入到同一代码中，违反了上述关注点。

#### 相似的声明放在一组

Go 语言支持将相似的声明放在一个组内。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1import "a" 2import "b"</p></td><td><p>1import ( 2 "a" 3 "b" 4)</p></td></tr></tbody></table>

这同样适用于常量、变量和类型声明：

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1 2const a = 1 3const b = 2 4 5var a = 1 6var b = 2 7 8type Area float64 9type Volume float64</p></td><td><p>1const ( 2 a = 1 3 b = 2 4) 5 6var ( 7 a = 1 8 b = 2 9) 10 11type ( 12 Area float64 13 Volume float64 14)</p></td></tr></tbody></table>

仅将相关的声明放在一组。不要将不相关的声明放在一组。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type Operation int 2 3const ( 4 Add Operation = iota + 1 5 Subtract 6 Multiply 7 EnvVar = "MY_ENV" 8)</p></td><td><p>1type Operation int 2 3const ( 4 Add Operation = iota + 1 5 Subtract 6 Multiply 7) 8 9const EnvVar = "MY_ENV"</p></td></tr></tbody></table>

分组使用的位置没有限制，例如：你可以在函数内部使用它们：

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func f() string {2 var red = color.New(0xff0000) 3 var green = color.New(0x00ff00) 4 var blue = color.New(0x0000ff) 5 6 ... 7}</p></td><td><p>1func f() string { 2 var (3 red = color.New(0xff0000) 4 green = color.New(0x00ff00) 5 blue = color.New(0x0000ff) 6 ) 7 8 ... 9}</p></td></tr></tbody></table>

#### import 分组

导入应该分为两组：

*   标准库
*   其他库

默认情况下，这是 goimports 应用的分组。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1import ( 2 "fmt" 3 "os" 4 "go.uber.org/atomic" 5 "golang.org/x/sync/errgroup" 6)</p></td><td><p>1import ( 2 "fmt" 3 "os" 4 5 "go.uber.org/atomic" 6 "golang.org/x/sync/errgroup" 7)</p></td></tr></tbody></table>

#### 包名

当命名包时，请按下面规则选择一个名称：

*   全部小写。没有大写或下划线。
*   大多数使用命名导入的情况下，不需要重命名。
*   简短而简洁。请记住，在每个使用的地方都完整标识了该名称。
*   不用复数。例如`net/url`，而不是`net/urls`。
*   不要用 “common”，“util”，“shared” 或“lib”。这些是不好的，信息量不足的名称。

另请参阅 [Package Names](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fblog.golang.org%2Fpackage-names&source=article&objectId=2295672) 和 [Go 包样式指南](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Frakyll.org%2Fstyle-packages%2F&source=article&objectId=2295672).

#### 函数名

我们遵循 Go 社区关于使用 [MixedCaps 作为函数名](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html%23mixed-caps&source=article&objectId=2295672) 的约定。有一个例外，为了对相关的测试用例进行分组，函数名可能包含下划线，如：`TestMyFunction_WhatIsBeingTested`.

#### 导入别名

如果程序包名称与导入路径的最后一个元素不匹配，则必须使用导入别名。

```
1make([]T, length, capacity)
```

在所有其他情况下，除非导入之间有直接冲突，否则应避免导入别名。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1import ( 2 "fmt" 3 "os" 4 5 nettrace "golang.net/x/trace" 6)</p></td><td><p>1import ( 2 "fmt" 3 "os" 4 "runtime/trace" 5 6 nettrace "golang.net/x/trace" 7)</p></td></tr></tbody></table>

#### 函数分组与顺序

*   函数应按粗略的调用顺序排序。
*   同一文件中的函数应按接收者分组。

因此，导出的函数应先出现在文件中，放在`struct`, `const`, `var`定义的后面。

在定义类型之后，但在接收者的其余方法之前，可能会出现一个 `newXYZ()`/`NewXYZ()`

由于函数是按接收者分组的，因此普通工具函数应在文件末尾出现。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func (s *something) Cost() { 2 return calcCost(s.weights) 3} 4 5type something struct{ ... } 6 7func calcCost(n []int) int {...} 8 9func (s *something) Stop() {...} 10 11func newSomething() *something { 12 return &amp;something{} 13}</p></td><td><p>1type something struct{...} 2 3func newSomething() *something { 4 return &amp;something{} 5} 6 7func (s *something) Cost() { 8 return calcCost(s.weights) 9} 10 11func (s *something) Stop() {...} 12 13func calcCost(n []int) int {...}</p></td></tr></tbody></table>

#### 减少嵌套

代码应通过尽可能先处理错误情况 / 特殊情况并尽早返回或继续循环来减少嵌套。减少嵌套多个级别的代码的代码量。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1for _, v := range data { 2 if v.F1 == 1 {3 v = process(v) 4 if err := v.Call(); err == nil { 5 v.Send() 6 } else { 7 return err 8 } 9 } else { 10 log.Printf("Invalid v: %v", v) 11 } 12}</p></td><td><p>1for _, v := range data { 2 if v.F1 != 1 {3 log.Printf("Invalid v: %v", v) 4 continue 5 } 6 7 v = process(v) 8 if err := v.Call(); err != nil { 9 return err 10 } 11 v.Send() 12}</p></td></tr></tbody></table>

#### 不必要的 else

如果在 if 的两个分支中都设置了变量，则可以将其替换为单个 if。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1var a int 2if b { 3 a = 100 4} else { 5 a = 10 6}</p></td><td><p>1a := 10 2if b { 3 a = 100 4}</p></td></tr></tbody></table>

#### 顶层变量声明

在顶层，使用标准`var`关键字。请勿指定类型，除非它与表达式的类型不同。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1var _s string = F() 2 3func F() string { return "A"}</p></td><td><p>1var _s = F() 2// 由于 F 已经明确了返回一个字符串类型，因此我们没有必要显式指定_s 的类型 3// 还是那种类型 4 5func F() string { return "A"}</p></td></tr></tbody></table>

如果表达式的类型与所需的类型不完全匹配，请指定类型。

```
1import (
2  "net/http"
4  client "example.com/client-go"
5  trace "example.com/trace/v2"
6)
```

#### 对于未导出的顶层常量和变量，使用_作为前缀

在未导出的顶级`vars`和`consts`， 前面加上前缀_，以使它们在使用时明确表示它们是全局符号。

例外：未导出的错误值，应以`err`开头。

基本依据：顶级变量和常量具有包范围作用域。使用通用名称可能很容易在其他文件中意外使用错误的值。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// foo.go 2 3const ( 4 defaultPort = 8080 5 defaultUser = "user" 6) 7 8// bar.go 9 10func Bar() { 11 defaultPort := 9090 12 ... 13 fmt.Println("Default port", defaultPort) 14 15 // We will not see a compile error if the first line of 16 // Bar() is deleted. 17}</p></td><td><p>1// foo.go 2 3const ( 4 _defaultPort = 8080 5 _defaultUser = "user" 6)</p></td></tr></tbody></table>

#### 结构体中的嵌入

嵌入式类型（例如 mutex）应位于结构体内的字段列表的顶部，并且必须有一个空行将嵌入式字段与常规字段分隔开。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type Client struct { 2 version int 3 http.Client 4}</p></td><td><p>1type Client struct { 2 http.Client 3 4 version int 5}</p></td></tr></tbody></table>

内嵌应该提供切实的好处，比如以语义上合适的方式添加或增强功能。 它应该在对用户不利影响的情况下完成这项工作（另请参见：`避免在公共结构中嵌入类型`[Avoid Embedding Types in Public Structs](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23avoid-embedding-types-in-public-structs&source=article&objectId=2295672)）。

嵌入 **不应该**:

*   纯粹是为了美观或方便。
*   使外部类型更难构造或使用。
*   影响外部类型的零值。如果外部类型有一个有用的零值，则在嵌入内部类型之后应该仍然有一个有用的零值。
*   作为嵌入内部类型的副作用，从外部类型公开不相关的函数或字段。
*   公开未导出的类型。
*   影响外部类型的复制形式。
*   更改外部类型的 API 或类型语义。
*   嵌入内部类型的非规范形式。
*   公开外部类型的实现详细信息。
*   允许用户观察或控制类型内部。
*   通过包装的方式改变内部函数的一般行为，这种包装方式会给用户带来一些意料之外情况。

简单地说，有意识地和有目的地嵌入。一种很好的测试体验是， “是否所有这些导出的内部方法 / 字段都将直接添加到外部类型” 如果答案是`some`或`no`，不要嵌入内部类型 - 而是使用字段。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1type A struct {2 // Bad: A.Lock() and A.Unlock() 现在可用 3 // 不提供任何功能性好处，并允许用户控制有关 A 的内部细节。 4 sync.Mutex 5}</p></td><td><p>1type countingWriteCloser struct {2 // Good: Write() 在外层提供用于特定目的， 3 // 并且委托工作到内部类型的 Write() 中。 4 io.WriteCloser 5 count int 6} 7func (w *countingWriteCloser) Write(bs []byte) (int, error) { 8 w.count += len(bs) 9 return w.WriteCloser.Write(bs) 10}</p></td></tr><tr><td><p>1type Book struct { 2 // Bad: 指针更改零值的有用性 3 io.ReadWriter 4 // other fields 5} 6// later 7var b Book 8b.Read(...) // panic: nil pointer 9b.String() // panic: nil pointer 10b.Write(...) // panic: nil pointer</p></td><td><p>1type Book struct { 2 // Good: 有用的零值 3 bytes.Buffer 4 // other fields 5} 6// later 7var b Book 8b.Read(...) // ok 9b.String() // ok 10b.Write(...) // ok</p></td></tr><tr><td><p>1type Client struct { 2 sync.Mutex 3 sync.WaitGroup 4 bytes.Buffer 5 url.URL 6}</p></td><td><p>1type Client struct { 2 mtx sync.Mutex 3 wg sync.WaitGroup 4 buf bytes.Buffer 5 url url.URL 6}</p></td></tr></tbody></table>

#### 使用字段名初始化结构体

初始化结构体时，应该指定字段名称。现在由 [`go vet`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fcmd%2Fvet%2F&source=article&objectId=2295672) 强制执行。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1k := User{"John", "Doe", true}</p></td><td><p>1k := User{ 2 FirstName: "John", 3 LastName: "Doe", 4 Admin: true, 5}</p></td></tr></tbody></table>

例外：如果有 3 个或更少的字段，则可以在测试表中省略字段名称。

```
1type myError struct{}
3func (myError) Error() string { return "error" }
5func F() myError { return myError{} }
7var _e error = F()
8// F 返回一个 myError 类型的实例，但是我们要 error 类型
```

#### 本地变量声明

如果将变量明确设置为某个值，则应使用短变量声明形式 (`:=`)。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1var s = "foo"</p></td><td><p>1s := "foo"</p></td></tr></tbody></table>

但是，在某些情况下，`var` 使用关键字时默认值会更清晰。例如，声明空切片。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func f(list []int) { 2 filtered := []int{} 3 for _, v := range list { 4 if v &gt; 10 { 5 filtered = append(filtered, v) 6 } 7 } 8}</p></td><td><p>1func f(list []int) { 2 var filtered []int 3 for _, v := range list { 4 if v &gt; 10 { 5 filtered = append(filtered, v) 6 } 7 } 8}</p></td></tr></tbody></table>

#### nil 是一个有效的 slice

`nil` 是一个有效的长度为 0 的 slice，这意味着，

您不应明确返回长度为零的切片。应该返回`nil` 来代替。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1if x == "" {2 return []int{} 3}</p></td><td><p>1if x == "" { 2 return nil 3}</p></td></tr></tbody></table>

要检查切片是否为空，请始终使用`len(s) == 0`。而非 `nil`。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1func isEmpty(s []string) bool { 2 return s == nil 3}</p></td><td><p>1func isEmpty(s []string) bool { 2 return len(s) == 0 3}</p></td></tr></tbody></table>

零值切片（用`var`声明的切片）可立即使用，无需调用`make()`创建。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1nums := []int{} 2// or, nums := make([]int) 3 4if add1 { 5 nums = append(nums, 1) 6} 7 8if add2 { 9 nums = append(nums, 2) 10}</p></td><td><p>1var nums []int 2 3if add1 {4 nums = append(nums, 1) 5} 6 7if add2 { 8 nums = append(nums, 2) 9}</p></td></tr></tbody></table>

记住，虽然 nil 切片是有效的切片，但它不等于长度为 0 的切片（一个为 nil，另一个不是），并且在不同的情况下（例如序列化），这两个切片的处理方式可能不同。

#### 缩小变量作用域

如果有可能，尽量缩小变量作用范围。除非它与 [减少嵌套](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23%25E5%2587%258F%25E5%25B0%2591%25E5%25B5%258C%25E5%25A5%2597&source=article&objectId=2295672)的规则冲突。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1err := ioutil.WriteFile(name, data, 0644) 2if err != nil { 3 return err 4}</p></td><td><p>1if err := ioutil.WriteFile(name, data, 0644); err != nil { 2 return err 3}</p></td></tr></tbody></table>

如果需要在 if 之外使用函数调用的结果，则不应尝试缩小范围。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1if data, err := ioutil.ReadFile(name); err == nil { 2 err = cfg.Decode(data) 3 if err != nil { 4 return err 5 } 6 7 fmt.Println(cfg) 8 return nil 9} else { 10 return err 11}</p></td><td><p>1data, err := ioutil.ReadFile(name) 2if err != nil { 3 return err 4} 5 6if err := cfg.Decode(data); err != nil { 7 return err 8} 9 10fmt.Println(cfg) 11return nil</p></td></tr></tbody></table>

#### 避免参数语义不明确 (Avoid Naked Parameters)

函数调用中的`意义不明确的参数`可能会损害可读性。当参数名称的含义不明显时，请为参数添加 C 样式注释 (`/* ... */`)

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// func printInfo(name string, isLocal, done bool) 2 3printInfo("foo", true, true)</p></td><td><p>1// func printInfo(name string, isLocal, done bool) 2 3printInfo("foo", true /* isLocal */, true /* done */)</p></td></tr></tbody></table>

对于上面的示例代码，还有一种更好的处理方式是将上面的 `bool` 类型换成自定义类型。将来，该参数可以支持不仅仅局限于两个状态（true/false）。

```
1tests := []struct{
2  op Operation
3  want string
4}{
5  {Add, "add"},
6  {Subtract, "subtract"},
7}
```

#### 使用原始字符串字面值，避免转义

Go 支持使用 [原始字符串字面值](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec%23raw_string_lit&source=article&objectId=2295672)，也就是 "`" 来表示原生字符串，在需要转义的场景下，我们应该尽量使用这种方案来替换。

可以跨越多行并包含引号。使用这些字符串可以避免更难阅读的手工转义的字符串。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1wantError := "unknown name:\"test\""</p></td><td><p>1wantError := `unknown error:"test"`</p></td></tr></tbody></table>

#### 初始化结构体

##### 使用字段名初始化结构

初始化结构时，几乎应该始终指定字段名。目前由 [`go vet`](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fcmd%2Fvet%2F&source=article&objectId=2295672)强制执行。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1k := User{"John", "Doe", true}</p></td><td><p>1k := User{ 2 FirstName: "John", 3 LastName: "Doe", 4 Admin: true, 5}</p></td></tr></tbody></table>

例外：当有 3 个或更少的字段时，测试表中的字段名 _may_ 可以省略。

```
1type Region int
 3const (
 4  UnknownRegion Region = iota
 5  Local
 6)
 8type Status int
10const (
11  StatusReady Status= iota + 1
12  StatusDone
13  // Maybe we will have a StatusInProgress in the future.
14)
16func printInfo(name string, region Region, status Status)
```

##### 省略结构中的零值字段

初始化具有字段名的结构时，除非提供有意义的上下文，否则忽略值为零的字段。 也就是，让我们自动将这些设置为零值

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1user := User{ 2 FirstName: "John", 3 LastName: "Doe", 4 MiddleName: "", 5 Admin: false, 6}</p></td><td><p>1user := User{ 2 FirstName: "John", 3 LastName: "Doe", 4}</p></td></tr></tbody></table>

这有助于通过省略该上下文中的默认值来减少阅读的障碍。只指定有意义的值。

在字段名提供有意义上下文的地方包含零值。例如，[表驱动测试](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23%25E8%25A1%25A8%25E9%25A9%25B1%25E5%258A%25A8%25E6%25B5%258B%25E8%25AF%2595&source=article&objectId=2295672) 中的测试用例可以受益于字段的名称，即使它们是零值的。

```
1tests := []struct{
2  op Operation
3  want string
4}{
5  {Add, "add"},
6  {Subtract, "subtract"},
7}
```

##### 对零值结构使用 `var`

如果在声明中省略了结构的所有字段，请使用 `var` 声明结构。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1user := User{}</p></td><td><p>1var user User</p></td></tr></tbody></table>

这将零值结构与那些具有类似于为 [初始化 Maps] 创建的, 区别于非零值字段的结构区分开来， 并与我们更喜欢的 [declare empty slices](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FCodeReviewComments%23declaring-empty-slices&source=article&objectId=2295672) 方式相匹配。

##### 初始化 Struct 引用

在初始化结构引用时，请使用`&T{}`代替`new(T)`，以使其与结构体初始化一致。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1sval := T{Name: "foo"} 2 3// inconsistent 4sptr := new(T) 5sptr.Name = "bar"</p></td><td><p>1sval := T{Name: "foo"} 2 3sptr := &amp;T{Name: "bar"}</p></td></tr></tbody></table>

#### 初始化 Maps

对于空 map 请使用 `make(..)` 初始化， 并且 map 是通过编程方式填充的。 这使得 map 初始化在表现上不同于声明，并且它还可以方便地在 make 后添加大小提示。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1var ( 2 // m1 读写安全; 3 // m2 在写入时会 panic 4 m1 = map[T1]T2{} 5 m2 map[T1]T2 6)</p></td><td><p>1var ( 2 // m1 读写安全; 3 // m2 在写入时会 panic 4 m1 = make(map[T1]T2) 5 m2 map[T1]T2 6)</p></td></tr><tr><td><p>声明和初始化看起来非常相似的。</p></td><td><p>声明和初始化看起来差别非常大。</p></td></tr></tbody></table>

在尽可能的情况下，请在初始化时提供 map 容量大小，详细请看 [指定 Map 容量提示](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fmousemin.com%2F%23%25E6%258C%2587%25E5%25AE%259AMap%25E5%25AE%25B9%25E9%2587%258F%25E6%258F%2590%25E7%25A4%25BA&source=article&objectId=2295672)。

另外，如果 map 包含固定的元素列表，则使用 map literals(map 初始化列表) 初始化映射。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1m := make(map[T1]T2, 3) 2m[k1] = v1 3m[k2] = v2 4m[k3] = v3</p></td><td><p>1m := map[T1]T2{ 2 k1: v1, 3 k2: v2, 4 k3: v3, 5}</p></td></tr></tbody></table>

基本准则是：在初始化时使用 map 初始化列表 来添加一组固定的元素。否则使用 `make` (如果可以，请尽量指定 map 容量)。

#### 字符串 string format

如果你在函数外声明`Printf`-style 函数的格式字符串，请将其设置为`const`常量。

这有助于`go vet`对格式字符串执行静态分析。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1msg := "unexpected values %v, %v\n" 2fmt.Printf(msg, 1, 2)</p></td><td><p>1const msg = "unexpected values %v, %v\n" 2fmt.Printf(msg, 1, 2)</p></td></tr></tbody></table>

#### 命名 Printf 样式的函数

声明`Printf`-style 函数时，请确保`go vet`可以检测到它并检查格式字符串。

这意味着您应尽可能使用预定义的`Printf`-style 函数名称。`go vet`将默认检查这些。有关更多信息，请参见 [Printf 系列](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fcmd%2Fvet%2F%23hdr-Printf_family&source=article&objectId=2295672)。

如果不能使用预定义的名称，请以 f 结束选择的名称：`Wrapf`，而不是`Wrap`。`go vet`可以要求检查特定的 Printf 样式名称，但名称必须以`f`结尾。

```
1tests := []struct{
2  give string
3  want int
4}{
5  {give: "0", want: 0},
6  // ...
7}
```

另请参阅 [go vet: Printf family check](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fkuzminva.wordpress.com%2F2017%2F11%2F07%2Fgo-vet-printf-family-check%2F&source=article&objectId=2295672).

### 编程模式

#### 表驱动测试

当测试逻辑是重复的时候，通过 [subtests](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fblog.golang.org%2Fsubtests&source=article&objectId=2295672) 使用 table 驱动的方式编写 case 代码看上去会更简洁。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// func TestSplitHostPort(t *testing.T) 2 3host, port, err := net.SplitHostPort("192.0.2.0:8000") 4require.NoError(t, err) 5assert.Equal(t, "192.0.2.0", host) 6assert.Equal(t, "8000", port) 7 8host, port, err = net.SplitHostPort("192.0.2.0:http") 9require.NoError(t, err) 10assert.Equal(t, "192.0.2.0", host) 11assert.Equal(t, "http", port) 12 13host, port, err = net.SplitHostPort(":8000") 14require.NoError(t, err) 15assert.Equal(t, "", host) 16assert.Equal(t, "8000", port) 17 18host, port, err = net.SplitHostPort("1:8") 19require.NoError(t, err) 20assert.Equal(t, "1", host) 21assert.Equal(t, "8", port)</p></td><td><p>1// func TestSplitHostPort(t *testing.T) 2 3tests := []struct{ 4 give string 5 wantHost string 6 wantPort string 7}{ 8 { 9 give: "192.0.2.0:8000", 10 wantHost: "192.0.2.0", 11 wantPort: "8000", 12 }, 13 { 14 give: "192.0.2.0:http", 15 wantHost: "192.0.2.0", 16 wantPort: "http", 17 }, 18 { 19 give: ":8000", 20 wantHost: "", 21 wantPort: "8000", 22 }, 23 { 24 give: "1:8", 25 wantHost: "1", 26 wantPort: "8", 27 }, 28} 29 30for _, tt := range tests { 31 t.Run(tt.give, func(t *testing.T) { 32 host, port, err := net.SplitHostPort(tt.give) 33 require.NoError(t, err) 34 assert.Equal(t, tt.wantHost, host) 35 assert.Equal(t, tt.wantPort, port) 36 }) 37}</p></td></tr></tbody></table>

很明显，使用 test table 的方式在代码逻辑扩展的时候，比如新增 test case，都会显得更加的清晰。

我们遵循这样的约定：将结构体切片称为`tests`。 每个测试用例称为`tt`。此外，我们鼓励使用`give`和`want`前缀说明每个测试用例的输入和输出值。

```
1$ go vet -printfuncs=wrapf,statusf
```

#### 功能选项

功能选项是一种模式，您可以在其中声明一个不透明 Option 类型，该类型在某些内部结构中记录信息。您接受这些选项的可变编号，并根据内部结构上的选项记录的全部信息采取行动。

将此模式用于您需要扩展的构造函数和其他公共 API 中的可选参数，尤其是在这些功能上已经具有三个或更多参数的情况下。

<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td><p>1// package db 2 3func Open( 4 addr string, 5 cache bool, 6 logger *zap.Logger 7) (*Connection, error) { 8 // ... 9}</p></td><td><p>1// package db 2 3type Option interface { 4 // ... 5} 6 7func WithCache(c bool) Option { 8 // ... 9} 10 11func WithLogger(log *zap.Logger) Option { 12 // ... 13} 14 15// Open creates a connection. 16func Open( 17 addr string, 18 opts ...Option, 19) (*Connection, error) { 20 // ... 21}</p></td></tr><tr><td><p>必须始终提供缓存和记录器参数，即使用户希望使用默认值。 1db.Open(addr, db.DefaultCache, zap.NewNop()) 2db.Open(addr, db.DefaultCache, log) 3db.Open(addr, false /* cache */, zap.NewNop()) 4db.Open(addr, false /* cache */, log)</p></td><td><p>只有在需要时才提供选项。 1db.Open(addr) 2db.Open(addr, db.WithLogger(log)) 3db.Open(addr, db.WithCache(false)) 4db.Open( 5 addr, 6 db.WithCache(false), 7 db.WithLogger(log), 8)</p></td></tr></tbody></table>

Our suggested way of implementing this pattern is with an `Option` interface that holds an unexported method, recording options on an unexported `options` struct.

我们建议实现此模式的方法是使用一个 `Option` 接口，该接口保存一个未导出的方法，在一个未导出的 `options` 结构上记录选项。

```
1tests := []struct{
 2  give     string
 3  wantHost string
 4  wantPort string
 5}{
 6  // ...
 7}
 9for _, tt := range tests {
10  // ...
11}
```

注意: 还有一种使用闭包实现这个模式的方法，但是我们相信上面的模式为作者提供了更多的灵活性，并且更容易对用户进行调试和测试。特别是，在不可能进行比较的情况下它允许在测试和模拟中对选项进行比较。此外，它还允许选项实现其他接口，包括 `fmt.Stringer`，允许用户读取选项的字符串表示形式。

还可以参考下面资料：

*   [Self-referential functions and the design of options](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fcommandcenter.blogspot.com%2F2014%2F01%2Fself-referential-functions-and-design.html&source=article&objectId=2295672)
*   [Functional options for friendly APIs](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fdave.cheney.net%2F2014%2F10%2F17%2Ffunctional-options-for-friendly-apis&source=article&objectId=2295672)

### Linting

比任何 “blessed” linter 集更重要的是，lint 在一个代码库中始终保持一致。

我们建议至少使用以下 linters，因为我认为它们有助于发现最常见的问题，并在不需要规定的情况下为代码质量建立一个高标准：

*   [errcheck](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fkisielk%2Ferrcheck&source=article&objectId=2295672) 以确保错误得到处理
*   [goimports](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgodoc.org%2Fgolang.org%2Fx%2Ftools%2Fcmd%2Fgoimports&source=article&objectId=2295672) 格式化代码和管理 imports
*   [golint](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Flint&source=article&objectId=2295672) 指出常见的文体错误
*   [govet](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fcmd%2Fvet%2F&source=article&objectId=2295672) 分析代码中的常见错误
*   [staticcheck](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fstaticcheck.io%2F&source=article&objectId=2295672) 各种静态分析检查

#### Lint Runners

我们推荐 [golangci-lint](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolangci%2Fgolangci-lint&source=article&objectId=2295672) 作为 go-to lint 的运行程序，这主要是因为它在较大的代码库中的性能以及能够同时配置和使用许多规范。这个 repo 有一个示例配置文件[.golangci.yml](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fuber-go%2Fguide%2Fblob%2Fmaster%2F.golangci.yml&source=article&objectId=2295672) 和推荐的 linter 设置。

golangci-lint 有 [various-linters](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolangci-lint.run%2Fusage%2Flinters%2F&source=article&objectId=2295672) 可供使用。建议将上述 linters 作为基本 set，我们鼓励团队添加对他们的项目有意义的任何附加 linters。

**原文链接:** [https://github.com/uber-go/guide](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fuber-go%2Fguide&source=article&objectId=2295672)

**译文链接:** [https://github.com/xxjwxc/uber_go_guide_cn](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fxxjwxc%2Fuber_go_guide_cn&source=article&objectId=2295672)

本文参与 [腾讯云自媒体同步曝光计划](https://cloud.tencent.com/developer/support-plan)，分享自作者个人站点 / 博客。

原始发表：2021 年 08 月 21 日，如有侵权请联系 [cloudcommunity@tencent.com](mailto:cloudcommunity@tencent.com) 删除