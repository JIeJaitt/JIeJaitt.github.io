---
title: 如何使用func (*Cookie) String
toc: true
abbrlink: 4c445ef7
date: 2021-06-24 20:41:51
tags:
sticky:
---

在Go语言中，func (*Cookie) String 方法用于将http.Cookie类型的对象转换为字符串形式。

具体来说，它返回一个字符串，该字符串是按照HTTP cookie格式构造的。例如：

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    cookie := &http.Cookie{
        Name:  "mycookie",
        Value: "12345",
    }

    cookieString := cookie.String()
    fmt.Println(cookieString)
}
```
输出结果将是：
```bash
mycookie=12345
```
在这个例子中，我们创建了一个http.Cookie对象并设置了它的Name和Value属性。然后，我们调用String()方法将其转换为字符串形式，并将结果打印到控制台。

注意，http.Cookie结构体的其他字段（例如Path、Domain和Expires）也会在字符串表示中显示出来，如果它们被设置了值。