---
title: 分布式对象存储原理架构Go实现之元数据服务
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: f6782cca
date: 2022-08-01 22:03:43
categories: 项目实战
tags:
sticky:
---

#### 接口服务的 versions 包

versions 包比较简单，只有Handler 函数，其主要工作都是调用es 包的函数来完成的，见例 3-2。

```go
package versions

import (
	"encoding/json"
	"goDistributed-Object-storage/src/lib/es"
	"log"
	"net/http"
	"strings"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	from := 0
	size := 1000
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	for {
		metas, e := es.SearchAllVersions(name, from, size)
		if e != nil {
			log.Println(e)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		for i := range metas {
			b, _ := json.Marshal(metas[i])
			w.Write(b)
			w.Write([]byte("\n"))
		}
		if len(metas) != size {
			return
		}
		from += size
	}
}
```

这个函数首先检查 HTTP 方法是否为GET，如果不为 GET，则返回 405 Method Not Allowed；如果方法为 GET，则获取 URL 中`<object_name＞` 的部分，获取的方式跟之前一样，调用 strings.Split 函数将 URL 以 ”/“ 分隔符切成数组并取第三个元素赋值给 name。这里要注意的是，如果客户端的 HTTP 请求的 URL 是“/versions/”而不含 `<object_name>` 部分，那么 name 就是空字符串。

接下来我们会在一个无限 for 循环中调用 es 包的 SearchAlIVersions 函数并将 name、from 和 size 作为参数传递给该函数。from 从0开始，size 则固定为1000。es.SearchAIIVersions 函数会返回一个元数据的数组，我们遍历该数组，将元数据一一写入HTTP 响应的正文。如果返回的数组长度不等于 size，说明元数据服务中没有更多的数据了，此时我们让函数返回；否则我们就把fom 的值增加1000进行下一个选代。

es 包封装了我们访问元数据服务的各种 API 的操作，本章后续会有详细介绍。




### objects 包 put 逻辑相关的函数如下所示

```go
// goDistributed-Object-storage/apiServer/objects/put.go

func put(w http.ResponseWriter, r *http.Request) {
	// 从请求头中获取对象的哈希值
	hash := utils.GetHashFromHeader(r.Header)
	if hash == "" {
		log.Println("missing object hash in digest header")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// 将对象存储到存储系统中
	statusCode, err := storeObject(r.Body, url.PathEscape(hash))
	if err != nil {
		log.Println(err)
		w.WriteHeader(statusCode)
		return
	}
	if statusCode != http.StatusOK {
		w.WriteHeader(statusCode)
		return
	}

	// 从 URL 中获取对象的名称
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	// 从请求头中获取对象的大小
	size := utils.GetSizeFromHeader(r.Header)
	// 将对象的元数据添加到 Elasticsearch 中
	err = es.AddVersion(name, hash, size)
	// 异步方式将对象的元数据添加到 Elasticsearch 中
	// go func() {
	// 	err = es.AddVersion(name, hash, size)
	// 	if err != nil {
	// 		log.Println(err)
	// 	}
	// }()
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	// 返回 HTTP 状态码 200 表示成功
	w.WriteHeader(http.StatusOK)
}
```

在第2 章中，我们以`<object_name>`为参数调用 storeObject。而本章我们首先调用`utils.GetHashFromHeader` 从 HTTP 请求头部获取对象的散列值，然后以散列值为参数调用 storeObject。之后我们从 URL 中获取对象的名字并且调用 `utils.GetSizeFromHeader`从 HTTP 请求头部取对象的大小，然后以对象的名字、散列值和大小为参数调用`es.AddVersion` 给该对象添加新版本。

```go
func GetHashFromHeader(h http.Header) string {
	digest := h.Get("digest")
	if len(digest) < 9 {
		return ""
	}
	if digest[:8] != "SHA-256=" {
		return ""
	}
	return digest[8:]
}
```

```go
func GetSizeFromHeader(h http.Header) int64 {
	size, _ := strconv.ParseInt(h.Get("content-length"), 0, 64)
	return size
}
```

`GetHashFromHeader` 和 `GetSizeFromHeader` 是 utils 包提供的两个函数。

`GetHashFromHeader` 函数首先调用 `h.Get` 获取 “digest” 头部。`r` 的类型是一个指向 `http.Request` 的指针。它的 Header 成员类型则是一个http.Header，用于记录 HTTP 的头部，其Get 方法用于根据提供的参数获取相对应的头部的值。在这里，我们获取的就是 HTTP 请求中 digest 头部的值。我们检查该值的形式是否为“SHA-256=<hash>”，如果不是以“SHA-256=”开头我们返回空字符串，否则返回其后的部分。

同样， `GetSizeFromHeader` 也是调用 `h.Get` 获取“content-length”头部，并调用strconv.Parselnt 将字符串转化为 int64 输出。strconv.ParseInt 和例3-6中 strconv.Atoi这两个函数的作用都是将一个字符串转换成一个数字。它们的区别在于 Parselnt 返回的类型是 int64 而 Atoi返回的类型是 int，且 ParseInt 的功能更加复杂，它额外的输入参数用于指定转换时的进制和结果的比特长度。比如说 ParseInt 可以将一个字符串“OxFF”以十六进制的方式转换为整数255，而 Atoi 则只能将字符串“255”转换为整数255。