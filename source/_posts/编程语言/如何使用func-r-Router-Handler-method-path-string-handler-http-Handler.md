---
title: 如何使用func (r *Router) Handler(method, path string, handler http.Handler)
toc: true
abbrlink: 7de26cae
date: 2021-06-24 20:42:14
tags:
sticky:
---

如何使用func (r *Router) Handler(method, path string, handler http.Handler)

<!-- more -->
## 如何使用gorilla/mux 的 Handler方法

func (r *Router) Handler(method, path string, handler http.Handler) 是 Router 结构体的一个方法，用于将一个 http.Handler 添加到路由中。

具体来说，它接受三个参数：

- method 是一个字符串，表示 HTTP 方法，比如 "GET"、"POST"、"PUT" 等等。如果要匹配所有方法，可以使用 "*"。
- path 是一个字符串，表示要匹配的 URL 路径。可以包含参数，比如 "/users/:id"。
- handler 是一个 http.Handler，表示要执行的处理器函数。

当请求到达路由器时，路由器将会匹配请求的方法和路径，如果匹配成功，就会执行相应的处理器函数。如果请求的方法或路径不匹配，路由器将会尝试下一个路由规则。

下面是一个例子：
```go
package main

import (
    "fmt"
    "net/http"

    "github.com/gorilla/mux"
)

func main() {
    r := mux.NewRouter()

    r.HandleFunc("/hello/{name}", func(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        name := vars["name"]
        fmt.Fprintf(w, "Hello, %s!", name)
    }).Methods("GET")

    r.Handler("POST", "/hello", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Hello, World!")
    }))

    http.ListenAndServe(":8080", r)
}
```

在这个例子中，我们创建了一个新的 mux.Router 实例，并使用 HandleFunc 和 Handler 方法分别添加了两个路由规则。第一个路由规则使用 HandleFunc 方法添加，它将会匹配所有的 GET 请求，路径为 "/hello/{name}"，并执行一个处理器函数，该函数会从请求 URL 中获取名字参数，并将字符串 "Hello, {name}!" 写入响应体中。

第二个路由规则使用 Handler 方法添加，它将会匹配所有的 POST 请求，路径为 "/hello"，并执行一个匿名函数，该函数将字符串 "Hello, World!" 写入响应体中。

## 如何使用httprouter包的 Handler 方法

httprouter 包中也有一个 Handler 方法，用于将一个 http.Handler 添加到路由中，其函数签名与 gorilla/mux 中的 Handler 方法一致。

具体来说，它接受三个参数：

- method 是一个字符串，表示 HTTP 方法，比如 "GET"、"POST"、"PUT" 等等。如果要匹配所有方法，可以使用 "*"。
- path 是一个字符串，表示要匹配的 URL 路径。可以包含参数，比如 "/users/:id"。
- handler 是一个 http.Handler，表示要执行的处理器函数。

当请求到达路由器时，路由器将会匹配请求的方法和路径，如果匹配成功，就会执行相应的处理器函数。如果请求的方法或路径不匹配，路由器将会尝试下一个路由规则。

下面是一个例子：
```go
package main

import (
    "fmt"
    "net/http"

    "github.com/julienschmidt/httprouter"
)

func main() {
    r := httprouter.New()

    r.GET("/hello/:name", func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
        name := ps.ByName("name")
        fmt.Fprintf(w, "Hello, %s!", name)
    })

    r.Handler("POST", "/hello", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Hello, World!")
    }))

    http.ListenAndServe(":8080", r)
}
```

在这个例子中，我们创建了一个新的 httprouter.Router 实例，并使用 GET 和 Handler 方法分别添加了两个路由规则。第一个路由规则使用 GET 方法添加，它将会匹配所有的 GET 请求，路径为 "/hello/{name}"，并执行一个处理器函数，该函数会从请求 URL 中获取名字参数，并将字符串 "Hello, {name}!" 写入响应体中。

第二个路由规则使用 Handler 方法添加，它将会匹配所有的 POST 请求，路径为 "/hello"，并执行一个匿名函数，该函数将字符串 "Hello, World!" 写入响应体中。

注意，httprouter 中的路由规则匹配顺序是按照添加的顺序进行的，因此更具体的规则需要放在前面，否则可能会被更通用的规则所覆盖。

## r := httprouter.New()之后为什么就能使用 r.GET函数和r.Handler函数了？

在 httprouter 包中，New 函数返回了一个 httprouter.Router 类型的实例，该实例具有多个方法，包括 GET 和 Handler 方法。

这是因为 httprouter.Router 类型实现了 http.Handler 接口，因此可以将其作为参数传递给 http.ListenAndServe 函数，从而处理传入的 HTTP 请求。

在 httprouter 中，路由器的处理方式与标准库中的 http.ServeMux 类似，都是将路由规则映射到处理器函数。但是，httprouter 采用了一些性能优化措施，例如使用 Trie 树来快速匹配路由规则，以提高路由匹配的速度和效率。

因此，当你调用 r.GET 或 r.Handler 函数时，实际上是将一个路由规则添加到 httprouter.Router 实例中。当请求到达路由器时，路由器将会根据路由规则匹配请求的方法和路径，并调用相应的处理器函数来处理请求。