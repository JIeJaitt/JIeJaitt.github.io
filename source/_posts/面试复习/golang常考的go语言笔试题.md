---
title: golang常考的go语言笔试题
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: fee99ec5
toc: true
date: 2024-03-12 04:59:51
categories:
tags: 期末考试
sticky:
---

## 计算两个和再打印输出

```go
package main

import (
	"fmt"
	"sync"
)

func sum(a, b int) int {
	var res int
	for i := a; i <= b; i++ {
		res += i
	}
	return res
}

func main() {
	var sum1, sum2 int
	var wg sync.WaitGroup

	wg.Add(2)

	go func() {
		defer wg.Done()
		sum1 = sum(1, 100)
	}()

	go func() {
		defer wg.Done()
		sum2 = sum(101, 200)
	}()

	wg.Wait()

	res := sum1 + sum2
	fmt.Println(res)
}
```

## 打印输出字符串

```go
package main

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

func main() {
	var wg sync.WaitGroup
	wg.Add(2)
	str := "hello,world!"
	str1 := []byte(str)
	sc := make(chan byte, len(str))
	count := make(chan int)
	for _, v := range str1 {
		sc <- v
	}
	close(sc)

	go func() {
		defer wg.Done()
		for {
			ball, ok := <-count
			if ok {
				pri, ok1 := <-sc
				if ok1 {
					fmt.Printf("go 2 : %c\n", pri)
				} else {
					close(count)
					return
				}
				count <- ball
			} else {
				return
			}
		}
	}()

	go func() {
		defer wg.Done()
		for {
			time.Sleep(8 * time.Millisecond)
			ball, ok := <-count
			if ok {
				pri, ok1 := <-sc
				if ok1 {
					fmt.Printf("go 1 : %c\n", pri)
				} else {
					close(count)
					return
				}
			} else {
				return
			}
			count <- ball
		}
	}()

	count <- 23
	wg.Wait()
} 
```


```go
package main

import (
	"fmt"
)

func printString(str string, done chan bool) {
	for _, letter := range str {
		fmt.Printf("%c", letter)
	}
	done <- true
}

func main() {
	done := make(chan bool)

	go printString("Hello", done)
	<-done // 等待第一个goroutine完成

	go printString("World", done)
	<-done // 等待第二个goroutine完成
}
```

## N个协程交替打印1-100

```go
package main

import (
	"fmt"
	"sync"
)

func printer(wg *sync.WaitGroup, ch chan int) {
	defer wg.Done()
	for num := range ch {
		fmt.Println(num)
		ch <- num + 1 // 将下一个数字发送到通道
	}
}

func main() {
	numGoroutines := 5 // 设置协程数量

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	ch := make(chan int)

	for i := 0; i < numGoroutines; i++ {
		go printer(&wg, ch)
	}

	ch <- 1 // 启动第一个协程开始打印

	wg.Wait()
	close(ch)
}
```
