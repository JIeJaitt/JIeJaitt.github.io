---
title: Gin框架render包源码源码阅读
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: gin-framework-render-package-source-code-reading
toc: true
date: 2022-03-01 14:44:16
categories: 开源精选
tags: [Gin,Go]
sticky: 9990
---

## 前情提要

gin 框架render包地址：https://github.com/gin-gonic/gin/blob/master/render/render.go

中文文档：https://gin-gonic.com/zh-cn/docs/examples/rendering/ 和英文文档：https://gin-gonic.com/docs/examples/rendering/

render_test.go：https://github.com/gin-gonic/gin/blob/master/render/render_test.go
朋友提的测试pr：https://github.com/gin-gonic/gin/pull/3525/commits/74a81ee4a0f07a579658d0346d1ac22ae27c2a02

我在copilot也提出过一些问题：https://copilot.microsoft.com/ 和google搜索：https://www.google.com/search?q=gin%20render%20json&ie=UTF-8#ip=1

## 快速上手

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

// Render 是一个接口interface，它定义了渲染JSON、XML、HTML、YAML等格式的方法
type Render interface {
	// Render 方法将数据以自定义ContentType写入响应中
	Render(http.ResponseWriter) error
	// WriteContentType 方法写入自定义的ContentType
	WriteContentType(w http.ResponseWriter)
}

// 下面的变量确保了各种类型都实现了Render接口
// 下面的变量确保了各种类型都实现了Render接口。
var (
    _ Render = JSON{}          // 确保JSON类型实现了Render接口
    _ Render = IndentedJSON{}  // 确保IndentedJSON类型实现了Render接口
    _ Render = SecureJSON{}    // 确保SecureJSON类型实现了Render接口
    _ Render = JsonpJSON{}     // 确保JsonpJSON类型实现了Render接口
    _ Render = XML{}           // 确保XML类型实现了Render接口
    _ Render = String{}        // 确保String类型实现了Render接口
    _ Render = Redirect{}      // 确保Redirect类型实现了Render接口
    _ Render = Data{}          // 确保Data类型实现了Render接口
    _ Render = HTML{}          // 确保HTML类型实现了Render接口
    _ HTMLRender = HTMLDebug{} // 确保HTMLDebug类型实现了HTMLRender接口
    _ HTMLRender = HTMLProduction{} // 确保HTMLProduction类型实现了HTMLRender接口
    _ Render = YAML{}          // 确保YAML类型实现了Render接口
    _ Render = Reader{}        // 确保Reader类型实现了Render接口
    _ Render = AsciiJSON{}     // 确保AsciiJSON类型实现了Render接口
    _ Render = ProtoBuf{}      // 确保ProtoBuf类型实现了Render接口
    _ Render = TOML{}          // 确保TOML类型实现了Render接口

// writeContentType 函数设置响应的Content-Type头部信息
// 如果头部信息中没有设置Content-Type，那么它会使用提供的value值
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


## render_test.go

这个`TestRenderJSON`函数是一个单元测试，用于测试Gin框架中的JSON渲染功能。下面是对这个测试函数的详细解释：

```go
func TestRenderJSON(t *testing.T) {
    // 创建一个HTTP响应记录器，用于测试中模拟HTTP响应
    w := httptest.NewRecorder()
    // 准备测试数据，这里是一个包含字符串键值对的map
    data := map[string]any{
        "foo":  "bar",
        "html": "<b>",
    }

    // 使用JSON结构体的WriteContentType方法设置响应的Content-Type为application/json
    (JSON{data}).WriteContentType(w)
    // 使用assert库检查Content-Type是否设置正确
    assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))

    // 使用JSON结构体的Render方法将data渲染为JSON格式，并写入响应记录器w中
    err := (JSON{data}).Render(w)

    // 使用assert库检查Render方法是否没有返回错误
    assert.NoError(t, err)
    // 检查渲染后的JSON字符串是否符合预期
    assert.Equal(t, "{\"foo\":\"bar\",\"html\":\"\\u003cb\\u003e\"}", w.Body.String())
    // 再次检查Content-Type是否设置正确
    assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
}
```

这个测试主要验证了以下几点：
1. `WriteContentType`方法能否正确地设置HTTP头部的`Content-Type`为`application/json; charset=utf-8`。
2. `Render`方法能否正确地将map数据渲染为JSON字符串，并且处理特殊字符（如`"<b>"`被转义为`"\\u003cb\\u003e"`）。
3. `Render`方法在执行过程中没有产生错误。

通过这个测试，我们可以确认`JSON`类型的`Render`方法能够正确地渲染数据并设置正确的`Content-Type`。




























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