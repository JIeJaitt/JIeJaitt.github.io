---
title: Go语言与C和C++进行交互
date: 2021-08-31 00:39:17
categories: 编程语言
tags: 
    - golang
toc: true
abbrlink: b45f2c03
sticky:
---

Go语言是类C的语言，与C语言有着千丝万缕的联系，在Go语言的代码中可以直接调用C语言代码，但不支持直接调用 C++。

Go 调用 C/C++ 的方式：

- C：直接调用 C API；
- C++：通过实现一层封装的 C 接口来调用 C++ 接口。

<!-- more -->

## 调用C语言

在Go语言的源代码中直接声明C语言代码是比较简单的应用情况，可以直接使用这种方法将C语言代码直接写在Go语言代码的注释中，并在注释之后紧跟`import "C"`，通过`C.xx `来引用C语言的结构和函数，如下所示：

```go
package main

/*
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int id;
}ctx;

ctx *createCtx(int id) {
    ctx *obj = (ctx *)malloc(sizeof(ctx));
    obj->id = id;
    return obj;
}
*/

import "C"
import (
    "fmt"
)

func main() {
    var ctx *C.ctx = C.createCtx(100)
    fmt.Printf("id : %d\n", ctx.id)
}
```

运行结果如下：

```bash
go run main.go
id : 100
```

## 通过封装实现 C++ 接口的调用

首先我们新建一个 cpp 目录，并将 C++ 的代码放置在 cpp 目录下，C++ 代码需要提前编译成动态库（拷贝到系统库目录可以防止 go 找不到动态库路径），go 程序运行时会去链接。

```bash
├── cpp
│   ├── cwrap.cpp
│   ├── cwrap.h
│   ├── test.cpp
│   └── test.h
└── main.go
```

其中 test.cpp 和 test.h 是 C++ 接口的实现；cwrap.h 和 cwrap.cpp 是封装的 C 接口的实现。

1) test.h

```c
#ifndef __TEST_H__
#define __TEST_H__

#include <stdio.h>
class Test {
public:
    void call();
};

#endif
```

2) test.cpp

```cpp
#include "test.h"

void Test::call() {
    printf("call from c++ language\n");
}

cwrap.cpp

#include "cwrap.h"
#include "test.h"

void call() {
    Test ctx;
    ctx.call();
}
```

3) cwrap.h

```c
#ifndef __CWRAP_H__
#define __CWRAP_H__

#ifdef __cplusplus
extern "C" {
#endif
void call();

#ifdef __cplusplus
}
#endif

#endif
```

4) main.go
```go
package main

/*
#cgo CFLAGS: -Icpp

#cgo LDFLAGS: -lgotest

#include "cwrap.h"
*/

import "C"

func main() {
    C.call()
}
```