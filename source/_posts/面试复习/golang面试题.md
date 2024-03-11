---
title: golang面试题
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: 768e69ef
date: 2023-07-25 00:02:33
categories: 编程语言
tags: [golang,期末考试]
sticky:
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [zhuanlan.zhihu.com](https://zhuanlan.zhihu.com/p/519979757)

前言
--

### 2、面试建议

**技术部分**

1）、算法部分，刷 LeetCode 就完事了, 这是一个长期的过程，短期突击没啥效果，因为题目太多了。

2）、语言基础，细分为：golang 基础及原理，就是本文主要内容了；mysql 基础及原理；redis 基础及原理; kafka 或其他消息中间件（如果没用过，需要了解大概的底层原理及结构）；linux 常用的命令，比如定时脚本几个参数时间分别代表啥，文件权限需要搞清楚，进程内存占用命令；小公司还要懂一些前端的知识，因为他们希望你什么都会。

建议大家可以去牛客网上多刷刷 Golong 题库，题库总结的很到位，而且题目质量也很高，方便巩固语法基础，还可以去看前端面试题库，题目很全还配有答案，可以方便快速的了解前端知识。

3）、项目经验，可以搞一个基于 gin 的后端接口服务的 web 框架，一般会问你怎么实现的；以及微服务了解一下。

**非技术部分**

1）因为上海 5 月份居家办公，远程面试，这些题目准备一份，遇到卡壳的题目完全可以参考你准备好的答案，因为视频面试你眼睛是看着面试官还是题目是不太容易区分的（把题目窗口置顶）。

2）HR 面也可以完全准备一份可能问到的问题的答案，并不是说你不会回答，而是会让你的表达更顺畅，其次也说明你是有备而来的，我在某拉公司面试就吃了这个亏，技术通过，HR 说我的表达能力不行（后续我也会把这个模板分享出来，感谢我媳妇充当面试官，以及指导如何高情商的回答 HR 的问题）。

3）可以自己录音面试回答，看看自己的语气、音量，顺畅度，如果自己听了都不舒服，面试官可能也不舒服。

## 一、基础部分



### 2、数组和切片的区别 （基本必问）

相同点：

1) 只能存储一组相同类型的数据结构

2) 都是通过下标来访问，并且有容量长度，长度通过 len 获取，容量通过 cap 获取

**区别：**

1）数组是定长，访问和复制不能超过数组定义的长度，否则就会下标越界，切片长度和容量可以自动扩容

2）数组是值类型，切片是引用类型，每个切片都引用了一个底层数组，切片本身不能存储任何数据，都是这底层数组存储数据，所以修改切片的时候修改的是底层数组中的数据。切片一旦扩容，指向一个新的底层数组，内存地址也就随之改变

**简洁的回答：**

1）定义方式不一样 2）初始化方式不一样，数组需要指定大小，大小不改变 3）在函数传递中，数组切片都是值传递。

**数组的定义**

var a1 [3]int

var a2 [...]int{1,2,3}

**切片的定义**

var a1 []int

var a2 :=make([]int,3,5)

**数组的初始化**

a1 := [...]int{1,2,3}

a2 := [5]int{1,2,3}

**切片的初始化**

b:= make([]int,3,5)

### **3、for range 的时候它的地址会发生变化么？**

答：在 for a,b := range c 遍历中， a 和 b 在内存中只会存在一份，即之后每次循环时遍历到的数据都是以值覆盖的方式赋给 a 和 b，a，b 的内存地址始终不变。由于有这个特性，for 循环里面如果开协程，不要直接把 a 或者 b 的地址传给协程。解决办法：在每次循环时，创建一个临时变量。

### **4、go defer，多个 defer 的顺序，defer 在什么时机会修改返回值？**

作用：defer 延迟函数，释放资源，收尾工作；如释放锁，关闭文件，关闭链接；捕获 panic;

避坑指南：defer 函数紧跟在资源打开后面，否则 defer 可能得不到执行，导致内存泄露。

多个 defer 调用顺序是 LIFO（后入先出），defer 后的操作可以理解为压入栈中

defer，return，return value（函数返回值） 执行顺序：首先 return，其次 return value，最后 defer。defer 可以修改函数最终返回值，修改时机：**有名返回值或者函数返回指针** 参考：

[【Golang】Go 语言 defer 用法大总结 (含 return 返回机制)__奶酪的博客 - CSDN 博客](https://blog.csdn.net/Cassie_zkq/article/details/108567205)

**有名返回值**

```
func b() (i int) {
	defer func() {
		i++
		fmt.Println("defer2:", i)
	}()
	defer func() {
		i++
		fmt.Println("defer1:", i)
	}()
	return i //或者直接写成return
}
func main() {
	fmt.Println("return:", b())
}
```

////////////////////////////////////////////////////////////////////////////////

**函数返回指针**

```
func c() *int {
	var i int
	defer func() {
		i++
		fmt.Println("defer2:", i)
	}()
	defer func() {
		i++
		fmt.Println("defer1:", i)
	}()
	return &i
}
func main() {
	fmt.Println("return:", *(c()))
}
```

### **5、uint 类型溢出问题**

超过最大存储值如 uint8 最大是 255

var a uint8 =255

var b uint8 =1

a+b = 0 总之类型溢出会出现难以意料的事

![](https://pic2.zhimg.com/v2-5bf5e213ce315a16d0b7e65ef41cc685_r.jpg)

### **6、能介绍下 rune 类型吗？**

相当 int32

golang 中的字符串底层实现是通过 byte 数组的，中文字符在 unicode 下占 2 个字节，在 utf-8 编码下占 3 个字节，而 golang 默认编码正好是 utf-8

byte 等同于 int8，常用来处理 ascii 字符

rune 等同于 int32, 常用来处理 unicode 或 utf-8 字符

![](https://pic2.zhimg.com/v2-15a9656d176cfcc16d4116bbc9d2a24d_r.jpg)

### **7、 golang 中解析 tag 是怎么实现的？反射原理是什么？(中高级肯定会问，比较难，需要自己多去总结)**

**参考如下连接**

[golang 中 struct 关于反射 tag_paladinosment 的博客 - CSDN 博客_golang 反射 tag](https://blog.csdn.net/paladinosment/article/details/42570937)

```
type User struct {
	name string `json:name-field`
	age  int
}
func main() {
	user := &User{"John Doe The Fourth", 20}

	field, ok := reflect.TypeOf(user).Elem().FieldByName("name")
	if !ok {
		panic("Field not found")
	}
	fmt.Println(getStructTag(field))
}

func getStructTag(f reflect.StructField) string {
	return string(f.Tag)
}
```

Go 中解析的 tag 是通过反射实现的，反射是指计算机程序在运行时（Run time）可以访问、检测和修改它本身状态或行为的一种能力或动态知道给定数据对象的类型和结构，并有机会修改它。反射将接口变量转换成反射对象 Type 和 Value；反射可以通过反射对象 Value 还原成原先的接口变量；反射可以用来修改一个变量的值，前提是这个值可以被修改；tag 是啥: 结构体支持标记，name string `json:name-field` 就是 `json:name-field` 这部分

**gorm json yaml gRPC protobuf gin.Bind() 都是通过反射来实现的**

### **8、调用函数传入结构体时，应该传值还是指针？ （Golang 都是传值）**

Go 的函数参数传递都是值传递。所谓值传递：指在调用函数时将实际参数复制一份传递到函数中，这样在函数中如果对参数进行修改，将不会影响到实际参数。参数传递还有引用传递，所谓引用传递是指在调用函数时将实际参数的地址传递到函数中，那么在函数中对参数所进行的修改，将影响到实际参数

因为 Go 里面的 map，slice，chan 是引用类型。变量区分值类型和引用类型。所谓值类型：变量和变量的值存在同一个位置。所谓引用类型：变量和变量的值是不同的位置，变量的值存储的是对值的引用。但并不是 map，slice，chan 的所有的变量在函数内都能被修改，不同数据类型的底层存储结构和实现可能不太一样，情况也就不一样。

### **9、讲讲 Go 的 slice 底层数据结构和一些特性？**

答：Go 的 slice 底层数据结构是由一个 array 指针指向底层数组，len 表示切片长度，cap 表示切片容量。slice 的主要实现是扩容。对于 append 向 slice 添加元素时，假如 slice 容量够用，则追加新元素进去，slice.len++，返回原来的 slice。当原容量不够，则 slice 先扩容，扩容之后 slice 得到新的 slice，将元素追加进新的 slice，slice.len++，返回新的 slice。对于切片的扩容规则：当切片比较小时（容量小于 1024），则采用较大的扩容倍速进行扩容（新的扩容会是原来的 2 倍），避免频繁扩容，从而减少内存分配的次数和数据拷贝的代价。当切片较大的时（原来的 slice 的容量大于或者等于 1024），采用较小的扩容倍速（新的扩容将扩大大于或者等于原来 1.25 倍），主要避免空间浪费，网上其实很多总结的是 1.25 倍，那是在不考虑内存对齐的情况下，实际上还要考虑内存对齐，扩容是大于或者等于 1.25 倍。

（关于刚才问的 slice 为什么传到函数内可能被修改，如果 slice 在函数内没有出现扩容，函数外和函数内 slice 变量指向是同一个数组，则函数内复制的 slice 变量值出现更改，函数外这个 slice 变量值也会被修改。如果 slice 在函数内出现扩容，则函数内变量的值会新生成一个数组（也就是新的 slice，而函数外的 slice 指向的还是原来的 slice，则函数内的修改不会影响函数外的 slice。）

### 讲讲 Go 的 select 底层数据结构和一些特性？（难点，没有项目经常可能说不清，面试一般会问你项目中怎么使用 select）

答：go 的 select 为 golang 提供了多路 IO 复用机制，和其他 IO 复用一样，用于检测是否有读写事件是否 ready。linux 的系统 IO 模型有 select，poll，epoll，go 的 select 和 linux 系统 select 非常相似。

select 结构组成主要是由 case 语句和执行的函数组成 select 实现的多路复用是：每个线程或者进程都先到注册和接受的 channel（装置）注册，然后阻塞，然后只有一个线程在运输，当注册的线程和进程准备好数据后，装置会根据注册的信息得到相应的数据。

**select 的特性**

1）select 操作至少要有一个 case 语句，出现读写 nil 的 channel 该分支会忽略，在 nil 的 channel 上操作则会报错。

2）select 仅支持管道，而且是单协程操作。

3）每个 case 语句仅能处理一个管道，要么读要么写。

4）多个 case 语句的执行顺序是随机的。

5）存在 default 语句，select 将不会阻塞，但是存在 default 会影响性能。

### 讲讲 Go 的 defer 底层数据结构和一些特性？

答：每个 defer 语句都对应一个_defer 实例，多个实例使用指针连接起来形成一个单连表，保存在 gotoutine 数据结构中，每次插入_defer 实例，均插入到链表的头部，函数结束再一次从头部取出，从而形成后进先出的效果。

**defer 的规则总结**：

延迟函数的参数是 defer 语句出现的时候就已经确定了的。

延迟函数执行按照后进先出的顺序执行，即先出现的 defer 最后执行。

延迟函数可能操作主函数的返回值。

申请资源后立即使用 defer 关闭资源是个好习惯。

### 单引号，双引号，反引号的区别？

单引号，表示 byte 类型或 rune 类型，对应 uint8 和 int32 类型，默认是 rune 类型。byte 用来强调数据是 raw data，而不是数字；而 rune 用来表示 Unicode 的 code point。

双引号，才是字符串，实际上是字符数组。可以用索引号访问某字节，也可以用 len() 函数来获取字符串所占的字节长度。

反引号，表示字符串字面量，但不支持任何转义序列。字面量 raw literal string 的意思是，你定义时写的啥样，它就啥样，你有换行，它就换行。你写转义字符，它也就展示转义字符。

**二、map 相关**
------------

### 1、map 使用注意的点，是否并发安全？

map 的类型是 map[key]，key 类型的 ke 必须是可比较的，通常情况，会选择内建的基本类型，比如整数、字符串做 key 的类型。如果要使用 struct 作为 key，要保证 struct 对象在逻辑上是不可变的。在 Go 语言中，map[key] 函数返回结果可以是一个值，也可以是两个值。map 是无序的，如果我们想要保证遍历 map 时元素有序，可以使用辅助的数据结构，例如 orderedmap。

**第一，**一定要先初始化，否则 panic

**第二，**map 类型是容易发生并发访问问题的。不注意就容易发生程序运行时并发读写导致的 panic。 Go 语言内建的 map 对象不是线程安全的，并发读写的时候运行时会有检查，遇到并发问题就会导致 panic。

### 2、map 循环是有序的还是无序的？

无序的, map 因扩张⽽重新哈希时，各键值项存储位置都可能会发生改变，顺序自然也没法保证了，所以官方避免大家依赖顺序，直接打乱处理。就是 for range map 在开始处理循环逻辑的时候，就做了随机播种

### map 中删除一个 key，它的内存会释放么？（常问）

如果删除的元素是值类型，如 int，float，bool，string 以及数组和 struct，map 的内存不会自动释放

如果删除的元素是引用类型，如指针，slice，map，chan 等，map 的内存会自动释放，但释放的内存是子元素应用类型的内存占用

map删除元素并不会释放内存，只是修改标记。如果想要释放内存，可以将map设置为nil后调用gc来实现。

https://juejin.cn/post/7195528153905184829

### 4、怎么处理对 map 进行并发访问？有没有其他方案？ 区别是什么？

![](https://pic2.zhimg.com/v2-1107961e741b834eb5fc071ff68da831_r.jpg)

**方式一、使用内置 sync.Map，详细参考**

[https://mbd.baidu.com/ma/s/7Hwd9yMc](https://mbd.baidu.com/ma/s/7Hwd9yMc)

**方式二、使用读写锁实现并发安全 map**

[https://mbd.baidu.com/ma/s/qO7b0VQU](https://mbd.baidu.com/ma/s/qO7b0VQU)

### 5、 nil map 和空 map 有何不同？

1）可以对未初始化的 map 进行取值，但取出来的东西是空：

var m1 map[string]string

fmt.Println(m1["1"])

////////////////////////////////////////////////////////////////////////////////

2）不能对未初始化的 map 进行赋值，这样将会抛出一个异常：

var m1 map[string]string

m1["1"] = "1"

panic: assignment to entry in nil map

////////////////////////////////////////////////////////////////////////////////

3) 通过 fmt 打印 map 时，空 map 和 nil map 结果是一样的，都为 map[]。所以，这个时候别断定 map 是空还是 nil，而应该通过 map == nil 来判断。

**nil map 未初始化，空 map 是长度为空**

### 6、map 的数据结构是什么？是怎么实现扩容？

答：golang 中 map 是一个 kv 对集合。底层使用 hash table，用链表来解决冲突 ，出现冲突时，不是每一个 key 都申请一个结构通过链表串起来，而是以 bmap 为最小粒度挂载，一个 bmap 可以放 8 个 kv。在哈希函数的选择上，会在程序启动时，检测 cpu 是否支持 aes，如果支持，则使用 aes hash，否则使用 memhash。每个 map 的底层结构是 hmap，是有若干个结构为 bmap 的 bucket 组成的数组。每个 bucket 底层都采用链表结构。

**hmap 的结构如下：**

```
type hmap struct {
    count     int                  // 元素个数
    flags     uint8
    B         uint8                // 扩容常量相关字段B是buckets数组的长度的对数 2^B
    noverflow uint16               // 溢出的bucket个数
    hash0     uint32               // hash seed
    buckets    unsafe.Pointer      // buckets 数组指针
    oldbuckets unsafe.Pointer      // 结构扩容的时候用于赋值的buckets数组
    nevacuate  uintptr             // 搬迁进度
    extra *mapextra                // 用于扩容的指针
}
```

**map 的容量大小**

  
底层调用 makemap 函数，计算得到合适的 B，map 容量最多可容纳 6.52^B 个元素，6.5 为装载因子阈值常量。装载因子的计算公式是：装载因子 = 填入表中的元素个数 / 散列表的长度，装载因子越大，说明空闲位置越少，冲突越多，散列表的性能会下降。底层调用 makemap 函数，计算得到合适的 B，map 容量最多可容纳 6.52^B 个元素，6.5 为装载因子阈值常量。装载因子的计算公式是：装载因子 = 填入表中的元素个数 / 散列表的长度，装载因子越大，说明空闲位置越少，冲突越多，散列表的性能会下降。

**触发 map 扩容的条件**

1）装载因子超过阈值，源码里定义的阈值是 6.5。

2）overflow 的 bucket 数量过多 map 的 bucket 定位和 key 的定位高八位用于定位 bucket，低八位用于定位 key，快速试错后再进行完整对比

![](https://pic4.zhimg.com/v2-f99ed061ef6ea995743cda6d332861e3_r.jpg)

### 7、slices 能作为 map 类型的 key 吗？

当时被问的一脸懵逼，其实是这个问题的变种：golang 哪些类型可以作为 map key？

答案是：**在 golang 规范中，可比较的类型都可以作为 map key；**这个问题又延伸到在：golang 规范中，哪些数据类型可以比较？

**不能作为 map key 的类型包括：**

*   slices
*   maps
*   functions

详细参考：

[golang 哪些类型可以作为 map key](https://blog.csdn.net/lanyang123456/article/details/123765745)

### 说一下map的数据结构和扩容机制

Go 语言中的 `map` 是一种高效的键值对集合，其内部实现是基于散列表（hash table）的。下面是 `map` 的数据结构和扩容机制的概述：

### 数据结构

`map` 的内部实现由以下几个主要部分构成：

- **哈希桶（Buckets）**：`map` 使用多个哈希桶来存储键值对，每个桶可以存储若干键值对（在较新版本的 Go 中，每个桶通常可以存放 8 个键值对）。键值对存储在哪个桶是根据键的哈希值来决定的。
- **溢出桶（Overflow Buckets）**：当一个桶填满时，额外的键值对将被存储在溢出桶中。每个主桶都有指向溢出桶的指针，以处理哈希冲突。
- **哈希函数**：用于将键映射到桶的索引。Go 的 `map` 实现中使用的哈希函数旨在分布均匀，以减少冲突并提高存取效率。

### 扩容机制

当 `map` 中的元素不断增加，导致装载因子（即 `map` 中元素的数量与桶数量的比值）超过某个阈值时，`map` 会进行扩容来保持操作的效率。扩容主要包括以下步骤：

1. **创建更大的哈希表**：扩容时，`map` 会创建一个新的、更大的哈希表。新表的桶数量通常是原表的两倍，这有助于分散已有的键值对，从而减少冲突和提高访问速度。
2. **重新哈希**：扩容过程中，所有现有的键值对都需要被重新哈希到新的哈希表中。这意味着根据每个键的哈希值重新计算其在新表中的桶位置，并将其移动到相应的位置。
3. **逐步迁移**：为了避免扩容时一次性的大量计算，Go 的 `map` 实现采用了逐步迁移的方式。当发生写操作时，会逐渐将旧表中的键值对迁移到新表中，直到所有键值对都迁移完毕。

这种扩容机制使得 `map` 能够在动态增长时保持较高的性能，但也意味着扩容操作可能会导致短暂的性能下降。由于扩容的成本相对较高，Go 的 `map` 实现尽量通过初始容量的预分配和合理的装载因子阈值来减少扩容次数。

## context 相关

### **1、context 结构是什么样的？context 使用场景和用途？**

**（难，也常常问你项目中怎么用，光靠记答案很难让面试官满意，反正有各种结合实际的问题）**

**参考链接：**

[go context 详解 - 卷毛狒狒 - 博客园](https://www.cnblogs.com/juanmaofeifei/p/14439957.html)

答：Go 的 Context 的数据结构包含 Deadline，Done，Err，Value，Deadline 方法返回一个 time.Time，表示当前 Context 应该结束的时间，ok 则表示有结束时间，Done 方法当 Context 被取消或者超时时候返回的一个 close 的 channel，告诉给 context 相关的函数要停止当前工作然后返回了，Err 表示 context 被取消的原因，Value 方法表示 context 实现共享数据存储的地方，是协程安全的。context 在业务中是经常被使用的，

**其主要的应用 ：**

1：上下文控制，2：多个 goroutine 之间的数据交互等，3：超时控制：到某个时间点超时，过多久超时。

**四、channel 相关**
----------------

### **1、channel 是否线程安全？锁用在什么地方？**

![](https://pic2.zhimg.com/v2-e287f5861392d5de73d8956974acdbbd_r.jpg)

就着图片里面的答案看看吧。

### **2、go channel 的底层实现原理 （数据结构）**

![](https://pic4.zhimg.com/v2-9452c08ff058590cea1b40a39fd8c70f_r.jpg)

底层结构需要描述出来，这个简单，buf，发送队列，接收队列，lock。

### **3、nil、关闭的 channel、有数据的 channel，再进行读、写、关闭会怎么样？（各类变种题型，重要）**

![](https://pic1.zhimg.com/v2-8e12b7eb664280346ec96bcc4fe1db2c_r.jpg)

还要去了解一下单向 channel, 如只读或者只写通道常见的异常问题，这块还需要大家自己总结总结，有懂得大佬也可以评论发送答案。

### **4、向 channel 发送数据和从 channel 读数据的流程是什么样的？**

**发送流程：**

![](https://pic2.zhimg.com/v2-d2a3f2aa5c85b94df49430c21a53a2d9_r.jpg)

**接收流程：**

![](https://pic3.zhimg.com/v2-69e0e2f1409a17ec2987e4b63e6210da_r.jpg)

这个没啥好说的，底层原理，1、2、3 描述出来，保证面试官满意。具体的文字描述下面一题有，channel 的概念多且复杂，脑海中有个总分的概念，否则你说的再多，面试官也抓不住你说的重点，等于白说。问题 5 已经为大家总结好了。

### **5、讲讲 Go 的 chan 底层数据结构和主要使用场景**

答：channel 的数据结构包含 qccount 当前队列中剩余元素个数，dataqsiz 环形队列长度，即可以存放的元素个数，buf 环形队列指针，elemsize 每个元素的大小，closed 标识关闭状态，elemtype 元素类型，sendx 队列下表，指示元素写入时存放到队列中的位置，recv 队列下表，指示元素从队列的该位置读出。recvq 等待读消息的 goroutine 队列，sendq 等待写消息的 goroutine 队列，lock 互斥锁，chan 不允许并发读写。

**无缓冲和有缓冲区别：** 管道没有缓冲区，从管道读数据会阻塞，直到有协程向管道中写入数据。同样，向管道写入数据也会阻塞，直到有协程从管道读取数据。管道有缓冲区但缓冲区没有数据，从管道读取数据也会阻塞，直到协程写入数据，如果管道满了，写数据也会阻塞，直到协程从缓冲区读取数据。

**channel 的一些特点** 1）、读写值 nil 管道会永久阻塞 2）、关闭的管道读数据仍然可以读数据 3）、往关闭的管道写数据会 panic 4）、关闭为 nil 的管道 panic 5）、关闭已经关闭的管道 panic

**向 channel 写数据的流程：** 如果等待接收队列 recvq 不为空，说明缓冲区中没有数据或者没有缓冲区，此时直接从 recvq 取出 G, 并把数据写入，最后把该 G 唤醒，结束发送过程； 如果缓冲区中有空余位置，将数据写入缓冲区，结束发送过程； 如果缓冲区中没有空余位置，将待发送数据写入 G，将当前 G 加入 sendq，进入睡眠，等待被读 goroutine 唤醒；

**向 channel 读数据的流程：** 如果等待发送队列 sendq 不为空，且没有缓冲区，直接从 sendq 中取出 G，把 G 中数据读出，最后把 G 唤醒，结束读取过程； 如果等待发送队列 sendq 不为空，此时说明缓冲区已满，从缓冲区中首部读出数据，把 G 中数据写入缓冲区尾部，把 G 唤醒，结束读取过程； 如果缓冲区中有数据，则从缓冲区取出数据，结束读取过程；将当前 goroutine 加入 recvq，进入睡眠，等待被写 goroutine 唤醒；

**使用场景：** 消息传递、消息过滤，信号广播，事件订阅与广播，请求、响应转发，任务分发，结果汇总，并发控制，限流，同步与异步

**五、GMP 相关**
------------

### 1、什么是 GMP？（必问）

答：G 代表着 goroutine，P 代表着上下文处理器，M 代表 thread 线程，在 GPM 模型，有一个全局队列（Global Queue）：存放等待运行的 G，还有一个 P 的本地队列：也是存放等待运行的 G，但数量有限，不超过 256 个。GPM 的调度流程从 go func() 开始创建一个 goroutine，新建的 goroutine 优先保存在 P 的本地队列中，如果 P 的本地队列已经满了，则会保存到全局队列中。M 会从 P 的队列中取一个可执行状态的 G 来执行，如果 P 的本地队列为空，就会从其他的 MP 组合偷取一个可执行的 G 来执行，当 M 执行某一个 G 时候发生系统调用或者阻塞，M 阻塞，如果这个时候 G 在执行，runtime 会把这个线程 M 从 P 中摘除，然后创建一个新的操作系统线程来服务于这个 P，当 M 系统调用结束时，这个 G 会尝试获取一个空闲的 P 来执行，并放入到这个 P 的本地队列，如果这个线程 M 变成休眠状态，加入到空闲线程中，然后整个 G 就会被放入到全局队列中。

关于 G,P,M 的个数问题，G 的个数理论上是无限制的，但是受内存限制，P 的数量一般建议是逻辑 CPU 数量的 2 倍，M 的数据默认启动的时候是 10000，内核很难支持这么多线程数，所以整个限制客户忽略，M 一般不做设置，设置好 P，M 一般都是要大于 P。

### 2、进程、线程、协程有什么区别？（必问）

进程：是应用程序的启动实例，每个进程都有独立的内存空间，不同的进程通过进程间的通信方式来通信。

线程：从属于进程，每个进程至少包含一个线程，线程是 CPU 调度的基本单位，多个线程之间可以共享进程的资源并通过共享内存等线程间的通信方式来通信。

协程：为轻量级线程，与线程相比，协程不受操作系统的调度，协程的调度器由用户应用程序提供，协程调度器按照调度策略把协程调度到线程中运行

### 3、抢占式调度是如何抢占的？

**基于协作式抢占**

**基于信号量抢占**

就像操作系统要负责线程的调度一样，Go 的 runtime 要负责 goroutine 的调度。现代操作系统调度线程都是抢占式的，我们不能依赖用户代码主动让出 CPU，或者因为 IO、锁等待而让出，这样会造成调度的不公平。基于经典的时间片算法，当线程的时间片用完之后，会被时钟中断给打断，调度器会将当前线程的执行上下文进行保存，然后恢复下一个线程的上下文，分配新的时间片令其开始执行。这种抢占对于线程本身是无感知的，系统底层支持，不需要开发人员特殊处理。

基于时间片的抢占式调度有个明显的优点，能够避免 CPU 资源持续被少数线程占用，从而使其他线程长时间处于饥饿状态。goroutine 的调度器也用到了时间片算法，但是和操作系统的线程调度还是有些区别的，因为整个 Go 程序都是运行在用户态的，所以不能像操作系统那样利用时钟中断来打断运行中的 goroutine。也得益于完全在用户态实现，goroutine 的调度切换更加轻量。

**上面这两段文字只是对调度的一个概括，具体的协作式调度、信号量调度大家还需要去详细了解，这偏底层了，大厂或者中高级开发会问。（字节就问了）**

### 4、M 和 P 的数量问题？

p 默认 cpu 内核数

M 与 P 的数量没有绝对关系，一个 M 阻塞，P 就会去创建或者切换另一个 M，所以，即使 P 的默认数量是 1，也有可能会创建很多个 M 出来

【Go 语言调度模型 G、M、P 的数量多少合适？】

详细参考这篇文章

[https://mbd.baidu.com/ma/s/ZMOKQATr](https://mbd.baidu.com/ma/s/ZMOKQATr)

GMP 数量这一块，结论很好记，没用项目经验的话，问了项目中怎么用可能容易卡壳。

六、锁相关
-----

### 1、除了 mutex 以外还有那些方式安全读写共享变量？

* 将共享变量的读写放到一个 goroutine 中，其它 goroutine 通过 channel 进行读写操作。

* 可以用个数为 1 的信号量（semaphore）实现互斥

* 通过 Mutex 锁实现

### 2、Go 如何实现原子操作？

答：原子操作就是不可中断的操作，外界是看不到原子操作的中间状态，要么看到原子操作已经完成，要么看到原子操作已经结束。在某个值的原子操作执行的过程中，CPU 绝对不会再去执行其他针对该值的操作，那么其他操作也是原子操作。

Go 语言的标准库代码包 sync/atomic 提供了原子的读取（Load 为前缀的函数）或写入（Store 为前缀的函数）某个值（这里细节还要多去查查资料）。

**原子操作与互斥锁的区别**

1）、互斥锁是一种数据结构，用来让一个线程执行程序的关键部分，完成互斥的多个操作。

2）、原子操作是针对某个值的单个互斥操作。

### 3、Mutex 是悲观锁还是乐观锁？悲观锁、乐观锁是什么？

**悲观锁**

悲观锁：当要对数据库中的一条数据进行修改的时候，为了避免同时被其他人修改，最好的办法就是直接对该数据进行加锁以防止并发。这种借助数据库锁机制，在修改数据之前先锁定，再修改的方式被称之为悲观并发控制【Pessimistic Concurrency Control，缩写 “PCC”，又名 “悲观锁”】。

**乐观锁**

乐观锁是相对悲观锁而言的，乐观锁假设数据一般情况不会造成冲突，所以在数据进行提交更新的时候，才会正式对数据的冲突与否进行检测，如果冲突，则返回给用户异常信息，让用户决定如何去做。乐观锁适用于读多写少的场景，这样可以提高程序的吞吐量

### 4、Mutex 有几种模式？

**1）正常模式**

1.  当前的 mutex 只有一个 goruntine 来获取，那么没有竞争，直接返回。
2.  新的 goruntine 进来，如果当前 mutex 已经被获取了，则该 goruntine 进入一个先入先出的 waiter 队列，在 mutex 被释放后，waiter 按照先进先出的方式获取锁。该 goruntine 会处于自旋状态 (不挂起，继续占有 cpu)。
3.  新的 goruntine 进来，mutex 处于空闲状态，将参与竞争。新来的 goroutine 有先天的优势，它们正在 CPU 中运行，可能它们的数量还不少，所以，在高并发情况下，被唤醒的 waiter 可能比较悲剧地获取不到锁，这时，它会被插入到队列的前面。如果 waiter 获取不到锁的时间超过阈值 1 毫秒，那么，这个 Mutex 就进入到了饥饿模式。

**2）饥饿模式**

在饥饿模式下，Mutex 的拥有者将直接把锁交给队列最前面的 waiter。新来的 goroutine 不会尝试获取锁，即使看起来锁没有被持有，它也不会去抢，也不会 spin（自旋），它会乖乖地加入到等待队列的尾部。 如果拥有 Mutex 的 waiter 发现下面两种情况的其中之一，它就会把这个 Mutex 转换成正常模式:

1.  此 waiter 已经是队列中的最后一个 waiter 了，没有其它的等待锁的 goroutine 了；
2.  此 waiter 的等待时间小于 1 毫秒。

### 5、goroutine 的自旋占用资源如何解决

自旋锁是指当一个线程在获取锁的时候，如果锁已经被其他线程获取，那么该线程将循环等待，然后不断地判断是否能够被成功获取，直到获取到锁才会退出循环。

**自旋的条件如下：**

1）还没自旋超过 4 次,

2）多核处理器，

3）GOMAXPROCS > 1，

4）p 上本地 goroutine 队列为空。

mutex 会让当前的 goroutine 去空转 CPU，在空转完后再次调用 CAS 方法去尝试性的占有锁资源，直到不满足自旋条件，则最终会加入到等待队列里。

**七、并发相关**
----------

### 1、怎么控制并发数？

**第一，有缓冲通道**

根据通道中没有数据时读取操作陷入阻塞和通道已满时继续写入操作陷入阻塞的特性，正好实现控制并发数量。

```
func main() {
	count := 10 // 最大支持并发
	sum := 100 // 任务总数
	wg := sync.WaitGroup{} //控制主协程等待所有子协程执行完之后再退出。

	c := make(chan struct{}, count) // 控制任务并发的chan
	defer close(c)

	for i:=0; i<sum;i++{
		wg.Add(1)
		c <- struct{}{} // 作用类似于waitgroup.Add(1)
		go func(j int) {
			defer wg.Done()
			fmt.Println(j)
			<- c // 执行完毕，释放资源
		}(i)
	}
	wg.Wait()
}
```

**第二，三方库实现的协程池**

panjf2000/ants（比较火）

Jeffail/tunny

```
import (
	"log"
	"time"

	"github.com/Jeffail/tunny"
)
func main() {
	pool := tunny.NewFunc(10, func(i interface{}) interface{} {
		log.Println(i)
		time.Sleep(time.Second)
		return nil
	})
	defer pool.Close()

	for i := 0; i < 500; i++ {
		go pool.Process(i)
	}
	time.Sleep(time.Second * 4)
}
```

### 2、多个 goroutine 对同一个 map 写会 panic，异常是否可以用 defer 捕获？

可以捕获异常，但是只能捕获一次，Go 语言，可以使用多值返回来返回错误。不要用异常代替错误，更不要用来控制流程。在极个别的情况下，才使用 Go 中引入的 Exception 处理：defer, panic, recover Go 中，对异常处理的原则是：多用 error 包，少用 panic

```
defer func() {
		if err := recover(); err != nil {
			// 打印异常，关闭资源，退出此函数
			fmt.Println(err)
		}
	}()
```

### 如何优雅的实现一个 goroutine 池

（百度、手写代码，本人面传音控股被问道：请求数大于消费能力怎么设计协程池）

这一块能啃下来，offer 满天飞，这应该是保证高并发系统稳定性、高可用的核心部分之一。

**建议参考：**

[Golang 学习篇 -- 协程池_Word 哥的博客 - CSDN 博客_golang 协程池](https://blog.csdn.net/finghting321/article/details/106492915/)

**这篇文章的目录是：**

1. 为什么需要协程池？

2. 简单的协程池

3. go-playground/pool

4. ants（推荐）

**所以直接研究 ants 底层吧，省的造轮子。**

在 Go 中实现一个优雅的 goroutine 池（goroutine pool）的目的是控制并发执行的 goroutine 的数量，以有效利用资源并防止过多的并发导致资源竭尽。goroutine 池通常由以下几个核心部分组成：工作队列（work queue），工作者（worker），以及调度器（dispatcher）。以下是实现一个简单但优雅的 goroutine 池的步骤和代码示例。

### 步骤

1. **定义任务**：首先定义任务（Task），通常是一个函数或者是包含要执行函数的结构体。
2. **工作者（Worker）**：工作者负责执行队列中的任务。每个工作者在自己的 goroutine 中运行，并从任务队列中获取任务执行。
3. **调度器（Dispatcher）**：调度器管理工作者池，负责接收新的任务并将其分配给空闲的工作者。如果所有工作者都忙碌，任务将在队列中等待。
4. **任务队列**：用来存放等待被执行的任务，通常是一个通道（channel）。

### 代码示例

这是一个简化的 goroutine 池实现示例：

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Task 是一个代表单个任务的类型
type Task func()

// Worker 是执行任务的工作者
type Worker struct {
    ID          int
    TaskChannel chan Task
    wg          *sync.WaitGroup
}

// NewWorker 创建并返回一个新的 Worker
func NewWorker(workerID int, wg *sync.WaitGroup) Worker {
    return Worker{
        ID:          workerID,
        TaskChannel: make(chan Task),
        wg:          wg,
    }
}

// Start 方法启动 Worker 循环，不断从 TaskChannel 接收并执行任务
func (w *Worker) Start() {
    go func() {
        for task := range w.TaskChannel {
            task()
            w.wg.Done()
        }
    }()
}

// Pool 是 goroutine 池
type Pool struct {
    Workers    []Worker
    TaskQueue  chan Task
    wg         sync.WaitGroup
}

// NewPool 创建一个新的 Pool
func NewPool(numWorkers int) *Pool {
    pool := &Pool{
        TaskQueue: make(chan Task),
        Workers:   make([]Worker, numWorkers),
    }
    pool.wg.Add(numWorkers)
    for i := 0; i < numWorkers; i++ {
        worker := NewWorker(i, &pool.wg)
        pool.Workers[i] = worker
        worker.Start()
    }
    return pool
}

// AddTask 向 Pool 添加任务
func (p *Pool) AddTask(task Task) {
    p.TaskQueue <- task
}

// Start 启动 Pool 的任务分发
func (p *Pool) Start() {
    for _, worker := range p.Workers {
        go func(w Worker) {
            for task := range p.TaskQueue {
                w.TaskChannel <- task
            }
        }(worker)
    }
}

// Wait 等待所有任务完成
func (p *Pool) Wait() {
    p.wg.Wait()
}

func main() {
    tasks := []Task{
        func() { fmt.Println("Task 1"); time.Sleep(1 * time.Second) },
        func() { fmt.Println("Task 2"); time.Sleep(1 * time.Second) },
        // 可以添加更多任务
    }

    pool := NewPool(3) // 创建一个有 3 个工作者的池
    pool.Start()

    for _, task := range tasks {
        pool.AddTask(task)
    }

    pool.Wait() // 等待所有任务完成
}
```

这个例子展示了如何创建和使用一个 goroutine 池来并发执行多个任务，同时控制并发数量。工作者池通过任务队列接收任务，每个工作者在自己的 goroutine 中执行任务。通过这种方式，可以有效地利用系统资源，避免因为创建过多的 goroutine 而耗尽资源。

**八、GC 相关**
-----------

### 1、go gc 是怎么实现的？（必问）

答：

**细分常见的三个问题：1、GC 机制随着 golang 版本变化如何变化的？2、三色标记法的流程？3、插入屏障、删除屏障，混合写屏障（具体的实现比较难描述，但你要知道屏障的作用：避免程序运行过程中，变量被误回收；减少 STW 的时间）4、虾皮还问了个开放性的题目：你觉得以后 GC 机制会怎么优化？**

Go 的 GC 回收有三次演进过程，Go V1.3 之前普通标记清除（mark and sweep）方法，整体过程需要启动 STW，效率极低。GoV1.5 三色标记法，堆空间启动写屏障，栈空间不启动，全部扫描之后，需要重新扫描一次栈 (需要 STW)，效率普通。GoV1.8 三色标记法，混合写屏障机制：栈空间不启动（全部标记成黑色），堆空间启用写屏障，整个过程不要 STW，效率高。

Go1.3 之前的版本所谓标记清除是先启动 STW 暂停，然后执行标记，再执行数据回收，最后停止 STW。Go1.3 版本标记清除做了点优化，流程是：先启动 STW 暂停，然后执行标记，停止 STW，最后再执行数据回收。

Go1.5 三色标记主要是插入屏障和删除屏障，写入屏障的流程：程序开始，全部标记为白色，1）所有的对象放到白色集合，2）遍历一次根节点，得到灰色节点，3）遍历灰色节点，将可达的对象，从白色标记灰色，遍历之后的灰色标记成黑色，4）由于并发特性，此刻外界向在堆中的对象发生添加对象，以及在栈中的对象添加对象，在堆中的对象会触发插入屏障机制，栈中的对象不触发，5）由于堆中对象插入屏障，则会把堆中黑色对象添加的白色对象改成灰色，栈中的黑色对象添加的白色对象依然是白色，6）循环第 5 步，直到没有灰色节点，7）在准备回收白色前，重新遍历扫描一次栈空间，加上 STW 暂停保护栈，防止外界干扰（有新的白色会被添加成黑色）在 STW 中，将栈中的对象一次三色标记，直到没有灰色，8）停止 STW，清除白色。至于删除写屏障，则是遍历灰色节点的时候出现可达的节点被删除，这个时候触发删除写屏障，这个可达的被删除的节点也是灰色，等循环三色标记之后，直到没有灰色节点，然后清理白色，删除写屏障会造成一个对象即使被删除了最后一个指向它的指针也依旧可以活过这一轮，在下一轮 GC 中被清理掉。

GoV1.8 混合写屏障规则是：

1）GC 开始将栈上的对象全部扫描并标记为黑色 (之后不再进行第二次重复扫描，无需 STW)，2）GC 期间，任何在栈上创建的新对象，均为黑色。3）被删除的对象标记为灰色。4）被添加的对象标记为灰色。

### 2、go 是 gc 算法是怎么实现的？ （得物，出现频率低）

```
func GC() {
	n := atomic.Load(&amp;work.cycles)
	gcWaitOnMark(n)

	gcStart(gcTrigger{kind: gcTriggerCycle, n: n + 1})
	gcWaitOnMark(n + 1)

	for atomic.Load(&amp;work.cycles) == n+1 &amp;&amp; sweepone() != ^uintptr(0) {
		sweep.nbgsweep++
		Gosched()
	}
	for atomic.Load(&amp;work.cycles) == n+1 &amp;&amp; atomic.Load(&amp;mheap_.sweepers) != 0 {
		Gosched()
	}
	mp := acquirem()
	cycle := atomic.Load(&amp;work.cycles)
	if cycle == n+1 || (gcphase == _GCmark &amp;&amp; cycle == n+2) {
		mProf_PostSweep()
	}
	releasem(mp)
}
```

底层原理了，可能大厂，中高级才会问，参考：

[Golang GC 算法解读_suchy_sz 的博客 - CSDN 博客_go 的 gc 算法](https://blog.csdn.net/shudaqi2010/article/details/90025192)

### 3、GC 中 stw 时机，各个阶段是如何解决的？ （百度）

**底层原理，自行百度一下，我等渣渣简历都过不了 BAT，字节，虾皮，特使拉以及一些国 Q 还能收到面试邀约**。

1）在开始新的一轮 GC 周期前，需要调用 gcWaitOnMark 方法上一轮 GC 的标记结束（含扫描终止、标记、或标记终止等）。

2）开始新的一轮 GC 周期，调用 gcStart 方法触发 GC 行为，开始扫描标记阶段。

3）需要调用 gcWaitOnMark 方法等待，直到当前 GC 周期的扫描、标记、标记终止完成。

4）需要调用 sweepone 方法，扫描未扫除的堆跨度，并持续扫除，保证清理完成。在等待扫除完毕前的阻塞时间，会调用 Gosched 让出。

5）在本轮 GC 已经基本完成后，会调用 mProf_PostSweep 方法。以此记录最后一次标记终止时的堆配置文件快照。

6）结束，释放 M。

### 4、GC 的触发时机？

初级必问，分为系统触发和主动触发。

1）gcTriggerHeap：当所分配的堆大小达到阈值（由控制器计算的触发堆的大小）时，将会触发。

2）gcTriggerTime：当距离上一个 GC 周期的时间超过一定时间时，将会触发。时间周期以 runtime.forcegcperiod 变量为准，默认 2 分钟。

3）gcTriggerCycle：如果没有开启 GC，则启动 GC。

4）手动触发的 runtime.GC 方法。

**九、内存相关**
----------

### 谈谈内存泄露，什么情况下内存会泄露？怎么定位排查内存泄漏问题？

答：go 中的内存泄漏一般都是 goroutine 泄漏，就是 goroutine 没有被关闭，或者没有添加超时控制，让 goroutine 一只处于阻塞状态，不能被 GC。

**内存泄露有下面一些情况**

1）如果 goroutine 在执行时被阻塞而无法退出，就会导致 goroutine 的内存泄漏，一个 goroutine 的最低栈大小为 2KB，在高并发的场景下，对内存的消耗也是非常恐怖的。

2）互斥锁未释放或者造成死锁会造成内存泄漏

3）time.Ticker 是每隔指定的时间就会向通道内写数据。作为循环触发器，必须调用 stop 方法才会停止，从而被 GC 掉，否则会一直占用内存空间。

4）字符串的截取引发临时性的内存泄漏

```
func main() {
	var str0 = "12345678901234567890"
	str1 := str0[:10]
}
```

5）切片截取引起子切片内存泄漏

```
func main() {
	var s0 = []int{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	s1 := s0[:3]
}
```

6）函数数组传参引发内存泄漏【如果我们在函数传参的时候用到了数组传参，且这个数组够大（我们假设数组大小为 100 万，64 位机上消耗的内存约为 800w 字节，即 8MB 内存），或者该函数短时间内被调用 N 次，那么可想而知，会消耗大量内存，对性能产生极大的影响，如果短时间内分配大量内存，而又来不及 GC，那么就会产生临时性的内存泄漏，对于高并发场景相当可怕。】

**排查方式：**

一般通过 pprof 是 Go 的性能分析工具，在程序运行过程中，可以记录程序的运行信息，可以是 CPU 使用情况、内存使用情况、goroutine 运行情况等，当需要性能调优或者定位 Bug 时候，这些记录的信息是相当重要。

**当然你能说说具体的分析指标更加分咯，有的面试官就喜欢他问什么，你简洁的回答什么，不喜欢巴拉巴拉详细解释一通，比如虾 P 面试官，不过他考察的内容特别多，可能是为了节约时间。**

### 2、知道 golang 的内存逃逸吗？什么情况下会发生内存逃逸？（必问）

答：1) 本该分配到栈上的变量，跑到了堆上，这就导致了内存逃逸。2) 栈是高地址到低地址，栈上的变量，函数结束后变量会跟着回收掉，不会有额外性能的开销。3) 变量从栈逃逸到堆上，如果要回收掉，需要进行 gc，那么 gc 一定会带来额外的性能开销。编程语言不断优化 gc 算法，主要目的都是为了减少 gc 带来的额外性能开销，变量一旦逃逸会导致性能开销变大。

**内存逃逸的情况如下：**

1）方法内返回局部变量指针。

2）向 channel 发送指针数据。

3）在闭包中引用包外的值。

4）在 slice 或 map 中存储指针。

5）切片（扩容后）长度太大。

6）在 interface 类型上调用方法。

### 3、请简述 Go 是如何分配内存的？

mcache mcentral mheap mspan

Go 程序启动的时候申请一大块内存，并且划分 spans，bitmap，areana 区域；arena 区域按照页划分成一个个小块，span 管理一个或者多个页，mcentral 管理多个 span 供现场申请使用；mcache 作为线程私有资源，来源于 mcentral。

**这里描述的比较简单，你可以自己再去搜索下更简洁完整的答案。**

### 4、Channel 分配在栈上还是堆上？哪些对象分配在堆上，哪些对象分配在栈上？

Channel 被设计用来实现协程间通信的组件，其作用域和生命周期不可能仅限于某个函数内部，所以 golang 直接将其分配在堆上

准确地说，你并不需要知道。Golang 中的变量只要被引用就一直会存活，存储在堆上还是栈上由内部实现决定而和具体的语法没有关系。

知道变量的存储位置确实和效率编程有关系。如果可能，Golang 编译器会将函数的局部变量分配到函数栈帧（stack frame）上。然而，如果编译器不能确保变量在函数 return 之后不再被引用，编译器就会将变量分配到堆上。而且，如果一个局部变量非常大，那么它也应该被分配到堆上而不是栈上。

当前情况下，如果一个变量被取地址，那么它就有可能被分配到堆上, 然而，还要对这些变量做逃逸分析，如果函数 return 之后，变量不再被引用，则将其分配到栈上。

### 5、介绍一下大对象小对象，为什么小对象多了会造成 gc 压力？

小于等于 32k 的对象就是小对象，其它都是大对象。一般小对象通过 mspan 分配内存；大对象则直接由 mheap 分配内存。通常小对象过多会导致 GC 三色法消耗过多的 CPU。优化思路是，减少对象分配。

小对象：如果申请小对象时，发现当前内存空间不存在空闲跨度时，将会需要调用 nextFree 方法获取新的可用的对象，可能会触发 GC 行为。

大对象：如果申请大于 32k 以上的大对象时，可能会触发 GC 行为。

十、其他问题
------

### 1、Go 多返回值怎么实现的？

答：Go 传参和返回值是通过 FP+offset 实现，并且存储在调用函数的栈帧中。FP 栈底寄存器，指向一个函数栈的顶部; PC 程序计数器，指向下一条执行指令; SB 指向静态数据的基指针，全局符号; SP 栈顶寄存器。

### 2、讲讲 Go 中主协程如何等待其余协程退出?

答：Go 的 sync.WaitGroup 是等待一组协程结束，sync.WaitGroup 只有 3 个方法，Add() 是添加计数，Done() 减去一个计数，Wait() 阻塞直到所有的任务完成。Go 里面还能通过有缓冲的 channel 实现其阻塞等待一组协程结束，这个不能保证一组 goroutine 按照顺序执行，可以并发执行协程。Go 里面能通过无缓冲的 channel 实现其阻塞等待一组协程结束，这个能保证一组 goroutine 按照顺序执行，但是不能并发执行。

**啰嗦一句：**循环智能二面，手写代码部分时，三个协程按交替顺序打印数字，最后题目做出来了，问我代码中 Add() 是什么意思，我回答的不是很清晰，这家公司就没有然后了。Add() 表示协程计数，可以一次 Add 多个，如 Add(3), 可以多次 Add(1); 然后每个子协程必须调用 done（）, 这样才能保证所有子协程结束，主协程才能结束。

### 3、Go 语言中不同的类型如何比较是否相等？

答：像 string，int，float interface 等可以通过 reflect.DeepEqual 和等于号进行比较，像 slice，struct，map 则一般使用 reflect.DeepEqual 来检测是否相等。

### 4、Go 中 init 函数的特征?

答：一个包下可以有多个 init 函数，每个文件也可以有多个 init 函数。多个 init 函数按照它们的文件名顺序逐个初始化。应用初始化时初始化工作的顺序是，从被导入的最深层包开始进行初始化，层层递出最后到 main 包。不管包被导入多少次，包内的 init 函数只会执行一次。应用初始化时初始化工作的顺序是，从被导入的最深层包开始进行初始化，层层递出最后到 main 包。但包级别变量的初始化先于包内 init 函数的执行。

### 5、Go 中 uintptr 和 unsafe.Pointer 的区别？

答：unsafe.Pointer 是通用指针类型，它不能参与计算，任何类型的指针都可以转化成 unsafe.Pointer，unsafe.Pointer 可以转化成任何类型的指针，uintptr 可以转换为 unsafe.Pointer，unsafe.Pointer 可以转换为 uintptr。uintptr 是指针运算的工具，但是它不能持有指针对象（意思就是它跟指针对象不能互相转换），unsafe.Pointer 是指针对象进行运算（也就是 uintptr）的桥梁。

### golang 共享内存（互斥锁）方法实现发送多个 get 请求

在 Go 语言中，实现多个并发的 GET 请求并通过共享内存（互斥锁）同步结果的方法通常涉及到几个步骤：使用 `goroutine` 来并发执行 HTTP GET 请求，使用 `sync.Mutex` 来保护共享内存的访问，以及使用 `sync.WaitGroup` 来等待所有并发操作完成。以下是一个简化的示例代码，展示了如何实现这个过程：

```go
package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
)

func main() {
	urls := []string{
		"http://example.com",
		"http://example.org",
		"http://example.net",
		// 添加更多URL
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	results := make(map[string]string) // 用于存储 URL 和对应的响应内容

	for _, url := range urls {
		wg.Add(1) // 为每个goroutine增加计数
		go func(url string) {
			defer wg.Done() // 结束时减少计数
			response, err := http.Get(url)
			if err != nil {
				fmt.Printf("Error fetching: %s, Error: %v\n", url, err)
				return
			}
			defer response.Body.Close()
			body, err := ioutil.ReadAll(response.Body)
			if err != nil {
				fmt.Printf("Error reading response: %s, Error: %v\n", url, err)
				return
			}
			mu.Lock() // 在修改共享资源前加锁
			results[url] = string(body)
			mu.Unlock() // 修改完成后解锁
		}(url)
	}

	wg.Wait() // 等待所有goroutine完成

	// 打印结果
	for url, body := range results {
		fmt.Printf("URL: %s, Body: %s\n", url, body[:100]) // 打印每个URL的响应内容的前100个字符
	}
}
```

这段代码首先定义了一个 URL 列表，然后遍历这个列表并为每个 URL 启动一个 `goroutine` 来执行 HTTP GET 请求。每个 `goroutine` 完成请求后，会将结果存储在一个由互斥锁保护的 `map` 中，以防止并发写入时发生竞态条件。使用 `WaitGroup` 来等待所有的 `goroutine` 完成后，主线程继续执行并打印所有请求的结果。

这个示例简单地展示了如何在 Go 中使用互斥锁和并发去执行多个 HTTP GET 请求，并安全地同步结果。在实际应用中，你可能需要根据具体需求调整错误处理、响应体的处理方式等。

### 从数组中取一个相同大小的 slice 有成本吗？

或者这么问：从切片中取一个相同大小的数组有成本吗？

这是爱立信的二面题目，这个问题我至今还没搞懂，不知道从什么切入点去分析，欢迎指教。

PS：爱立信面试都要英文自我介绍，以及问答，如果英文回答不上来，会直接切换成中文。

从数组中取一个相同大小的切片（slice）本身是很低成本的操作，因为切片本质上是对底层数组的引用。创建切片时，Go 语言仅仅是创建了一个指向原数组特定部分的切片结构体，这个结构体包含了指向原数组的指针、切片的长度以及切片的容量。因此，这个操作的时间复杂度和空间复杂度都是常数级别的，即 (O(1))。

相反，从切片中取出一个相同大小的数组的操作是有成本的，因为这要求将切片中的元素复制到一个全新的数组中。这个复制过程是通过迭代切片中的每个元素并将它们一个个复制到新数组中完成的，因此这个操作的时间复杂度是线性的，即 (O(n))，其中 (n) 是切片（或者说新数组）的长度。从空间复杂度的角度看，还需要为新数组分配内存，这同样与数组（或切片）的长度 (n) 直接相关。

简而言之，从数组中取切片是低成本的操作，而从切片中取数组则是有成本的，因为后者需要复制数据。


参考并致谢
-----

1、可可酱 [可可酱：Golang 常见面试题](https://zhuanlan.zhihu.com/p/434629143)

2、Bel_Ami 同学 [golang 面试题 (从基础到高级)](https://blog.csdn.net/Bel_Ami_n/article/details/123352478)