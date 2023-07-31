---
title: Go语言（Pingo）插件化开发
categories: 编程语言
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: e2ff4cb2
date: 2023-07-30 23:33:14
tags:
sticky:
---

Pingo 是一个用来为Go语言程序编写插件的简单独立库，因为 Go 本身是静态链接的，因此所有插件都以外部进程方式存在。Pingo 旨在简化标准 RPC 包，支持 TCP 和 Unix 套接字作为通讯协议。当前还不支持远程插件，如果有需要，远程插件很快会提供。

使用 Pingo 创建一个插件非常简单，首先新建目录，如 "plugins/hello-world" ，然后在该目录下编写 main.go：

```go
// 创建新的二进制文件
package main
import "github.com/dullgiulio/pingo"
// 创建要导出的对象
type MyPlugin struct{}
// 导出的方法，带有rpc签名
func (p *MyPlugin) SayHello(name string, msg *string) error {
    *msg = "Hello, " + name
    return nil
}
func main() {
    plugin := &MyPlugin{}
    // 注册要导出的对象
    pingo.Register(plugin)
    // 运行主程序
    pingo.Run()
}
```

使用`go build`命令编译并生成可执行文件：

```bash
cd plugins/hello-world
go build
```

接下来就可以调用该插件：

```go
package main
import (
    "log"
    "github.com/dullgiulio/pingo"
)
func main() {
    // 从创建的可执行文件中创建一个新插件。通过 TCP 连接到它
    p := pingo.NewPlugin("tcp", "plugins/hello-world/hello-world")
    // 启动插件
    p.Start()
    // 使用完插件后停止它
    defer p.Stop()
    var resp string
    // 从先前创建的对象调用函数
    if err := p.Call("MyPlugin.SayHello", "Go developer", &resp); err != nil {
        log.Print(err)
    } else {
        log.Print(resp)
    }
}
```

运行结果如下：

```bash
go run main.go
2019/12/17 18:00:20 Hello, Go developer
```

## 参考资料

- https://www.kandaoni.com/news/11038.html（ ❌ ）
