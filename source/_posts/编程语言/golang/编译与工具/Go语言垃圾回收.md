---
title: Go语言垃圾回收
date: 2021-08-31 00:17:42
categories: 编程语言
tags: 
    - golang
abbrlink: aa9b68a9
toc: true
sticky:
---

Go语言中使用的垃圾回收使用的是标记清扫算法。进行垃圾回收时会 stoptheworld。不过在Go语言 1.3 版本中，实现了精确的垃圾回收和并行的垃圾回收，大大地提高了垃圾回收的速度，进行垃圾回收时系统并不会长时间卡住。

<!-- more -->

## 标记清扫算法

标记清扫算法是一个很基础的垃圾回收算法，该算法中有一个标记初始的 root 区域，以及一个受控堆区。root 区域主要是程序运行到当前时刻的栈和全局数据区域。在受控堆区中，很多数据是程序以后不需要用到的，这类数据就可以被当作垃圾回收了。

判断一个对象是否为垃圾，就是看从 root 区域的对象是否有直接或间接的引用到这个对象。如果没有任何对象引用到它，则说明它没有被使用，因此可以安全地当作垃圾回收掉。

标记清扫算法分为两阶段，分别是标记阶段和清扫阶段。

- 标记阶段，从 root 区域出发，扫描所有 root 区域的对象直接或间接引用到的对象，将这些对上全部加上标记；
- 清扫阶段，扫描整个堆区，对所有无标记的对象进行回收。

## 位图标记和内存布局

既然垃圾回收算法要求给对象加上垃圾回收的标记，显然是需要有标记位的。一般的做法会将对象结构体中加上一个标记域，一些优化的做法会利用对象指针的低位进行标记，这都只是些奇技淫巧罢了。Go 没有这么做，它的对象和 C 的结构体对象完全一致，使用的是非侵入式的标记位，我们看看它是怎么实现的。

堆区域对应了一个标记位图区域，堆中每个字（不是 byte，而是 word）都会在标记位区域中有对应的标记位。每个机器字（32 位或 64 位）会对应 4 位的标记位。因此 64 位系统中相当于每个标记位图的字节对应 16 个堆中的字节。

虽然是一个堆字节对应 4 位标记位，但标记位图区域的内存布局并不是按 4 位一组，而是 16 个堆字节为一组，将它们的标记位信息打包存储的。每组 64 位的标记位图从上到下依次包括：

- 16 位的特殊位、标记位；
- 16 位的垃圾回收标记位；
- 16 位的无指针 / 块边界的标记位；
- 16 位的已分配标记位。


这样设计使得对一个类型的相应的位进行遍历很容易。

前面提到堆区域和堆地址的标记位图区域是分开存储的，其实它们是以 mheap.arena_start 地址为边界，向上是实际使用的堆地址空间，向下则是标记位图区域。以 64 位系统为例，计算堆中某个地址的标记位的公式如下：

```tex
偏移 = 地址 - mheap.arena_start
标记位地址 = mheap.arena_start - 偏移/16 - 1
移位 = 偏移 % 16
标记位 = *标记位地址 >> 移位
```

然后就可以通过（标记位 & 垃圾回收标记位）、（标记位 & 分配位）等来测试相应的位。其中已分配的标记为 1<<0，无指针/块边界是 1<<16，垃圾回收的标记位为 1<<32，特殊位 1<<48。

## 精确的垃圾回收

像C语言这种不支持垃圾回收的语言，其实还是有些垃圾回收的库可以使用的。这类库一般也是用的标记清扫算法实现的，但是它们都是保守的垃圾回收。之所以叫“保守”是因为它们没办法获取对象类型信息，因此只能保守地假设地址区间中每个字都是指针。

无法获取对象的类型信息会造成什么问题呢？这里举两个例子来说明。

先看第一个例子，假设某个结构体中是不包含指针成员的，那么对该结构体成员进行垃圾回收时，其实是不必要递归地标记结构体的成员的。但是由于没有类型信息，我们并不知道这个结构体成员不包含指针，因此我们只能对结构体的每个字节递归地标记下去，这显然会浪费很多时间。这个例子说明精确的垃圾回收可以减少不必要的扫描，提高标记过程的速度。

再看另一个例子，假设堆中有一个 long 的变量，它的值是 8860225560。但是我们不知道它的类型是 long，所以在进行垃圾回收时会把它当作指针处理，这个指针引用到了 0x2101c5018 位置。假设 0x2101c5018 碰巧有某个对象，那么这个对象就无法被释放了，即使实际上已经没任何地方使用它。

这个例子说明，保守的垃圾回收某些情况下会出现垃圾无法被回收的情况。虽然不会造成大的问题，但总是让人很不爽，都是没有类型信息惹的祸。

现在好了，在Go语言的 1.1 版本中开始支持精确的垃圾回收。精确的垃圾回收首先需要的就是类型信息，上一节中讲过 MSpan 结构体，类型信息是存储在 MSpan 中的。从一个地址计算它所属的 MSpan，公式如下：

```tex
页号 = (地址 - mheap.arena_start) >> 页大小
MSpan = mheap->map[页号]
```



接下来通过 MSpan->type 可以得到分配块的类型。这是一个 MType 的结构体：

```go
struct  MTypes
{
    byte         compression;         //  one  of  MTypes_*
    bool         sysalloc;            //  whether  (void*)data  is  from  runtime·SysAlloc uintptr         
    data;
};
```

MTypes 描述 MSpan 里分配的块的类型，其中 compression 域描述数据的布局。它的取值为 MTypes_Empty、MTypes_Single、MTypes_Words、MTypes_Bytes 四个中的一种：

- MTypes_Empty：所有的块都是 free 的，或者这个分配块的类型信息不可用。这种情况下 data 域是无意义的。
- MTypes_Single：这个 MSpan 只包含一个块，data 域存放类型信息，sysalloc 域无意义。
- MTypes_Words：这个 MSpan 包含多个块（块的种类多于 7）。这时 data 指向一个数组 [NumBlocks]uintptr，数组里每个元索存放相应块的类型信息。
- MTypes_Bytes：这个 MSpan 中包含最多 7 种不同类型的块。这时 data 域指下面这个结构体

```go
struct  {
    type    [8]uintptr               //  type[0]  is  always  0
    index   [NumBlocks]byte
}
```



第 i 个块的类型是 data.type[data.index[i]]

表面上看 MTypes_Bytes 好像最复杂，其实这里的复杂程度是 MTypes_Empty 小于 MTypes_Single 小于 MTypes_Bytes 小于 MTypes_Words 的。MTypes_Bytes 只不过为了做优化而显得很复杂。

上一节中说过，每一块 MSpan 中存放的块的大小都是一样的，不过它们的类型不一定相同。如果没有使用，那么这个 MSpan 的类型就是 MTypes_Empty。如果存一个很大块，大于这个 MSpan 大小的一半，因此存不了其它东西了，那么这个 MSpan 的类型是 MTypes_Single。

假设存了多种块，每一块用一个指针，本来可以直接用 MTypes_Words 存的。但是当类型不多时，可以把这些类型的指针集中起来放在数组中，然后存储数组索引。这是一个小的优化，可以节省内存空间。

得到的类型信息最终是什么样子的呢？其实是一个这样的结构体：

```go
struct  Type
{
    uintptr  size;
    uint32  hash;
    uint8  _unused;
    uint8  align;
    uint8  fieldAlign;
    uint8  kind;
    Alg  *alg;
    void  *gc;
    String  *string;
    UncommonType  *x;
    Type  *ptrto;
};
```

不同类型的类型信息结构体略有不同，这个是通用的部分。可以看到这个结构体中有一个 gc 域，精确的垃圾回收就是利用类型信息中这个 gc 域实现的。

从 gc 出去其实是一段指令码，是对这种类型的数据进行垃圾回收的指令，Go语言中用一个状态机来执行垃圾回收指令码。大致的框架是类似下面这样子：

```go
for(;;)  {
    switch(pc[0])  {
        case  GC_PTR:
        break;
        case  GC_SLICE:
        break;
        case  GC_APTR:
        break;
        case  GC_STRING:
        continue;
        case  GC_EFACE:
        if(eface->type  ==  nil)
            continue;
        break;
        case  GC_IFACE:
        break;
        case  GC_DEFAULT_PTR:
        while(stack_top.b  <=  end_b){
            obj = *(byte**)stack_top.b;
            stack_top.b += PtrSize;
            if(obj >=  arena_start && obj < arena_used) {
                *ptrbufpos++  =  (PtrTarget){obj,  0};
                if(ptrbufpos  ==  ptrbuf_end)
                    flushptrbuf(ptrbuf,  &ptrbufpos,  &wp,  &wbuf,  &nobj);
            }
        }
        case GC_ARRAY_START:
        continue;
        case GC_ARRAY_NEXT:
        continue;
        case GC_CALL:
        continue;
        case GC_MAP_PTR:
        continue;
        case GC_MAP_NEXT:
        continue;
        case GC_REGION:
        continue;
        case GC_CHAN_PTR:
        continue;
        case GC_CHAN:
        continue;
        default:
        runtime·throw("scanblock:  invalid  GC  instruction");
        return;
    }
}
```

Go语言使用标记清扫的垃圾回收算法，标记位图是非侵入式的，内存布局设计得比较巧妙。并且当前版本的Go语言实现了精确的垃圾回收。在精确的垃圾回收中，通过定位对象的类型信息，得到该类型中的垃圾回收的指令码，通过一个状态机解释这段指令码来执行特定类型的垃圾回收工作。

对于堆中任意地址的对象，找到它的类型信息过程为，先通过它在的内存页找到它所属的 MSpan，然后通过 MSpan 中的类型信息找到它的类型信息。

目前Go语言中垃圾回收的核心函数是 scanblock，源代码在文件 runtime/mgc0.c 中。这个函数非常难读，单个函数写了足足 500 多行。

上面有两个大的循环，外层循环作用是扫描整个内存块区域，将类型信息提取出来，得到其中的 gc 域。内层的大循环是实现一个状态机，解析执行类型信息中 gc 域的指令码。

MType 中的数据其实是类型信息，但它是用 uintptr 表示，而不是 Type 结构体的指针，这是一个优化的小技巧。由于内存分配是机器字节对齐的，所以地址就只用到了高位，低位是用不到的。

于是低位可以利用起来存储一些额外的信息。这里的 uintptr 中高位存放的是 Type 结构体的指针，低位用来存放类型。通过下面的代码：

```go
t = (Type*)(type & ~(uintptr)(PtrSize-1));
```

就可以从 uintptr 得到 Type 结构体指针，而通过下面的代码：

```go
type & (PtrSize-1)
```

就可以得到类型。这里的类型有 TypeInfo_SingleObject、TypeInfo_Array、TypeInfo_Map、TypeInfo_Chan 几种。

## 基本的标记过程

从最简单的开始看，基本的标记过程，有一个不带任何优化的标记的实现，对应于函数 debug_scanblock。

debug_scanblock 函数是递归实现的，单线程的，更简单更慢的 scanblock 版本。该函数接收的参数分别是一个指针表示要扫描的地址，以及字节数。

首先要将传入的地址，按机器字节大小对齐。然后对待扫描区域的每个地址：

- 找到它所属的 MSpan，将地址转换为 MSpan 里的对象地址。
- 根据对象的地址，找到对应的标记位图里的标记位。
- 判断标记位，如果是未分配则跳过。否则加上特殊位标记（debug_scanblock 中用特殊位代码的 mark 位）完成标记。
- 判断标记位中标记了无指针标记位，如果没有，则要递归地调用 debug_scanblock。


这个递归版本的标记算法还是很容易理解的。其中涉及的细节在上节中已经说过了，比如任意给定一个地址，找到它的标记位信息。很明显这里仅仅使用了一个无指针位，并没有精确的垃圾回收。

## 并行的垃圾回收

Go语言在这个版本中不仅实现了精确的垃圾回收，而且实现了并行的垃圾回收。标记算法本质上就是一个树的遍历过程，上面实现的是一个递归版本。

并行的垃圾回收需要做的第一步，就是先将算法做成非递归的。非递归版本的树的遍历需要用到一个队列。树的非递归遍历的伪代码大致是：

```go
根结点进队
while(队列不空){
  出队
  访问
  将子结点进队
}
```

第二步是使上面的代码能够并行地工作，显然这时是需要一个线程安全的队列的。假设有这样一个队列，那么上面代码就能够工作了。但是，如果不加任何优化，这里的队列的并行访问非常地频繁，对这个队列加锁代价会非常高，即使是使用 CAS 操作也会大大降低效率。

所以，第三步要做的就是优化上面队列的数据结构。事实上，Go中并没有使用这样一个队列，为了优化，它通过三个数据结构共同来完成这个队列的功能，这三个数据结构分别是 PtrTarget 数组，Workbuf，lfstack。

先说 Workbuf 吧。听名字就知道，这个结构体的意思是工作缓冲区，里面存放的是一个数组，数组中的每个元素都是一个待处理的结点，也就是一个 Obj 指针。这个对象本身是已经标记了的，这个对象直接或间接引用到的对象，都是应该被标记的，它们不会被当作垃圾回收掉。Workbuf 是比较大的，一般是 N 个内存页的大小(目前是 2 页，也就是 8K)。

PtrTarget 数组也是一个缓冲区，相当于一个 intermediate buffer，跟 Workbuf 有一点点的区别。

- 第一，它比 Workbuf 小很多，大概只有 32 或 64 个元素的数组。
- 第二，Workbuf 中的对象全部是已经标记过的，而 PtrTarget 中的元素可能是标记的，也可能是没标记的。
- 第三，PtrTarget 里面的元素是指针而不是对象，指针是指向任意地址的，而对象是对齐到正确地址的。从一个指针变为一个对象要经过一次变换，上一节中有讲过具体细节。


垃圾回收过程中，会有一个从 PtrTarget 数组冲刷到 Workbuf 缓冲区的过程。对应于源代码中的 flushptrbuf 函数，这个函数作用就是对 PtrTaget 数组中的所有元素，如果该地址是 mark 了的，则将它移到 Workbuf 中。

标记过程形成了一个环，在环的一边，对 Workbuf 中的对象，会将它们可能引用的区域全部放到 PtrTarget 中记录下来。在环的另一边，又会将 PtrTarget 中确定需要标记的地址刷到 Workbuf 中。这个过程一轮一轮地进行，推动非递归版本的树的遍历过程，也就是前面伪代码中的出队，访问，子结点进队的过程。

另一个数据结构是 lfstack，这个名字的意思是 lock free 栈。其实它是被用作了一个无锁的链表，链表结点是以 Workbuf 为单位的。并行垃圾回收中，多条线程会从这个链表中取数据，每次以一个 Workbuf 为工作单位。

同时，标记的过程中也会产生 Workbuf 结点放到链中。lfstack 保证了对这个链的并发访问的安全性。由于现在链表结点是以 Workbuf 为单位的，所以保证整体的性能，lfstack 的底层代码是用 CAS 操作实现的。

经过第三步中数据结构上的拆解，整个并行垃圾回收的架构已经呼之欲出了，这就是标记扫描的核心函数 scanblock。这个函数是在多线程下并行安全的。

那么，最后一步，多线程并行。整个的 gc 是以 runtime.gc 函数为入口的，它实际调用的是 gc。进入 gc 函数后会先 stoptheworld，接着添加标记的 root 区域。然后会设置 markroot 和 sweepspan 的并行任务。运行 mark 的任务，扫描块，运行 sweep 的任务，最后 starttheworld 并切换出去。

有一个 ParFor 的数据结构。在 gc 函数中调用了

```bash
runtime·parforsetup(work.markfor, work.nproc, work.nroot, nil, false, markroot);
runtime·parforsetup(work.sweepfor, work.nproc, runtime·mheap->nspan, nil, true, sweepspan);
```

是设置好回调函数让线程去执行 markroot 和 sweepspan 函数。垃圾回收时会 stoptheworld，其它 goroutine 会对发起 stoptheworld 做出响应，调用 runtime.gchelper，这个函数会调用 scanblock 帮助标记过程。也会并行地做 markroot 和 sweepspan 的过程。

```go
void
runtime·gchelper(void)
{
    gchelperstart();
    //  parallel  mark  for  over  gc  roots runtime·parfordo(work.markfor);
    //  help  other  threads  scan  secondary  blocks scanblock(nil,  nil,  0,  true);
    if(DebugMark)  {
    //  wait  while  the  main  thread  executes  mark(debug_scanblock)
        while(runtime·atomicload(&work.debugmarkdone)  ==  0)
            runtime·usleep(10);
    }
    runtime·parfordo(work.sweepfor);
    bufferList[m->helpgc].busy  =  0;
    if(runtime·xadd(&work.ndone,  +1)  ==  work.nproc-1)
        runtime·notewakeup(&work.alldone);
}
```

其中并行时也有实现工作流窃取的概念，多个 worker 同时去工作缓存中取数据出来处理，如果自己的任务做完了，就会从其它的任务中“偷”一些过来执行。

## 垃圾回收的时机

垃圾回收的触发是由一个 gcpercent 的变量控制的，当新分配的内存占已在使用中的内存的比例超过 gcprecent 时就会触发。

比如 gcpercent=100，当前使用了 4M 的内存，那么当内存分配到达 8M 时就会再次 gc。如果回收完毕后，内存的使用量为 5M，那么下次回收的时机则是内存分配达到 10M 的时候。也就是说，并不是内存分配越多，垃圾回收频率越高，这个算法使得垃圾回收的频率比较稳定，适合应用的场景。

gcpercent 的值是通过环境变量 GOGC 获取的，如果不设置这个环境变量，默认值是 100。如果将它设置成 off，则是关闭垃圾回收。

