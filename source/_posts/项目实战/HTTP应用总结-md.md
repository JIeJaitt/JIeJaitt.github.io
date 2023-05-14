---
title: HTTP应用总结
categories: 项目实战
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: 5dcc809a
date: 2023-02-14 14:59:33
tags:
---
- [blogService源码](https://github.com/go-programming-tour-book/blog-service/blob/master/main.go)
- [viper WIKI](https://github.com/spf13/viper/blob/master/README.md)
- [李文周Goweb](https://github.com/Q1mi/go_web)
- [Go语言配置管理神器——Viper中文教程](https://www.liwenzhou.com/posts/Go/viper/#autoid-0-0-0)


## 编写公共组件
刚想正式的开始编码，你会突然发现，怎么什么配套组件都没有，写起来一点都不顺手，没法形成闭环。

实际上在我们每个公司的项目中，都会有一类组件，我们常称其为基础组件，又或是公共组件，它们是不带强业务属性的，串联着整个应用程序，一般由负责基建或第一批搭建的该项目的同事进行梳理和编写，如果没有这类组件，谁都写一套，是非常糟糕的，并且这个应用程序是无法形成闭环的。

因此在这一章节我们将完成一个 Web 应用中最常用到的一些基础组件，保证应用程序的标准化，一共分为如下五个板块：
![](https://golang2.eddycjy.com/images/ch2/common-component.jpg)

### 错误码标准化

在应用程序的运行中，我们常常需要与客户端进行交互，而交互分别是两点，一个是正确响应下的结果集返回，另外一个是错误响应的错误码和消息体返回，用于告诉客户端，这一次请求发生了什么事，因为什么原因失败了。而在错误码的处理上，又延伸出一个新的问题，那就是错误码的标准化处理，不提前预判，将会造成比较大的麻烦，如下：
![](https://golang2.eddycjy.com/images/ch2/errcode.jpg)

在上图中，我们可以看到客户端分别调用了三个不同的服务端，三个服务端 A、B、C，它们的响应结果的模式都不一样…如果不做任何挣扎的话，那客户端就需要知道它调用的是哪个服务，然后每一个服务写一种错误码处理规则，非常麻烦，那如果后面继续添加新的服务端，如果又不一样，那岂不是适配的更加多了？

至少在大的层面来讲，我们要尽可能的保证每个项目前后端的交互语言规则是一致的，因此在一个新项目搭建之初，其中重要的一项预备工作，那就是标准化我们的错误码格式，保证客户端是“理解”我们的错误码规则，不需要每次都写一套新的。

#### 公共错误码
我们需要在在项目目录下的 `pkg/errcode` 目录新建 common_code.go 文件，用于预定义项目中的一些公共错误码，便于引导和规范大家的使用，如下：

```go
var (
	Success                   = NewError(0, "成功")
	ServerError               = NewError(10000000, "服务内部错误")
	InvalidParams             = NewError(10000001, "入参错误")
	NotFound                  = NewError(10000002, "找不到")
	UnauthorizedAuthNotExist  = NewError(10000003, "鉴权失败，找不到对应的 AppKey 和 AppSecret")
	UnauthorizedTokenError    = NewError(10000004, "鉴权失败，Token 错误")
	UnauthorizedTokenTimeout  = NewError(10000005, "鉴权失败，Token 超时")
	UnauthorizedTokenGenerate = NewError(10000006, "鉴权失败，Token 生成失败")
	TooManyRequests           = NewError(10000007, "请求过多")
)
```

#### 错误处理
接下来我们在项目目录下的 `pkg/errcode` 目录新建 errcode.go 文件，编写常用的一些错误处理公共方法，标准化我们的错误输出，如下：
```go
type Error struct {
	code int `json:"code"`
	msg string `json:"msg"`
	details []string `json:"details"`
}

var codes = map[int]string{}

func NewError(code int, msg string) *Error {
	if _, ok := codes[code]; ok {
		panic(fmt.Sprintf("错误码 %d 已经存在，请更换一个", code))
	}
	codes[code] = msg
	return &Error{code: code, msg: msg}
}

func (e *Error) Error() string {
	return fmt.Sprintf("错误码：%d, 错误信息：%s", e.Code(), e.Msg())
}

func (e *Error) Code() int {
	return e.code
}

func (e *Error) Msg() string {
	return e.msg
}

func (e *Error) Msgf(args []interface{}) string {
	return fmt.Sprintf(e.msg, args...)
}

func (e *Error) Details() []string {
	return e.details
}

func (e *Error) WithDetails(details ...string) *Error {
	newError := *e
	newError.details = []string{}
	for _, d := range details {
		newError.details = append(newError.details, d)
	}

	return &newError
}

func (e *Error) StatusCode() int {
	switch e.Code() {
	case Success.Code():
		return http.StatusOK
	case ServerError.Code():
		return http.StatusInternalServerError
	case InvalidParams.Code():
		return http.StatusBadRequest
	case UnauthorizedAuthNotExist.Code():
		fallthrough
	case UnauthorizedTokenError.Code():
		fallthrough
	case UnauthorizedTokenGenerate.Code():
		fallthrough
	case UnauthorizedTokenTimeout.Code():
		return http.StatusUnauthorized
	case TooManyRequests.Code():
		return http.StatusTooManyRequests
	}

	return http.StatusInternalServerError
}
```
在错误码方法的编写中，我们声明了 `Error` 结构体用于表示错误的响应结果，并利用 `codes` 作为全局错误码的存储载体，便于查看当前注册情况，并在调用 `NewError` 创建新的 `Error` 实例的同时进行排重的校验。

另外相对特殊的是 `StatusCode` 方法，它主要用于针对一些特定错误码进行状态码的转换，因为不同的内部错误码在 HTTP 状态码中都代表着不同的意义，我们需要将其区分开来，便于客户端以及监控/报警等系统的识别和监听。


### 配置管理

在应用程序的运行生命周期中，最直接的关系之一就是应用的配置读取和更新。它的一举一动都有可能影响应用程序的改变，其分别包含如下行为：
