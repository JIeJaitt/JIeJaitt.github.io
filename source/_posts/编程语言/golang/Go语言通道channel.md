---
title: Go语言通道channel
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 3e41805f
toc: true
date: 2021-10-28 15:04:46
categories:
tags: Go
sticky:
---

通道(channels)是连接多个协程的管道。 你可以从一个协程将值发送到通道，然后在另一个协程中接收。

使用 `make(chan val-type)` 创建一个新的通道。 通道类型就是他们需要传递值的类型。

使用 `channel <-` 语法 *发送* 一个新的值到通道中。 这里我们在一个新的协程中发送 `"ping"` 到上面创建的 `messages` 通道中。

使用 `<-channel` 语法从通道中 接收 一个值。 这里我们会收到在上面发送的 `"ping"` 消息并将其打印出来。

我们运行程序时，通过通道， 成功的将消息 `"ping"` 从一个协程传送到了另一个协程中。

默认发送和接收操作是阻塞的，直到发送方和接收方都就绪。 这个特性允许我们，不使用任何其它的同步操作， 就可以在程序结尾处等待消息 `"ping"`。

```go
package main

import "fmt"

func main() {

    messages := make(chan string)

    go func() { messages <- "ping" }()

    msg := <-messages
    fmt.Println(msg)
}
```

```bash
$ go run channels.go
ping
```

## 通道缓冲

默认情况下，通道是 *无缓冲* 的，这意味着只有对应的接收（`<- chan`） 通道准备好接收时，才允许进行发送（`chan <-`）。 *有缓冲通道* 允许在没有对应接收者的情况下，缓存一定数量的值。

这里我们 `make` 了一个字符串通道，最多允许缓存 2 个值。

由于此通道是有缓冲的， 因此我们可以将这些值发送到通道中，而无需并发的接收。

然后我们可以正常接收这两个值。

```go
package main

import "fmt"

func main() {

    messages := make(chan string, 2)

    messages <- "buffered"
    messages <- "channel"

    fmt.Println(<-messages)
    fmt.Println(<-messages)
}
```

```bash
$ go run channel-buffering.go 
buffered
channel
```

## 通道同步

## 通道同步

我们可以使用通道来同步协程之间的执行状态。 这儿有一个例子，使用阻塞接收的方式，实现了等待另一个协程完成。 如果需要等待多个协程，[WaitGroup](https://gobyexample-cn.github.io/waitgroups) 是一个更好的选择。

我们将要在协程中运行这个函数。 `done` 通道将被用于通知其他协程这个函数已经完成工作。

发送一个值来通知我们已经完工啦。

运行一个 worker 协程，并给予用于通知的通道。

程序将一直阻塞，直至收到 worker 使用通道发送的通知。

如果你把 `<- done` 这行代码从程序中移除， 程序甚至可能在 `worker` 开始运行前就结束了。

```go
package main

import (
    "fmt"
    "time"
)

func worker(done chan bool) {
    fmt.Print("working...")
    time.Sleep(time.Second)
    fmt.Println("done")

    done <- true
}

func main() {

    done := make(chan bool, 1)
    go worker(done)

    <-done
}
```



















## 参考资料

Go by Example 中文版，通道相关内容：https://gobyexample-cn.github.io/channels