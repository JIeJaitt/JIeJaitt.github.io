---
title: defer退出顺序
date: 2023-11-03T10:53:46+08:00
categories: 
tags: 
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true
sticky:
---

```go
func f() {
	defer fmt.Println("D")
	fmt.Println("F")
}

func main() {
	f()
	fmt.Println("M")
}
```

被调用函数里的 defer 语句在返回之前就会被执行，所以输出顺序是 F D M。