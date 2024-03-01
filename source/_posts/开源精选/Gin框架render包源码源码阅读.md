---
title: Gin框架render包源码源码阅读
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: gin-framework-render-package-source-code-reading
toc: true
date: 2022-03-01 14:44:16
categories: 开源精选
tags: [Gin,Go]
sticky: 9999
---

## 

Gin框架的render包主要是用于HTML模板渲染的。在Gin中，你可以使用`LoadHTMLGlob()`或者`LoadHTMLFiles()`方法来加载模板文件。例如，以下是一个简单的示例，展示了如何在Gin中加载和渲染HTML模板：

```go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    router := gin.Default()
    // 加载模板文件
    router.LoadHTMLGlob("templates/*")
    // 定义路由和处理函数
    router.GET("/index", func(c *gin.Context) {
        // 使用模板
        c.HTML(http.StatusOK, "index.tmpl", gin.H{
            "title": "Main website",
        })
    })
    // 启动服务器
    router.Run(":8080")
}
```

当然可以。Gin框架的render包主要是用于HTML模板渲染的。在Gin中，你可以使用`LoadHTMLGlob()`或者`LoadHTMLFiles()`方法来加载模板文件。例如，以下是一个简单的示例，展示了如何在Gin中加载和渲染HTML模板：

```go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    router := gin.Default()
    // 加载模板文件
    router.LoadHTMLGlob("templates/*")
    // 定义路由和处理函数
    router.GET("/index", func(c *gin.Context) {
        // 使用模板
        c.HTML(http.StatusOK, "index.tmpl", gin.H{
            "title": "Main website",
        })
    })
    // 启动服务器
    router.Run(":8080")
}
```

在这个例子中，`LoadHTMLGlob("templates/*")`会加载`templates`目录下的所有模板文件。当访问`/index`路由时，Gin会渲染`index.tmpl`模板，并将其作为HTTP响应发送。

如果你想要使用不同目录下名称相同的模板，你可以使用`LoadHTMLGlob("templates/**/*")`来实现。此外，Gin还允许你自定义模板渲染器和分隔符，以及添加自定义模板函数来扩展模板的功能。


## render.go

```go
package render

import "net/http"

// Render interface is to be implemented by JSON, XML, HTML, YAML and so on.
type Render interface {
	// Render writes data with custom ContentType.
	Render(http.ResponseWriter) error
	// WriteContentType writes custom ContentType.
	WriteContentType(w http.ResponseWriter)
}

var (
	_ Render     = JSON{}
	_ Render     = IndentedJSON{}
	_ Render     = SecureJSON{}
	_ Render     = JsonpJSON{}
	_ Render     = XML{}
	_ Render     = String{}
	_ Render     = Redirect{}
	_ Render     = Data{}
	_ Render     = HTML{}
	_ HTMLRender = HTMLDebug{}
	_ HTMLRender = HTMLProduction{}
	_ Render     = YAML{}
	_ Render     = Reader{}
	_ Render     = AsciiJSON{}
	_ Render     = ProtoBuf{}
	_ Render     = TOML{}
)

func writeContentType(w http.ResponseWriter, value []string) {
	header := w.Header()
	if val := header["Content-Type"]; len(val) == 0 {
		header["Content-Type"] = value
	}
}
```

这段代码是Gin框架中`render`包的一部分，它定义了一个`Render`接口和多个实现了该接口的类型。让我们逐一解释：

1. `Render`接口：
   - `Render`接口定义了两个方法：`Render`和`WriteContentType`。
   - `Render`方法接受一个`http.ResponseWriter`作为参数，并返回一个`error`。它的作用是将数据以自定义的`ContentType`写入响应中。
   - `WriteContentType`方法也接受一个`http.ResponseWriter`作为参数，但不返回任何值。它的作用是写入自定义的`ContentType`。

2. 实现`Render`接口的类型：
   - 代码中列出了多个结构体，如`JSON`、`IndentedJSON`、`SecureJSON`等，它们都实现了`Render`接口。
   - `_ Render = JSON{}`这样的语句是类型断言，用来确保`JSON`类型实现了`Render`接口。如果`JSON`没有实现`Render`接口，编译器会报错。

3. `writeContentType`函数：
   - 这个函数接受两个参数：`http.ResponseWriter`和一个字符串切片`value`。
   - 它首先获取响应的头部信息，然后检查`Content-Type`是否已设置。
   - 如果没有设置，它会将`value`设置为`Content-Type`的值。

这段代码的语义是提供一个统一的接口来渲染不同格式的响应内容，如JSON、XML、HTML等。通过实现`Render`接口，Gin可以轻松地扩展支持更多的内容类型，同时保持代码的整洁和一致性。如果你有更具体的问题或需要进一步的解释，请随时告诉我！































## XML/JSON/YAML/ProtoBuf 渲染

下面是来自[Gin框架文档](https://gin-gonic.com/zh-cn/docs/examples/rendering/)的实例代码，展示了如何使用 `gin.Context` 渲染 JSON、XML、YAML 和 ProtoBuf 响应。

```go
func main() {
	r := gin.Default()

	// gin.H 是 map[string]interface{} 的一种快捷方式
	r.GET("/someJSON", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "hey", "status": http.StatusOK})
	})

	r.GET("/moreJSON", func(c *gin.Context) {
		// 你也可以使用一个结构体
		var msg struct {
			Name    string `json:"user"`
			Message string
			Number  int
		}
		msg.Name = "Lena"
		msg.Message = "hey"
		msg.Number = 123
		// 注意 msg.Name 在 JSON 中变成了 "user"
		// 将输出：{"user": "Lena", "Message": "hey", "Number": 123}
		c.JSON(http.StatusOK, msg)
	})

	r.GET("/someXML", func(c *gin.Context) {
		c.XML(http.StatusOK, gin.H{"message": "hey", "status": http.StatusOK})
	})

	r.GET("/someYAML", func(c *gin.Context) {
		c.YAML(http.StatusOK, gin.H{"message": "hey", "status": http.StatusOK})
	})

	r.GET("/someProtoBuf", func(c *gin.Context) {
		reps := []int64{int64(1), int64(2)}
		label := "test"
		// protobuf 的具体定义写在 testdata/protoexample 文件中。
		data := &protoexample.Test{
			Label: &label,
			Reps:  reps,
		}
		// 请注意，数据在响应中变为二进制数据
		// 将输出被 protoexample.Test protobuf 序列化了的数据
		c.ProtoBuf(http.StatusOK, data)
	})

	// 监听并在 0.0.0.0:8080 上启动服务
	r.Run(":8080")
}
```

## 参考资料

(1) Golang Gin 实战（十一）| HTML模板渲染 - 知乎 - 知乎专栏. https://zhuanlan.zhihu.com/p/151818857.
(2) HTML 渲染 | Gin Web Framework. https://gin-gonic.com/zh-cn/docs/examples/html-rendering/.
(3) 部署 | 正文 |《Gin 框架中文文档 1.5》| Go 技术论坛. https://learnku.com/docs/gin-gonic/1.5/deployment/6155.
(4) undefined. http://localhost:8080/html.