---
title: Go语言编码规范
date: 2024-09-14T10:51:43+08:00
categories: 编程语言
tags: Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [cloud.tencent.com](https://cloud.tencent.com/developer/article/1911268)

> 各个公司或组织，都有各自不同的 Go 编码规范，但大同小异。规范是一种倡导，不遵守并不代表错误，但当大家都遵守规范时，你会发现，整个世界将变得整洁有序。

#### 文章目录

*   [0. 前言](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [1. 布局篇](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [2. 风格篇](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [3. 功能篇](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [使用 time 处理时间](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [避免在公共结构中嵌入类型](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [4. 初始化](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [初始化 struct](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [初始化 map](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [初始化 slice](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [变量申明](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [避免使用 init()](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [5. 错误处理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [error 处理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [panic 处理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [recover 处理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [类型断言失败处理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [6. 性能篇](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [优先使用 strconv 而不是 fmt](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [指定 slice 容量](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [指定 map 容量](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [7. 注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [包注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [函数注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [结构体注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [变量和常量注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [类型注释](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [8. 命名规范](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [包命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [文件命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [函数命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [结构体命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [接口命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [变量命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [常量命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [方法接收器命名](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [避免使用内置名称](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [9. 流程控制](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [if](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [for](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [range](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [switch](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [return](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [goto](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [主函数退出方式](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [10. 函数](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [入参 & 返回值](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [defer](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [代码行数](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [减少嵌套（圈复杂度）](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [魔法数字](https://cloud.tencent.com/developer?from_column=20421&from=20421)
    *   [函数分组与顺序](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [11. 单元测试](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [12. 依赖管理](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [13. 应用服务](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [14. 常用工具](https://cloud.tencent.com/developer?from_column=20421&from=20421)
*   [参考文献](https://cloud.tencent.com/developer?from_column=20421&from=20421)

0. 前言
-----

各个公司或组织，都有各自不同的 Go 编码规范，但大同小异。规范是一种倡导，不遵守并不代表错误，但当大家都遵守规范时，你会发现，整个世界将变得整洁有序。

本文结合官方编码建议，大厂编码规范和自身项目经验，尽可能以简短的语言给出一套行之有效 Go 编码规范建议，让您的代码高效易读。

本文所述内容均为参考意见，并非标准。其中许多是 Go 的通用准则，而其他扩展准则依赖于下面官方指南：

*   [Effective Go](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fdoc%2Feffective_go.html&source=article&objectId=1911268)
*   [Go Common Mistakes](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FCommonMistakes&source=article&objectId=1911268)
*   [Go Code Review Comments](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Fgo%2Fwiki%2FCodeReviewComments&source=article&objectId=1911268)
*   [The Go Programming Language Specification](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec&source=article&objectId=1911268)

1. 布局篇
------

[Go 项目布局建议](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fdablelv.blog.csdn.net%2Farticle%2Fdetails%2F121311627&source=article&objectId=1911268)

2. 风格篇
------

[Go 编码规范建议——风格篇](https://cloud.tencent.com/developer/article/1931446?from_column=20421&from=20421)

3. 功能篇
------

### 使用 time 处理时间

时间处理很复杂。关于时间的错误假设通常包括以下几点。

*   一天有 24 小时
*   一小时有 60 分钟
*   一周有七天
*   一年 365 天
*   [还有更多](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Finfiniteundo.com%2Fpost%2F25326999628%2Ffalsehoods-programmers-believe-about-time&source=article&objectId=1911268)

例如，在一个时间点上加上 24 小时并不总是产生一个新的日历日。

因此，在处理时间时始终使用 “time” 包，因为它有助于以更安全、更准确的方式处理这些不正确的假设。

*   使用 time.Time 表达瞬时时间

在处理时间的瞬间时使用 time.Time，在比较、添加或减去时间时使用 time.Time 中的方法。

```go
// Bad
func isActive(now, start, stop int) bool {
  return start <= now && now < stop
}

// God
func isActive(now, start, stop time.Time) bool {
  return (start.Before(now) || start.Equal(now)) && now.Before(stop)
}
```

*   使用 time.Duration 表达时间段

```go
// Bad
func poll(delay int) {
  for {
    // ...
    time.Sleep(time.Duration(delay) * time.Millisecond)
  }
}
poll(10) // 是几秒钟还是几毫秒?

// Good
func poll(delay time.Duration) {
  for {
    // ...
    time.Sleep(delay)
  }
}
poll(10*time.Second)
```

*   对外部系统使用 time.Time 和 time.Duration

尽可能在与外部系统交互中使用 `time.Duration` 和 `time.Time`，例如：

*   Command-line 标志: `flag` 通过 `time.ParseDuration` 支持 `time.Duration`
*   JSON: `encoding/json` 通过其 `UnmarshalJSON method` 方法支持将 `time.Time` 编码为 [RFC 3339](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Ftools.ietf.org%2Fhtml%2Frfc3339&source=article&objectId=1911268) 字符串
*   SQL: `database/sql` 支持将 `DATETIME` 或 `TIMESTAMP` 列转换为 `time.Time`，如果底层驱动程序支持则返回
*   YAML: `gopkg.in/yaml.v2` 支持将 `time.Time` 作为 [RFC 3339](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Ftools.ietf.org%2Fhtml%2Frfc3339&source=article&objectId=1911268) 字符串，并通过 `time.ParseDuration` 支持 time.Duration。

当不能在这些交互中使用 `time.Duration` 时，请使用 `int` 或 `float64`，并在字段名称中包含单位。

例如，由于 `encoding/json` 不支持 `time.Duration`，因此该单位包含在字段的名称中。

```go
// Bad
// {"interval": 2}
type Config struct {
  Interval int `json:"interval"`
}

// Good
// {"intervalMillis": 2000}
type Config struct {
  IntervalMillis int `json:"intervalMillis"`
}
```

### 避免在公共结构中嵌入类型

嵌入类型会泄漏实现细节、禁止类型演化、产生模糊的文档，应该尽可能地避免。

```go
// Bad
// ConcreteList 是一个实体列表。
type ConcreteList struct {
  *AbstractList
}

// Good
// ConcreteList 是一个实体列表
type ConcreteList struct {
  list *AbstractList
}
// 添加将实体添加到列表中
func (l *ConcreteList) Add(e Entity) {
  l.list.Add(e)
}
// 移除从列表中移除实体
func (l *ConcreteList) Remove(e Entity) {
  l.list.Remove(e)
}
```

无论是使用嵌入式结构还是使用嵌入式接口，嵌入式类型都会限制类型的演化。

*   向嵌入式接口添加方法是一个破坏性的改变。
*   删除嵌入类型是一个破坏性的改变。
*   即使使用满足相同接口的替代方法替换嵌入类型，也是一个破坏性的改变。

尽管编写这些委托方法是乏味的，但是额外的工作隐藏了实现细节，留下了更多的更改机会，还消除了在文档中发现完整列表接口的间接性操作。

4. 初始化
------

### 初始化 struct

*   使用字段名初始化结构体

```go
// Bad
k := User{"John", "Doe", true}

// Good
k := User{
    FirstName: "John",
    LastName: "Doe",
    Admin: true,
}
```

例外：如果有 **3 个**或更少的字段，则可以在测试表中省略字段名称。

```go
tests := []struct{
  op Operation
  want string
}{
  {Add, "add"},
  {Subtract, "subtract"},
}
```

*   省略结构中的零值字段

```go
// Bad
user := User{
  FirstName: "John",
  LastName: "Doe",
  MiddleName: "",
  Admin: false,
}

// Good
user := User{
  FirstName: "John",
  LastName: "Doe",
}
```

例外：在字段名提供有意义上下文的地方包含零值。例如，表驱动测试中的测试用例可以受益于字段的名称，即使它们是零值的。

```go
tests := []struct{
  give string
  want int
}{
  {give: "0", want: 0},
  // ...
}
```

*   声明零值结构使用 var

```
// Bad
var user := User{}

// Good
var user User
```

*   初始化 Struct 引用

在初始化结构引用时，请使用`&T{}`代替`new(T)`，以使其与结构体初始化一致。

```
// Bad
sval := T{Name: "foo"}

// inconsistent
sptr := new(T)
sptr.Name = "bar"

// Good
sval := T{Name: "foo"}

sptr := &T{Name: "bar"}
```

### 初始化 map

*   对于空 map 请使用`make(..)`初始化。

```
// Bad
var (
  // m1 读写安全;
  // m2 在写入时会 panic
  m1 = map[T1]T2{}
  m2 map[T1]T2
)

// Good
var (
  // m1 读写安全;
  // m2 在写入时会 panic
  m1 = make(map[T1]T2)
  m2 map[T1]T2
)
```

*   试用初始化列表初始化包含固定的元素 map

```
// Bad
m := make(map[T1]T2, 3)
m[k1] = v1
m[k2] = v2
m[k3] = v3

// Good
m := map[T1]T2{
  k1: v1,
  k2: v2,
  k3: v3,
}
```

### 初始化 slice

*   非零值 slice 使用`make()`初始化，并指定容量

```
// Bad
nums := []int{}

// Good
nums := make([]int, 0, SIZE)
```

*   零值切片（用 var 声明的切片）可立即使用，无需调用`make()`创建

```
// Bad
// 非 nil 切片
nums := []int{}

// Good
// nil 切片
var nums []int
```

### 变量申明

*   本地变量声明应使用短变量声明形式（`:=`）

*   尽量缩小变量作用范围。

```
// Bad
var s = "foo"

// Good
s := "foo"
```

### 避免使用 init()

尽可能避免使用 init()。当 init() 是不可避免或可取的，代码应先尝试：

*   无论程序环境或调用如何，都要完全确定。
*   避免依赖于其他 init() 函数的顺序或副作用。虽然 init() 顺序是明确的，但代码可以更改， 因此 init() 函数之间的关系可能会使代码变得脆弱和容易出错。
*   避免访问或操作全局或环境状态，如机器信息、环境变量、工作目录、程序参数 / 输入等。
*   避免 I/O，包括文件系统、网络和系统调用。

5. 错误处理
-------

### error 处理

*   error 作为函数的值返回，必须对 error 进行处理，或将返回值赋值给明确忽略。对于`defer xx.Close()`可以不用显式处理
*   error 作为函数的值返回且有多个返回值的时候，error 必须是最后一个参数

```
// Bad
err := ioutil.WriteFile(name, data, 0644)
if err != nil {
 return err
}

// Good
if err := ioutil.WriteFile(name, data, 0644); err != nil {
 return err
}
```

*   采用独立的错误流进行处理。

```
// 不要采用这种方式
func do() (error, int) {
}

// 要采用下面的方式
func do() (int, error) {
}
```

*   如果函数返回值需用于初始化其他变量，则采用下面的方式：

```
// 不要采用这种方式
if err != nil {
    // error handling
} else {
    // normal code
}

// 而要采用下面的方式
if err != nil {
    // error handling
    return // or continue, etc.
}
// normal code
```

*   错误返回的判断独立处理，不与其他变量组合逻辑判断。

```
x, err := f()
if err != nil {
    // error handling
    return // or continue, etc.
}
// use x
```

*   带参数的 error 生成方式为：`fmt.Errorf("module xxx: %v", err)`，而不是 `errors.New(fmt.Sprintf("module xxx: %v",err))`。

### panic 处理

*   在业务逻辑处理中禁止使用 panic
*   在 main 包中只有当完全不可运行的情况可使用 panic，例如：文件无法打开，[数据库](https://cloud.tencent.com/solution/database?from_column=20065&from=20065)无法连接导致程序无法正常运行
*   对于其它的包，可导出的接口一定不能有 panic
*   在包内传递错误时，不推荐使用 panic 来传递 error

```
// 不要采用这种方式：
x, y, err := f()
if err != nil || y == nil {
    return err   // 当y与err都为空时，函数的调用者会出现错误的调用逻辑
}

// 应当使用如下方式：
x, y, err := f()
if err != nil {
    return err
}
if y == nil {
    return fmt.Errorf("some error")
}
```

*   建议在 main 包中使用 log.Fatal 来记录错误，这样就可以由 log 来结束程序，或者将 panic 抛出的异常记录到日志文件中，方便排查问题
*   panic 捕获只能到 goroutine 最顶层，每个自行启动的 goroutine，必须在入口处捕获 panic，并打印详细堆栈信息或进行其它处理

### recover 处理

*   recover 用于捕获 runtime 的异常，禁止滥用 recover
*   必须在 defer 中使用，一般用来捕获程序运行期间发生异常抛出的 panic 或程序主动抛出的 panic

```
// 不推荐为传递 error 而在包内使用 panic。以下为反面示例

// TError 包内定义的错误类型
type TError string

// Error error接口方法
func (e TError) Error() string {
    return string(e)
}

func do(str string) {
    // ...
    // 此处的 panic 用于传递 error
    panic(TError("错误信息"))
    // ...
}

// Do 包级访问入口
func Do(str string) (err error) {
    defer func() {
        if e := recover(); e != nil {
            err = e.(TError)
        }
    }()
    do(str)
    return nil
}
```

### 类型断言失败处理

*   type assertion 的单个返回值形式针对不正确类型将产生 panic。因此，请始终使用 “comma ok” 惯用法。

```
package main

import (
    "log"
)

func main() {
    defer func() {
        if err := recover(); err != nil {
            // do something or record log
            log.Println("exec panic error: ", err)
            // log.Println(debug.Stack())
        }
    }()
    
    getOne()
    
    panic(44) //手动抛出panic
}

// getOne 模拟 slice 越界 runtime 运行时抛出的 panic
func getOne() {
    defer func() {
        if err := recover(); err != nil {
            // do something or record log
            log.Println("exec panic error: ", err)
            // log.Println(debug.Stack())
        }
    }()
    
    var arr = []string{"a", "b", "c"}
    log.Println("hello,", arr[4])
}

// 执行结果：
2021/10/04 11:07:13 exec panic error:  runtime error: index out of range [4] with length 3
2021/10/04 11:07:13 exec panic error:  44
```

6. 性能篇
------

### 优先使用 strconv 而不是 fmt

将原语转换为字符串或从字符串转换时，`strconv`比`fmt`快。

```
// 不要采用这种方式
t := i.(string)

// 而要采用下面的方式
t, ok := i.(string)
if !ok {
    // 优雅地处理错误
}
```

### 指定 slice 容量

在尽可能的情况下，在使用`make()`初始化切片时提供容量信息，特别是在追加切片时。

```
// Bad
// BenchmarkFmtSprint-4    143 ns/op    2 allocs/op
for i := 0; i < b.N; i++ {
  s := fmt.Sprint(rand.Int())
}

// Good
// BenchmarkStrconv-4    64.2 ns/op    1 allocs/op
for i := 0; i < b.N; i++ {
  s := strconv.Itoa(rand.Int())
}
```

### 指定 map 容量

向`make()`提供容量提示会在初始化时尝试调整`map`的大小，这将减少在将元素添加到`map`时为`map`重新分配内存。

注意，与 slice 不同。map capacity 提示并不保证完全的抢占式分配，而是用于估计所需的 hashmap bucket 的数量。 因此，在将元素添加到 map 时，甚至在指定 map 容量时，仍可能发生分配。

7. 注释
-----

在编码阶段同步写好类型、变量、函数、包注释，注释可以通过`godoc`导出生成文档。

程序中每一个被导出的 (大写的) 名字，都应该有一个文档注释。

所有注释掉的代码在提交 code review 前都应该被删除，除非添加注释讲解为什么不删除， 并且标明后续处理建议（比如删除计划）。

### 包注释

*   每个包都应该有一个包注释。
*   包如果有多个 go 文件，只需要出现在一个 go 文件中（一般是和包同名的文件）即可，格式为：“// Package 包名 包信息描述”。

```
// Bad
// BenchmarkBad-4    100000000    2.48s
for n := 0; n < b.N; n++ {
  data := make([]int, 0)
  for k := 0; k < size; k++{
    data = append(data, k)
  }
}

// Good
// BenchmarkGood-4   100000000    0.21s
for n := 0; n < b.N; n++ {
  data := make([]int, 0, size)
  for k := 0; k < size; k++{
    data = append(data, k)
  }
}
```

### 函数注释

*   每个需要导出的函数或者方法（结构体或者接口下的函数称为方法）都必须有注释。注意，如果方法的接收器为不可导出类型，可以不注释，但需要质疑该方法可导出的必要性。
*   注释描述函数或方法功能、调用方等信息。
*   格式为："// 函数名 函数信息描述"。

```
make(map[T1]T2, hint)
```

*   避免参数语义不明确

函数调用中的意义不明确的参数可能会损害可读性。当参数名称的含义不明显时，请为参数添加 C 样式注释 (`/* ... */`)

```
// Package math provides basic constants and mathematical functions.
package math

// 或者

/*
Package template implements data-driven templates for generating textual
output such as HTML.
....
*/
package template
```

### 结构体注释

*   每个需要导出的自定义结构体或者接口都必须有注释说明。
*   注释对结构进行简要介绍，放在结构体定义的前一行。
*   格式为："// 结构体名 结构体信息描述"。
*   结构体内的可导出成员变量名，如果是个生僻词或意义不明确的词，必须要单独给出注释，放在成员变量的前一行或同一行的末尾。

```
// NewtAttrModel 是属性数据层操作类的工厂方法
func NewAttrModel(ctx *common.Context) *AttrModel {
    // TODO
}
```

### 变量和常量注释

*   每个需要导出的常量和变量都必须有注释说明。
*   注释对常量或变量进行简要介绍，放在常量或变量定义的前一行。
*   大块常量或变量定义时，可在前面注释一个总的说明，然后每一行常量的末尾详细注释该常量。
*   独行注释格式为："// 变量名 描述"，斜线后面紧跟一个空格。

```
// Bad
// func printInfo(name string, isLocal, done bool)
printInfo("foo", true, true)

// Good 
// func printInfo(name string, isLocal, done bool)
printInfo("foo", true /* isLocal */, true /* done */)
```

### 类型注释

*   每个需要导出的类型定义（type definition）和类型别名（type aliases）都必须有注释说明。
*   该注释对类型进行简要介绍，放在定义的前一行。
*   格式为："// 类型名 描述"。

```
// User 用户结构定义了用户基础信息
type User struct {
    Name  string
    Email string
    Demographic string // 族群
}
```

8. 命名规范
-------

命名是代码规范中很重要的一部分，统一的命名规范有利于提高代码的可读性，好的命名仅仅通过命名就可以获取到足够多的信息。

### 包命名

*   保持 package 的名字和目录一致。
*   尽量采取有意义、简短的包名，尽量不要和标准库冲突。
*   包名应该为小写单词，不要使用下划线或者混合大小写，使用多级目录来划分层级。
*   简单明了的包命名，如：time、list、http。
*   不要使用无意义的包名，如`util、common、misc、global`。package 名字应该追求清晰且越来越收敛，符合‘单一职责’原则。而不是像`common`一样，什么都能往里面放，越来越膨胀，让依赖关系变得复杂，不利于阅读、复用、重构。注意，`xx/util/encryption`这样的包名是允许的。

### 文件命名

*   采用有意义、简短的文件名。
*   文件名应该采用小写，并且使用下划线分割各个单词。

### 函数命名

*   函数名必须遵循驼峰式，首字母根据访问控制决定使用大写或小写。
*   代码生成工具自动生成的代码可排除此规则（如协议生成文件 xxx.pb.go , gotests 自动生成文件 xxx_test.go 里面的下划线）。

### 结构体命名

*   采用驼峰命名方式，首字母根据访问控制采用大写或者小写。
*   结构体名应该是名词或名词短语，如 Customer、WikiPage、Account、AddressParser，它不应是动词。
*   避免使用 Data、Info 这类意义太宽泛的结构体名。
*   结构体的定义和初始化格式采用多行，例如：

```
// FlagConfigFile 配置文件的命令行参数名
const FlagConfigFile = "--config"

// 命令行参数
const (
    FlagConfigFile1 = "--config" // 配置文件的命令行参数名1
    FlagConfigFile2 = "--config" // 配置文件的命令行参数名2
    FlagConfigFile3 = "--config" // 配置文件的命令行参数名3
    FlagConfigFile4 = "--config" // 配置文件的命令行参数名4
)

// FullName 返回指定用户名的完整名称
var FullName = func(username string) string {
    return fmt.Sprintf("fake-%s", username)
}
```

### 接口命名

*   命名规则基本保持和结构体命名规则一致。
*   单个函数的接口名以 er 作为后缀，例如 Reader，Writer。

```
// StorageClass 存储类型
type StorageClass string

// FakeTime 标准库时间的类型别名
type FakeTime = time.Time
```

*   两个函数的接口名综合两个函数名。
*   三个以上函数的接口名，类似于结构体名。

```
// User 多行声明
type User struct {
    Name  string
    Email string
}

// 多行初始化
u := User{
    UserName: "john",
    Email:    "john@example.com",
}
```

### 变量命名

*   变量名必须遵循驼峰式，首字母根据访问控制决定大写或小写。
*   特有名词时，需要遵循以下规则： （1）如果变量为私有，且特有名词为首个单词，则使用小写，如 apiClient； （2）其他情况都应该使用该名词原有的写法，如 APIClient、repoID、UserID； （3）错误示例：UrlArray，应该写成 urlArray 或者 URLArray； （4）详细的专有名词列表可参考[这里](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang%2Flint%2Fblob%2F738671d3881b9731cc63024d5d88cf28db875626%2Flint.go%23L770&source=article&objectId=1911268)。
*   若变量类型为 bool 类型，则名称应以 Has，Is，Can 或者 Allow 开头。
*   私有全局变量和局部变量规范一致，均以小写字母开头。
*   代码生成工具自动生成的代码可排除此规则（如 xxx.pb.go 里面的 Id）。
*   变量名更倾向于选择短命名。特别是对于局部变量。 c 比 lineCount 要好，i 比 sliceIndex 要好。基本原则是：变量的使用和声明的位置越远，变量名就需要具备越强的描述性。

### 常量命名

*   常量均需遵循驼峰式。

```
// Reader 字节数组读取接口
type Reader interface {
    // Read 读取整个给定的字节数据并返回读取的长度
    Read(p []byte) (n int, err error)
}
```

*   如果是枚举类型的常量，需要先创建相应类型：

```
// Car 小汽车结构申明
type Car interface {
    // Start ...
    Start([]byte)
    // Stop ...
    Stop() error
    // Recover ...
    Recover()
}
```

*   私有全局常量和局部变量规范一致，均以小写字母开头。

```
// AppVersion 应用程序版本号定义
const AppVersion = "1.0.0"
```

### 方法接收器命名

*   推荐以类名第一个英文首字母的小写作为接收器的命名。
*   接收器的命名在函数超过 20 行的时候不要用单字符。
*   命名不能采用 me，this，self 这类易混淆名称。

### 避免使用内置名称

Go 语言规范 [language specification](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec&source=article&objectId=1911268) 概述了几个内置的，不应在 Go 项目中使用的名称标识 [predeclared identifiers](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgolang.org%2Fref%2Fspec%23Predeclared_identifiers&source=article&objectId=1911268)。

```
// Scheme 传输协议
type Scheme string

// 传输协议
const (
    HTTP Scheme = "http" 	// HTTP 明文传输协议
    HTTPS Scheme = "https" 	// HTTPS 加密传输协议
)
```

编译器在使用预先分隔的标识符时不会生成错误， 但是诸如`go vet`之类的工具会正确地指出这些和其他情况下的隐式问题。

```
const appVersion = "1.0.0"
```

9. 流程控制
-------

### if

*   if 接受初始化语句，约定如下方式建立局部变量

```
Types:
	bool byte complex64 complex128 error float32 float64
	int int8 int16 int32 int64 rune string
	uint uint8 uint16 uint32 uint64 uintptr

Constants:
	true false iota

Zero value:
	nil

Functions:
	append cap close complex copy delete imag len
	make new panic print println real recover
```

*   if 对两个值进行判断时，约定如下顺序：变量在左，常量在右

```
// Bad
// 作用域内隐式覆盖 error interface
var error string

func handleErrorMessage(error string) {
}

// Good
var errorMessage string

func handleErrorMessage(msg string) {
}
```

*   if 对于 bool 类型的变量，应直接进行真假判断

```
if err := file.Chmod(0664); err != nil {
    return err
}
```

*   不必要的 else

如果在 if 的两个分支中都设置变量，则可以将其替换为单个 if。

```
// 不要采用这种方式
if nil != err {
    // error handling
}

// 不要采用这种方式
if 0 == errorCode {
    // do something
}

// 而要采用下面的方式
if err != nil {
    // error handling
}   

// 而要采用下面的方式
if errorCode == 0 {
    // do something
}
```

### for

*   采用短声明建立局部变量

```
var allowUserLogin bool
// 不要采用这种方式
if allowUserLogin == true {
    // do something
}

// 不要采用这种方式
if allowUserLogin == false {
    // do something
}

// 而要采用下面的方式
if allowUserLogin {
    // do something
}

// 而要采用下面的方式
if !allowUserLogin {
    // do something
}
```

### range

*   如果只需要第一项（key），就丢弃第二个（value）

```
// Bad
var a int
if b {
  a = 100
} else {
  a = 10
}

// Good
a := 10
if b {
  a = 100
}
```

*   如果只需要第二项，则把第一项置为下划线

```
sum := 0
for i := 0; i < 10; i++ {
    sum += 1
}
```

### switch

*   要求必须有 default

```
for key := range m {
    if key.expired() {
        delete(m, key)
    }
}
```

### return

*   尽早 return，一旦有错误发生，马上返回

```
sum := 0
for _, v := range array {
    sum += v
}
```

### goto

业务代码禁止使用 goto，其他框架或底层源码推荐尽量不用。

### 主函数退出方式

*   Go 程序使用`os.Exit`或者`log.Fatal*`立即退出，而不是`panic`。
*   一次性退出，如果可能的话，你的`main()`函数中最多一次 调用`os.Exit`或者`log.Fatal`。如果有多个错误场景停止程序执行，请将该逻辑放在单独的函数下并从中返回错误。 这会精简`main()`函数，并将所有关键业务逻辑放入一个单独的、可测试的函数中。

```
switch os := runtime.GOOS; os {
    case "darwin":
        fmt.Println("MAC OS")
    case "linux":
        fmt.Println("Linux.")
    default:
        // freebsd, openbsd,
        // plan9, windows...
        fmt.Printf("%s.\n", os)
}
```

10. 函数
------

### 入参 & 返回值

*   入参和返回值以小写字母开头。
*   入参和返回值均不能超过 **5** 个。
*   尽量用值传递，非指针传递。
*   类型为 map，slice，chan，interface 不要传递指针。
*   返回两个或三个值，或者如果从上下文中不清楚结果的含义，使用命名返回，其它情况不建议使用命名返回。

```
f, err := os.Open(name)
if err != nil {
    return err
}

defer f.Close()

d, err := f.Stat()
if err != nil {
    return err
}

codeUsing(f, d)
```

### defer

*   当存在资源管理时，应紧跟 defer 函数进行资源的释放。
*   判断是否有错误发生之后，再 defer 释放资源。

```
// Bad
package main
func main() {
  args := os.Args[1:]
  if len(args) != 1 {
    log.Fatal("missing file")
  }
  name := args[0]
  f, err := os.Open(name)
  if err != nil {
    log.Fatal(err)
  }
  defer f.Close()
  // 如果我们调用log.Fatal f.Close 将不会被执行
  b, err := ioutil.ReadAll(f)
  if err != nil {
    log.Fatal(err)
  }
  // ...
}

// Good
package main
func main() {
  if err := run(); err != nil {
    log.Fatal(err)
  }
}
func run() error {
  args := os.Args[1:]
  if len(args) != 1 {
    return errors.New("missing file")
  }
  name := args[0]
  f, err := os.Open(name)
  if err != nil {
    return err
  }
  defer f.Close()
  b, err := ioutil.ReadAll(f)
  if err != nil {
    return err
  }
  // ...
}
```

*   禁止在循环中使用 defer，举例如下：

```
// Parent1 ...
func (n *Node) Parent1() *Node

// Parent2 ...
func (n *Node) Parent2() (*Node, error)

// Location ...
func (f *Foo) Location() (lat, long float64, err error)
```

### 代码行数

*   函数长度不能超过 80 行。
*   文件长度不能超过 800 行。

### 减少嵌套（圈复杂度）

*   嵌套深度不能超过 **4 层**

```
resp, err := http.Get(url)
if err != nil {
    return err
}
// 如果操作成功，再defer Close()
defer resp.Body.Close()
```

### 魔法数字

*   如果魔法数字出现超过 **2 次**，则禁止使用。

```
// 不要这样使用
func filterSomething(values []string) {
    for _, v := range values {
        fields, err := db.Query(v) // 示例，实际不要这么查询，防止sql注入
        if err != nil {
            // xxx
        }
        defer fields.Close()
        // 继续使用fields
    }
}

// 应当使用如下的方式：
func filterSomething(values []string) {
    for _, v := range values {
        func() {
            fields, err := db.Query(v) // 示例，实际不要这么查询，防止sql注入
            if err != nil {
            ...
            }
            defer fields.Close()
            // 继续使用fields
        }()
    }
}
```

*   用一个常量代替：

```
// AddArea 添加成功或出错
func (s *BookingService) AddArea(areas ...string) error {
    s.Lock()
    defer s.Unlock()
    
    for _, area := range areas {
        for _, has := range s.areas {
            if area == has {
                return srverr.ErrAreaConflict
            }
        }
        s.areas = append(s.areas, area)
        s.areaOrders[area] = new(order.AreaOrder)
    }
    return nil
}

// 建议调整为这样：

// AddArea 添加成功或出错
func (s *BookingService) AddArea(areas ...string) error {
    s.Lock()
    defer s.Unlock()
    
    for _, area := range areas {
        if s.HasArea(area) {
            return srverr.ErrAreaConflict
        }
        s.areas = append(s.areas, area)
        s.areaOrders[area] = new(order.AreaOrder)
    }
    return nil
}

// HasArea ...
func (s *BookingService) HasArea(area string) bool {
    for _, has := range s.areas {
        if area == has {
            return true
        }
    }
    return false
}
```

### 函数分组与顺序

*   函数应按粗略的调用顺序排序。
*   同一文件中的函数应按接收者分组。

因此，导出的函数应先出现在文件中，放在`struct`, `const`, `var`定义的后面。

在定义类型之后，但在接收者的其余方法之前，可能会出现一个`newXYZ()/NewXYZ()`。

由于函数是按接收者分组的，因此普通工具函数应在文件末尾出现。

```
func getArea(r float64) float64 {
    return 3.14 * r * r
}
func getLength(r float64) float64 {
    return 3.14 * 2 * r
}
```

11. 单元测试
--------

*   单元测试文件名命名规范为 example_test.go。
*   测试用例的函数名称必须以 Test 开头，例如 TestExample。
*   单测文件行数限制是普通文件的 2 倍（1600 行）。单测函数行数限制也是普通函数的 2 倍（160 行）。圈复杂度、列数限制、 import 分组等其他规范细节和普通文件保持一致。
*   由于单测文件内的函数都是不对外的，所有可导出函数可以没有注释，但是结构体定义时尽量不要导出。
*   每个重要的可导出函数都要首先编写测试用例，测试用例和正规代码一起提交方便进行回归测试。
*   表驱动测试

使用 table 驱动的方式编写 case 代码看上去会更简洁。

```
// PI ...
const PI = 3.14

func getArea(r float64) float64 {
    return PI * r * r
}

func getLength(r float64) float64 {
    return PI * 2 * r
}
```

12. 依赖管理
--------

*   go1.11 以上必须使用 go modules 模式

```
// Bad
func (s *something) Cost() {
  return calcCost(s.weights)
}

type something struct{ ... }

func calcCost(n []int) int {...}

func (s *something) Stop() {...}

func newSomething() *something {
    return &something{}
}

// Good
type something struct{ ... }

func newSomething() *something {
    return &something{}
}

func (s *something) Cost() {
  return calcCost(s.weights)
}

func (s *something) Stop() {...}

func calcCost(n []int) int {...}
```

*   代码提交
*   建议使用 go modules 作为依赖管理的项目不提交 vendor 目录
*   使用 go modules 管理依赖的项目， `go.sum`文件必须提交，不要添加到`.gitignore`规则中

13. 应用服务
--------

*   应用服务建议有 README.md 说明文档，介绍服务功能、使用方法、部署时的限制与要求、基础环境依赖等
*   应用服务必须要有接口测试

14. 常用工具
--------

Go 本身在代码规范方面做了很多努力，很多限制都是语法要求，例如左大括号不换行，引用的包或者定义的变量不使用会报错。此外 Go 还是提供了很多好用的工具帮助我们进行代码的规范。

*   gofmt ，大部分的格式问题可以通过 gofmt 解决， gofmt 自动格式化代码，保证所有的 go 代码与官方推荐的格式保持一致，于是所有格式有关问题，都以 gofmt 的结果为准。
*   goimports ，此工具在 gofmt 的基础上增加了自动删除和引入包。
*   go vet ，vet 工具可以帮我们静态分析我们的源码存在的各种问题，例如多余的代码，提前 return 的逻辑， struct 的 tag 是否符合标准等。编译前先执行代码静态分析。
*   golint ，类似 javascript 中的 jslint 的工具，主要功能就是检测代码中不规范的地方。

参考文献
----

[github.com/uber-go/guide](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fuber-go%2Fguide&source=article&objectId=1911268)

[github.com/golang-standards/project-layout](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fgithub.com%2Fgolang-standards%2Fproject-layout&source=article&objectId=1911268)

[书栈网. Go 语言 (Golang) 编码规范](https://cloud.tencent.com/developer/tools/blog-entry?target=https%3A%2F%2Fwww.bookstack.cn%2Fread%2Fgo-code-convention%2Fzh-CN-README.md&source=article&objectId=1911268)

本文参与 [腾讯云自媒体同步曝光计划](https://cloud.tencent.com/developer/support-plan)，分享自作者个人站点 / 博客。

原始发表：2021/10/05 ，如有侵权请联系 [cloudcommunity@tencent.com](mailto:cloudcommunity@tencent.com) 删除