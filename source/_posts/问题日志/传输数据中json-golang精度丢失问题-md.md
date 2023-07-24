---
title: 传输数据中json-golang精度丢失问题
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
categories: 问题日志
tags:
  - json
  - golang
abbrlink: 9cb453a5
date: 2023-07-20 23:50:03
sticky:
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [zhuanlan.zhihu.com](https://zhuanlan.zhihu.com/p/347985826)


protobuf有12种int类型，JSON只有一种。JSON中的数字类型就是float64，事实上，UseNumber只能保证序列化或者反序列不丢失精度，传递过程还是会丢失精度。

传递过程指什么：json数据服务端传到客户端。

数字大就用字符串吧，可以写个函数用反射把json数据的各种id由int弄成string。

长ID丢失精度的问题，还有分页。如果是接口返回的长id，后端处理直接用json.number类型接，如果是传给前端，直接给字符串过去就行，前端的js的number类型数据范围更小。

postman测了一下，我看发送或者接受到的是正常的。但是浏览器打开试试，响应是正常的，但浏览器的预览功能确实会丢失精度。

查了一下，js的Number是float64，不会超过json的最大限制，我目前的想的是前端传后端直接传就行，后端直接双精度浮点数double接收，后端传前端，如果数字很大，直接用string，在json.Marshal中也有提到

如果是别的地方获取到的json序列化后的很大的数字（例如请求rpc或者请求http获得的），那就单独考虑下

一、背景
----

在某次功能上线前，由于测试人员上传 id 字段使用了 int 的最大值 9223372036854775807，但是服务端代码在接收数据的时候却变成了 9223372036854776000，导致超过了 int 存储的范围而报错，这是什么原因呢？

在解析数据的时候使用了 json.Unmarshal 方法 (测试传的是 json 数据)，下面通过简化代码演示问题产生的原因和解决方案。通过阅读本文，你将了解以下知识：

1、json Unmarshal 精度丢失原因和解决方案

2、strconv.ParseFloat 使用时需要小心

二、解决方案
------

1、问题演示，下面的代码会输出什么？

```go
package main
import (
   "encoding/json"
   "fmt"
)
func main() {
   var test interface{}
   str := `{"id":9223372036854775807, "name":"golang"}`
   err := json.Unmarshal([]byte(str), &test)
   if err != nil {
      fmt.Println(err)
   }
   m := test.(map[string]interface{})
   fmt.Printf("type:%T, value:%v\n", m["id"], m["id"])
}
```

运行上述代码后输出 type:float64, value:9.223372036854776e+18，而通过断点发现原本 9223372036854775807，变成了 9223372036854776000，诡异吧。

![](https://pic1.zhimg.com/v2-ce66732261095e9b598fa39fae1ff64c_r.jpg)

2、解决方案，设置 UseNumber 属性为 true 即可

```go
package main
import (
   "bytes"
   "encoding/json"
   "fmt"
)
func main() {
   var test interface{}
   str := `{"id":9223372036854775807, "name":"golang"}`
   //注释该代码，
   //err := json.Unmarshal([]byte(str), &test)
   
   //替换上面的代码
   d := json.NewDecoder(bytes.NewReader([]byte(str)))
   d.UseNumber()
   err := d.Decode(&test)
   if err != nil {
      fmt.Println(err)
   }
   m := test.(map[string]interface{})
   fmt.Printf("type:%T, value:%v\n", m["id"], m["id"])
}
```

上述代码运行后输出 type:json.Number, value:9223372036854775807，这回对上了，再看看断点调试，发现是符合预期的。

![](https://pic2.zhimg.com/v2-5933e3d5bff08a1f670b74a29d547c85_r.jpg)

问题是解决了，但我们需要再看下问题产生的根本原因，以及为什么能够解决问题。

三、问题原因
------

1、json 解析过程追踪

从 json.Unmarshal 方法的调用开始，我们发现 json 的解析过程是采用死循环的方式，逐个字符去解析，这和其它语言是一样的。如果解析后赋值是一个 interface{}，会调用 objectInterface 方法处理。

![](https://pic1.zhimg.com/v2-4f1fb47eb78ea7e408d210c2d1bea81c_r.jpg)

objectInterface 会声明一个 map[string]interface{} 来接收数据，**这就是为什么我们看到的数据是 map[string]interface{}。**

![](https://pic1.zhimg.com/v2-37a40fb77391034320ef36cac6083834_r.jpg)

从下图我们可以看到传输的 9223372036854775807 还是正常的值，如果是数字，会调用 convertNumber 进行处理。

![](https://pic4.zhimg.com/v2-fe365b5d9dc2d7f1348bce6c402744e7_r.jpg)

在 convertNumber 中，我们可以看到 UseNumber 属性，默认是 false，**如果我们设置了，会调用 Number 处理，否则会调用 strconv.ParseFloat 进行处理，从下图中，可以看出来 strconv.ParseFloat 处理后我们的值发生了变化。**

![](https://pic3.zhimg.com/v2-a7d79869e23a9d44677a291f3c2370aa_r.jpg)

因此 strconv.ParseFloat 才是值发生改变的根本原因，那 Number 处理又是什么呢？Number 只是 string 的一个别名，这也就理解了我们解决方案中输出的是 “type:json.Number, value:9223372036854775807” 的原因。

```
// A Number represents a JSON number literal.
type Number string
```

2、strconv.ParseFloat 又是怎么引起精度丢失的呢？

问题变成了研究 ParseFloat，因此对代码再次简化

```go
package main
import (
   "fmt"
   "strconv"
)
func main() {
   f, err := strconv.ParseFloat("9223372036854775807", 64)
   fmt.Println("f:", f, "err:", err)
}
//运行后输出 f: 9.223372036854776e+18 err: <nil>
```

此后又看了下 ParseFloat 方法的实现，注释中说过了会损失精度，采用的是 “IEEE754” 的计算标准。

![](https://pic1.zhimg.com/v2-47de6b091b5293081f763adebf36fee8_r.jpg)

问题到这里本次内容就结束了。剩下的感兴趣的自己可以继续研究。这又让我想起了以前学过的，整数，浮点数在内存中是怎么用二进制 0、1 表示的，以及 cpu 的大端序，小端序结构，除了还记得这些词，内容都忘光了，现在看见这些有点晕。

这里贴下百度百科的解释：

![](https://pic4.zhimg.com/v2-aba1e4e5ab7877a55c257b8069a5123b_r.jpg)

四、总结
----

1、使用 json Unmarshal 和 interface{} 的时候需要注意大数字会丢失精度，当然如果是指定了类型 int 是不存在该问题的。

2、strconv.ParseFloat 使用要注意了，搞不好精度就丢了，返回是最接近的数字

3、相关代码参见 go/src/encoding/json/decode.go