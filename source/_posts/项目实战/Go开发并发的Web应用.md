---
title: Go 开发并发的Web应用
data: 2021-06-29 16:00:03
categories: 项目实战
tags:
- Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 14e55b49
toc: true
sticky:
---



## 【实战】开发一个自增整数生成器

在 Python 和 PhP 中,使用 yield 关键字来让—个函数成为生成器。在Go语言中，则可以使用通道来创建生成器。下面是一个创建自增整数生成器的示例：直到主线向通道索要数据，才添加数据到通道。





```go
package main

import "fmt"

//生成自增的整数
func IntegerGenerator() chan int{
	var ch chan int = make(chan int)

	// 开启 goroutine
	go func() {
		for i := 0; ; i++ {
			ch <- i  // 直到通道索要数据，才把i添加进信道
		}
	}()

	return ch
}

func main() {

	generator := IntegerGenerator()

	for i:=0; i < 100; i++ {  //生成100个自增的整数
		fmt.Println(<-generator)
	}
}
```

## 【实战】开发一个并发的消息发送器

在大流量的 Web 应用中，消息数据往往比较大。这时应该将消息部署成为一个独立的服务，消息服务只负责返回某个用户的新的消息提醒。开发一个并发的消息发送器的示例如下：

```go
package main

import "fmt"

func SendNotification(user string) chan string {

	//......此处省略查询数据库获取新消息。
	//声明一个通道来保存消息
	notifications := make(chan string, 500)

	// 开启一个通道
	go func() {
		//将消息放入通道
		notifications <- fmt.Sprintf("Hi %s, welcome to our site!", user)
	}()

	return notifications
}

func main() {
	barry := SendNotification("barry")     //  获取barry的消息
	shirdon := SendNotification("shirdon") // 获取shirdon的消息

	// 获取消息的返回
	fmt.Println(<-barry)
	fmt.Println(<-shirdon)
}
```

