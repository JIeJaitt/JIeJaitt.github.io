---
title: rand 随机数生成方法研究草稿
date: 2021-09-16 01:24:24
categories: 项目实战
tags: golang
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 57e7820e
toc: true
sticky:
---

package rand 实现了用于加解密的更安全的随机数生成器。


```go
import "crypto/rand"
```



## Variables 

```go
var Reader io.Reader
```
Reader是一个全局、共享的密码用强随机数生成器。在Unix类型系统中，会从`/dev/urandom`读取；而Windows中会调用`CryptGenRandom API`。

```go
package main 
import(
    "fmt"
    "encoding/base64"
    "crypto/rand"
    "io"
)

//sessionId函数用来生成一个session ID，即session的唯一标识符
func sessionId() string {
    b := make([]byte, 32)
    //ReadFull从rand.Reader精确地读取len(b)字节数据填充进b
    //rand.Reader是一个全局、共享的密码用强随机数生成器
    if _, err := io.ReadFull(rand.Reader, b); err != nil { 
        return ""
    }
    fmt.Println(b) //[62 186 123 16 209 19 130 218 146 136 171 211 12 233 45 99 80 200 59 20 56 254 170 110 59 147 223 177 48 136 220 142]
    return base64.URLEncoding.EncodeToString(b)//将生成的随机数b编码后返回字符串,该值则作为session ID
}
func main() { 
    fmt.Println(sessionId()) //Prp7ENETgtqSiKvTDOktY1DIOxQ4_qpuO5PfsTCI3I4=
}
```

## func Int

```go
func Int(rand io.Reader, max *big.Int) (n *big.Int, err error)
```
返回一个在[0, max)区间服从均匀分布的随机值，如果max<=0则会panic。

```go
package main 
import(
    "fmt"
    "crypto/rand"
    "math/big"
)


func main() { 
    //从128开始，这样就能够将(max.BitLen() % 8) == 0的情况包含在里面
    for n := 128; n < 140; n++ {
        b := new(big.Int).SetInt64(int64(n)) //将new(big.Int)设为int64(n)并返回new(big.Int)
        fmt.Printf("max Int is : %v\n", b)
        i, err := rand.Int(rand.Reader, b)
        if err != nil {
            fmt.Printf("Can't generate random value: %v, %v", i, err)
        }
        fmt.Printf("rand Int is : %v\n", i)
    }
}
```

```shell
bogon:~ user$ go run testGo.go 
max Int is : 128
rand Int is : 25
max Int is : 129
rand Int is : 117
max Int is : 130
rand Int is : 85
max Int is : 131
rand Int is : 62
max Int is : 132
rand Int is : 27
max Int is : 133
rand Int is : 120
max Int is : 134
rand Int is : 10
max Int is : 135
rand Int is : 27
max Int is : 136
rand Int is : 11
max Int is : 137
rand Int is : 119
max Int is : 138
rand Int is : 35
max Int is : 139
rand Int is : 83
```

## func Prime
```go
func Prime(rand io.Reader, bits int) (p *big.Int, err error)
```
返回一个具有指定字位数的数字，该数字具有很高可能性是质数。如果从rand读取时出错，或者bits<2会返回错误。

```go
package main 
import(
    "fmt"
    "crypto/rand"
)


func main() { 
    for n := 2; n < 10; n++ {
        p, err := rand.Prime(rand.Reader, n) //n代表位数，比如3为2位，127为7位
        if err != nil {
            fmt.Printf("Can't generate %d-bit prime: %v", n, err)
        }
        if p.BitLen() != n { //返回p的绝对值的字位数，0的字位数为0
            fmt.Printf("%v is not %d-bit", p, n)
        }
        if !p.ProbablyPrime(32) { //对p进行32次Miller-Rabin质数检测。如果方法返回真则p是质数的几率为1-(1/4)**32；否则p不是质数
            fmt.Printf("%v is not prime", p)
        }
        fmt.Println(p)
    }
}
```

```shell
bogon:~ user$ go run testGo.go 
3
7
13
31
53
109
223
439
```

如果位数小于2的话，会报错：
```go
package main 
import(
    "fmt"
    "crypto/rand"
    "log"
)


func main() { 
    p, err := rand.Prime(rand.Reader, 1) //n代表位数，比如3为2位，127为7位
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(p)
}
```

```shell
bogon:~ user$ go run testGo.go 
2019/02/23 12:31:37 crypto/rand: prime size must be at least 2-bit
exit status 1
```

## func Read
```go
func Read(b []byte) (n int, err error)
```
本函数是一个使用`io.ReadFull`调用`Reader.Read`的辅助性函数。当且仅当`err == nil`时，返回值`n == len(b)`。
```go
c := 10 
b := make([]byte, c) 
// func Read(b []byte) (n int, err error)
// 生成 b 切片大小的随机数
_, err := rand.Read(b) 
if err != nil {     
	fmt.Println("error:", err)     
	return 
} 

// func Equal(a []byte, b []byte) bool
// 	Equal 返回 a 和 b 是否具有相同的长度并包含相同的字节
// 也就断判断两个切片的内容是否完全相同。
//	一个 nil 参数相当于一个空切片（empty slice）。
fmt.Println(bytes.Equal([]byte("Go"), []byte("Go")))
fmt.Println(bytes.Equal([]byte("Go"), []byte("C++")))
// Output:
//  true
//  false

// 切片现在应该包含随机字节（random bytes），而不仅仅是零。
// Output:
//	false
fmt.Println(bytes.Equal(b, make([]byte, c)))
```
因为本函数是一个使用io.ReadFull调用Reader.Read的辅助性函数，所以最上面的那个生成session ID的例子等价于：

```go
package main 
import(
    "fmt"
    "encoding/base64"
    "crypto/rand"
)

//sessionId函数用来生成一个session ID，即session的唯一标识符
func sessionId() string {
    b := make([]byte, 32)
    //rand.Reader是一个全局、共享的密码用强随机数生成器
    n, err := rand.Read(b);
    if err != nil { 
        return ""
    }
    fmt.Println(b[:n]) //[154 94 244 2 147 96 148 6 13 27 3 52 231 127 160 159 40 47 84 116 79 87 160 217 185 216 47 143 101 107 219 178]
    return base64.URLEncoding.EncodeToString(b)//将生成的随机数b编码后返回字符串,该值则作为session ID
}
func main() { 
    fmt.Println(sessionId()) //ml70ApNglAYNGwM053-gnygvVHRPV6DZudgvj2Vr27I=
}
```

## Read Function
```go
// Read 是一个辅助函数，它使用 io.ReadFull 调用 Reader.Read。
// 返回时，n == len(b) 当且仅当 err == nil。
func Read(b []byte) (n int, err error) {
	return io.ReadFull(Reader, b)
}
```
简单来说，它读出的数据，并不一定是指定长度的。
##  ReadFull Function
```go
// ReadFull 将 r 中的 len(buf) 个字节准确地读入 buf。
// 它返回复制的字节数，如果读取的字节数较少，则返回错误。
// 仅当没有读取字节时，错误才是 EOF。
// 如果在读取一些但不是所有字节后发生 EOF，
// ReadFull 返回 ErrUnexpectedEOF。
// 返回时，n == len(buf) 当且仅当 err == nil。
// 如果 r 返回一个读取了至少 len(buf) 个字节的错误，则删除该错误。
func ReadFull(r Reader, buf []byte) (n int, err error) {
	return ReadAtLeast(r, buf, len(buf))
}
```
意思是读取正好len(buf)长度的字节。如果字节数不是指定长度，则返回错误信息和正确的字节数。当没有字节能被读时，返回EOF错误。如果读了一些，但是没读完产生EOF错误时，返回ErrUnexpectedEOF错误。


## Reader interface
```go
// Reader 是封装了基本 Read 方法的接口。
//
// Read 最多将 len(p) 个字节读入 p。
// 它返回读取的字节数 (0 <= n <= len(p)) 和遇到的任何错误。
// 即使 Read 返回 n < len(p)，它也可能在调用期间使用所有 p 作为暂存空间。
// 如果某些数据可用但不是 len(p) 字节，Read 通常会返回可用的数据，而不是等待更多。
//
// 当Read成功读取n>0个字节后遇到错误或文件结束条件时，返回读取的字节数。
// 它可能会从同一次调用中返回非零（non-nil）错误，或者从后续调用中返回错误（并且 n == 0）。
// 这种一般情况的一个例子是，在输入流末尾返回非零字节数的 Reader 可能会返回 err == EOF 或 err == nil。
// 下一次读 Read 应该返回 0，EOF。
//
// 在考虑错误 err 之前，调用者应始终处理返回的 n > 0 字节。
// 这样做可以正确处理读取一些字节后发生的 I/O 错误以及允许的 EOF 行为。
//
// 不鼓励 Read 的实现返回零字节计数并返回 nil 错误，除非 len(p) == 0。
// 调用者应该将返回的 0 和 nil 视为没有发生任何事情；特别是它不表示EOF。
//
// 实现不能保留 p。
type Reader interface {
	Read(p []byte) (n int, err error)
}
```