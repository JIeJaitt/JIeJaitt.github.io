---
title: Go语言复习
date: 2023-03-08T16:57:54+08:00
categories: 期末考试
tags: 期末考试
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: go-review
toc: true
sticky: 
---

## 基础部分

### make 和 new 的区别？（基本必问）

共同点都是给变量分配内存；但是`new`一般是给`string`,`int`和`数组`分配内存，make 给切片，`map`，`channel` 分配内存；然后返回类型不一样，new 返回指向变量的指针，make 返回变量本身；new 分配的空间被清零。make 分配空间后，会进行初始化；make、new 内存分配是在堆上还是在栈上？golang 会弱化分配的位置的概念，因为编译的时候会自动内存逃逸处理

但这条八股是错的
> 值类型通常在栈上分配，全局变量、引用类型（指针、slice、map、chan、interface）通常在堆上分配。而用make的都是引用类型，用new的都是值类型。

Go 语言中，变量可以分配在堆（heap）上也可以分配在栈（stack）上，两者有几个主要区别：

1. **生命周期**：栈上分配的变量通常随着函数调用的结束而销毁，其生命周期与函数调用直接相关。而堆上分配的变量则可以跨函数调用存在，其生命周期由垃圾回收机制控制，直到没有任何引用指向它们时才会被回收。

2. **管理方式**：栈上的变量由编译器自动管理，分配和释放速度非常快，但是空间相对有限。堆上的变量则由程序员（或运行时通过垃圾回收器）管理，分配和释放相对较慢，但是可以动态地分配大量内存。

3. **性能**：由于栈上的变量分配和销毁速度快，且访问速度也快（因为栈是一种线性结构），使用栈空间通常会比堆空间更高效。而堆上的变量分配可能涉及到内存寻址和垃圾回收等操作，可能会引入额外的性能开销。

4. **用途**：简单的局部变量，尤其是那些不需要跨函数保存状态的变量，一般分配在栈上。需要跨函数生命周期或者动态增长的数据结构，如切片、映射（map）和通道（channel）等，一般分配在堆上。

Go 语言的编译器和运行时会自动决定变量应该分配在堆还是栈上，这一决策基于变量的逃逸分析（escape analysis）。如果编译器确定一个变量在函数返回后还会被访问，那么这个变量就会被分配到堆上，否则它可以安全地分配在栈上。这种自动管理极大地简化了内存管理工作，减少了内存泄露和其他内存错误的风险。

### 数组和切片的区别 （基本必问）

数组和切片只能存储一组相同类型的数据结构，而且都是通过下标来访问，并且有容量长度，长度通过 len 获取，容量通过 cap 获取，在函数传递的时候数组和切片都是值传递；

不同点在于数组的长度是固定的访问和复制都不能超过数组定义的长度否则就会发生下标越界报错，切片长度和容量可以自动扩容。更重要的是数组是值类型，切片是引用类型，每个切片都引用了一个底层数组，切片本身不能存储任何数据，都是这底层数组存储数据，所以修改切片的时候修改的是底层数组中的数据。切片一旦扩容，指向一个新的底层数组，内存地址也就随之改变。

```go
// 数组的定义
var a1 [3]int
var a2 [...]int{1,2,3}

// 切片的定义
var a1 []int
var a2 :=make([]int,3,5)

// 数组的初始化
a1 := [...]int{1,2,3}
a2 := [5]int{1,2,3}

// 切片的初始化
b:= make([]int,3,5)
```

## 讲讲 Go 的 slice 底层数据结构和一些特性？

slice底层数据结构如下：
```go
type {
    array unsafe.Pointer // 指针
    len int // 现有长度
    cap int // 容量 
}
```

在Go语言中，所有的参数传递都是值传递，slice也是如此，不过由于其底层的指针，在其传递到另一个函数后，仍能对其地址对应位置的值做修改，然而，当发生扩容操作时，由于会重新分配地址，就会导致问题的发生，下面我们就来介绍slice的扩容机制。

### 扩容机制

在进行append()并且cap不够用的时候，会触发扩容操作(copy()操作不会触发扩容)。

容量的确定

- 如果期望容量大于当前容量的两倍就会使用期望容量；
- 如果当前切片的长度小于 1024 就会将容量翻倍；
- 如果当前切片的长度大于 1024 就会每次增加 25% 的容量，直到新容量大于期望容量；

Golang Slice 的扩容机制，有什么注意点？
Go 中切片扩容的策略是这样的：
⚫ 首先判断，如果新申请容量大于 2 倍的旧容量，最终容量就是新申请的容量
⚫ 否则判断，如果旧切片的长度小于 1024，则最终容量就是旧容量的两倍
⚫ 否则判断，如果旧切片长度大于等于 1024，则最终容量从旧容量开始循环
增加原来的 1/4, 直到最终容量大于等于新申请的容量
⚫ 如果最终容量计算值溢出，则最终容量就是新申请

上面所说的是一个容量的初步确定步骤，当数据类型size为1字节，8字节，或者2的倍数时，会根据内存大小进行向上取整，进行内存对齐，之后返回新的扩容大小。
内存对齐的一个重要原因是因为Go进行内存分配时是类似于伙伴系统的固定的内存块，对齐这个内存可以最大化的人利用分配到的空间。

可以看看源码，好像叫growslice；面试会问，背得出来就行

```go
	if cap < old.cap {
		panic(errorString("growslice: cap out of range"))
	}

	if et.size == 0 {
		// append should not create a slice with nil pointer but non-zero len.
		// We assume that append doesn't need to preserve old.array in this case.
		return slice{unsafe.Pointer(&zerobase), old.len, cap}
	}

	newcap := old.cap
	doublecap := newcap + newcap
	if cap > doublecap {
		newcap = cap
	} else {
		const threshold = 256
		if old.cap < threshold {
			newcap = doublecap
		} else {
			// Check 0 < newcap to detect overflow
			// and prevent an infinite loop.
			for 0 < newcap && newcap < cap {
				// Transition from growing 2x for small slices
				// to growing 1.25x for large slices. This formula
				// gives a smooth-ish transition between the two.
				newcap += (newcap + 3*threshold) / 4
			}
			// Set newcap to the requested cap when
			// the newcap calculation overflowed.
			if newcap <= 0 {
				newcap = cap
			}
		}
	}
```

## map

```go
m = make(map[int]int) // 需要注意 make(map)返回的是一个指针 
```

```go
// 数据结构
type hmap {
    count int
    flags uint8 // map当前是否处于写入状态等
    B     uint8 // 2的B次幂表示当前map中桶的数量（buckets的长度）
    noverlow uint16 // map中溢出桶的数量，当溢出桶太多时，map会进行等量扩容
    hash0 uint32 //生成hash的随机数种子
    
    buckets unsafe.Pointer //当前map对应的桶的指针
    oldbuckets unsafe.Pointer // 扩容时的旧桶
    nevacuate uintptr //扩容时，用于标记当前旧桶中小于nevacute的数据都已经转移到了新桶
    
    extra *mapextra //存储map的溢出桶
}
```

Go中的map的数据都是存在bmap的数据结构中的，最多放8个kv对，溢出桶的设计与GC有关系，如果map为内联数据类型时，map数据结构里的指针就只有溢出桶了，这个时候就可以避免遍历map。

2.3  扩容机制
当我们插入一个k-v对时，需要确定他应该插入到bucket数组的哪一个槽中。bucket数组的长度为2^B，即2的次幂数，而2^B-1转换成二进制后一定是低位全1，高位全0的形式，因此在进行按位与操作后，一定能求得一个在[0,2^B-1]区间上的任意一个数，也就是数组中的下标位置，相较之下，能获得比取模更加优秀的执行效率。
涉及到扩容，每一次bucket数组都会变为现在的两倍，方便我们进行hash迁移。
map触发扩容的条件有两种：

负载因子大于6.5时（负载因子 = 键数量 / bucket数量）
overflow的数量达到2^min(15,B)

等量扩容
所谓等量扩容，并不是扩大容量，而是bucket数量不变，重新做一遍类似增量扩容的搬迁动作，把松散的键值对重新排列一次，以使bucket的使用率更高，从而保证更快的存取速度。

## channel

```go
type hchan struct {
    qcount   uint           // total data in the queue
    dataqsiz uint           // size of the circular queue
    buf      unsafe.Pointer // points to an array of dataqsiz elements
    elemsize uint16
    closed   uint32
    elemtype *_type // element type
    sendx    uint   // send index
    recvx    uint   // receive index
    recvq    waitq  // list of recv waiters
    sendq    waitq  // list of send waiters

    // lock protects all fields in hchan, as well as several
    // fields in sudogs blocked on this channel.
    //
    // Do not change another G's status while holding this lock
    // (in particular, do not ready a G), as this can deadlock
    // with stack shrinking.
    lock mutex
}
```

![bf86ae9c27d9408288eaaf23dcb9997c~tplv-k3u1fbpfcp-zoom-in-crop-mark_1512_0_0_0.webp](https://image.dooo.ng/i/2024/03/11/65eea95983b0a.webp)

channl的入队与出队操作都是都是加锁的，以此来保证并发安全。

当队列满了再插入数据时，插入线程g会进入wait状态并且挂在sendq队列上，等取出元素时会将其唤醒，空队取元素同理。

## init函数的执行顺序

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [cloud.tencent.com](https://cloud.tencent.com/developer/article/2138066)

> Golang init 函数是一种特殊的函数，主要用于完成程序的初始化工作，如初始化数据库的连接、载入本地配置文件、根据命令行参数初始化全局变量等。

Golang 中的 init 是一种特殊的函数，主要用于完成程序的初始化工作。其特点有：

*   init 函数是可选的，可以没有；
*   与 main 函数一样，不能有入参与返回值；
*   与 main 函数一样，init 会自动执行，不能被其他函数调用；
*   一个包内可以有多个 init 函数，即可以在包的多个源文件中定义多个 init 函数。一般建议在与包同名源文件中写一个 init 函数，这样可读性好且便于维护；
*   一个源文件可以有多个 init 函数。

程序中如果在不同包的不同源文件有多个 init 函数时，其执行顺序可概述为：

*   同一个源文件的 init 函数执行顺序与其定义顺序一致，从上到下；
*   同一个包中不同文件的 init 函数的执行顺序按照文件名的字典序；
*   对于不同的包，如果不相互依赖的话，按照 main 包中 import 的顺序调用其包中的 init 函数；
*   如果包存在依赖，不同包的 init 函数按照包导入的依赖关系决定执行顺序。 调用顺序为最后被依赖的最先被初始化，如导入顺序 main > a > b > c，则初始化顺序为 c > b > a > main，依次执行对应的 init 方法；
*   如果包存在包级变量，则先于包的 init 函数完成初始化。

程序的初始化和执行都起始于 main 包。如果 main 包还导入了其它的包，那么就会在编译时将它们依次导入。有时一个包会被多个包同时导入，那么它只会被导入一次（例如很多包可能都会用到 fmt 包，但它只会被导入一次，因为没有必要导入多次）。

当一个包被导入时，如果该包还导入了其它的包，那么会先将其它包导入进来，然后再对这些包中的包级常量和变量进行初始化，接着执行 init 函数，依次类推。

## 了解sync包的几种类型实现，如Map、Mutes吗？

`sync`包主要用于提供基本的同步原语，如互斥锁、读写锁、条件变量等，以便在多个goroutine之间同步访问共享资源。

1. **Map**: `sync.Map`是一种安全的并发map，它与普通的map不同，可以在多个goroutine中安全地进行读写操作，无需额外的锁定或复杂的协调机制。`sync.Map`主要适用于键值对数量巨大，或者键值对的添加和删除比较频繁的场景。它提供了如`Load`、`Store`、`LoadOrStore`、`Delete`等并发安全的方法来操作map。

2. **Mutex**: `sync.Mutex`是一个互斥锁，用来保证在任一时刻，只有一个goroutine可以访问某个对象。它提供了`Lock`和`Unlock`两个方法，可以在goroutine之间同步访问共享资源，确保每次只有一个goroutine能访问该资源。这是实现临界区和避免数据竞争的一种基本方式。

3. **RWMutex**: `sync.RWMutex`是一个读写锁，它分为读锁和写锁。在读锁占用期间，可以有多个goroutine同时获取读锁读取数据，但在写锁占用期间，只能有一个goroutine可以获取写锁来写入数据。这样可以在保证数据一致性的同时，提高读操作的并发性。`RWMutex`有`RLock`、`RUnlock`、`Lock`和`Unlock`方法，用于控制读写访问。

这些类型提供了强大的同步机制，使得在并发编程中对共享资源的访问更加安全和高效。

## sync.Map为什么主要适用于键值对数量巨大，或者键值对的添加和删除比较频繁的场景？

https://eddycjy.com/posts/go/sync-map/

`sync.Map`之所以主要适用于键值对数量巨大，或者键值对的添加和删除比较频繁的场景，是因为它在设计时考虑到了这些场景下的特殊性能和同步需求。具体来说，有以下几个原因：

1. **减少锁的竞争**：在传统的并发程序中，如果多个goroutine频繁地读写同一个map，通常需要使用互斥锁（`sync.Mutex`）来保证并发安全。这种方法在键值对数量较少或者读写操作较少时工作得很好。但是，当操作非常频繁，尤其是在键值对数量巨大时，互斥锁会成为一个瓶颈，因为每次访问都需要等待锁。而`sync.Map`通过内部的优化减少了锁的竞争，提高了性能。

2. **延迟清除和分片技术**：`sync.Map`采用了一些特殊技术，比如延迟清除和分片技术，来优化对于频繁添加和删除操作的处理。这些技术可以帮助`sync.Map`在管理大量键值对时，减少内存分配和回收的压力，从而提高性能。

3. **针对读多写少的优化**：`sync.Map`特别适用于读操作远多于写操作的场景。它内部对读操作进行了优化，以减少读操作的锁竞争。在这种使用场景下，`sync.Map`的性能比使用互斥锁来同步标准`map`的性能要好。

4. **自适应**：`sync.Map`在内部自动处理哈希碰撞和动态扩容等问题，使得开发者在处理大量键值对时不需要担心这些底层的细节，可以更加专注于业务逻辑。

因此，对于那些键值对数量巨大或者键值对的添加和删除非常频繁的场景，使用`sync.Map`相比于标准`map`加锁处理，可以获得更好的性能和更高的并发安全性。然而，如果你的应用场景不符合这些条件，那么使用标准的`map`配合适当的锁可能会是更好的选择，因为`sync.Map`的某些特性（如无法直接获取其长度）可能会带来一些限制。

## 了解gmp吗？

是的，GMP（Goroutine、M（Machine）、P（Processor））模型是Go语言的并发调度模型的核心，用于在用户级别上管理goroutine的执行、网络I/O等待等。这个模型确保了Go的高并发和高性能特性。

1. **Goroutine（G）**：在Go语言中，每一个并发执行的活动称为goroutine。Goroutine是Go的轻量级线程，它比系统线程更易于创建和销毁，由Go的运行时（runtime）管理。Goroutines之间的调度不是由操作系统内核管理，而是由Go运行时进行调度的，这使得调度更加高效和可控。

2. **Machine（M）**：M代表了操作系统的线程，它是执行goroutine代码的实际线程。M由操作系统内核调度，Go运行时会在必要时向操作系统请求更多的线程（M），或者在不再需要时减少线程数量。每个M都绑定一个P来执行P队列中的G。

3. **Processor（P）**：P代表了处理器，是执行G所需要的上下文环境，包括运行时必须的资源（如内存分配状态）。每个P都有一个本地的runqueue，用于存储准备执行的G。P的数量通常由GOMAXPROCS环境变量决定，这个变量定义了程序运行时能够使用的最大P数量，从而控制着同时运行goroutines的数量。

**GMP调度模型的工作流程**：当一个G需要执行时，它会被放到一个P的本地runqueue中。M会从P的runqueue中获取G来执行。如果一个G因为系统调用或者其他原因被阻塞，执行该G的M会被阻塞，此时Go运行时会尝试将P分配给其他的M（如果有空闲的M），或者新建一个M来保证P不闲置，从而保持CPU的高效利用。当阻塞的G重新就绪时，它会被放回到P的runqueue中等待执行。

GMP模型通过有效地利用CPU核心和减少操作系统线程的创建和销毁，提高了并发性能，尤其是在高并发场景下。此外，Go运行时会自动进行G的调度，开发者无需手动管理线程或者编写复杂的并发控制代码，这极大地简化了并发程序的开发。

## GOGC

是的，GoGC指的是Go语言的垃圾回收（Garbage Collection）机制，它负责自动管理内存，回收不再使用的对象以释放内存。Go的垃圾回收器是一个非分代、并发、标记-清除（Mark-Sweep）类型的垃圾回收器。让我们来深入了解一下它的几个关键特性：

1. **并发执行**：Go的垃圾回收器设计为并发运行，与用户的Go程序同时运行而不是停止应用程序执行（也就是说，它尽量减少了“停顿时间”）。这意味着在程序运行时，垃圾回收过程中的大部分工作都是在后台完成的，以减少对程序性能的影响。

2. **标记-清除算法**：Go垃圾回收使用标记-清除算法，这个过程分为两个主要阶段：标记（Mark）阶段和清除（Sweep）阶段。在标记阶段，垃圾回收器遍历所有活动对象，并标记它们；在清除阶段，未被标记的对象，即被认为是垃圾的对象，会被回收。

3. **写屏障（Write Barrier）**：Go垃圾回收器使用写屏障来帮助标记过程。写屏障是一种同步机制，用于监视对内存的写操作。当程序在标记阶段写入一个指针时，写屏障确保被写入的新对象也会被标记，这样可以在并发标记的情况下保持正确性。

4. **STW（Stop The World）**：虽然Go的垃圾回收器设计为并发执行，但在某些阶段仍然需要暂停程序执行（即STW），例如在标记过程开始和结束时。Go团队一直在努力减少这种停顿时间，以最小化对程序性能的影响。

5. **自适应调整**：从Go 1.5版本开始，Go引入了一个重要的环境变量`GOGC`，它用于控制垃圾回收的触发频率。`GOGC`的默认值是100，意味着每当堆内存增长到上一次垃圾回收后大小的100%时，垃圾回收器就会触发。调整这个值可以影响程序的内存使用和性能表现。降低这个值会增加垃圾回收的频率，可能减少内存使用但增加CPU的使用；提高这个值会减少垃圾回收的频率，可能增加内存使用但减少CPU的使用。

Go的垃圾回收机制通过这些设计和技术，平衡了内存使用和程序性能，使得开发者可以更专注于业务逻辑的实现，而不必过多关注内存管理的问题。