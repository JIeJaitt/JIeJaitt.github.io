---
title: 经典库httprouter源码阅读
categories: 项目实战
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 2f2e68b6
toc: true
---

## 简介

官方：https://github.com/julienschmidt/httprouter

文档：https://godoc.org/github.com/julienschmidt/httprouter

> HttpRouter is a lightweight high performance HTTP request router (also called multiplexer or just mux for short) for Go. In contrast to the default mux of Go's net/http package, this router supports variables in the routing pattern and matches against the request method. It also scales better. The router is optimized for high performance and a small memory footprint. It scales well even with very long paths and a large number of routes. A compressing dynamic trie (radix tree) structure is used for efficient matching.

简单描述，httprouter是一个golang实现的路由组件。httprouter使用一个前缀树来维护映射的父子关系，通过前缀树快速路由。同时其里面的HttpRouter结构体实现了golang的net.http.server的Handler接口，可以作为httpHandle发布。golang以性能出名的gin使用的也就是httprouter来做路由处理。

在go web开发中，很多时候会选用一款web框架，随着项目功能增加，接口也越来越多，一款好的路由框架能很方便的帮助我们管理与维护繁多的接口地址。

## 特性

- 基于基数树实现的高性能路由框架
- 仅支持精确匹配
- 不必关心 URL 结尾的斜线
- 路径自动校正，例如在 url 路径当中有`../`,`//`的时候
- 可以在 URL 当中设置参数，例如`/user/:id`
- 零内存分配
- 不存在服务器崩溃，可以通过设置`panic handler`使服务器从 panic 当中恢复
- 适合 API 构建

# httprouter解读

- 核心思想

  - 与defaultServeMux的实现区别在于什么？采取特殊的数据结构作路由。
  - defaultServeMux的实现采用什么样的数据结构？
  - httprouter的实现采用什么样的数据结构？
  - router的架构图是怎样的，与server.go有何异同
  - 一些http相关的细节
  - 其他细节

- 细读源码

  - Router的 paramsPool？sync.Pool需要看看 *done*
  - 修复重定向是代码大头，得细细解读重定向相关的协议内容 *这部分先跳过吧，细节太多了*
  - http包的server.go里面req的context里面包含了params怎么取消的。*done*
  
  “server.serve => conn.serve ==>defer cancleCtx/ w.cancelCtx() ”
  
  因此， 最要紧的就是看tree.go里面定义的数据结构。最好找图帮助理解
  
- tree
  - addRoute方法为切入口
  - 初次阅读有几个不明白的地方，还需要回顾router.go
	  - 具体的路由规则要烂熟，由此解读node的几个类型
	  - priority/wildchild/indices的意思和作用
	  - test文件的测试有没有没覆盖到的情况？
    

## node 的结构

```go
type node struct {
    path      string
    indices   string 
    wildChild bool
    nType     nodeType
    priority  uint32
    children  []*node
    handle    Handle
}
```

## 依赖

```go
require github.com/julienschmidt/httprouter latest
```

## 使用Demo

```go
package httpRouterDemo

import (
    "net/http"
    "github.com/julienschmidt/httprouter"
)

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    w.Write([]byte("hello world"))
}

func main() {
    router := httprouter.New()
    router.GET("/", Index)
    http.ListenAndServe(":80", router)
}
```

```go
package main

import (
    "fmt"
    "github.com/julienschmidt/httprouter"
    "net/http"
    "log"
)

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    fmt.Fprint(w, "Welcome!\n")
}

func Hello(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    fmt.Fprintf(w, "hello, %s!\n", ps.ByName("name"))
}

func main() {
    router := httprouter.New()
    router.GET("/", Index)
    router.GET("/hello/:name", Hello)

    log.Fatal(http.ListenAndServe(":8080", router))
}
```

和http包的ServeMux用法其实很类似。上面定义了两个httprouter中的handle，类似于http包中的http.HandlerFunc类型，具体的对应关系后文会解释，只要认为它是handler，是处理对应请求的就行了。然后使用New()方法创建了实例，并使用GET()方法为两个模式注册了对应的handler。

需要注意的是，第二个模式"/hello/:name"，它可以用来做命名匹配，类似于正则表达式的命名捕获分组。后面会详细解释用法。

## httprouter用法说明

```bash
Variables
func CleanPath(p string) string
type Handle
type Param
type Params
	func ParamsFromContext(ctx context.Context) Params
	func (ps Params) ByName(name string) string
type Router
	func New() *Router
	func (r *Router) DELETE(path string, handle Handle)
	func (r *Router) GET(path string, handle Handle)
	func (r *Router) HEAD(path string, handle Handle)
	func (r *Router) Handle(method, path string, handle Handle)
	func (r *Router) Handler(method, path string, handler http.Handler)
	func (r *Router) HandlerFunc(method, path string, handler http.HandlerFunc)
	func (r *Router) Lookup(method, path string) (Handle, Params, bool)
	func (r *Router) OPTIONS(path string, handle Handle)
	func (r *Router) PATCH(path string, handle Handle)
	func (r *Router) POST(path string, handle Handle)
	func (r *Router) PUT(path string, handle Handle)
	func (r *Router) ServeFiles(path string, root http.FileSystem)
	func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request)

```

### type Handle

httprouter中的Handle类似于http.HandlerFunc，只不过它支持第三个参数Params。

```go
type Handle func(http.ResponseWriter, *http.Request, Params)
    Handle is a function that can be registered to a route to handle HTTP
    requests. Like http.HandlerFunc, but has a third parameter for the values of
    wildcards (variables).
```

例如前面示例中的Index()和Hello()都是Handle类型的实例。

```go
func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    fmt.Fprint(w, "Welcome!\n")
}

func Hello(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    fmt.Fprintf(w, "hello, %s!\n", ps.ByName("name"))
}
```

### 注册handler

httprouter.Router类型类似于http包中的ServeMux，它实现了http.Handler接口，所以它是一个http.Handler。它可以将请求分配给注册好的handler。

```go
type Router struct {}
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request)
```

除此之外，Router提供了不少方法，用来指示如何为路径注册handler。

```go
func (r *Router) Handle(method, path string, handle Handle)
func (r *Router) Handler(method, path string, handler http.Handler)
func (r *Router) HandlerFunc(method, path string, handler http.HandlerFunc)
```

httprouter.Handle()用于为路径注册指定的Handle，而httprouter.Handle对应于http.HandlerFunc，所以是直接将Handle类型的函数绑定到指定路径上。同时，它还可以指定http方法：GET, POST, HEAD, PUT, PATCH, DELETE, OPTIONS。

这些方法还有对应的各自缩写：

```go
func (r *Router) DELETE(path string, handle Handle)
func (r *Router) GET(path string, handle Handle)
func (r *Router) HEAD(path string, handle Handle)
func (r *Router) OPTIONS(path string, handle Handle)
func (r *Router) PATCH(path string, handle Handle)
func (r *Router) POST(path string, handle Handle)
func (r *Router) PUT(path string, handle Handle)
```

例如，Get()等价于route.Handle("GET", path, handle)。

例如上面的示例中，为两个路径注册了各自的httprouter.Handle函数。

```go
router := httprouter.New()
router.GET("/", Index)
router.GET("/hello/:name", Hello)
```

Handler()方法是直接为指定http方法和路径注册http.Handler；HandlerFunc()方法则是直接为指定http方法和路径注册http.HandlerFunc。

### Param相关

```go
type Param struct {
    Key   string
    Value string
}
Param is a single URL parameter, consisting of a key and a value.

type Params []Param
Params is a Param-slice, as returned by the router. The slice is ordered, the first URL parameter is also the first slice value. It is therefore safe to read values by the index.

func (ps Params) ByName(name string) string
ByName returns the value of the first Param which key matches the given name. If no matching Param is found, an empty string is returned.
```

Param类型是key/value型的结构，每个分组捕获到的值都会保存为此类型。正如前面的示例中：

```go
router.GET("/hello/:name", Hello)
```

这里的`:name`就是key，当请求的URL路径为`/hello/abc`，则key对应的value为abc。也就是说保存了一个Param实例：

```go
Param{
	Key: "name",
	Value: "abc",
}
```

更多的匹配用法稍后解释。

Params是Param的slice。也就是说，每个分组捕获到的key/value都存放在这个slice中。

ByName(str)方法可以根据Param的Key检索已经保存在slice中的Param的Value。正如示例中：

```go
func Hello(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    fmt.Fprintf(w, "hello, %s!\n", ps.ByName("name"))
}

router.GET("/hello/:name", Hello)
```

这里`ByName("name")`将检索保存在slice中，Key="name"的Param，且返回这个Param中的Value。

由于Params是slice结构，除了ByName()方法可以检索key/value，通过slice的方法也可以直接检索：

```bash
ps[0].Key
ps[0].Value
```

## 路径匹配规则

httprouter要为路径注册handler的适合，路径可以进行命名捕获。有两种命名捕获的方式：

```powershell
Syntax    Type
:name     named parameter
*name     catch-all parameter
```

其中`:name`的捕获方式是匹配内容直到下一个斜线或者路径的结尾。例如要为如下路径注册handler:

```ruby
Path: /blog/:category/:post
```

当请求路径为：

```bash
/blog/go/request-routers            match: category="go", post="request-routers"
/blog/go/request-routers/           no match, but the router would redirect
/blog/go/                           no match
/blog/go/request-routers/comments   no match
```

`*name`的捕获方式是从指定位置开始(包含前缀"/")匹配到结尾：

```bash
Path: /files/*filepath

/files/                             match: filepath="/"
/files/LICENSE                      match: filepath="/LICENSE"
/files/templates/article.html       match: filepath="/templates/article.html"
/files                              no match, but the router would redirect
```

再解释下什么时候会进行重定向。在Router类型中，第一个字段控制尾随斜线的重定向操作：

```haskell
type Router struct {
    RedirectTrailingSlash bool
	...
}
```

如果请求的URL路径包含或者不包含尾随斜线时，但在注册的路径上包含了或没有包含"/"的目标上定义了handler，但是会进行301重定向。简单地说，不管URL是否带尾随斜线，只要注册路径不存在，但在去掉尾随斜线或加上尾随斜线的路径上定义了handler，就会自动重定向。

例如注册路径为`/foo`，请求路径为`/foo/`，会重定向。

下面还有几种会重定向的情况：

```bash
注册路径：/blog/:category/:post
请求URL路径：/blog/go/request-routers/

注册路径：/blog/:category
请求URL路径：/blog/go

注册路径：/files/*filepath
请求URL路径：/files
```

### Lookup()

```go
func (r *Router) Lookup(method, path string) (Handle, Params, bool)
```

Lookup根据method+path检索对应的Handle，以及Params，并可以通过第三个返回值判断是否会进行重定向。













## 源码分析

解决两个问题，就基本明白了这个路由框架

- 路由是是如何注册？如何保存的？
- 当请求到来之后，路由是如何匹配，如何查找的？

还是从一个`Hello World`讲起

```go
func main()  {
	r := httprouter.New()
	r.GET("/:name", func(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
        fmt.Fprintf(writer, "hello, %s!\n", params.ByName("name"))
	})
	http.ListenAndServe(":8080",r)
}
```

`httprouter.New()`初始化了一个 Router，下面直接看一下 Router 的结构

### Router

在 Router 的源码当中有十分详尽的注释，这里按照我个人的理解注释一下

```go
// Router实现了Http.Handler接口，用于注册分发路由
type Router struct {
    // trees 是一个基数树集合，每一个HTTP方法对应一棵单独的路由树
    // node是基数树的根节点
	trees map[string]*node

    // 用于开启上文提到的自动处理URL尾部斜杆的特性
    // 这个值为true时，如果/foo/没有被匹配到，会尝试匹配/foo
	RedirectTrailingSlash bool

	// 用于开启上文提到的路由校正的特性
    // 这个值为true时，会对../和//这种路径进行校正
	RedirectFixedPath bool

    // 这个值为true时，如果当前方法的路由没有被匹配到，会尝试匹配其他方法的路由，
    // 如果匹配到了则返回405，如果没有，就交给NotFound Handler处理
	HandleMethodNotAllowed bool

	// 这个值为true时，将开启OPTIONS自动匹配，注意: 手动匹配优先级更高
	HandleOPTIONS bool

    // 没有匹配到相应路由的时候会调用这个方法
    // 如果没有注册这个方法会返回 NotFound
	NotFound http.Handler

	// 没有匹配到相应路由并且HandleMethodNotAllowed为true时会调用这个方法
	MethodNotAllowed http.Handler

    // 用于从panic当中恢复
    // 需要返回500错误，并且渲染相应的错误页面
	PanicHandler func(http.ResponseWriter, *http.Request, interface{})
}
```

初始化 Router 之后看看路由是如何保存并且注册的

### 路由是如何保存的?

这里以官方 Readme 当中的例子说明：
如果注册了以下路由

```tex
r.GET("/", f1)
r.GET("/search/", f2)
r.GET("/support/", f3)
r.GET("/blog/", f4)
r.GET("/blog/:post/", f5)
r.GET("/about_us/", f6)
r.GET("/about_us/team/", f7)
r.GET("/contact/", f8)
```

那么这些路由会如下方所示，以一颗树的形式保存，并且这些路由的公共前缀会被抽离并且变为上一层节点
Priority 表示加上自身一共有多少个节点
Path 表示路径
Handle 表示路由注册的方法

```tex
Priority   Path             Handle
9          \                *<1>
3          ├s               nil
2          |├earch\         *<2>
1          |└upport\        *<3>
2          ├blog\           *<4>
1          |    └:post      nil
1          |         └\     *<5>
2          ├about-us\       *<6>
1          |        └team\  *<7>
1          └contact\        *<8>
```

### r.Handle

`r.Get`, `r.Post`等方法实质都是通过调用 r.Handle 实现的

```go
func (r *Router) Handle(method, path string, handle Handle) {
    // 路径注册必须从/开始，否则直接报错
	if path[0] != '/' {
		panic("path must begin with '/' in path '" + path + "'")
	}

    // 路由树map不存在需要新建
	if r.trees == nil {
		r.trees = make(map[string]*node)
	}

    // 获取当前方法所对应树的根节点，不存在则新建一个
	root := r.trees[method]
	if root == nil {
		root = new(node)
		r.trees[method] = root
	}

    // 向路由树当中添加一条一条路由
	root.addRoute(path, handle)
}
```

### node

路由是注册到一颗路由树当中的，先看看节点的源码，再来分析，是如何添加路由的

```go
type node struct {
    // 当前节点的路径
    path      string

    // 是否为参数节点，参数节点用:name表示
    wildChild bool

    // 当前节点类型， 一共有4种
    // static: 静态节点，默认类型
	// root: 根节点
	// param: 其他节点
	// catchAll: 带有*的节点，这里*的作用和正则当中的*一样
    nType     nodeType

    // 当前路径上最大参数的个数，不能超过255
    maxParams uint8

    // 代表分支的首字母
    // 上面的例子，当前节点为s
    // 那么indices = eu
    // ├s               nil
    // |├earch\         *<2>
    // |└upport\        *<3>
    indices   string

    // 孩子节点
    children  []*node

    // 注册的路由
    handle    Handle

    // 权重，表示当前节点加上所有子节点的数目
	priority  uint32
}
```



## 流程

httprouter使用了前缀树来存储路由和其对应的处理函数。

httprouter为每个http方法均创建了一颗前缀树。

```go
type node struct {
	path      string  // 路径
	wildChild bool    // 路径是否有通配符(:或*)
	nType     nodeType // 节点类型，static（默认）,root,param,catchAll中的一种，对应值为0，1，2，3
	maxParams uint8 // 当前节点及其子节点最大param数量
	priority  uint32 // 优先级
	indices   string // children的索引（孩子节点的第一个字母）
	children  []*node // 孩子节点
	handle    Handle // 路由处理函数
}
```

假如我们有下面这几个路径(GET方法)：

```tex
/search/

/support

/blog/:post/

/blog/:post/:name

/files/*filepath
```

则创建的前缀树如下：

```tex
/              
├─ blog/            
│  └─ :post         
│     └─ /     
│        └─ :name   
├─ files           
│  └─ ""        
│     └─ /*filepath  
└─ s               
   ├─ earch        
   └─ upport       

```

插入代码为[func (n *node) addRoute(path string, handle Handle)](https://link.juejin.cn/?target=https%3A%2F%2Fsourcegraph.com%2Fgithub.com%2Fjulienschmidt%2Fhttprouter@v1.3.0%2F-%2Fblob%2Ftree.go%3FL83%3A16)。

插入即为前缀树的插入操作，从根节点开始，查找树是否有相同前缀，对无共同前缀的部分进行插入操作，在这个操作中，原来的节点非共同前缀部分会作为子节点。

要注意的是，插入分为有参数（有:或*符号）和无参数两类

> 1.path为最大能利用的公共前缀，当为叶子节点时，则为除去路径前缀的剩余部分（无参数）
>
> 2.如果有参数的路径，在上一步会进行额外操作，把参数部分裂开作为一个单独节点。如:/blog/:name/:id/，即使其为叶子节点，会把:name和:id作为单独节点
>
> 3.如果有通配符(*)，则只能为最后一个节点。

### 查找

查找代码[func (n *node) getValue(path string)](https://link.juejin.cn/?target=https%3A%2F%2Fsourcegraph.com%2Fgithub.com%2Fjulienschmidt%2Fhttprouter@v1.3.0%2F-%2Fblob%2Ftree.go%3FL339%3A16)

查找时同样分为有参数和无参数两类

> 1.对于无参数的路径，直接根据node.path匹配，根据node.indices进入下一节点顺着树查找即可。
>
> 2.对于有参数的路径，区分参数（：符号）和通配符（*），拿到路径对应的参数，也比较简单。



## 总结

> 1.httprouter使用前缀树来复用空间
>
> 2.代码简洁易懂
>
> 3.支持路径传参和通配
>
> 4.有优先级，保证匹配的确定性





## 纵览

New方法实际就是生成一个HttpRouter对象 接下来看看注册Get映射的实现

```go
func (r *Router) GET(path string, handle Handle) {
    r.Handle(http.MethodGet, path, handle)
}
func (r *Router) Handle(method, path string, handle Handle) {
    if len(path) < 1 || path[0] != '/' {
        panic("path must begin with '/' in path '" + path + "'")
    }

    if r.trees == nil {
        r.trees = make(map[string]*node)
    }

    root := r.trees[method]
    if root == nil {
        root = new(node)
        r.trees[method] = root

        r.globalAllowed = r.allowed("*", "")
    }

    root.addRoute(path, handle)
}
func (n *node) addRoute(path string, handle Handle) {
    fullPath := path
    n.priority++
    numParams := countParams(path)

    // non-empty tree
    if len(n.path) > 0 || len(n.children) > 0 {
    walk:
        for {
            // Update maxParams of the current node
            if numParams > n.maxParams {
                n.maxParams = numParams
            }

            //查询最长公共前缀
            i := 0
            max := min(len(path), len(n.path))
            for i < max && path[i] == n.path[i] {
                i++
            }

            // 出现部分前缀匹配，最极端情况/根路径
            //创建一个以匹配部分为映射路径的空节点顶替当前匹配节点n，当前匹配节点n作为其子节点
            if i < len(n.path) {
                child := node{
                    path:      n.path[i:],
                    wildChild: n.wildChild,
                    nType:     static,
                    indices:   n.indices,
                    children:  n.children,
                    handle:    n.handle,
                    priority:  n.priority - 1,
                }

                // Update maxParams (max of all children)
                for i := range child.children {
                    if child.children[i].maxParams > child.maxParams {
                        child.maxParams = child.children[i].maxParams
                    }
                }

                n.children = []*node{&child}
                // []byte for proper unicode char conversion, see #65
                n.indices = string([]byte{n.path[i]})
                n.path = path[:i]
                n.handle = nil
                n.wildChild = false
            }
            //到这里可以确认，n绝对可以成为注册映射的祖先节点
            //找到最匹配的祖先节点作为自己的父节点
            if i < len(path) {
                path = path[i:]

                if n.wildChild {
                    n = n.children[0]
                    n.priority++

                    // Update maxParams of the child node
                    if numParams > n.maxParams {
                        n.maxParams = numParams
                    }
                    numParams--

                    // Check if the wildcard matches
                    if len(path) >= len(n.path) && n.path == path[:len(n.path)] &&
                        // Adding a child to a catchAll is not possible
                        n.nType != catchAll &&
                        // Check for longer wildcard, e.g. :name and :names
                        (len(n.path) >= len(path) || path[len(n.path)] == '/') {
                        continue walk
                    } else {
                        // Wildcard conflict
                        var pathSeg string
                        if n.nType == catchAll {
                            pathSeg = path
                        } else {
                            pathSeg = strings.SplitN(path, "/", 2)[0]
                        }
                        prefix := fullPath[:strings.Index(fullPath, pathSeg)] + n.path
                        panic("'" + pathSeg +
                            "' in new path '" + fullPath +
                            "' conflicts with existing wildcard '" + n.path +
                            "' in existing prefix '" + prefix +
                            "'")
                    }
                }

                c := path[0]

                // slash after param
                if n.nType == param && c == '/' && len(n.children) == 1 {
                    n = n.children[0]
                    n.priority++
                    continue walk
                }

                // Check if a child with the next path byte exists
                for i := 0; i < len(n.indices); i++ {
                    if c == n.indices[i] {
                        i = n.incrementChildPrio(i)
                        n = n.children[i]
                        continue walk
                    }
                }
                //插入子节点
                // Otherwise insert it
                if c != ':' && c != '*' {
                    // []byte for proper unicode char conversion, see #65
                    n.indices += string([]byte{c})
                    child := &node{
                        maxParams: numParams,
                    }
                    n.children = append(n.children, child)
                    n.incrementChildPrio(len(n.indices) - 1)
                    n = child
                }
                n.insertChild(numParams, path, fullPath, handle)
                return

            } else if i == len(path) { // Make node a (in-path) leaf
                if n.handle != nil {
                    panic("a handle is already registered for path '" + fullPath + "'")
                }
                n.handle = handle
            }
            return
        }
    } else { 
        //树是空的，直接作为root
        n.insertChild(numParams, path, fullPath, handle)
        n.nType = root
    }
}
```

然后查看其处理请求的方式，也就是对前缀树进行查询

```go
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    if r.PanicHandler != nil {
        defer r.recv(w, req)
    }

    path := req.URL.Path

    if root := r.trees[req.Method]; root != nil {
        //查询前缀树
        if handle, ps, tsr := root.getValue(path); handle != nil {
            //handle请求
            handle(w, req, ps)
            return
        } else if req.Method != http.MethodConnect && path != "/" {
            code := 301 // Permanent redirect, request with GET method
            if req.Method != http.MethodGet {
                // Temporary redirect, request with same method
                // As of Go 1.3, Go does not support status code 308.
                code = 307
            }

            if tsr && r.RedirectTrailingSlash {
                if len(path) > 1 && path[len(path)-1] == '/' {
                    req.URL.Path = path[:len(path)-1]
                } else {
                    req.URL.Path = path + "/"
                }
                http.Redirect(w, req, req.URL.String(), code)
                return
            }

            // Try to fix the request path
            if r.RedirectFixedPath {
                fixedPath, found := root.findCaseInsensitivePath(
                    CleanPath(path),
                    r.RedirectTrailingSlash,
                )
                if found {
                    req.URL.Path = string(fixedPath)
                    http.Redirect(w, req, req.URL.String(), code)
                    return
                }
            }
        }
    }

    if req.Method == http.MethodOptions && r.HandleOPTIONS {
        // Handle OPTIONS requests
        if allow := r.allowed(path, http.MethodOptions); allow != "" {
            w.Header().Set("Allow", allow)
            if r.GlobalOPTIONS != nil {
                r.GlobalOPTIONS.ServeHTTP(w, req)
            }
            return
        }
    } else if r.HandleMethodNotAllowed { // Handle 405
        if allow := r.allowed(path, req.Method); allow != "" {
            w.Header().Set("Allow", allow)
            if r.MethodNotAllowed != nil {
                r.MethodNotAllowed.ServeHTTP(w, req)
            } else {
                http.Error(w,
                    http.StatusText(http.StatusMethodNotAllowed),
                    http.StatusMethodNotAllowed,
                )
            }
            return
        }
    }

    // Handle 404
    if r.NotFound != nil {
        r.NotFound.ServeHTTP(w, req)
    } else {
        http.NotFound(w, req)
    }
}
func (n *node) getValue(path string) (handle Handle, p Params, tsr bool) {
walk: // outer loop for walking the tree
    for {
        //查询前缀树节点
        if len(path) > len(n.path) {
            if path[:len(n.path)] == n.path {
                path = path[len(n.path):]
                // If this node does not have a wildcard (param or catchAll)
                // child,  we can just look up the next child node and continue
                // to walk down the tree
                if !n.wildChild {
                    c := path[0]
                    for i := 0; i < len(n.indices); i++ {
                        if c == n.indices[i] {
                            n = n.children[i]
                            continue walk
                        }
                    }

                    // Nothing found.
                    // We can recommend to redirect to the same URL without a
                    // trailing slash if a leaf exists for that path.
                    tsr = (path == "/" && n.handle != nil)
                    return

                }

                // handle wildcard child
                n = n.children[0]
                switch n.nType {
                case param:
                    // find param end (either '/' or path end)
                    end := 0
                    for end < len(path) && path[end] != '/' {
                        end++
                    }

                    // save param value
                    if p == nil {
                        // lazy allocation
                        p = make(Params, 0, n.maxParams)
                    }
                    i := len(p)
                    p = p[:i+1] // expand slice within preallocated capacity
                    p[i].Key = n.path[1:]
                    p[i].Value = path[:end]

                    // we need to go deeper!
                    if end < len(path) {
                        if len(n.children) > 0 {
                            path = path[end:]
                            n = n.children[0]
                            continue walk
                        }

                        // ... but we can't
                        tsr = (len(path) == end+1)
                        return
                    }

                    if handle = n.handle; handle != nil {
                        return
                    } else if len(n.children) == 1 {
                        // No handle found. Check if a handle for this path + a
                        // trailing slash exists for TSR recommendation
                        n = n.children[0]
                        tsr = (n.path == "/" && n.handle != nil)
                    }

                    return

                case catchAll:
                    // save param value
                    if p == nil {
                        // lazy allocation
                        p = make(Params, 0, n.maxParams)
                    }
                    i := len(p)
                    p = p[:i+1] // expand slice within preallocated capacity
                    p[i].Key = n.path[2:]
                    p[i].Value = path

                    handle = n.handle
                    return

                default:
                    panic("invalid node type")
                }
            }
        } else if path == n.path {
            // We should have reached the node containing the handle.
            // Check if this node has a handle registered.
            if handle = n.handle; handle != nil {
                return
            }

            if path == "/" && n.wildChild && n.nType != root {
                tsr = true
                return
            }

            // No handle found. Check if a handle for this path + a
            // trailing slash exists for trailing slash recommendation
            for i := 0; i < len(n.indices); i++ {
                if n.indices[i] == '/' {
                    n = n.children[i]
                    tsr = (len(n.path) == 1 && n.handle != nil) ||
                        (n.nType == catchAll && n.children[0].handle != nil)
                    return
                }
            }

            return
        }

        // Nothing found. We can recommend to redirect to the same URL with an
        // extra trailing slash if a leaf exists for that path
        tsr = (path == "/") ||
            (len(n.path) == len(path)+1 && n.path[len(path)] == '/' &&
                path == n.path[:len(n.path)-1] && n.handle != nil)
        return
    }
}
```



## 参考资料

- [Httprouter—用go实现的高性能路由器-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1680956)

- [Httprouter介绍及源码阅读](https://lailin.xyz/post/44029.html#%E7%89%B9%E6%80%A7)
- [httprouter源码阅读 - 掘金](https://juejin.cn/post/6988839084428886046)
- [Go Web：HttpRouter路由 - 骏马金龙 - 博客园](https://www.cnblogs.com/f-ck-need-u/p/10020917.html)





Gin框架的render包册单测文件有以下测试文件，你觉得还需要写什么测试文件

func TestRenderJSON
func TestRenderJSONError
func TestRenderIndentedJSON
func TestRenderIndentedJSONPanics
func TestRenderSecureJSON
func TestRenderSecureJSONFail
func TestRenderJsonpJSON
class errorWriter
func Write
func TestRenderJsonpJSONError
func TestRenderJsonpJSONError2
func TestRenderJsonpJSONFail
func TestRenderAsciiJSON
func TestRenderAsciiJSONFail
func TestRenderPureJSON
type xmlmap
func MarshalXML
fun TestRenderYAML
class fail
func MarshalYAML
func TestRenderYAMLFail
func TestRenderTOML
func TestRenderTOMLFail
func TestRenderProtoBuf
func TestRenderProtoBufFail
func TestRenderXML
func TestRenderRedirect
func TestRenderData
func TestRenderString
func TestRenderStringLenZero
func TestRenderHTMLTemplate
func TestRenderHTMLTemplateEmptyName
func TestRenderHTMLDebugFiles
func TestRenderHTMLDebugGlob
func TestRenderHTMLDebugPanics
func TestRenderReader
func TestRenderReaderNoContentLength

