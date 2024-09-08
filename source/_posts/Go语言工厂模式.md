---
title: Go语言工厂模式
date: 2024-09-08T22:58:31+08:00
categories: 设计模式
tags: 
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---

## 你知道go语言的工厂模式吗？

是的，工厂模式是一种常见的设计模式，主要用于创建对象。Go语言中也可以实现工厂模式，通常用于封装对象的创建逻辑，使得代码更加灵活和可维护。

### 工厂模式的基本概念

工厂模式通常分为两种类型：

1. **简单工厂模式**：一个工厂类根据输入的参数决定创建哪一种产品类的实例。
2. **抽象工厂模式**：提供一个接口，用于创建一系列相关或相互依赖的对象，而无需指定具体类。

### 示例代码

以下是一个简单工厂模式的示例：

```go
package main

import (
    "fmt"
)

// 产品接口
type Product interface {
    Use() string
}

// 具体产品A
type ProductA struct{}

func (p *ProductA) Use() string {
    return "Using Product A"
}

// 具体产品B
type ProductB struct{}

func (p *ProductB) Use() string {
    return "Using Product B"
}

// 工厂
type Factory struct{}

func (f *Factory) CreateProduct(productType string) Product {
    switch productType {
    case "A":
        return &ProductA{}
    case "B":
        return &ProductB{}
    default:
        return nil
    }
}

func main() {
    factory := &Factory{}

    productA := factory.CreateProduct("A")
    fmt.Println(productA.Use())

    productB := factory.CreateProduct("B")
    fmt.Println(productB.Use())
}
```

### 说明

1. **产品接口**：定义了产品的基本行为。
2. **具体产品**：实现了产品接口的具体类。
3. **工厂类**：根据输入参数创建不同的产品实例。

这种模式的好处在于，它将对象的创建与使用分离，使得代码更加灵活，易于扩展和维护。你可以轻松地添加新的产品类型，而无需修改现有的代码。

## 还有呢

当然，除了简单工厂模式，Go语言中还有其他几种工厂模式的实现方式，包括**工厂方法模式**和**抽象工厂模式**。下面分别介绍这两种模式。

### 1. 工厂方法模式

工厂方法模式允许子类决定实例化哪个类。它定义了一个创建对象的接口，但将对象的实例化推迟到子类。

#### 示例代码

```go
package main

import (
    "fmt"
)

// 产品接口
type Product interface {
    Use() string
}

// 具体产品A
type ProductA struct{}

func (p *ProductA) Use() string {
    return "Using Product A"
}

// 具体产品B
type ProductB struct{}

func (p *ProductB) Use() string {
    return "Using Product B"
}

// 工厂接口
type Factory interface {
    CreateProduct() Product
}

// 具体工厂A
type FactoryA struct{}

func (f *FactoryA) CreateProduct() Product {
    return &ProductA{}
}

// 具体工厂B
type FactoryB struct{}

func (f *FactoryB) CreateProduct() Product {
    return &ProductB{}
}

func main() {
    var factory Factory

    factory = &FactoryA{}
    productA := factory.CreateProduct()
    fmt.Println(productA.Use())

    factory = &FactoryB{}
    productB := factory.CreateProduct()
    fmt.Println(productB.Use())
}
```

### 2. 抽象工厂模式

抽象工厂模式提供一个接口，用于创建一系列相关或相互依赖的对象，而无需指定具体类。它通常用于需要创建多个产品族的情况。

#### 示例代码

```go
package main

import (
    "fmt"
)

// 产品接口
type ProductA interface {
    Use() string
}

type ProductB interface {
    Use() string
}

// 具体产品A1
type ProductA1 struct{}

func (p *ProductA1) Use() string {
    return "Using Product A1"
}

// 具体产品A2
type ProductA2 struct{}

func (p *ProductA2) Use() string {
    return "Using Product A2"
}

// 具体产品B1
type ProductB1 struct{}

func (p *ProductB1) Use() string {
    return "Using Product B1"
}

// 具体产品B2
type ProductB2 struct{}

func (p *ProductB2) Use() string {
    return "Using Product B2"
}

// 抽象工厂接口
type AbstractFactory interface {
    CreateProductA() ProductA
    CreateProductB() ProductB
}

// 具体工厂1
type Factory1 struct{}

func (f *Factory1) CreateProductA() ProductA {
    return &ProductA1{}
}

func (f *Factory1) CreateProductB() ProductB {
    return &ProductB1{}
}

// 具体工厂2
type Factory2 struct{}

func (f *Factory2) CreateProductA() ProductA {
    return &ProductA2{}
}

func (f *Factory2) CreateProductB() ProductB {
    return &ProductB2{}
}

func main() {
    var factory AbstractFactory

    factory = &Factory1{}
    productA1 := factory.CreateProductA()
    productB1 := factory.CreateProductB()
    fmt.Println(productA1.Use())
    fmt.Println(productB1.Use())

    factory = &Factory2{}
    productA2 := factory.CreateProductA()
    productB2 := factory.CreateProductB()
    fmt.Println(productA2.Use())
    fmt.Println(productB2.Use())
}
```

### 总结

- **简单工厂模式**：适合创建少量对象，逻辑简单。
- **工厂方法模式**：适合需要扩展的场景，允许子类决定实例化的具体类。
- **抽象工厂模式**：适合需要创建多个相关对象的场景，提供了更高层次的抽象。

这些模式在不同的场景中都有各自的优势，可以根据具体需求选择合适的模式来实现对象的创建。