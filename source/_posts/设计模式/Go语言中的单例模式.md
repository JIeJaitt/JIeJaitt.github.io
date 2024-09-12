---
title: Go语言中的单例模式
categories: 设计模式
tags: Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 7ab3f4e2
toc: true
date: 2024-09-07 07:00:38
sticky:
---

在过去的几年中，Go 语言的发展是惊人的，并且吸引了很多由其他语言（Python、PHP、Ruby）转向 Go 语言的跨语言学习者。在过去的很长时间里，很多开发人员和初创公司都习惯使用 Python、PHP 或 Ruby 快速开发功能强大的系统，并且大多数情况下都不需要担心内部事务如何工作，也不需要担心线程安全性和并发性。直到最近几年，多线程高并发的系统开始流行起来，我们现在不仅需要快速开发功能强大的系统，而且还要保证被开发的系统能够足够快速运行。（我们真是太难了☺️）

对于被 Go 语言天生支持并发的特性吸引来的跨语言学习者来说，我觉着掌握 Go 语言的语法并不是最难的，最难的是突破既有的思维定势，真正理解并发和使用并发来解决实际问题。Go 语言太容易实现并发了，以至于它在很多地方被不正确的使用了。

一句话介绍一下单例模式，就是单例模式的目的是为了保证一个类仅有一个实例，并提供一个访问它的全局访问点.

## Go语言中的单例模式

### 常见的错误

有一些错误是很常见的，比如不考虑并发安全的单例模式。就像下面的示例代码：

```go
package singleton

type singleton struct {}

var instance *singleton

func GetInstance() *singleton {
	if instance == nil {
		instance = &singleton{}   // 不是并发安全的
	}
	return instance
}
```

在上述情况下，多个 goroutine 可以执行第一个检查，并且它们都将创建该`singleton`类型的实例并相互覆盖。无法保证它将在此处返回哪个实例，并且对该实例的其他进一步操作可能与开发人员的期望不一致。

不好的原因是，如果有代码保留了对该单例实例的引用，则可能存在具有不同状态的该类型的多个实例，从而产生潜在的不同代码行为。这也成为调试过程中的一个噩梦，并且很难发现该错误，因为在调试时，由于运行时暂停而没有出现任何错误，这使非并发安全执行的可能性降到了最低，并且很容易隐藏开发人员的问题。

### 激进的加锁

也有很多对这种并发安全问题的糟糕解决方案。使用下面的代码确实能解决并发安全问题，但会带来其他潜在的严重问题，通过加锁把对该函数的并发调用变成了串行。

```go
var mu Sync.Mutex

func GetInstance() *singleton {
    mu.Lock()                    // 如果实例存在没有必要加锁
    defer mu.Unlock()

    if instance == nil {
        instance = &singleton{}
    }
    return instance
}
```

在上面的代码中，我们可以看到在创建单例实例之前通过引入`Sync.Mutex`和获取 Lock 来解决并发安全问题。问题是我们在这里执行了过多的锁定，即使我们不需要这样做，在实例已经创建的情况下，我们应该简单地返回缓存的单例实例。在高度并发的代码基础上，这可能会产生瓶颈，因为一次只有一个 goroutine 可以获得单例实例。

因此，这不是最佳方法。我们必须考虑其他解决方案。

### Check-Lock-Check 模式

在 C ++ 和其他语言中，确保最小程度的锁定并且仍然是并发安全的最佳和最安全的方法是在获取锁定时利用众所周知的`Check-Lock-Check`模式。该模式的伪代码表示如下。

```go
if check() {
    lock() {
        if check() {
            // 在这里执行加锁安全的代码
        }
    }
}
```

该模式背后的思想是，你应该首先进行检查，以最小化任何主动锁定，因为 IF 语句的开销要比加锁小。其次，我们希望等待并获取互斥锁，这样在同一时刻在那个块中只有一个执行。但是，在第一次检查和获取互斥锁之间，可能有其他 goroutine 获取了锁，因此，我们需要在锁的内部再次进行检查，以避免用另一个实例覆盖了实例。

如果将这种模式应用于我们的`GetInstance()`方法，我们会写出类似下面的代码：

```go
func GetInstance() *singleton {
    if instance == nil {     // 不太完美 因为这里不是完全原子的
        mu.Lock()
        defer mu.Unlock()

        if instance == nil {
            instance = &singleton{}
        }
    }
    return instance
}
```

通过使用`sync/atomic`这个包，我们可以原子化加载并设置一个标志，该标志表明我们是否已初始化实例。

```go
import "sync"
import "sync/atomic"

var initialized uint32
... // 此处省略

func GetInstance() *singleton {

    if atomic.LoadUInt32(&initialized) == 1 {  // 原子操作 
		    return instance
	  }

    mu.Lock()
    defer mu.Unlock()

    if initialized == 0 {
         instance = &singleton{}
         atomic.StoreUint32(&initialized, 1)
    }

    return instance
}
```

但是…… 这看起来有点繁琐了，我们其实可以通过研究 Go 语言和标准库如何实现 goroutine 同步来做得更好。

### Go 语言惯用的单例模式

我们希望利用 Go 惯用的方式来实现这个单例模式。我们在标准库`sync`中找到了`Once`类型。它能保证某个操作仅且只执行一次。下面是来自 Go 标准库的源码（部分注释有删改）。

```go
// Once is an object that will perform exactly one action.
type Once struct {
	// done indicates whether the action has been performed.
	// It is first in the struct because it is used in the hot path.
	// The hot path is inlined at every call site.
	// Placing done first allows more compact instructions on some architectures (amd64/x86),
	// and fewer instructions (to calculate offset) on other architectures.
	done uint32
	m    Mutex
}

func (o *Once) Do(f func()) {
	if atomic.LoadUint32(&o.done) == 0 { // check
		// Outlined slow-path to allow inlining of the fast-path.
		o.doSlow(f)
	}
}

func (o *Once) doSlow(f func()) {
	o.m.Lock()                          // lock
	defer o.m.Unlock()
	
	if o.done == 0 {                    // check
		defer atomic.StoreUint32(&o.done, 1)
		f()
	}
}
```

这说明我们可以借助这个实现只执行一次某个函数 / 方法，`once.Do()`的用法如下：

```go
once.Do(func() {
    // 在这里执行安全的初始化
})
```

下面就是单例实现的完整代码，该实现利用`sync.Once`类型去同步对`GetInstance()` 的访问，并确保我们的类型仅被初始化一次。

```go
package singleton

import (
    "sync"
)

type singleton struct {}

var instance *singleton
var once sync.Once

func GetInstance() *singleton {
    once.Do(func() {
        instance = &singleton{}
    })
    return instance
}
```

因此，使用`sync.Once`包是安全地实现此目标的首选方式，类似于 Objective-C 和 Swift（Cocoa）实现`dispatch_once`方法来执行类似的初始化。

### 结论

当涉及到并发和并行代码时，需要对代码进行更仔细的检查。始终让你的团队成员执行代码审查，因为这样的事情很容易就会被发现。

所有刚转到 Go 语言的新开发人员都必须真正了解并发安全性如何工作以更好地改进其代码。即使 Go 语言本身通过允许你在对并发性知识知之甚少的情况下设计并发代码，也完成了许多繁重的工作。在某些情况下，单纯的依靠语言特性也无能为力，你仍然需要在开发代码时应用最佳实践。

翻译自 [http://marcio.io/2015/07/singleton-pattern-in-go/](http://marcio.io/2015/07/singleton-pattern-in-go/)，考虑到可读性部分内容有修改。


## 单例模式的目的是为了保证一个类仅有一个实例，并提供一个访问它的全局访问点

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [isekiro.com](https://isekiro.com/go%E8%AF%AD%E8%A8%80%E5%AE%9E%E7%8E%B0%E8%AE%BE%E8%AE%A1%E6%A8%A1%E5%BC%8F-%E5%8D%95%E4%BE%8B%E6%A8%A1%E5%BC%8F/)

> GO 语言实现设计模式 - 单例模式.

单例模式的目的是为了保证一个类仅有一个实例，并提供一个访问它的全局访问点.

> 单例模式的两种表现形式。

*   饿汉式：类加载时，就进行实例化。
    
*   懒汉式，第一次引用类时才进行实例化。
    

> 单例对象是在包加载时立即被创建，所以这个方式叫作饿汉式

`singleton` 包在被导入时会自动初始化 `instance` 实例，使用时通过调用 `singleton.GetSingleton()` 函数即可获得 `singleton` 这个结构体的单例对象。

```go
package singleton

type singleton struct{}

var instance = &singleton{}

func GetSingleton() *singleton {
    return instance
}
```

> 懒汉式模式下实例只有在第一次被使用时才被创建。

```go
package singleton

type singleton struct{}

var instance *singleton

func GetSingleton() *singleton {
    if instance == nil {
        instance = &singleton{}
    }
    return instance
}
```

> 懒汉式单例模式并发安全问题，比如像下面这样。

使用了锁机制也带来了一些问题，这让每次调用 `GetSingleton()` 时程序都会进行加锁、解锁的步骤，从而导致程序性能的下降。

```go
package singleton

import "sync"

type singleton struct{}

var instance *singleton

var mu sync.Mutex

func GetSingleton() *singleton {
    mu.Lock()
    defer mu.Unlock()
    if instance == nil {
        instance = &singleton{}
    }
    return instance
}
```

> 带锁的单例模式是一个不错的方法，但是还并不是很完美。如果使用 `sync/atomic` 包的话，我们可以原子化加载并设置一个标志，该标志表明我们是否已初始化实例。

```go
import "sync"
import "sync/atomic"

var initialized uint32
...

func GetInstance() *singleton {

    if atomic.LoadUInt32(&initialized) == 1 {
        return instance
    }

    mu.Lock()
    defer mu.Unlock()

    if initialized == 0 {
         instance = &singleton{}
         atomic.StoreUint32(&initialized, 1)
    }

    return instance
}
```

不过这样有点繁琐，我们可以通过 Go 标准库 `sync` 包中提供的 `Once` 方法，让我们写出更加优雅的代码。

> sync 库中的 `Once` 方法，它能保证某个操作仅且只执行一次。

Go 标准库的部分源码

```go
// Once is an object that will perform exactly one action.
type Once struct {
	// done indicates whether the action has been performed.
	// It is first in the struct because it is used in the hot path.
	// The hot path is inlined at every call site.
	// Placing done first allows more compact instructions on some architectures (amd64/x86),
	// and fewer instructions (to calculate offset) on other architectures.
	done uint32
	m    Mutex
}

func (o *Once) Do(f func()) {
	if atomic.LoadUint32(&o.done) == 0 { // check
		// Outlined slow-path to allow inlining of the fast-path.
		o.doSlow(f)
	}
}

func (o *Once) doSlow(f func()) {
	o.m.Lock()                          // lock
	defer o.m.Unlock()
	
	if o.done == 0 {                    // check
		defer atomic.StoreUint32(&o.done, 1)
		f()
	}
}
```

`once.Do()` 的用法如下：

```go
once.Do(func() {
    // 在这里执行安全的初始化
})
```

代码示例：

```go
package singleton

import "sync"

type singleton struct{}

var instance *singleton

var once sync.Once

func GetSingleton() *singleton {
    once.Do(func() {
        instance = &singleton{}
    })
    return instance
}
```

`Once` 是一个结构体，在执行 `Do` 方法的内部通过 `atomic` 操作和加锁机制来保证并发安全，且 `once.Do` 能够保证多个 `goroutine` 同时执行时 `&singleton{}` 只被创建一次。

以上几种单例模式的常用套路中，使用 `sync.Once` 包是安全地实现此目标的首选方式，`sync.Once` 包帮我们隐藏了部分细节，却可以让代码可读性得到很大提升。


## 单例模式是什么意思，请使用go语言写一段简单的单例模式代码

单例模式（Singleton Pattern）是一种设计模式，它确保一个类只有一个实例，并提供一个全局访问点。单例模式在某些情况下非常有用，例如需要全局唯一的配置对象或日志对象。

在Go语言中，实现单例模式通常使用 `sync.Once` 来确保单例对象只被初始化一次。下面是一个简单的单例模式的实现示例：

```go
package main

import (
	"fmt"
	"sync"
)

// 定义一个结构体类型，表示单例对象
type Singleton struct {
	data string
}

// 定义一个变量来保存单例实例
var instance *Singleton

// 使用 sync.Once 确保单例对象只被初始化一次
var once sync.Once

// 获取单例对象的函数
func GetInstance() *Singleton {
	once.Do(func() {
		instance = &Singleton{data: "这是一个单例对象"}
	})
	return instance
}

func main() {
	// 获取单例实例
	s1 := GetInstance()
	fmt.Println(s1.data)

	// 再次获取单例实例
	s2 := GetInstance()
	fmt.Println(s2.data)

	// 验证两个实例是否相同
	if s1 == s2 {
		fmt.Println("s1 和 s2 是相同的实例")
	} else {
		fmt.Println("s1 和 s2 是不同的实例")
	}
}
```

在这个示例中，我们定义了一个 `Singleton` 结构体，并使用 `sync.Once` 确保 `GetInstance` 函数只会创建一次 `Singleton` 实例。每次调用 `GetInstance` 都会返回同一个实例。通过这种方式，我们实现了单例模式，确保全局只有一个 `Singleton` 实例。

## 今天遇到一个比较有意思的问题，怎么让单例模式实现restart？

要实现单例模式的重启（restart）功能，即允许单例实例在某些条件下被重新创建，我们需要稍微调整单例模式的标准实现。这通常意味着提供一个额外的方法来重置单例实例，同时确保这个过程是线程安全的。

以下是一个使用Go语言实现的带有重启功能的单例模式示例：

```go
package main

import (
	"fmt"
	"sync"
)

// Singleton 定义单例结构体
type Singleton struct {
	data string
}

var (
	// instance 保存单例实例的指针
	instance *Singleton
	// once 用于确保单例初始化只执行一次
	once sync.Once
	// lock 用于保护重启操作的互斥锁
	lock sync.Mutex
)

// GetInstance 返回单例实例，如果不存在则创建
func GetInstance() *Singleton {
	once.Do(func() {
		instance = &Singleton{"初始数据"}
	})
	return instance
}

// Restart 重启单例实例，创建一个新的实例替换旧的实例
func Restart() {
	// 确保重启操作是线程安全的
	lock.Lock()
	defer lock.Unlock()

	// 重置once，使得可以重新执行其Do方法
	once = sync.Once{}
	// 通过once.Do立即初始化新的实例
	once.Do(func() {
		instance = &Singleton{"重启后的数据"}
	})
}

func main() {
	// 获取单例实例
	s1 := GetInstance()
	fmt.Println(s1.data)

	// 重启单例实例
	Restart()

	// 再次获取单例实例，这次应该是重启后的实例
	s2 := GetInstance()
	fmt.Println(s2.data)

	// 验证s1和s2是否不同
	if s1 != s2 {
		fmt.Println("s1 和 s2 是不同的实例")
	} else {
		fmt.Println("s1 和 s2 是相同的实例")
	}
}
```

在这个实现中，我们通过添加一个 `Restart` 函数来允许单例的重启。`Restart` 函数首先通过加锁确保线程安全，然后重置 `sync.Once` 变量，这样就可以再次利用 `once.Do` 来初始化新的单例实例。这种方法允许在保持单例模式的基本原则不变的同时，提供了重新初始化单例实例的灵活性。


## 参考资料

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [www.liwenzhou.com](https://www.liwenzhou.com/posts/Go/singleton/)

- isekiro大佬的博客站点————可乐去冰，发布的文章：[GO语言实现设计模式-单例模式](https://isekiro.com/go%E8%AF%AD%E8%A8%80%E5%AE%9E%E7%8E%B0%E8%AE%BE%E8%AE%A1%E6%A8%A1%E5%BC%8F-%E5%8D%95%E4%BE%8B%E6%A8%A1%E5%BC%8F/)