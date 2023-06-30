---
title: 理解读懂 Golang init 函数执行顺序
toc: true
tags: golang
abbrlink: 74a5ec07
date: 2023-06-28 23:53:41
categories:
sticky:
---



## init 函数简介
Golang init 函数是一种特殊的函数，主要用于完成程序的初始化工作，如初始化数据库的连接、载入本地配置文件、根据命令行参数初始化全局变量等。

```go
package main

import "flag"

var gopath string

func init() {
	println("init a")
}

func init() {
	println("init b")
}

func init() {
	println("init c")
	// gopath may be overridden by --gopath flag on command line.
	flag.StringVar(&gopath, "gopath", "/root/go", "override default GOPATH")
}

func main() {
	println("main")
	flag.Parse()
	println(gopath)
}
```

运行输出：

```bash
$ go run main.go --gopath="/home/alice/go"
init a
init b
init c
main
/home/alice/go
```
之所以特殊，是因为 init 函数有如下特点：

## 参考资料

- https://cloud.tencent.com/developer/article/2138066

