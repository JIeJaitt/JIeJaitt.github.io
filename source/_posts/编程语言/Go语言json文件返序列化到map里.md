---
title: Go语言json文件返序列化到map里
toc: true
abbrlink: 13fd086
date: 2023-06-24 20:43:42
tags:
sticky:
---



## Go语言我想json文件返序列化到map里

如何使用Go语言将json文件反序列化到map里。

- 首先，你需要导入`encoding/json`包，这个包提供了json的序列化和反序列化的功能。
- 然后，你需要定义一个map变量，用来存储反序列化后的数据。map的键类型必须是字符串、整数或者实现了`encoding.TextUnmarshaler`接口的类型，map的值类型可以是任意类型。
- 接着，你需要调用`json.Unmarshal`函数，将json文件的字节切片和map变量的指针作为参数传入。这个函数会解析json文件，并将数据存储到map变量中。
- 最后，你可以打印或者操作map变量，查看反序列化后的结果。

例如，假设你有一个json文件，内容如下：

```json
{
    "name": "Alice",
    "age": 25,
    "hobbies": ["reading", "coding", "traveling"]
}
```

你可以用以下代码将它反序列化到map里：

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
)

func main() {
    // 读取json文件
    data, err := ioutil.ReadFile("data.json")
    if err != nil {
        fmt.Println("读取文件失败:", err)
        return
    }
    // 定义map变量
    var m map[string]interface{}
    // 反序列化
    err = json.Unmarshal(data, &m)
    if err != nil {
        fmt.Println("反序列化失败:", err)
        return
    }
    // 打印结果
    fmt.Println("反序列化后:", m)
}
```

输出结果为：

```go
反序列化后: map[age:25 hobbies:[reading coding traveling] name:Alice]
```

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
)

func main() {
	// 假设filename是一个字符串切片，存储了json文件的路径
	for i := range filename {
		// 打开文件
		file, err := os.OpenFile(filename[i], os.O_CREATE|os.O_RDWR, 0666)
		if err != nil {
			fmt.Println("打开文件失败:", err)
			return
		}
		// 延迟关闭文件
		defer file.Close()
		// 定义map变量
		dataMap1 := make(map[string]string)
		// 创建json解码器
		decoder := json.NewDecoder(file)
		// 反序列化
		err8 := decoder.Decode(&dataMap1)
		if err8 != nil {
			fmt.Println("反序列化失败:")
			fmt.Println(err8)
			return
		}
	}
}
```