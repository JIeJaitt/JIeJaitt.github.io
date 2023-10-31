---
title: Go语言接口interface
date: 2021-10-04T17:31:05+08:00
categories: 
tags: Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: ac09deb4
toc: true
sticky:
---

```go
type A interface {
	ShowA() int
}

type B interface {
	ShowB() int
}

type Work struct {
	i int
}

func (w Work) ShowA() int {
	return w.i + 10
}

func (w Work) ShowB() int {
	return w.i + 20
}

func main() {
	var a A = Work{3}
	s := a.(Work)
	fmt.Println(s.ShowA())
	fmt.Println(s.ShowB())
}
```

1. `type A interface { ShowA() int }` 定义了一个名为`A`的接口，这个接口要求实现它的类型必须有一个方法`ShowA`，并且这个方法返回一个整数。
2. `type B interface { ShowB() int }` 定义了一个名为`B`的接口，与`A`接口类似，要求实现它的类型必须有一个方法`ShowB`，也返回一个整数。
3. `type Work struct { i int }` 定义了一个名为`Work`的结构体，这个结构体包含一个整数字段`i`。
4. 这是`Work`结构体的一个方法。因为它满足了`A`接口的要求（即拥有`ShowA()`方法），所以我们可以说`Work`实现了`A`接口。
5. 同样，这是`Work`结构体的另一个方法。它满足了`B`接口的要求，所以`Work`也实现了`B`接口。
6. 在`main`函数中，首先声明了一个`A`接口类型的变量`a`并将其初始化为`Work`结构体的一个实例，其`i`字段的值为`3`。接着，使用类型断言`a.(Work)`，我们将`a`转换回`Work`类型，并将结果存储在`s`变量中。最后，使用`fmt.Println`打印`s`的`ShowA()`和`ShowB()`方法的返回值。根据方法的定义，这两个方法分别返回`3+10=13`和`3+20=23`。

总结：这段代码展示了如何定义和使用接口、结构体以及如何在它们之间进行转换。在这里，`Work`结构体实现了两个接口`A`和`B`。

## 为什么可以声明了一个A接口类型的变量a并将其初始化为Work结构体的一个实例？

这涉及到Go语言中接口的工作方式。

在Go中，接口不是直接声明它们需要哪些字段，而是声明需要哪些方法。任何类型只要实现了接口声明的所有方法，就被认为实现了该接口，不需要明确地声明它实现了该接口。

在给定的代码中，`A`接口声明了一个方法`ShowA() int`。`Work`结构体实现了这个方法。因此，我们可以说`Work`实现了`A`接口。这就是为什么你可以声明一个`A`接口类型的变量并将其初始化为`Work`结构体实例的原因。

这样做的好处是，你可以为不同的类型定义相同的方法，并且所有这些类型都可以赋值给这个接口类型的变量。这在多态和设计模式中是非常有用的，因为你可以编写接受接口类型参数的函数，然后在运行时传入任何实现了该接口的类型。

## 实现了某个接口的意义何在？可以写个例子供我理解吗？

实现某个接口的意义主要在于多态和代码的解耦。当你定义一个接口，你其实是定义了一个行为的契约，而不是具体的实现。这意味着任何满足这个契约的类型都可以被用在期望该接口的地方。这为我们提供了一种编写灵活、可插拔和易于维护的代码的方式。

让我给你一个简单的例子来说明这个概念：

```go
package main

import "fmt"

// 定义一个 Animal 接口，要求实现 SayHello 方法
type Animal interface {
    SayHello() string
}

// 实现一个 Dog 类型，满足 Animal 接口
type Dog struct{}

func (d Dog) SayHello() string {
    return "Woof!"
}

// 实现一个 Cat 类型，满足 Animal 接口
type Cat struct{}

func (c Cat) SayHello() string {
    return "Meow!"
}

// 这个函数接受 Animal 接口类型的参数，因此可以接受任何满足 Animal 接口的类型
func Introduce(a Animal) {
    fmt.Println("The animal says:", a.SayHello())
}

func main() {
    d := Dog{}
    c := Cat{}
    
    Introduce(d)  // 输出: The animal says: Woof!
    Introduce(c)  // 输出: The animal says: Meow!
}
```

在上面的代码中，`Animal`接口定义了一个行为`SayHello`。`Dog`和`Cat`两个结构体都实现了这个接口。因此，我们可以在`Introduce`函数中，不关心具体的动物类型，只关心它们都满足`Animal`接口。

这为我们提供了极大的灵活性。例如，如果未来我们想添加一个新的动物类型，只需要确保它实现了`SayHello`方法，然后就可以直接使用`Introduce`函数来介绍它，而不需要修改`Introduce`函数的代码。

这种方式允许我们将具体的实现细节（如`Dog`和`Cat`的行为）与使用这些实现的代码（如`Introduce`函数）分开，达到了解耦的目的。


