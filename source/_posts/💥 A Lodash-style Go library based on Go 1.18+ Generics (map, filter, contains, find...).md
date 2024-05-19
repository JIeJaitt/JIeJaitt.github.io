---
title: 💥 A Lodash-style Go library based on Go 1.18+ Generics (map, filter, contains, find...)
date: 2024-05-19T23:20:23+08:00
categories: 
tags: Go
excerpt: 💥 A Lodash-style Go library based on Go 1.18+ Generics (map, filter, contains, find...)
abbrlink: samber-lo
toc: true
sticky:
---

> ✨ `samber/lo` is a Lodash-style Go library based on Go 1.18+ Generics.

This project started as an experiment with the new generics implementation. It may look like Lodash in some aspects. I used to code with the fantastic "go-funk" package, but "go-funk" uses reflection and therefore is not typesafe.

As expected, benchmarks demonstrate that generics are much faster than implementations based on the "reflect" package. Benchmarks also show similar performance gains compared to pure for loops. See below.

In the future, 5 to 10 helpers will overlap with those coming into the Go standard library (under package names slices and maps). I feel this library is legitimate and offers many more valuable abstractions.

<!-- more -->

## 前言

感觉这个库查到的教程挺少，我写一下中文版吧。项目地址：https://github.com/samber/lo


## lo.Map


You: 
- 我在看go语言这个库：https://github.com/samber/lo，现在想让你给我说一下lo. Filter方法，我是小白，你要说的尽量详细一点，并且要举两个例子，一个复杂的例子一个简单的例子

ChatGPT: 
- 我在看go语言这个库：https://github.com/samber/lo，现在想让你给我说一下lo. Filter方法，我是小白，你要说的尽量详细一点，并且要举两个例子，一个复杂的例子一个简单的例子

You: 
- 已搜索 5 个网站




The `lo.Filter` function in the `samber/lo` Go library is used to filter elements of a slice based on a specified condition. It returns a new slice containing only the elements that satisfy the given condition. Here's a detailed explanation along with simple and complex examples to help you understand how to use it effectively.
### Simple Example

Let's start with a basic example where we filter out even numbers from a slice of integers.

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    isOdd := func(n int) bool {
        return n%2 != 0
    }

    oddNumbers := lo.Filter(numbers, isOdd)
    fmt.Println(oddNumbers) // Output: [1, 3, 5, 7, 9]
}
```



In this example: 
1. We define a slice of integers `numbers`. 
2. We create a filter function `isOdd` that returns `true` if a number is odd. 
3. We use `lo.Filter` to apply this function to the `numbers` slice, resulting in a new slice `oddNumbers` containing only odd numbers.
### Complex Example

For a more complex scenario, let's filter a slice of structs. Suppose we have a list of users and we want to filter out users who are older than 18.

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    isAdult := func(user User) bool {
        return user.Age > 18
    }

    adults := lo.Filter(users, isAdult)
    fmt.Println(adults) // Output: [{Bob 20} {Dave 22}]
}
```



In this example: 
1. We define a `User` struct with `Name` and `Age` fields. 
2. We create a slice `users` containing several `User` structs. 
3. We define a filter function `isAdult` that returns `true` if a user's age is greater than 18. 
4. We use `lo.Filter` to apply this function to the `users` slice, resulting in a new slice `adults` containing only users older than 18.
### Summary

The `lo.Filter` function is versatile and can be used with slices of any type, as long as you provide a suitable filtering function. Whether working with simple types like integers or complex types like structs, `lo.Filter` helps streamline the process of extracting elements that meet specific criteria.

For more details, you can refer to the [official GitHub repository](https://github.com/samber/lo) .




4o

ChatGPT: 
- The `lo.Filter` function in the `samber/lo` Go library is used to filter elements of a slice based on a specified condition. It returns a new slice containing only the elements that satisfy the given condition. Here's a detailed explanation along with simple and complex examples to help you understand how to use it effectively.
### Simple Example

Let's start with a basic example where we filter out even numbers from a slice of integers.

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    isOdd := func(n int) bool {
        return n%2 != 0
    }

    oddNumbers := lo.Filter(numbers, isOdd)
    fmt.Println(oddNumbers) // Output: [1, 3, 5, 7, 9]
}
```



In this example: 
1. We define a slice of integers `numbers`. 
2. We create a filter function `isOdd` that returns `true` if a number is odd. 
3. We use `lo.Filter` to apply this function to the `numbers` slice, resulting in a new slice `oddNumbers` containing only odd numbers.
### Complex Example

For a more complex scenario, let's filter a slice of structs. Suppose we have a list of users and we want to filter out users who are older than 18.

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    isAdult := func(user User) bool {
        return user.Age > 18
    }

    adults := lo.Filter(users, isAdult)
    fmt.Println(adults) // Output: [{Bob 20} {Dave 22}]
}
```



In this example: 
1. We define a `User` struct with `Name` and `Age` fields. 
2. We create a slice `users` containing several `User` structs. 
3. We define a filter function `isAdult` that returns `true` if a user's age is greater than 18. 
4. We use `lo.Filter` to apply this function to the `users` slice, resulting in a new slice `adults` containing only users older than 18.
### Summary

The `lo.Filter` function is versatile and can be used with slices of any type, as long as you provide a suitable filtering function. Whether working with simple types like integers or complex types like structs, `lo.Filter` helps streamline the process of extracting elements that meet specific criteria.

For more details, you can refer to the [official GitHub repository](https://github.com/samber/lo) .

You: 
- 请你说中文谢谢，把上面的这段话翻译一下，并且以同样的方式向我介绍lo.Map方法

ChatGPT: 
- 请你说中文谢谢，把上面的这段话翻译一下，并且以同样的方式向我介绍lo.Map方法

You: 
- ### 详细解释lo.Filter方法

`lo.Filter`函数是`samber/lo` Go库中的一个方法，用于根据指定的条件过滤切片中的元素。它返回一个新的切片，包含所有满足给定条件的元素。以下是详细的解释，并附有一个简单和一个复杂的例子，帮助你理解如何使用这个方法。
#### 简单示例

首先是一个基本示例，我们将从一个整数切片中筛选出所有奇数。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    isOdd := func(n int) bool {
        return n%2 != 0
    }

    oddNumbers := lo.Filter(numbers, isOdd)
    fmt.Println(oddNumbers) // 输出: [1, 3, 5, 7, 9]
}
```



在这个示例中： 
1. 我们定义了一个整数切片`numbers`。 
2. 创建了一个筛选函数`isOdd`，该函数在数字为奇数时返回`true`。 
3. 使用`lo.Filter`将此函数应用于`numbers`切片，结果是一个新的切片`oddNumbers`，仅包含奇数。
#### 复杂示例

对于更复杂的场景，假设我们有一个用户列表，需要筛选出年龄大于18岁的用户。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    isAdult := func(user User) bool {
        return user.Age > 18
    }

    adults := lo.Filter(users, isAdult)
    fmt.Println(adults) // 输出: [{Bob 20} {Dave 22}]
}
```



在这个示例中： 
1. 我们定义了一个包含`Name`和`Age`字段的`User`结构体。 
2. 创建了一个包含多个`User`结构体的切片`users`。 
3. 定义了一个筛选函数`isAdult`，该函数在用户年龄大于18岁时返回`true`。 
4. 使用`lo.Filter`将此函数应用于`users`切片，结果是一个新的切片`adults`，仅包含年龄大于18岁的用户。
### 详细解释lo.Map方法

`lo.Map`函数用于将一个切片的每个元素通过一个转换函数映射到一个新的切片中。以下是详细的解释，并附有一个简单和一个复杂的例子。
#### 简单示例

让我们从一个整数切片开始，将每个元素都乘以2。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5}
    double := func(n int) int {
        return n * 2
    }

    doubledNumbers := lo.Map(numbers, double)
    fmt.Println(doubledNumbers) // 输出: [2, 4, 6, 8, 10]
}
```



在这个示例中： 
1. 我们定义了一个整数切片`numbers`。 
2. 创建了一个映射函数`double`，将每个数字乘以2。 
3. 使用`lo.Map`将此函数应用于`numbers`切片，结果是一个新的切片`doubledNumbers`，其中包含所有元素的两倍。
#### 复杂示例

假设我们有一个包含用户的列表，我们想要获取所有用户的名字。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    getName := func(user User) string {
        return user.Name
    }

    names := lo.Map(users, getName)
    fmt.Println(names) // 输出: [Alice Bob Charlie Dave]
}
```



在这个示例中： 
1. 我们定义了一个包含`Name`和`Age`字段的`User`结构体。 
2. 创建了一个包含多个`User`结构体的切片`users`。 
3. 定义了一个映射函数`getName`，返回用户的名字。 
4. 使用`lo.Map`将此函数应用于`users`切片，结果是一个新的切片`names`，仅包含所有用户的名字。

希望这些示例能够帮助你更好地理解`lo.Filter`和`lo.Map`方法的使用。如果你需要更多信息，可以参考[官方GitHub仓库](https://github.com/samber/lo) 。




4o

ChatGPT: 
- ### 详细解释lo.Filter方法

`lo.Filter`函数是`samber/lo` Go库中的一个方法，用于根据指定的条件过滤切片中的元素。它返回一个新的切片，包含所有满足给定条件的元素。以下是详细的解释，并附有一个简单和一个复杂的例子，帮助你理解如何使用这个方法。
#### 简单示例

首先是一个基本示例，我们将从一个整数切片中筛选出所有奇数。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    isOdd := func(n int) bool {
        return n%2 != 0
    }

    oddNumbers := lo.Filter(numbers, isOdd)
    fmt.Println(oddNumbers) // 输出: [1, 3, 5, 7, 9]
}
```



在这个示例中： 
1. 我们定义了一个整数切片`numbers`。 
2. 创建了一个筛选函数`isOdd`，该函数在数字为奇数时返回`true`。 
3. 使用`lo.Filter`将此函数应用于`numbers`切片，结果是一个新的切片`oddNumbers`，仅包含奇数。
#### 复杂示例

对于更复杂的场景，假设我们有一个用户列表，需要筛选出年龄大于18岁的用户。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    isAdult := func(user User) bool {
        return user.Age > 18
    }

    adults := lo.Filter(users, isAdult)
    fmt.Println(adults) // 输出: [{Bob 20} {Dave 22}]
}
```



在这个示例中： 
1. 我们定义了一个包含`Name`和`Age`字段的`User`结构体。 
2. 创建了一个包含多个`User`结构体的切片`users`。 
3. 定义了一个筛选函数`isAdult`，该函数在用户年龄大于18岁时返回`true`。 
4. 使用`lo.Filter`将此函数应用于`users`切片，结果是一个新的切片`adults`，仅包含年龄大于18岁的用户。
### 详细解释lo.Map方法

`lo.Map`函数用于将一个切片的每个元素通过一个转换函数映射到一个新的切片中。以下是详细的解释，并附有一个简单和一个复杂的例子。
#### 简单示例

让我们从一个整数切片开始，将每个元素都乘以2。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

func main() {
    numbers := []int{1, 2, 3, 4, 5}
    double := func(n int) int {
        return n * 2
    }

    doubledNumbers := lo.Map(numbers, double)
    fmt.Println(doubledNumbers) // 输出: [2, 4, 6, 8, 10]
}
```



在这个示例中： 
1. 我们定义了一个整数切片`numbers`。 
2. 创建了一个映射函数`double`，将每个数字乘以2。 
3. 使用`lo.Map`将此函数应用于`numbers`切片，结果是一个新的切片`doubledNumbers`，其中包含所有元素的两倍。
#### 复杂示例

假设我们有一个包含用户的列表，我们想要获取所有用户的名字。

```go
package main

import (
    "fmt"
    "github.com/samber/lo"
)

type User struct {
    Name string
    Age  int
}

func main() {
    users := []User{
        {"Alice", 17},
        {"Bob", 20},
        {"Charlie", 15},
        {"Dave", 22},
    }

    getName := func(user User) string {
        return user.Name
    }

    names := lo.Map(users, getName)
    fmt.Println(names) // 输出: [Alice Bob Charlie Dave]
}
```



在这个示例中： 
1. 我们定义了一个包含`Name`和`Age`字段的`User`结构体。 
2. 创建了一个包含多个`User`结构体的切片`users`。 
3. 定义了一个映射函数`getName`，返回用户的名字。 
4. 使用`lo.Map`将此函数应用于`users`切片，结果是一个新的切片`names`，仅包含所有用户的名字。

希望这些示例能够帮助你更好地理解`lo.Filter`和`lo.Map`方法的使用。如果你需要更多信息，可以参考[官方GitHub仓库](https://github.com/samber/lo) 。
