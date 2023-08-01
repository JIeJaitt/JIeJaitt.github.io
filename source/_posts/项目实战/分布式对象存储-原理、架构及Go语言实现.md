---
title: 分布式对象存储 -- 原理、架构及Go语言实现
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: f6782cca
date: 2023-08-01 22:03:43
categories:
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