---
title: 理解 wire 使用与源码分析
categories: 开源精选
toc: true
abbrlink: f36c5805
date: 2023-06-24 20:48:28
tags:
sticky:
---

> 依赖注入？
>
> 依赖注入是指你的组件(通常在go中是结构体)在创建时应该接收到它们的依赖项。这与组件在初始化期间构建自己依赖关系的相关反模式背道而驰。

依赖注入是保持软件“松耦合和易于维护”的最重要的设计原则之一。这一原则被广泛应用于各种开发平台，并且有许多与之相关的优秀工具。

<!-- more -->

```go
package main
import (
 "fmt"
)
type Message string
type Greeter struct {
    Message Message
}
type Event struct {
    Greeter Greeter
}
func NewMessage() Message {
    return Message("Hello there!")
}
func NewGreeter(m Message) Greeter {
    return Greeter{Message: m}
}
func (g Greeter) Greet() Message {
    return g.Message
}
func NewEvent(g Greeter) Event {
    return Event{Greeter: g}
}
func (e Event) Start() {
    msg := e.Greeter.Greet()
    fmt.Println(msg)
}
func main() {
    message := NewMessage()
    greeter := NewGreeter(message)
    event := NewEvent(greeter)

    event.Start()
}
```

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [articles.wesionary.team](https://articles.wesionary.team/dependency-injection-in-go-with-wire-74f81cd222f6)

> Dependency Injection? Dependency Injection is the idea that your components (usually structs in go) s......依赖注入？ 依赖注入是你的组件（通常是 go 中的结构）s 的想法......

[

![](https://miro.medium.com/v2/resize:fill:88:88/2*0NQWPp9ZkqbHsB4zV7eQBQ.jpeg)

](https://medium.com/@santosh.shrestha?source=post_page-----74f81cd222f6--------------------------------)[

![](https://miro.medium.com/v2/resize:fill:48:48/1*65IIKHd-GI1rPmFsZaG-oQ.png)

](https://articles.wesionary.team/?source=post_page-----74f81cd222f6--------------------------------)![](https://miro.medium.com/v2/resize:fit:1400/1*NBicaeTLWW5z69nUnnK-7Q.png)

> **Dependency Injection?**  
> Dependency Injection is the idea that your components (usually structs in go) should receive their dependencies when being created. This runs counter to the associated anti-pattern of components building their own dependencies during initialization.
> 
> 依赖注入？依赖注入是你的组件（通常是 go 中的结构）在创建时应该接收它们的依赖关系的想法。这与组件在初始化期间构建自己的依赖项的相关反模式背道而驰。

Dependency Injection is one of the most important design principles for keeping software “loose-coupling and easy to maintain”. This principle is widely used in all kind of development platforms and there are many excellent tools related to it.

依赖注入是保持软件 “松耦合和易于维护” 的最重要的设计原则之一。该原则广泛用于各种开发平台，并且有许多与之相关的优秀工具。

Let’s code to show Dependency Injection in GO

让我们编写代码来展示 GO 中的依赖注入


---------------------------------------------------------------------

First I will write a very simple program that simulates an event with a greeter greeting guests with a particular message.

首先，我将编写一个非常简单的程序，模拟一个事件，迎宾员用特定的消息问候客人。

```go
package mainimport (
 "fmt"
)type Message stringtype Greeter struct {
    Message Message
}type Event struct {
    Greeter Greeter
}func NewMessage() Message {
    return Message("Hello there!")
}func NewGreeter(m Message) Greeter {
    return Greeter{Message: m}
}func (g Greeter) Greet() Message {
    return g.Message
}func NewEvent(g Greeter) Event {
    return Event{Greeter: g}
}func (e Event) Start() {
    msg := e.Greeter.Greet()
    fmt.Println(msg)
}func main() {
    message := NewMessage()
    greeter := NewGreeter(message)
    event := NewEvent(greeter)

    event.Start()
}
```

What we did above: First we created a message, then we created a greeter with that message, and finally we created an event with that greeter. With all the initialization done, we’re ready to start our event.

我们在上面做了什么：首先我们创建了一个消息，然后我们创建了一个带有该消息的欢迎客人，最后我们创建了一个带有该欢迎员的事件。完成所有初始化后，我们就可以开始活动了。

If you run the file, you will get output:

如果运行该文件，将获得输出：

```
Hello there!
```

We are using the dependency injection design principle. In practice, that means we pass in whatever each component needs. This style of design lends itself to writing easily tested code and makes it easy to swap out one dependency with another.

我们正在使用依赖注入设计原则。在实践中，这意味着我们传递每个组件需要的任何内容。这种设计风格适合编写易于测试的代码，并且可以轻松地将一个依赖项换成另一个依赖项。

> It’s easy to write our own code if the application is small but what if you have a large application and have complicated dependency graph. And if you want to add a new dependency within that complicated tree and make sure that dependency propagates down to the tree. This will be brain storming and a great challenge that will take your time. For this reason, we use tools to make it simple that automates connecting components using dependency injection.
> 
> 如果应用程序很小，编写我们自己的代码很容易，但是如果你有一个大型应用程序并且有复杂的依赖关系图怎么办。如果您想在该复杂树中添加新的依赖项，并确保该依赖项向下传播到树。这将是头脑风暴，也是需要您时间的巨大挑战。出于这个原因，我们使用工具来简化使用依赖注入自动连接组件的过程。

Dependency injection is so important, that there are quite a few solutions for this in the Golang community already, such as **dig** from **Uber** and **inject** from **Facebook**. Both of them implement **runtime** dependency injection through **Reflection** **Mechanisms**.

依赖注入是如此重要，以至于在 Golang 社区中已经有很多解决方案，例如来自 Uber 的挖掘和来自 Facebook 的注入。它们都通过反射机制实现运行时依赖注入。

**How Wire is different than these tools?  
**Wire operates without runtime state or reflection, code written to be used with Wire is useful even for hand-written initialization. Wire can generate source code and implement dependency injection at compile time.

Wire 与这些工具有何不同？Wire 无需运行时状态或反射即可运行，编写用于 Wire 的代码甚至对于手写初始化也很有用。Wire 可以在编译时生成源代码并实现依赖注入。

**Benefits of Using Wire:**  
1. Because wire uses code generation, the resulting container code is obvious and readable.  
2 . Easy debug. If any dependency is missing or being unused, an error will be reported during compiling.

使用电线的好处：1. 由于 wire 使用代码生成，因此生成的容器代码显而易见且可读。2 . 易于调试。如果任何依赖项缺失或未使用，则在编译过程中将报告错误。

Installation

安装


------------------

Installing wire is quite easy, just run

安装电线非常简单，只需运行即可

```
go get github.com/google/wire/cmd/wire
```

Usage

用法


-----------

From above example, we have a main function as:

从上面的例子中，我们有一个 main 函数为：

```go
func main() {
    message := NewMessage()
    greeter := NewGreeter(message)
    event := NewEvent(greeter)

    event.Start()
}
```

Let’s change this into:

让我们将其更改为：

```go
func main() {
    event := InitializeEvent()    event.Start()
}
```

And create **wire.go** file that will have **InitializeEvent()**. It looks something like this:

并创建具有 InitializeEvent（） 的 wire.go 文件。它看起来像这样：

```
package mainimport "github.com/google/wire"func InitializeEvent() Event {
    wire.Build(NewEvent, NewGreeter, NewMessage)
    return Event{}
}
```

Here, we have a single call to **wire.Build** passing in the initializers we want to use. There is no rule on what order you should pass the initializers. For example, you can use:

在这里，我们有一个电话接线。在我们要使用的初始值设定项中进行生成传递。没有关于应传递初始值设定项的顺序的规则。例如，您可以使用：

```
wire.Build(NewEvent, NewGreeter, NewMessage)
// OR
wire.Build(NewMessage, NewGreeter, NewEvent)
// OR
wire.Build(NewMessage, NewEvent, NewGreeter)// So just pass the initializers that you need
```

Now, time to run wire

现在，是时候运行电线了

```
$ wire
```

You should see something like this output:

您应该看到类似以下输出的内容：

```
$ wire
example: wrote ~/example/wire_gen.go
```

Let’s look inside the **wire_gen.go** file.

让我们看看 wire_gen.go 文件的内部。

```
// Code generated by Wire. DO NOT EDIT.//go:generate wire
//+build !wireinjectpackage main// Injectors from wire.go:func InitializeEvent() Event {
 message := NewMessage()
 greeter := NewGreeter(message)
 event := NewEvent(greeter)
 return event
}
```

You can see, wire has implemented the exact function we would have written ourselves.

你可以看到，wire 已经实现了我们自己编写的确切函数。

**Note:**  
1. //go:generate wire  
This means in the future we can regenerate files created by wire simply by running

注：1.go：generate wire 这意味着将来我们可以通过运行来重新生成通过 wire 创建的文件

```
$ go generate
```

If we make changes into our dependency graph then we can regenerate the file.

如果我们对依赖关系图进行更改，那么我们可以重新生成文件。

2. //+build !wireinject  
During compilation, this file will be used so that our dependency graph could work just fine.

2. //+build ！wireinject 在编译过程中，将使用这个文件，以便我们的依赖图可以正常工作。

**If you build or run right now**

**如果立即生成或运行**

```
$ go build
./wire_gen.go:10:6: InitializeEvent redeclared in this block
        previous declaration at ./wire.go:5:24
```

**Why this message?**  
It’s because we have to ignore the wire.go file to run our wire_gen.go that has wired dependency injection.

为什么会有这个消息？这是因为我们必须忽略 wire.go 文件来运行具有有线依赖注入的 wire_gen.go。

So to solve this problem just add **//+build wireinject** into your wire.go file

因此，要解决此问题，只需将 //+build wireinject 添加到您的 wire.go 文件中

Let’s pass one NewPerson initializer that is not a part of this dependency graph. File: **wire.go**

让我们传递一个不属于此依赖项图的 NewPerson 初始值设定项。文件： 线.go

```
package mainimport "github.com/google/wire"func InitializeEvent() Event {
    wire.Build(NewEvent, NewGreeter, NewMessage, NewPerson)
    return Event{}
}
```

Run wire:

线路：

```
//if

如果

 NewPerons

纽庇隆

 is undeclared
wire: ./wire.go:6:50:

./wire.go：6：50：

 undeclared

未申报的

 name:

名字：

 NewPerson
wire: generate failed//if

失败 //if

 NewPerson

新人

 is

是

 declared

宣布

wire: ./wire.go:5:1: inject InitializeEvent: unused

闲置

 provider "main.NewPerson"

“主要。新人”

wire: generate failed
```

What if we forgot to pass any one initializer? File: **wire.go**

如果我们忘记传递任何一个初始值设定项怎么办？文件： 线.go

```
package mainimport "github.com/google/wire"func InitializeEvent() Event {
    wire.Build(NewMessage, NewGreeter)
    return Event{}
}
```

Run wire

```
wire: ./wire.go:5:1:

./wire.go：5：1：

 inject

注入

 InitializeEvent:

初始化事件：

 no

不

 provider

供应商

 found

发现

 for

为

 _/home/cyantosh/Desktop/go-learn.Event,

_/home/cyantosh/Desktop/go-learn. 事件

 output

输出

 of

之

 injector

注射器

wire: _/home/cyantosh/Desktop/go-learn:

_/home/cyantosh/Desktop/go-learn：

 generate failed

失败

wire:

线：

 at

在

 least

最小

 one

一

 generate

生成

 failure

失败


```

Also, the wire will throw errors **needed by some Provider** if the missing initializer has to be used into another. You can try yourself if you want.

此外，如果必须将缺少的初始值设定项用于另一个提供程序，则连线将引发某些提供程序所需的错误。如果你愿意，你可以自己尝试。

Know About two core concepts used in Wire:

了解 Wire 中使用的两个核心概念：

1.  **Provider:** a function that can produce a value. These functions are ordinary Go code.
    
    提供程序：可以生成值的函数。这些函数是普通的 Go 代码。
    

```go
package foobarbaz

type Foo struct {
    X int
}

// ProvideFoo returns a Foo.
func ProvideFoo() Foo {
    return Foo{X: 42}
}
```

Provider functions must be exported in order to be used from other packages, just like ordinary functions.

必须导出提供程序函数才能从其他包中使用，就像普通函数一样。

**Things you can do in Provider:**  
1. can specify dependencies with parameters  
2. can also return errors  
3. can be grouped into provider sets  
4. can also add other provider sets into a provider set

您可以在提供程序中执行的操作：1。可以使用参数 2 指定依赖项。还可以返回错误 3。可以分组到提供程序集中 4。还可以将其他提供程序集添加到提供程序集中

**2. Injectors:** a function that calls providers in dependency order. With Wire, you write the injector’s signature, then Wire generates the function’s body. An injector is declared by writing a function declaration whose body is a call to **wire.Build**.

2. 注入器：按依赖顺序调用提供程序的函数。使用 Wire，您可以编写注入器的签名，然后 Wire 生成函数的主体。注入器是通过编写函数声明来声明的，该函数声明的主体是对 WIRED 的调用。建。

```
func initializeBaz(ctx context.Context) (foobarbaz.Baz, error) {
    wire.Build(ProvideFoo, ProvideBar, ProvideBaz)
    return foobarbaz.Baz{}, nil
}
```

Like providers, injectors can be parameterized on inputs (which then get sent to providers) and can return errors.

与提供程序一样，注入器可以在输入上参数化（然后发送到提供程序），并且可以返回错误。

Wire will produce an implementation of the injector in a file **wire_gen.go**

Wire 将在文件中生成注入器的实现 wire_gen.go

I guess, you have learned a lot about wire tool in go for dependency injection. There are still advance features on top of the concepts of providers and injectors. These includes **Binding** **Interfaces**, **Struct Providers**, **Binding Values**, **Cleanup functions**, and much more. You can know about these things [here](https://github.com/google/wire/blob/master/docs/guide.md).

我想，您已经学到了很多关于用于依赖注入的电线工具的知识。在提供者和注入器的概念之上，仍然有高级功能。其中包括绑定接口、结构提供程序、绑定值、清理函数等。你可以在这里了解这些事情。

**Let’s code a bit more on using wire for GO on dependency injection**

**让我们在依赖注入中使用 GO 的连线进行更多编码**

Imagine we have a simple system that will take a list of URLs, perform an HTTP GET against each of the URLs, and finally concatenate the results of these requests together.

假设我们有一个简单的系统，它将获取一个 URL 列表，对每个 URL 执行 HTTP GET，最后将这些请求的结果连接在一起。

**main.go**

**主去**

```go
package main

import (
	"bytes"

“字节”

	"fmt"

“FMT”

)

type Logger struct{}

func (logger *Logger) Log(message string) {
	fmt.Println(message)
}

type HttpClient struct {
	logger *Logger
}

func (client *HttpClient) Get(url string) string {
	client.logger.Log("Getting " + url)

	// make an HTTP request
	return "my response from " + url
}

func NewHttpClient(logger *Logger) *HttpClient {
	return &HttpClient{logger}
}

type ConcatService struct {
	logger *Logger
	client *HttpClient
}

func (service *ConcatService) GetAll(urls ...string) string {
	service.logger.Log("Running GetAll")

	var result bytes.Buffer

	for _, url := range urls {
		result.WriteString(service.client.Get(url))
	}

	return result.String()
}

func NewConcatService(logger *Logger, client *HttpClient) *ConcatService {
	return &ConcatService{logger, client}
}

func main() {
	service := CreateConcatService()

	result := service.GetAll(
		"http://example.com",
		"https://drewolson.org",
	)

	fmt.Println(result)
}
```

**container.go**

**容器.go**

```go
//+build wireinject

package main

import (
	"github.com/google/wire"
)

func CreateConcatService() *ConcatService {
	panic(wire.Build(
		wire.Struct(new(Logger), "*"),
		NewHttpClient,
		NewConcatService,
	))
}
```

Run wire

运行线

```bash
$ wire
example: wrote ~/example/wire_gen.go 
```

**wire_gen.go**

```go
// Code generated by Wire. DO NOT EDIT.

//go:generate wire
//+build !wireinject

package main

// Injectors from container.go:

func CreateConcatService() *ConcatService {
	logger := &Logger{}
	httpClient := NewHttpClient(logger)
	concatService := NewConcatService(logger, httpClient)
	return concatService
}
```

So this is all about Dependency injection in GO with wire. Hope you learned something. And clap for you as you learned something.

所以这都是关于 GO 中的依赖注入与线。希望你学到了一些东西。当你学到一些东西时为你鼓掌。


## 参考资料
- [GitHub仓库](https://github.com/google/wire)
- [go语言中使用wire实现依赖注入](https://juejin.cn/post/7067141368149180429)
- [Dependency Injection in GO with Wire](https://articles.wesionary.team/dependency-injection-in-go-with-wire-74f81cd222f6)

