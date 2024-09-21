---
title: if err != nil 太烦？Go 创始人教你如何对错误进行编程！
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: a2df3add
toc: true
date: 2024-09-21 09:21:13
categories:
tags:
sticky:
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [segmentfault.com](https://segmentfault.com/a/1190000042252269)

> 前段时间我分享了一篇文章《10+ 条 Go 官方谚语，你知道几条？》，引发了许多小伙伴的讨论。其中有一条 “Errors are values”，大家在是 “错误是值” 还是 “错...

大家好，我是煎鱼。

前段时间我分享了一篇文章《[10+ 条 Go 官方谚语，你知道几条？](https://link.segmentfault.com/?enc=H3NDdfj1pSODsbi10MzO8w%3D%3D.uYjRUD5QYVYBlXxFVpO0JIifnA7PRtqyAdYSm0bhGIqCLCULEQiWFK%2F7%2FfbMX%2FtcewuPpkZxZrFxPNFVubvJtw%3D%3D)》，引发了许多小伙伴的讨论。其中有一条 “Errors are values”，大家在是 “错误是值” 还是 “错误就是价值” 中反复横跳，纠结不易。

其实说这句话的 Rob Pike，他用一篇文章《[Errors are values](https://link.segmentfault.com/?enc=zebxo4WhOT3buiTjP9tNDQ%3D%3D.2naTFb7R5ARqi0FWj%2Fqmu1%2FCwI2uST9rzRaeAwGTG13LrV6EBvHw1rGmsMZCrfs7 "Errors are values")》诠释了这句谚语的意思，到底是什么？

今天煎鱼和大家一起学习，以下的 “我” 均代表 Rob Pike。

背景
--

Go 程序员，尤其是那些刚接触该语言的程序员，经常讨论的一个问题是如何处理错误。对于以下代码片段出现的次数，谈话经常变成哀叹（各大平台吐槽、批判非常多，认为设计的不好）。

如下代码：

```
if err != nil {
    return err
}
```

### 扫描代码片段

我们最近扫描了我们能找到的所有 Go 开源项目，发现这个代码片段只在每一两页出现一次，比一些人认为的要少。

尽管如此，如果人们仍然认为必须经常输入如下代码：

```
if err != nil
```

那么一定有什么地方出了问题，而明显的目标就是 Go 语言本身（说设计的不好？）。

### 错误的理解

显然这是不幸的，误导的，而且很容易纠正。也许现在的情况是，刚接触 Go 的程序员会问："如何处理错误？"，学习这种模式，然后就此打住。

在其他语言中，人们可能会使用 try-catch 块或其他类似机制来处理错误。因此，程序员认为，当我在以前的语言中会使用 try-catch 时，我在 Go 中只需输入 if err != nil。

随着时间的推移，Go 代码中收集了许多这样的片段，结果感觉很笨拙。

错误是值
----

不管这种解释是否合适，很明显，这些 Go 程序员错过了关于错误的一个基本点：错误是值（Errors are values）。

值可以被编程，既然错误是值，那么错误也可以被编程。

当然，涉及错误值的常见语句是测试它是否为 nil，但是还有无数其他事情可以用错误值做，并且应用其中一些其他事情可以使您的程序更好，消除很多样板。

如果使用死记硬背的 if 语句检查每个错误，就会出现这种情况（也就是 if err != nil 到处都是的情况）。

### bufio 例子

下面是一个来自 bufio 包的 Scanner 类型的简单例子。它的 Scan 方法执行了底层的 I/O，这当然会导致一个错误。然而，Scan 方法根本没有暴露出错误。

相反，它返回一个布尔值，并在扫描结束时运行一个单独的方法，报告是否发生错误。

客户端代码看起来像这样：

```
scanner := bufio.NewScanner(input)
for scanner.Scan() {
    token := scanner.Text()
    // process token
}
if err := scanner.Err(); err != nil {
    // process the error
}
```

当然，有一个 nil 检查错误，但它只出现并执行一次。Scan 方法可以改为定义为：

```
func (s *Scanner) Scan() (token []byte, error)
```

然后，用户代码的例子可能是（取决于如何检索令牌）：

```
scanner := bufio.NewScanner(input)
for {
    token, err := scanner.Scan()
    if err != nil {
        return err // or maybe break
    }
    // process token
}
```

这并没有太大的不同，但有一个重要的区别。在这段代码中，客户端必须在每次迭代时检查错误，但在真正的 Scanner API 中，错误处理是从关键 API 元素中抽象出来的，它正在迭代令牌。

使用真正的 API，客户端的代码因此感觉更自然：循环直到完成，然后担心错误。

错误处理不会掩盖控制流程。

当然，在幕后发生的事情是，一旦 Scan 遇到 I/O 错误，它就会记录它并返回 false。当客户端询问时，一个单独的方法 Err 会报告错误值。

虽然这很微不足道，但它与在每个 `if err != nil` 后到处放或要求客户端检查错误是不一样的。这是用错误值编程。简单的编程，是的，但仍然是编程。

值得强调的是，无论设计如何，程序检查错误是至关重要的，无论它们暴露在哪里。 这里的讨论不是关于如何避免检查错误，而是关于使用语言优雅地处理错误。

实战探讨
----

当我参加在东京举行的 2014 年秋季 GoCon 时，出现了重复错误检查代码的话题。一位热心的 Gopher，在 Twitter 上的名字是 @jxck\_，回应了我们熟悉的关于错误检查的哀叹。

他有一些代码，从结构上看是这样的：

```
_, err = fd.Write(p0[a:b])
if err != nil {
    return err
}
_, err = fd.Write(p1[c:d])
if err != nil {
    return err
}
_, err = fd.Write(p2[e:f])
if err != nil {
    return err
}
// and so on
```

它是非常重复的。在真正的代码中，这段代码比较长，有更多的事情要做，所以不容易只是用一个辅助函数来重构这段代码，但在这种理想化的形式中，一个函数字面的关闭对错误变量会有帮助：

```
var err error
write := func(buf []byte) {
    if err != nil {
        return
    }
    _, err = w.Write(buf)
}
write(p0[a:b])
write(p1[c:d])
write(p2[e:f])
// and so on
if err != nil {
    return err
}
```

这种模式效果很好，但需要在每个执行写入的函数中关闭； 单独的辅助函数使用起来比较笨拙，因为需要在调用之间维护 err 变量（尝试一下）。

我们可以通过借用上面的扫描方法的思路，使之更简洁、更通用、更可重复使用。我在我们的讨论中提到了这个技术，但是 @jxck\_ 没有看到如何应用它。经过长时间的交流，在语言不通的情况下，我问能不能借他的笔记本，打一些代码给他看。

我定义了一个名为 errWriter 的对象，如下所示：

```
type errWriter struct {
    w   io.Writer
    err error
}
```

并给了它一种方法，Write。 它不需要具有标准的 Write 签名，并且部分小写以突出区别。 write 方法调用底层 Writer 的 Write 方法，并记录第一个错误以备参考：

```
func (ew *errWriter) write(buf []byte) {
    if ew.err != nil {
        return
    }
    _, ew.err = ew.w.Write(buf)
}
```

一旦发生错误，Write 方法就会变成无用功，但错误值会被保存。

鉴于 errWriter 类型和它的 Write 方法，上面的代码可以被重构为如下代码：

```go
ew := &errWriter{w: fd}
ew.write(p0[a:b])
ew.write(p1[c:d])
ew.write(p2[e:f])
// and so on
if ew.err != nil {
    return ew.err
}
```

这更干净，甚至与使用闭包相比，也使实际的写入顺序更容易在页面上看到。不再有混乱。使用错误值（和接口）进行编程使代码更好。

很可能同一个包中的其他一些代码可以基于这个想法，甚至直接使用 errWriter。

另外，一旦 errWriter 存在，它可以做更多的事情来帮助，特别是在不太人性化的例子中。它可以积累字节数。它可以将写内容凝聚成一个缓冲区，然后以原子方式传输。还有更多。

事实上，这种模式经常出现在标准库中。 archive/zip 和 net/http 包使用它。 在这个讨论中更突出的是，bufio 包的 Writer 实际上是 errWriter 思想的一个实现。 尽管 bufio.Writer.Write 返回错误，但这主要是为了尊重 io.Writer 接口。

bufio.Writer 的 Write 方法的行为就像我们上面的 errWriter.write 方法一样，Flush 会报错，所以我们的例子可以这样写：

```
b := bufio.NewWriter(fd)
b.Write(p0[a:b])
b.Write(p1[c:d])
b.Write(p2[e:f])
// and so on
if b.Flush() != nil {
    return b.Flush()
}
```

这种方法有一个明显的缺点，至少对于某些应用程序而言：没有办法知道在错误发生之前完成了多少处理。 如果该信息很重要，则需要更细粒度的方法。 不过，通常情况下，最后进行全有或全无检查就足够了。

总结
--

在本文中我们只研究了一种避免重复错误处理代码的技术。

请记住，使用 errWriter 或 bufio.Writer 并不是简化错误处理的唯一方法，而且这种方法并不适用于所有情况。

然而，关键的教训是错误是值，Go 编程语言的全部功能可用于处理它们。

使用该语言来简化您的错误处理。

但请记住：无论您做什么，都要检查您的错误！

> 文章持续更新，可以微信搜【脑子进煎鱼了】阅读，本文 **GitHub** [github.com/eddycjy/blog](https://link.segmentfault.com/?enc=tlEXDAI3V78VzF2YOFeBRg%3D%3D.M3XHJio8jv8nkag450jgwyrJt2dgdFHDBC3AUd4mWdA%3D) 已收录，学习 Go 语言可以看 [Go 学习地图和路线](https://link.segmentfault.com/?enc=DgBlNTnywynOqfHc3lU5gw%3D%3D.HXwKpjXnZ%2B%2B%2BcGcow8LCS1RoMo3O3aAbhAcEUoKaIDssQEWlvZnWgZiDUOkl5xwB)，欢迎 Star 催更。

### Go 图书系列

*   [Go 语言入门系列：初探 Go 项目实战](https://link.segmentfault.com/?enc=K3p5S5usNx66eXGI7LKWfg%3D%3D.BModn4o55VgD%2BWK43qlMp4euJyPAcyPaU13WlTisgxA3RKO98vWy5VvMONcbeDQZ)
*   [Go 语言编程之旅：深入用 Go 做项目](https://link.segmentfault.com/?enc=0%2BsLFTtGC3Mx%2FduCKj4xZQ%3D%3D.qebZ49XpVbXho2Oln5jz6rNcdM0zYqDGCgwJ%2BStV794%3D)
*   [Go 语言设计哲学：了解 Go 的为什么和设计思考](https://link.segmentfault.com/?enc=RO4Jq3tS0KxGj%2BPuJ9wo7w%3D%3D.iL4GgcBHq3kBCnA%2BZPUsdzRN6otQc79CGl%2FU%2FD5YB8Q%3D)
*   [Go 语言进阶之旅：进一步深入 Go 源码](https://link.segmentfault.com/?enc=dsybLtS3LyQ9IFE9XjyMlw%3D%3D.nAfH1aAVorwtfHLkfoZywqAjGNpNHkeERS5hVgf%2B%2FiU%3D)

### 更多阅读

*   [Go 想要加个箭头语法，这下更像 PHP 了！](https://link.segmentfault.com/?enc=iEoDs7DM%2FgbLW5qOZSzaCg%3D%3D.boIrqI%2BDX0kDCAffQYnLvE%2FcjMw%2B3EfZ3t0K051q1P%2BzCZ%2BCycOG214aZthk91uH%2F4xBxU7spW7Plj6pe6o3LQ%3D%3D)
*   [Go 错误处理新思路？用左侧函数和表达式](https://link.segmentfault.com/?enc=HixL0RzUIi4SXYhJmzykcA%3D%3D.RMUCgKgU4wc%2BR7ubeXj4TVLi%2BYHCVID08epV3HxCZ7iZTS4wEvsPHAM5ALGg0jMosaN0RGTHDVEIGO0%2BV8YpyQ%3D%3D)




# 我不允许你只会 if err == nil ，请收下这份优雅处理错误的指南

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [cloud.tencent.com](https://cloud.tencent.com/developer/article/2186230)

> 如果你习惯了 try catch 这样的语法后，会觉得处理错误真简单，然后你再来接触 Go 的错误异常，你会发现他好复杂啊，怎么到处都是 error，到处都需要处理 error。

![](https://ask.qcloudimg.com/http-save/yehe-3055912/9f4ff0a23cdf26d2ac905f6bd195307d.jpg)

Go 的错误异常处理，一直都是一个非常好玩的话题。

如果你习惯了 try catch 这样的语法后，会觉得处理错误真简单，然后你再来接触 Go 的错误异常，你会发现他好复杂啊，怎么到处都是 error，到处都需要处理 error。

所以如果你去一些论坛，或许喷得最多的就是这个点了。

### **一、Go 的约定**

首先咱们需要知道 Go 语言里面有个约定，就是**一个方法的返回参数，我们通常习惯的把错误当最后一个参数返回。**

这虽然官方在这点上没有做硬性规定，但是大家也都习惯这么做，所以大家在写代码时就尽量不要去违反了哈，咱就是放第一个，咱就是玩，估计会被骂死的。

至于为啥 Go 要这样去设计处理异常，咱们这种干饭人事就不去分析了，官方怎么设计咱们就怎么遵守就好了。

### **二、简单错误创建**

Go 的标准库里面为我们提供了**两种**使用字符串快速创建错误的方式。

#### **1、 errors**

我们可以使用 errors 包的 New 方法，传入一个字符串快速地创建。

```
var e error
e = errors.New("我是错误")
```

#### **2、fmt**

可能大多数同学都习惯用 fmt 去输出一些内容，同样他还能为我们创建错误。

```
var e error
e = fmt.Errorf("%s", "我还是错误")
```

相比 errors 包，fmt 还支持格式化字符串输出。

所以从这个角度可以看到，其实错误对 Go 语言来说，其实就是一段字符串。

### **三、哨兵错误**

接下来我们分享 Go 中最常用的设计 error 的方式，那就是哨兵模式。

**怎么去理解呢？**

就像童话故事里一座城堡，在城堡的一些关卡，总会安排各种各样的哨兵，他们不同哨兵负责的事不同。

所以我们通常会在一个包里面设置一些标志性的错误，方便调用者对错误做更好的处理。

拿我们常用的 GORM 这个库吧，我们在查询某条数据的时候，如果没找到这条数据，不知道你是怎么判断的。

其实官方为我们提供了错误哨兵，在源码 `github.com/jinzhu/gorm/errors.go`中：

```go
var (
 // ErrRecordNotFound returns a "record not found error". Occurs only when attempting to query the database with a struct; querying with a slice won't return this error
 ErrRecordNotFound = errors.New("record not found")
 // ErrInvalidSQL occurs when you attempt a query with invalid SQL
 ErrInvalidSQL = errors.New("invalid SQL")
 // ErrInvalidTransaction occurs when you are trying to `Commit` or `Rollback`
 ErrInvalidTransaction = errors.New("no valid transaction")
 // ErrCantStartTransaction can't start transaction when you are trying to start one with `Begin`
 ErrCantStartTransaction = errors.New("can't start transaction")
 // ErrUnaddressable unaddressable value
 ErrUnaddressable = errors.New("using unaddressable value")
)
```

所以我们就可以直接通过返回的 error 来判断是不是没找到数据，下面我写一份假代码：

```
g,_ := gorm.Open()
e = g.Find().Error
if e == gorm.ErrRecordNotFound {
 fmt.Println("没找到")
}
```

其实这样用 == 比较是有坑的，后面我们会讲到。

所以如果我们在写我们的模块的时候，也可以这样去设计我们的错误。

虽然这种设计模式网上也有很多人说不好，因为他建立起了两个包之间的依赖，说人话就是，如果我们要比较错误，就必须导入错误所在的包。

反正任何设计都会有人说好有人说坏，大家理智看到就好了。

### **四、对错误进行编程**

我们**需要时刻记住，Go 语言中错误其实就是一串字符串。**

所以我们尽量避免去比较 error.Error() 输出的值，因为他正常情况下不是给我们人看的，而是给程序看的，同时方便我们调试。

所以，Go 里面的错误其实我们可以进行一系列的编程。

Go 语言中的错误定义是一个借口，只要是声明了 `Error() string` 这个方法，就意味着他就可以判定他是一个错误。

这是 Go 中的错误定义源码：

```
// The error built-in interface type is the conventional interface for
// representing an error condition, with the nil value representing no error.
type error interface {
 Error() string
}
```

如果官方的错误，并不能满足你的需求，咱们也可以自定义。

#### **1、创建错误**

我们先来使用常量去创建自定义错误吧：

```
type MyError string

func (this MyError) Error() string {
 return string(this)
}
```

这样我们就创建好我们的自定义错误了，使用下：

```
func main() {
 var e error
 e = MyError("hello")
 fmt.Println(e)
}
```

当然我们可以把 string 换成 struct ，同时加入很多我们自定义的属性：

```
type MyError struct {
 Code int
 Msg string
}

func NewMyError(code int, msg string) *MyError {
 return &MyError{Code: code, Msg: msg}
}

func (this MyError) Error() string {
 return fmt.Sprintf("%d-%s",this.Code, this.Msg)
}

// FindUser 模拟下我们的业务方法
func FindUser() error {
 return NewMyError(404, "找不到内容")
}

func main() {
 var e error
 e = FindUser()
 fmt.Println(e)
}
```

#### **2、错误的 API**

最后我们来说说 Go 语言中错误的 API，到目前为止，我们面对错误除了输出外，就是使用 == 对错误进行哨兵比较，但是这样未必准确。

所以官方在错误的基础上，又扩展了几个 API。

1、Is

我们面对错误，尽量不要使用这样的方式去比较：

```
// 尽量少用
if e.Error() == "404-找不到内容" {
}
```

尽量少用，最好不用。

也少用这样的方式：

```
var ErrorNotFind = NewMyError(404, "找不到内容")

// FindUser 模拟下我们的业务方法
func FindUser() error {
 return ErrorNotFind
}

func main() {
 var e error
 e = FindUser()
 log.Println(e)

 // 尽量少用
 if e == ErrorNotFind {

 }
}
```

目前我们的错误结构体还是非常简单的，如果我们的结构体里面的属性再多几个，很可能就会出现牛头对马嘴情况。

所以官方为我们提供了 Is 方法的 API，他默认使用 == 将特定的错误与错误链中的错误进行比较，如果不一样，就会去调用错误实现的 Is 方法进行比较。

```
func (this *MyError) Is(target error) bool {
 log.Println("到这里来了....")
 if inputE, ok := target.(*MyError); ok {
  if inputE.Code == this.Code && inputE.Msg == this.Msg {
   return true
  }
 }
 return false
}

func main() {
 var e error
 e = FindUser()
 log.Println(e)

 if errors.Is(e, NewMyError(404, "ddd")) {
  log.Println("是 ErrorNotFind")
 }else {
  log.Println("不是 ErrorNotFind")
 }
}
```

首先我们先去实现下 Is 这个方法，随后我们使用 `errors.Is` 进行比较，你会看到控制台输出了：

```
$ go run main.go 
2022/08/13 17:20:48 404-找不到内容
2022/08/13 17:20:48 到这里来了....
2022/08/13 17:20:48 不是 ErrorNotFind
```

2、Unwrap

这是一个不大常用的 API ，标准库里面 `fmt.Errorf` 就是一个非常典型的使用案例。

场景是什么呢？

我们通常在错误异常的时候，会有给错误加上一些上下文的需求，那在哪里加呢？

就是错误的 `Unwrap` 方法里面：

```
func (this *MyError) Unwrap() error {
 this.Msg = "hello" + this.Msg
 return this
}

func main() {
 var e error
 e = FindUser()
 log.Println("最原始的错误：", e)
 wE := errors.Unwrap(e)
 log.Println("加了上下文的错误：", wE)
}
```

然后看下我们的输出结果：

```
$ go run main.go 
2022/08/13 17:30:06 最原始的错误： 404-找不到内容
2022/08/13 17:30:06 加了上下文的错误： 404-hello找不到内容
```

你会发现，`errors.Unwrap` 后的错误调用了我们自定义错误的 Unwrap 方法，在我们的 msg 前面加了 hello。

对错误进行编程最常用的两个 API 就是这两个了，还有一些不大常用的比如 As，大家感兴趣的可以自行去翻阅下资料。

### **总结**

Go 的错误处理和其他语言不太一样，如果遵守错误处理的规范，不对错误进行隐藏，写出来的代码一般都是比较健壮的。

于是就难免会出现一个包里面，特别多的错误处理代码，这就是时间和空间的博弈，就看 Go 语言的领路人如何取舍了。

其次每个人对错误的理解和处理思路方式都不太一样。

欢迎留下你对错误处理的思路和看法，就比如：

**我们到底是该多使用哨兵错误，还是该少用呢？**

本文参与 [腾讯云自媒体同步曝光计划](https://cloud.tencent.com/developer/support-plan)，分享自微信公众号。

原始发表：2022-08-13，如有侵权请联系 [cloudcommunity@tencent.com](mailto:cloudcommunity@tencent.com) 删除