---
title: go面试题集锦快答
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: 7ac5aff
date: 2023-07-24 23:49:09
categories: 编程语言
tags: [Go]
sticky:
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [learnku.com](https://learnku.com/articles/69250)

## slice 扩容机制

这个我是看过源码的，

```go
func growslice(et *_type, old slice, cap int) slice {
   //  ......
	newcap := old.cap
	doublecap := newcap + newcap    //双倍扩容（原容量的两倍）
	if cap > doublecap {   //如果所需容量大于 两倍扩容，则直接扩容到所需容量
		newcap = cap
	} else {
		const threshold = 256   //这里设置了一个 阈值 -- 256
		if old.cap < threshold {		//如果旧容量 小于 256，则两倍扩容
			newcap = doublecap   
		} else {
	    // 检查 0 < newcap 以检测溢出并防止无限循环。
			for 0 < newcap && newcap < cap {   //如果新容量 > 0  并且 原容量 小于 所需容量
		
               // 从小片的增长2x过渡到大片的增长1.25x。这个公式给出了两者之间的平滑过渡。(这里的系数会随着容量的大小发生变化，从2.0到无线接近1.25)
				newcap += (newcap + 3*threshold) / 4
              
                
              //当newcap计算溢出时，将newcap设置为请求的上限。
			if newcap <= 0 {   // 如果发生了溢出，将新容量设置为请求的容量大小
				newcap = cap
			}
		}
	}
}
```

GO1.17版本及之前
当新切片需要的容量cap大于两倍扩容的容量，则直接按照新切片需要的容量扩容；
当原 slice 容量 < 1024 的时候，新 slice 容量变成原来的 2 倍；
当原 slice 容量 > 1024，进入一个循环，每次容量变成原来的1.25倍,直到大于期望容量。

GO1.18之后
当新切片需要的容量cap大于两倍扩容的容量，则直接按照新切片需要的容量扩容；
当原 slice 容量 < threshold 的时候，新 slice 容量变成原来的 2 倍；
当原 slice 容量 > threshold，进入一个循环，每次容量增加（旧容量+3*threshold）/4。


## slice 为什么不是线程安全的

slice底层结构并没有使用加锁的方式,不支持并发读写

## map 底层原理

```
map 是一个指针 占用8个字节(64位计算机),指向hmap结构体,hmap包含多个bmap数组(桶) 
type hmap struct { 
    count int  //元素个数，调用len(map)时直接返回 
    flags uint8  //标志map当前状态,正在删除元素、添加元素..... 
    B uint8  //单元(buckets)的对数 B=5表示能容纳32个元素  B随着map容量增大而变大
    noverflow uint16  //单元(buckets)溢出数量，如果一个单元能存8个key，此时存储了9个，溢出了，就需要再增加一个单元 
    hash0 uint32  //哈希种子 
    buckets unsafe.Pointer //指向单元(buckets)数组,大小为2^B，可以为nil 
    oldbuckets unsafe.Pointer //扩容的时候，buckets长度会是oldbuckets的两倍 
    nevacute uintptr  //指示扩容进度，小于此buckets迁移完成 
    extra *mapextra //与gc相关 可选字段 
}

type bmap struct { 
    tophash [bucketCnt]uint8 
} 
//实际上编译期间会生成一个新的数据结构  
type bmap struct { 
    topbits [8]uint8     //key hash值前8位 用于快速定位keys的位置
    keys [8]keytype     //键
    values [8]valuetype //值
    pad uintptr 
    overflow uintptr     //指向溢出桶 无符号整形 优化GC
}
```

## map 扩容机制

```
扩容时机：向 map 插入新 key 的时候，会进行条件检测，符合下面这 2 个条件，就会触发扩容
```

```
扩容条件：
1.超过负载 map元素个数 > 6.5（负载因子） * 桶个数
2.溢出桶太多
当桶总数<2^15时，如果溢出桶总数>=桶总数，则认为溢出桶过多
当桶总数>2^15时，如果溢出桶总数>=2^15，则认为溢出桶过多
```

```
扩容机制：
双倍扩容：针对条件1，新建一个buckets数组，新的buckets大小是原来的2倍，然后旧buckets数据搬迁到新的buckets。
等量扩容：针对条件2，并不扩大容量，buckets数量维持不变，重新做一遍类似双倍扩容的搬迁动作，把松散的键值对重新排列一次，使得同一个 bucket 中的 key 排列地更紧密，节省空间，提高 bucket 利用率，进而保证更快的存取。
```

```
渐进式扩容：
插入修改删除key的时候，都会尝试进行搬迁桶的工作，每次都会检查oldbucket是否nil，如果不是nil则每次搬迁2个桶，蚂蚁搬家一样渐进式扩容
```

## map 遍历为什么无序

map每次遍历,都会从一个随机值序号的桶,再从其中随机的cell开始遍历,并且扩容后,原来桶中的key会落到其他桶中,本身就会造成失序
如果想顺序遍历map,先把key放到切片排序,再按照key的顺序遍历map

```go
var sl []int
for k := range m {
    sl = append(sl, k)
}
sort.Ints(sl)
for _,k:= range sl {
    fmt.Print(m[k])
}
```

## map 为什么不是线程安全的

```
map设计就不是用来多个协程高并发访问的
多个协程同时对map进行并发读写,程序会panic
如果想线程安全,可以使用sync.RWLock 锁

sync.map
这个包里面的map实现了锁,是线程安全的
```

## Map 如何查找

```
1.写保护机制
先查hmap的标志位flags,如果flags写标志位此时是1,说明其他协程正在写操作,直接panic
2.计算hash值
key经过哈希函数计算后,得到64bit(64位CPU)
10010111 | 101011101010110101010101101010101010 | 10010
3.找到hash对应的桶
上面64位后5(hmap的B值)位定位所存放的桶
如果当前正在扩容中,并且定位到旧桶数据还未完成迁移,则使用旧的桶
4.遍历桶查找
上面64位前8位用来在tophash数组查找快速判断key是否在当前的桶中,如果不在需要去溢出桶查找  
5.返回key对应的指针
```

```
GO采用链地址法解决冲突，具体就是插入key到map中时，当key定位的桶填满8个元素后，将会创建一个溢出桶，并且将溢出桶插入当前桶的所在链表尾部
```

```
负载因子 = 哈希表存储的元素个数 / 桶个数
Go 官方发现：装载因子越大，填入的元素越多，空间利用率就越高，但发生哈希冲突的几率就变大。
            装载因子越小，填入的元素越少，冲突发生的几率减小，但空间浪费也会变得更多，而且还会提高扩容操作的次数
Go 官方取了一个相对适中的值，把 Go 中的 map 的负载因子硬编码为 6.5，这就是 6.5 的选择缘由。
这意味着在 Go 语言中，当 map存储的元素个数大于或等于 6.5 * 桶个数 时，就会触发扩容行为。
```

```
type Map struct {
    mu Mutex
    read atomic.Value
    dirty map[interface()]*entry
    misses int
}
对比原始map：
和原始map+RWLock的实现并发的方式相比，减少了加锁对性能的影响。它做了一些优化：可以无锁访问read map，而且会优先操作read map，倘若只操作read map就可以满足要求，那就不用去操作write map(dirty)，所以在某些特定场景中它发生锁竞争的频率会远远小于map+RWLock的实现方式
优点：
适合读多写少的场景
缺点：
写多的场景，会导致 read map 缓存失效，需要加锁，冲突变多，性能急剧下降
```

```
通过var声明或者make函数创建的channel变量是一个存储在函数栈帧上的指针，占用8个字节，指向堆上的hchan结构体
type hchan struct {
    closed   uint32   // channel是否关闭的标志
    elemtype *_type   // channel中的元素类型
    // channel分为无缓冲和有缓冲两种。
    // 对于有缓冲的channel存储数据，使用了 ring buffer（环形缓冲区) 来缓存写入的数据，本质是循环数组
    // 为啥是循环数组？普通数组不行吗，普通数组容量固定更适合指定的空间，弹出元素时，普通数组需要全部都前移
    // 当下标超过数组容量后会回到第一个位置，所以需要有两个字段记录当前读和写的下标位置
    buf      unsafe.Pointer // 指向底层循环数组的指针（环形缓冲区）
    qcount   uint           // 循环数组中的元素数量
    dataqsiz uint           // 循环数组的长度
    elemsize uint16                 // 元素的大小
    sendx    uint           // 下一次写下标的位置
    recvx    uint           // 下一次读下标的位置
    // 尝试读取channel或向channel写入数据而被阻塞的goroutine
    recvq    waitq  // 读等待队列
    sendq    waitq  // 写等待队列
    lock mutex //互斥锁，保证读写channel时不存在并发竞争问题
}
等待队列：
双向链表，包含一个头结点和一个尾结点
每个节点是一个sudog结构体变量，记录哪个协程在等待，等待的是哪个channel，等待发送/接收的数据在哪里
type waitq struct {
    first *sudog
    last  *sudog
}

type sudog struct {
    g *g
    next *sudog
    prev *sudog
    elem unsafe.Pointer 
    c        *hchan 
    ...
}
```

```
创建时:
创建时会做一些检查:
-   元素大小不能超过 64K
-   元素的对齐大小不能超过 maxAlign 也就是 8 字节
-   计算出来的内存是否超过限制

创建时的策略:
-   如果是无缓冲的 channel，会直接给 hchan 分配内存
-   如果是有缓冲的 channel，并且元素不包含指针，那么会为 hchan 和底层数组分配一段连续的地址
-   如果是有缓冲的 channel，并且元素包含指针，那么会为 hchan 和底层数组分别分配地址
```

```
发送时:
-   如果 channel 的读等待队列存在接收者goroutine
-   将数据**直接发送**给第一个等待的 goroutine， **唤醒接收的 goroutine**
-   如果 channel 的读等待队列不存在接收者goroutine
-   如果循环数组buf未满，那么将会把数据发送到循环数组buf的队尾
-   如果循环数组buf已满，这个时候就会走阻塞发送的流程，将当前 goroutine 加入写等待队列，并**挂起等待唤醒**
```

```
接收时:
-   如果 channel 的写等待队列存在发送者goroutine
-   如果是无缓冲 channel，**直接**从第一个发送者goroutine那里把数据拷贝给接收变量，**唤醒发送的 goroutine**
-   如果是有缓冲 channel（已满），将循环数组buf的队首元素拷贝给接收变量，将第一个发送者goroutine的数据拷贝到 buf循环数组队尾，**唤醒发送的 goroutine**
-   如果 channel 的写等待队列不存在发送者goroutine
-   如果循环数组buf非空，将循环数组buf的队首元素拷贝给接收变量
-   如果循环数组buf为空，这个时候就会走阻塞接收的流程，将当前 goroutine 加入读等待队列，并**挂起等待唤醒**
```

```
channel有2种类型：无缓冲、有缓冲
channel有3种模式：写操作模式（单向通道）、读操作模式（单向通道）、读写操作模式（双向通道）
写操作模式    make(chan<- int)
读操作模式    make(<-chan int)
读写操作模式    make(chan int)
```

channel 有 3 种状态：未初始化、正常、关闭

<table><thead><tr><th>操作 \ 状态</th><th>未初始化</th><th>关闭</th><th>正常</th></tr></thead><tbody><tr><td>关闭</td><td>panic</td><td>panic</td><td>正常</td></tr><tr><td>发送</td><td>永远阻塞导致死锁</td><td>panic</td><td>阻塞或者成功发送</td></tr><tr><td>接收</td><td>永远阻塞导致死锁</td><td>缓冲区为空则为零值，否则可以继续读</td><td>阻塞或者成功接收</td></tr></tbody></table>

```
注意点：

一个 channel不能多次关闭，会导致painc
如果多个 goroutine 都监听同一个 channel，那么 channel 上的数据都可能随机被某一个 goroutine 取走进行消费
如果多个 goroutine 监听同一个 channel，如果这个 channel 被关闭，则所有 goroutine 都能收到退出信号
```

```
不同协程通过channel进行通信，本身的使用场景就是多线程，为了保证数据的一致性，必须实现线程安全
channel的底层实现中，hchan结构体中采用Mutex锁来保证数据读写安全。在对循环数组buf中的数据进行入队和出队操作时，必须先获取互斥锁，才能操作channel数据
```

```
func deadlock1() {    //无缓冲channel只写不读
    ch := make(chan int) 
    ch <- 3 //  这里会发生一直阻塞的情况，执行不到下面一句
}
func deadlock2() { //无缓冲channel读在写后面
    ch := make(chan int)
    ch <- 3  //  这里会发生一直阻塞的情况，执行不到下面一句
    num := <-ch
    fmt.Println("num=", num)
}
func deadlock3() { //无缓冲channel读在写后面
    ch := make(chan int)
    ch <- 100 //  这里会发生一直阻塞的情况，执行不到下面一句
    go func() {
        num := <-ch
        fmt.Println("num=", num)
    }()
    time.Sleep(time.Second)
}
func deadlock3() {    //有缓冲channel写入超过缓冲区数量
    ch := make(chan int, 3)
    ch <- 3
    ch <- 4
    ch <- 5
    ch <- 6  //  这里会发生一直阻塞的情况
}
func deadlock4() {    //空读
    ch := make(chan int)
    // ch := make(chan int, 1)
    fmt.Println(<-ch)  //  这里会发生一直阻塞的情况
}
func deadlock5() {    //互相等对方造成死锁
    ch1 := make(chan int)
    ch2 := make(chan int)
    go func() {
        for {
        select {
        case num := <-ch1:
            fmt.Println("num=", num)
            ch2 <- 100
        }
    }
    }()
    for {
        select {
        case num := <-ch2:
            fmt.Println("num=", num)
            ch1 <- 300
        }
    }
}
```

```
Go sync包提供了两种锁类型：互斥锁sync.Mutex 和 读写互斥锁sync.RWMutex，都属于悲观锁。
锁的实现一般会依赖于原子操作、信号量，通过atomic 包中的一些原子操作来实现锁的锁定，通过信号量来实现线程的阻塞与唤醒

在正常模式下，锁的等待者会按照先进先出的顺序获取锁。但是刚被唤起的 Goroutine 与新创建的 Goroutine 竞争时，大概率会获取不到锁，在这种情况下，这个被唤醒的 Goroutine 会加入到等待队列的前面。 如果一个等待的 Goroutine 超过1ms 没有获取锁，那么它将会把锁转变为饥饿模式。
Go在1.9中引入优化，目的保证互斥锁的公平性。在饥饿模式中，互斥锁会直接交给等待队列最前面的 Goroutine。新的 Goroutine 在该状态下不能获取锁、也不会进入自旋状态，它们只会在队列的末尾等待。如果一个 Goroutine 获得了互斥锁并且它在队列的末尾或者它等待的时间少于 1ms，那么当前的互斥锁就会切换回正常模式。
```

```
线程没有获取到锁时常见有2种处理方式：
-   一种是没有获取到锁的线程就一直循环等待判断该资源是否已经释放锁，这种锁也叫做自旋锁，它不用将线程阻塞起来， 适用于并发低且程序执行时间短的场景，缺点是cpu占用较高
-   另外一种处理方式就是把自己阻塞起来，会释放CPU给其他线程，内核会将线程置为「睡眠」状态，等到锁被释放后，内核会在合适的时机唤醒该线程，适用于高并发场景，缺点是有线程上下文切换的开销
Go语言中的Mutex实现了自旋与阻塞两种场景，当满足不了自旋条件时，就会进入阻塞
**允许自旋的条件：**
1.  锁已被占用，并且锁不处于饥饿模式。
2.  积累的自旋次数小于最大自旋次数（active_spin=4）。
3.  cpu 核数大于 1。
4.  有空闲的 P。
5.  当前 goroutine 所挂载的 P 下，本地待运行队列为空。
```

```
读写锁的底层是基于互斥锁实现的。
写锁需要阻塞写锁：一个协程拥有写锁时，其他协程写锁定需要阻塞；
写锁需要阻塞读锁：一个协程拥有写锁时，其他协程读锁定需要阻塞；
读锁需要阻塞写锁：一个协程拥有读锁时，其他协程写锁定需要阻塞；
读锁不能阻塞读锁：一个协程拥有读锁时，其他协程也可以拥有读锁。
```

```
Go atomic包是最轻量级的锁（也称无锁结构），可以在不形成临界区和创建互斥量的情况下完成并发安全的值替换操作，不过这个包只支持int32/int64/uint32/uint64/uintptr这几种数据类型的一些基础操作（增减、交换、载入、存储等）
当我们想要对**某个变量**并发安全的修改，除了使用官方提供的 `mutex`，还可以使用 sync/atomic 包的原子操作，它能够保证对变量的读取或修改期间不被其他的协程所影响。
atomic 包提供的原子操作能够确保任一时刻只有一个goroutine对变量进行操作，善用 atomic 能够避免程序中出现大量的锁操作。
**常见操作：**
-   增减Add     AddInt32 AddInt64 AddUint32 AddUint64 AddUintptr
-   载入Load    LoadInt32 LoadInt64    LoadPointer    LoadUint32    LoadUint64    LoadUintptr    
-   比较并交换CompareAndSwap    CompareAndSwapInt32...
-   交换Swap    SwapInt32...
-   存储Store    StoreInt32...
```

```
原子操作由底层硬件支持，而锁是基于原子操作+信号量完成的。若实现相同的功能，前者通常会更有效率
原子操作是单个指令的互斥操作；互斥锁/读写锁是一种数据结构，可以完成临界区（多个指令）的互斥操作，扩大原子操作的范围
原子操作是无锁操作，属于乐观锁；说起锁的时候，一般属于悲观锁
原子操作存在于各个指令/语言层级，比如“机器指令层级的原子操作”，“汇编指令层级的原子操作”，“Go语言层级的原子操作”等。
锁也存在于各个指令/语言层级中，比如“机器指令层级的锁”，“汇编指令层级的锁”，“Go语言层级的锁”等
```

```
g本质是一个数据结构,真正让 goroutine 运行起来的是调度器
type g struct { 
    goid int64  // 唯一的goroutine的ID 
    sched gobuf // goroutine切换时，用于保存g的上下文 
    stack stack // 栈 
    gopc // pc of go statement that created this goroutine 
    startpc uintptr  // pc of goroutine function ... 
} 
type gobuf struct {     //运行时寄存器
    sp uintptr  // 栈指针位置 
    pc uintptr  // 运行到的程序位置 
    g  guintptr // 指向 goroutine 
    ret uintptr // 保存系统调用的返回值 ... 
} 
type stack struct {     //运行时栈
    lo uintptr  // 栈的下界内存地址 
    hi uintptr  // 栈的上界内存地址 
}
```

```
内存占用:
创建一个 goroutine 的栈内存消耗为 2 KB，实际运行过程中，如果栈空间不够用，会自动进行扩容。创建一个 thread 则需要消耗 1 MB 栈内存。
创建和销毀:
Thread 创建和销毀需要陷入内核,系统调用。而 goroutine 因为是由 Go runtime 负责管理的，创建和销毁的消耗非常小，是用户级。
切换:
当 threads 切换时，需要保存各种寄存器,而 goroutines 切换只需保存三个寄存器：Program Counter, Stack Pointer and BP。一般而言，线程切换会消耗 1000-1500 ns,Goroutine 的切换约为 200 ns,因此，goroutines 切换成本比 threads 要小得多。
```

```
泄露原因
Goroutine 内进行channel/mutex 等读写操作被一直阻塞。
Goroutine 内的业务逻辑进入死循环，资源一直无法释放。
Goroutine 内的业务逻辑进入长时间等待，有不断新增的 Goroutine 进入等待

泄露场景
channel 如果忘记初始化，那么无论你是读，还是写操作，都会造成阻塞。
channel 发送数量 超过 channel接收数量，就会造成阻塞
channel 接收数量 超过 channel发送数量，也会造成阻塞
http request body未关闭，goroutine不会退出
互斥锁忘记解锁
sync.WaitGroup使用不当

如何排查
单个函数：调用 `runtime.NumGoroutine` 方法来打印 执行代码前后Goroutine 的运行数量，进行前后比较，就能知道有没有泄露了。
生产/测试环境：使用`PProf`实时监测Goroutine的数量
```

```
package main

import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    for i := 0; i < 100; i++ {
        go func() {
            select {}
        }()
    }
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()
    select {}
}
执行程序之后，命令运行以下命令，会自动打开浏览器显示一系列目前还看不懂的图，提示Could not execute dot; may need to install graphviz.则需要安装graphviz，需要python环境
go tool pprof -http=:1248 http://127.0.0.1:6060/debug/pprof/goroutine
```

```
在开发过程中，如果不对goroutine加以控制而进行滥用的话，可能会导致服务整体崩溃。比如耗尽系统资源导致程序崩溃，或者CPU使用率过高导致系统忙不过来。
解决方案：
有缓冲channel:利用缓冲满时发送阻塞的特性
无缓冲channel:任务发送和执行分离，指定消费者并发协程数
```

```
M个线程对应N个内核线程
优点：
-   能够利用多核
-   上下文切换成本低
-   如果进程中的一个线程被阻塞，不会阻塞其他线程，是能够切换同一进程内的其他线程继续执行
```

```
G：Goroutine
M: 线程
P: Processor 本地队列

GM模型：
2012年前的调度器模型，使用了4年果断被抛弃，缺点如下：
1.  创建、销毁、调度G都需要每个M获取锁，这就形成了激烈的锁竞争。
2.  M转移G会造成延迟和额外的系统负载。比如当G中包含创建新协程的时候，M创建了G’，为了继续执行G，需要把G’交给M’执行，也造成了很差的局部性，因为G’和G是相关的，最好放在M上执行，而不是其他M'。
3.  系统调用(CPU在M之间的切换)导致频繁的线程阻塞和取消阻塞操作增加了系统开销。

GMP模型：
P的数量：
由启动时环境变量`$GOMAXPROCS`或者是由`runtime`的方法`GOMAXPROCS()`决定
M的数量:
go语言本身的限制：go程序启动时，会设置M的最大数量，默认10000.但是内核很难支持这么多的线程数
runtime/debug中的SetMaxThreads函数，设置M的最大数量
一个M阻塞了，会创建新的M。

P何时创建：在确定了P的最大数量n后，运行时系统会根据这个数量创建n个P。
M何时创建：没有足够的M来关联P并运行其中的可运行的G。比如所有的M此时都阻塞住了，而P中还有很多就绪任务，就会去寻找空闲的M，而没有空闲的，就会去创建新的M。

全场景解析：
1.P拥有G1，M1获取P后开始运行G1，G1创建了G2，为了局部性G2优先加入到P1的本地队列。
2.G1运行完成后，M上运行的goroutine切换为G0，G0负责调度时协程的切换。从P的本地队列取G2，从G0切换到G2，并开始运行G2。实现了线程M1的复用。
3.假设每个P的本地队列只能存4个G。G2要创建了6个G，前4个G（G3, G4, G5, G6）已经加入p1的本地队列，p1本地队列满了。
4.G2在创建G7的时候，发现P1的本地队列已满，需要执行负载均衡(把P1中本地队列中前一半的G，还有新创建G转移到全局队列)，这些G被转移到全局队列时，会被打乱顺序
5.G2创建G8时，P1的本地队列未满，所以G8会被加入到P1的本地队列。
6.在创建G时，运行的G会尝试唤醒其他空闲的P和M组合去执行。假定G2唤醒了M2，M2绑定了P2，并运行G0，但P2本地队列没有G，M2此时为自旋线程
7.M2尝试从全局队列取一批G放到P2的本地队列，至少从全局队列取1个g，但每次不要从全局队列移动太多的g到p本地队列，给其他p留点。
8.假设G2一直在M1上运行，经过2轮后，M2已经把G7、G4从全局队列获取到了P2的本地队列并完成运行，全局队列和P2的本地队列都空了,那m就要执行work stealing(偷取)：从其他有G的P哪里偷取一半G过来，放到自己的P本地队列。P2从P1的本地队列尾部取一半的G
9.G1本地队列G5、G6已经被其他M偷走并运行完成，当前M1和M2分别在运行G2和G8，M3和M4没有goroutine可以运行，M3和M4处于自旋状态，它们不断寻找goroutine。系统中最多有GOMAXPROCS个自旋的线程，多余的没事做线程会让他们休眠。
10.假定当前除了M3和M4为自旋线程，还有M5和M6为空闲的线程，G8创建了G9，G8进行了阻塞的系统调用，M2和P2立即解绑，P2会执行以下判断：如果P2本地队列有G、全局队列有G或有空闲的M，P2都会立马唤醒1个M和它绑定，否则P2则会加入到空闲P列表，等待M来获取可用的p。
11.G8创建了G9，假如G8进行了非阻塞系统调用。M2和P2会解绑，但M2会记住P2，然后G8和M2进入系统调用状态。当G8和M2退出系统调用时，会尝试获取P2，如果无法获取，则获取空闲的P，如果依然没有，G8会被记为可运行状态，并加入到全局队列,M2因为没有P的绑定而变成休眠状态
```

```
当线程M⽆可运⾏的G时，尝试从其他M绑定的P偷取G，减少空转，提高了线程利用率（避免闲着不干活）。
当从本线程绑定 P 本地 队列、全局G队列、netpoller都找不到可执行的 g，会从别的 P 里窃取G并放到当前P上面。
从netpoller 中拿到的G是_Gwaiting状态（ 存放的是因为网络IO被阻塞的G），从其它地方拿到的G是_Grunnable状态
从全局队列取的G数量：N = min(len(GRQ)/GOMAXPROCS + 1, len(GRQ/2)) （根据GOMAXPROCS负载均衡）
从其它P本地队列窃取的G数量：N = len(LRQ)/2（平分）
```

```
也称为P分离机制，当本线程 M 因为 G 进行的系统调用阻塞时，线程释放绑定的 P，把 P 转移给其他空闲的 M 执行，也提高了线程利用率（避免站着茅坑不拉shi）。
```

```
有 2 种方式可以查看一个程序的调度GMP信息，分别是go tool trace和GODEBUG
```

```
额，这个不太了解！
好的你回去等通知吧！
```

```
编译器会根据变量是否被外部引用来决定是否逃逸：
如果函数外部没有引用，则优先放到栈中；
如果函数外部存在引用，则必定放到堆中;
如果栈上放不下，则必定放到堆上;

案例：
指针逃逸：函数返回值为局部变量的指针，函数虽然退出了，但是因为指针的存在，指向的内存不能随着函数结束而回收，因此只能分配在堆上。
栈空间不足：当栈空间足够时，不会发生逃逸，但是当变量过大时，已经完全超过栈空间的大小时，将会发生逃逸到堆上分配内存。局部变量s占用内存过大，编译器会将其分配到堆上
变量大小不确定：编译期间无法确定slice的长度，这种情况为了保证内存的安全，编译器也会触发逃逸，在堆上进行分配内存
动态类型：动态类型就是编译期间不确定参数的类型、参数的长度也不确定的情况下就会发生逃逸
闭包引用对象：闭包函数中局部变量i在后续函数是继续使用的，编译器将其分配到堆上

总结：
1.  栈上分配内存比在堆中分配内存效率更高
2.  栈上分配的内存不需要 GC 处理，而堆需要
3.  逃逸分析目的是决定内分配地址是栈还是堆
4.  逃逸分析在编译阶段完成
因为无论变量的大小，只要是指针变量都会在堆上分配，所以对于小变量我们还是使用传值效率（而不是传指针）更高一点。
```

```
什么是内存对齐
为了能让CPU可以更快的存取到各个字段，Go编译器会帮你把struct结构体做数据的对齐。所谓的数据对齐，是指内存地址是所存储数据大小（按字节为单位）的整数倍，以便CPU可以一次将该数据从内存中读取出来。编译器通过在结构体的各个字段之间填充一些空白已达到对齐的目的。存在内存空间的浪费，实际上是空间换时间
对齐原则：
1.  结构体变量中成员的偏移量必须是成员大小的整数倍
2.  整个结构体的地址必须是最大字节的整数倍
```

```
在应用程序中会使用到两种内存，分别为堆（Heap）和栈（Stack），GC负责回收堆内存，而不负责回收栈中的内存
常用GC算法
1.引用计数：python,swift,php
2.分代收集：Java
3.标记清除：GO 三色标记法+混合屏障 停顿时间在0.5ms左右
```

```
1.控制内存分配的速度，限制 Goroutine 的数量，提高赋值器 mutator 的 CPU 利用率（降低GC的CPU利用率）
2.少量使用+连接string
3.slice提前分配足够的内存来降低扩容带来的拷贝
4.避免map key对象过多，导致扫描时间增加
5.变量复用，减少对象分配，例如使用 sync.Pool 来复用需要频繁创建临时对象、使用全局变量等
6.增大 GOGC 的值，降低 GC 的运行频率 (不太用这个)
```

> 好无聊的面试题，正常人谁这么写代码
> 
> ```
> 1. GODEBUG='gctrace=1' go run main.go
> 2. go tool trace trace.out
> 3. debug.ReadGCStats
> 4. runtime.ReadMemStats
> ```

```
额，这个不太了解！
好的你回去等通知吧！
```

```
go run -race main.go
```

```
package main
import (
    "fmt"
    "sync"
)
var wg sync.WaitGroup
func dog(dogChan chan bool, catChan chan bool) {
    i := 0
    for {
        select {
        case <-dogChan:
            fmt.Println("dog", i)
            i++
            catChan <- true
            break
        default:
            break
        }
    }
}
func cat(catChan chan bool, fishChan chan bool) {
    for {
        select {
        case <-catChan:
            fmt.Println("cat")
            fishChan <- true
            break
        default:
            break
        }
    }
}
func fish(fishChan chan bool, dogChan chan bool) {
    i := 0
    for {
        select {
        case <-fishChan:
            fmt.Println("fish")
            i++ // 计数，打印完之后就溜溜结束了。
            if i > 9 {
                wg.Done()
                return
            }
            dogChan <- true
            break
        default:
            break
        }
    }
}
func main() {
    dogChan, catChan, fishChan := make(chan bool), make(chan bool), make(chan bool)
    wg.Add(1)
    go dog(dogChan, catChan)
    go cat(catChan, fishChan)
    go fish(fishChan, dogChan)
    dogChan <- true // 记得这里进行启动条件，不然就没法启动了。
    wg.Wait()
}
```

> 本作品采用[《CC 协议》](https://learnku.com/docs/guide/cc4.0/6589)，转载必须注明作者和本文链接

遇强则强，太强另说