---
title: 理解 httprouter 使用与源码分析
categories: 开源精选
toc: true
abbrlink: 555971b6
date: 2023-06-24 20:49:29
tags:
sticky:
---

httprouter 是一个快速、灵活的 HTTP 路由器，它使用 Trie 树来实现高效的路由匹配。如果你想深入了解 httprouter 的实现原理，可以阅读其源代码。

<!-- more -->

在阅读源代码之前，需要先了解 httprouter 中的一些重要概念：
- Route：表示一个路由规则，包括 HTTP 方法、路径模式和处理器函数。
- Node：表示 Trie 树中的一个节点，包括路径片段和路由规则。
- Params：表示从 URL 中提取的参数，包括名称和值。

httprouter 的核心在于 Router 类型，它是一个 Trie 树的根节点，包含多个子节点，每个子节点都代表一条路由规则。Router 类型实现了 http.Handler 接口，因此可以将其作为参数传递给 http.ListenAndServe 函数，从而处理传入的 HTTP 请求。

下面是 Router 类型的部分源代码：
```go
type Router struct {
    // 子节点
    roots map[string]*node
    // 路由规则
    handlers map[string]HandlerFunc
    // 404 处理器
    NotFoundHandler HandlerFunc
    // 405 处理器
    MethodNotAllowedHandler HandlerFunc
}

func New() *Router {
    return &Router{
        roots:    make(map[string]*node),
        handlers: make(map[string]HandlerFunc),
    }
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    // 根据请求方法和路径查找匹配的路由规则
    path := req.URL.Path
    if root := r.roots[req.Method]; root != nil {
        if handler, ps, _ := root.getValue(path); handler != nil {
            handler(w, req, ps)
            return
        }
    }

    // 处理 404 错误
    if r.NotFoundHandler != nil {
        r.NotFoundHandler(w, req, nil)
    } else {
        http.NotFound(w, req)
    }
}
```
在 ServeHTTP 方法中，Router 类型首先根据请求方法和路径查找匹配的路由规则。如果找到了匹配的规则，就执行相应的处理器函数。否则，如果设置了 NotFoundHandler 处理器，就执行该处理器；否则，就返回 HTTP 404 错误。

Router 类型中的 roots 字段是一个 map，用于存储每个 HTTP 方法的根节点。每个根节点都是一个 node 类型，代表 Trie 树的一个分支。handlers 字段是一个 map，用于存储路由规则和对应的处理器函数。

node 类型是 Trie 树中的一个节点，它包含一个路径片段和多个子节点。路径片段可以是一个静态字符串，也可以是一个参数，如 :name。每个子节点也是一个 node 类型，代表 Trie 树的下一层。

下面是 node 类型的部分源代码：
```go
type node struct {
    // 路径片段
    path      string
    // 子节点
    children  []*node
    // 路由规则
    handlers  map[string]HandlerFunc
    // 参数节点
    wildcard *node
    // 是否精确匹配
    isLeaf    bool
}

func (n *node) insert(path string, handlers map[string]HandlerFunc, height int) {
    if len(path) == 0 {
        n.handlers = handlers
        n.isLeaf = true
        return
    }

    // 查找路径片段是否已存在
    pathSeg := getPathSegment(path)
    child := n.matchChild(pathSeg)
    if child != nil {
        // 路径片段已存在，继续递归插入
        child.insert(path[len(pathSeg):], handlers, height+1)
        return
    }

    // 路径片段不存在，创建新的子节点
    child = &node{path: pathSeg}
    child.insert(path[len(pathSeg):], handlers, height+1)
    n.children = insertChild(n.children, child)

    // 处理参数节点
    if pathSeg[0] == ':' || pathSeg[0] == '*' {
        if n.wildcard == nil {
            n.wildcard = child
        } else {
            panic(fmt.Sprintf("a parameter with name %s already exists", pathSeg))
        }
    }
}
```
在 insert 方法中，node 类型首先判断路径片段是否为空。如果为空，说明已经到达了叶子节点，将路由规则和处理器函数存储在该节点中。否则，就查找路径片段是否已存在。如果已存在，就继续递归插入；否则，就创建新的子节点，并将其插入到子节点列表中。

如果路径片段是一个参数，如 :name 或 *path，则将该节点保存为参数节点。在执行匹配时，如果当前节点没有匹配成功，就可以尝试从参数节点中查找匹配的子节点。

httprouter 的路由匹配算法主要是在 Trie 树中查找匹配的节点。对于每个请求，httprouter 首先从根节点开始遍历 Trie 树，按照路径片段依次查找匹配的节点。如果找到了匹配的节点，就将该节点对应的处理器函数执行，并将从 URL 中提取的参数传递给处理器函数。

下面是 node 类型中的 getValue 方法的部分源代码：
```go
func (n *node) getValue(path string) (HandlerFunc, Params, bool) {
    // 记录路径参数
    var params Params

    // 从根节点开始遍历 Trie 树
    node := n
    for len(path) > 0 {
        // 查找路径片段是否已存在
        pathSeg := getPathSegment(path)
        child := node.matchChild(pathSeg)
        if child == nil {
            // 没有找到匹配的节点
            if node.wildcard != nil {
                // 尝试从参数节点中查找匹配的子节点
                node = node.wildcard
                params = append(params, Param{Key: node.path[1:], Value: path})
                path = ""
            } else {
                return nil, nil, false
            }
        } else {
            // 找到了匹配的节点
            node = child
            path = path[len(pathSeg):]
            if node.isLeaf {
                // 匹配成功，返回处理器函数和路径参数
                return node.handlers[pathSeg], params, true
            }
        }
    }

    // 没有找到匹配的节点
    return nil, nil, false
}
```
在 getValue 方法中，node 类型首先记录路径参数，然后从根节点开始遍历 Trie 树。对于每个路径片段，都尝试从子节点列表中查找匹配的节点。如果找到了匹配的节点，就继续向下遍历；否则，就尝试从参数节点中查找匹配的子节点。如果最终找到了叶子节点，就返回该节点对应的处理器函数和路径参数。

总之，httprouter 的实现原理并不复杂，它主要是通过 Trie 树来实现快速的路由匹配。如果你想深入了解 httprouter 的实现细节，可以阅读其源代码，特别是 Router 和 node 类型的相关代码。