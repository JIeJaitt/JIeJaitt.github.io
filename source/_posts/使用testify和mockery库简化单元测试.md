---
title: 使用testify和mockery库简化单元测试
date: 2024-08-23T09:39:15+08:00
categories: 
tags: [Go,Mockery]
excerpt: 
abbrlink: 
toc: true 
sticky: 
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [segmentfault.com](https://segmentfault.com/a/1190000016897506)

> 2016 年我写过一篇关于 Go 语言单元测试的文章，简单介绍了 testing 库的使用方法。后来发现 testify/require 和 testify/assert 可以大大简化单元测试的写法，...

<!-- more -->

前言
--

2016 年我写过一篇关于 [Go 语言单元测试](https://link.segmentfault.com/?enc=hKlWluIbksDN1ASPlciudA%3D%3D.YLaobGKz7UK4PDrQdfYA4h%2FqGYC3gvGKCXIIUypA0Nied2rbmsYyJnqhTcYEpnRfAC%2BTcc%2FOPrwSML6hdSCVL9ho3Bu71S%2BG6uh4y33LgE8%3D)的文章，简单介绍了 testing 库的使用方法。后来发现 [testify/require 和 testify/assert](https://link.segmentfault.com/?enc=j2Z930nEzu43E7msowoXsw%3D%3D.StkkX8qJ65B86dRr6cz20PQxmIP3Ar%2BvwmDp4L5I2%2FflJBNp9RwEnvWTHKH1dWeZ) 可以大大简化单元测试的写法，完全可以替代 `t.Fatalf` 和 `t.Errorf`，而且代码实现更为简短、优雅。

再后来，发现了 [mockery](https://link.segmentfault.com/?enc=astM7X3RW6afZm2u%2Fq3u4w%3D%3D.pX2dnN%2Frzn60j6iCb8uFvSPeb%2B99I7wTZQipWG3PhXw2bYzSroVRK7iFCA%2Fi41Vp) 库，它可以为 Go interface 生成一个 mocks struct。通过 mocks struct，在单元测试中我们可以模拟所有 normal cases 和 corner cases，彻底消除细节实现上的 bug。mocks 在测试无状态函数 (对应 FP 中的 pure function) 中意义不大，其应用场景主要在于处理不可控的第三方服务、数据库、磁盘读写等。如果这些服务的调用细节已经被封装到 interface 内部，调用方只看到了 interface 定义的一组方法，那么在测试中 mocks 就能控制第三方服务返回任意期望的结果，进而实现对调用方逻辑的全方位测试。

关于 interface 的诸多用法，我会单独拎出来一篇文章来讲。本文中，我会通过两个例子展示 `testify/require` 和 `mockery` 的用法，分别是：

1.  使用 `testify/require` 简化 table driven test
2.  使用 `mockery` 和 `testify/mock` 为 lazy cache 写单元测试

### 准备工作

```bash
# download require, assert, mock
go get -u -v github.com/stretchr/testify
# install mockery into GoBin
go get -u -v github.com/vektra/mockery/.../
```

### testify/require

首先，我们通过一个简单的例子看下 require 的用法。我们针对函数 `Sqrt` 进行测试，其实现为：

```go
// Sqrt calculate the square root of a non-negative float64 
// number with max error of 10^-9. For simplicity, we don't 
// discard the part with is smaller than 10^-9.
func Sqrt(x float64) float64 {
  if x < 0 {
    panic("cannot be negative")
  }

  if x == 0 {
    return 0
  }

  a := x / 2
  b := (a + 2) / 2
  erro := a - b
  for erro >= 0.000000001 || erro <= -0.000000001 {
    a = b
    b = (b + x/b) / 2
    erro = a - b
  }

  return b
}
```

这里我们使用了一个常规的方法实现 `Sqrt`，该实现的最大精确度是到小数点后 9 位（为了方便演示，这里没有对超出 9 位的部分进行删除）。我们首先测试 `x < 0` 导致 panic 的情况，看 `require` 如何使用，测试代码如下：

```go
func TestSqrt_Panic(t *testing.T) {
  defer func() {
    r := recover()
    require.Equal(t, "cannot be negative", r)
  }()
  _ = Sqrt(-1)
}
```

在上面的函数中，我们只使用 `require.Equal` 一行代码就实现了运行结果校验。如果使用 `testing` 来实现的话，变成了三行，并且需要手写一串描述：

```go
func TestSqrt_Panic(t *testing.T) {
  defer func() {
    r := recover()
      if r.(string) != "cannot be negative" {
        t.Fatalf("expect to panic with message \"cannot be negative\", but got \"%s\"\n", r)
      }
  }()
  _ = Sqrt(-1)
}
```

使用 `require` 之后，不仅使测试代码更易于编写，而且能够在测试运行失败时，格式化运行结果，方便定位和修改 bug。这里你不妨把 `-1` 改成一个正数，运行 `go test`，查看运行结果。

上面我们能够看到 `require` 库带来的编码和调试效率的上升。在 table driven test 中，我们会有更深刻的体会。

#### Table Driven Test

我们仍然以 `Sqrt` 为例，来看下如何在 table driven test 中使用 `require`。这里我们测试的传入常规参数的情况，代码实现如下：

```go
func TestSqrt(t *testing.T) {
  testcases := []struct {
    desc   string
    input  float64
    expect float64
  }{
    {
      desc:   "zero",
      input:  0,
      expect: 0,
    },
    {
      desc:   "one",
      input:  1,
      expect: 1,
    },
    {
      desc: "a very small rational number",
      input: 0.00000000000000000000000001,
      expect: 0.0,
    },
    {
      desc:   "rational number result: 2.56",
      input:  2.56,
      expect: 1.6,
    },
    {
      desc:   "irrational number result: 2",
      input:  2,
      expect: 1.414213562,
    },
  }

  for _, ts := range testcases {
    got := Sqrt(ts.input)
    erro := got - ts.expect
    require.True(t, erro < 0.000000001 && erro > -0.000000001, ts.desc)
  }
}
```

在上面这个例子，有三点值得注意：

1.  `匿名struct` 允许我们填充任意类型的字段，非常方便于构建测试数据集；
2.  每个`匿名struct`都包含一个 `desc string` 字段，用于描述该测试要处理的状况。在测试运行失败时，非常有助于定位失败位置；
3.  使用 `require` 而不是 `assert`，因为使用 `require` 时，测试失败以后，所有测试都会停止执行。

关于 `require`，除了本文中提到的 `require.True`, `require.Equal`，还有一个比较实用的方法是 `require.EqualValues`，它的应用场景在于处理 Go 的强类型问题，我们不妨看一段代码：

```go
func Test_Require_EqualValues(t *testing.T) {
  // tests will pass
  require.EqualValues(t, 12, 12.0, "compare int32 and float64")
  require.EqualValues(t, 12, int64(12), "compare int32 and int64")

  // tests will fail
  require.Equal(t, 12, 12.0, "compare int32 and float64")
  require.Equal(t, 12, int64(12), "compare int32 and int64")
}
```

更多 `require` 的方法参考 [require's godoc](https://link.segmentfault.com/?enc=GyJsIh7e4vIbLEl1diwgMw%3D%3D.YpnpVXcFe0bUAjpiFTzhNGoBiaePBWzG2wO4edQspnirpeDO82nYsJV2mT45pZx%2B%2F1w3OOzSQhRGLNjIo4zdSQ%3D%3D)。

### mockery

[mockery](https://link.segmentfault.com/?enc=NrEQwWjMqiEY1cuaXIAo9A%3D%3D.1Fc%2BFKGZYals4437Wizp3%2BjL5ER1EmGM6t8SJZZtaG4ZBvz55rhVP9Inv2Z0v1pp) 与 Go 指令 (directive) 结合使用，我们可以为 interface 快速创建对应的 mock struct。即便没有具体实现，也可以被其他包调用。我们通过 LazyCache 的例子来看它的使用方法。

假设有一个第三方服务，我们把它封装在 `thirdpartyapi` 包里，并加入 go directive，代码如下：

```go
package thirdpartyapi

//go:generate mockery -name=Client

// Client defines operations a third party service has
type Client interface {
  Get(key string) (data interface{}, err error)
}
```

我们在 thirdpartyapi 目录下执行 `go generate`，在 mocks 目录下生成对应的 mock struct。目录结构如下：

```bash
~ $ tree thirdpartyapi/
thirdpartyapi/
├── client.go
└── mocks
    └── Client.go

1 directory, 2 files
```

在执行 `go generate` 时，指令 `//go:generate mockery -name=Client` 被触发。它本质上是 `mockery -name=Client` 的快捷方式，优势是 go generate 可以批量执行多个目录下的多个指令（需要多加一个参数，具体可以参考文档）。  
此时，我们只有 interface，并没有具体的实现，但是不妨碍在 `LazyCache` 中调用它，也不妨碍在测试中调用 `thirdpartyapi` 的 mocks client。为了方便理解，这里把 `LazyCache` 的实现也贴出来 (忽略 import)：

```go
//go:generate mockery -name=LazyCache

// LazyCache defines the methods for the cache
type LazyCache interface {
  Get(key string) (data interface{}, err error)
}

// NewLazyCache instantiates a default lazy cache implementation
func NewLazyCache(client thirdpartyapi.Client, timeout time.Duration) LazyCache {
  return &lazyCacheImpl{
    cacheStore:       make(map[string]cacheValueType),
    thirdPartyClient: client,
    timeout:          timeout,
  }
}

type cacheValueType struct {
  data        interface{}
  lastUpdated time.Time
}

type lazyCacheImpl struct {
  sync.RWMutex
  cacheStore       map[string]cacheValueType
  thirdPartyClient thirdpartyapi.Client
  timeout          time.Duration // cache would expire after timeout
}

// Get implements LazyCache interface
func (c *lazyCacheImpl) Get(key string) (data interface{}, err error) {
  c.RLock()
  val := c.cacheStore[key]
  c.RUnlock()

  timeNow := time.Now()
  if timeNow.After(val.lastUpdated.Add(c.timeout)) {
    // fetch data from third party service and update cache
    latest, err := c.thirdPartyClient.Get(key)
    if err != nil {
      return nil, err
    }

    val = cacheValueType{latest, timeNow}
    c.Lock()
    c.cacheStore[key] = val
    c.Unlock()
  }

  return val.data, nil
}
```

为了简单，我们暂时不考虑 cache miss 或 timeout 与 cache 被更新的时间间隙，大量请求直接打到 `thirdpartyapi` 可能导致的后果。

介绍测试之前，我们首先了解一下 "控制变量法"，在自然科学中，它被广泛用于各类实验中。在[智库百科](https://link.segmentfault.com/?enc=y3SB7vKUsd2OzBAMi8oE0g%3D%3D.npBtEdRxni0vzgxW0t8s26LaLTR73RK%2BJs14XMzXsfyGwI9TU%2FiEh2DFlbJPJp8uxvRqGV90lWTkfH%2BgvV6wgdXITdnb%2BilBB0dhQ4bLiwk%3D)，它被定义为 _指把多因素的问题变成多个单因素的问题，而只改变其中的某一个因素，从而研究这个因素对事物影响，分别加以研究，最后再综合解决的方法_。该方法同样适用于计算机科学，尤其是测试不同场景下程序是否能如期望般运行。我们将这种方法应用于本例中 `Get` 方法的测试。

在 `Get` 方法中，可变因素有 `cacheStore`、`thirdPartyClient` 和 `timeout`。在测试中，`cacheStore` 和 `timeout` 是完全可控的，`thirdPartyClient` 的行为需要通过 mocks 自定义期望行为以覆盖默认实现。事实上，mocks 的功能要强大的多，下面我们用代码来看。

#### 为 LazyCache 写测试

这里，我只拿出 **Cache Miss Update Failure** 一个 case 来分析，覆盖所有 case 的代码查看 [github repo](https://link.segmentfault.com/?enc=Y6pUiCx1mRFsJhnWbgswzg%3D%3D.V1ltmJCq8gqDlwgBwaMQQzFmnte5AUHY4iw8ZhEdEY92h3jXVp7jlDwgvFJMJsc33S030tcB4Csf2keLrZOUDo3YkF1GGnaJYTLbjEgYhS98TZNaTquuhBnZBSEI9Wvf)。

```go
func TestGet_CacheMiss_Update_Failure(t *testing.T) {
  testKey := "test_key"
  errTest := errors.New("test error")
  mockThirdParty := &mocks.Client{}
  mockThirdParty.On("Get", testKey).Return(nil, errTest).Once()

  mockCache := &lazyCacheImpl{
    memStore:         map[string]cacheValueType{},
    thirdPartyClient: mockThirdParty,
    timeout:          testTimeout,
  }

  // test cache miss, fails to fetch from data source
  _, gotErr := mockCache.Get(testKey)
  require.Equal(t, errTest, gotErr)

  mock.AssertExpectationsForObjects(t, mockThirdParty)
}
```

这里，我们只讨论 `mockThirdParty`，主要有三点：

1.  `mockThirdParty.On("Get", testKey).Return(nil, errTest).Once()` 用于定义该对象 `Get` 方法的行为：`Get` 方法接受 `testKey` 作为参数，当且仅当被调用一次时，会返回 `errTest`。如果同样的参数，被调用第二次，就会报错；
2.  `_, gotErr := mockCache.Get(testKey)` 触发一次上一步中定义的行为；
3.  `mock.AssertExpectationsForObjects` 函数会对传入对象进行检查，保证预定义的期望行为完全被精确地触发；

在 table driven test 中，我们可以通过 `mockThirdParty.On` 方法定义 `Get` 针对不同参数返回不同的结果。

在上面的测试中 `.Once()` 等价于 `.Times(1)`。如果去掉 `.Once()`，意味着 `mockThirdParty.Get` 方法可以被调用任意次。

更多 mockery 的使用方法参考 [github](https://link.segmentfault.com/?enc=KDtPbVBzEMk3%2F9ndiooJPA%3D%3D.5Hf1ISYNaDujVEDDQOzZQtSiKHcNiAAa7nhUU9ErHuB3aPPmo3xSXN7LZ6QKuHMa)

### 小结

在本文中，我们结合实例讲解了 `testify` 和 `mockery` 两个库在单元测试中的作用。最后分享一个图，希望大家能重视单元测试。

![](https://segmentfault.com/img/remote/1460000016897509?w=509&h=348)

### 相关链接

1.  [示例代码](https://link.segmentfault.com/?enc=uZ1zMpXXv%2FDK7314NpBWOA%3D%3D.f475kAWxVTj2XG8LUeolCA8Gu1P%2FUTWTiKoKR8irKFZpIaVdRZ%2FYeUPLzLcz8gefHq8uhrZaVl8PIU7siFyzGJfHk7kcEhYG2hUcWArNkY2flvyc1XcGkFijhudtaO%2Fo)
2.  [testify](https://link.segmentfault.com/?enc=tpj7GG5R1%2F3sKy0aKzF1RQ%3D%3D.LJQAMSfXfNpmDDqyxnY9NVg6KAgep4U4drVLbf7JCXDqymicFJycyO5CDZFaNdxI)
3.  [mockery](https://link.segmentfault.com/?enc=V03%2FI8S3dVU9EM%2FJExb4Dg%3D%3D.t2YQa%2BOQYLDYtdLFNPnCzmIZc68%2FSy9NANRVk8Fyi2kKxU%2BNzFXsumIOCS19pvMW)
4.  [The Outrageous Cost of Skipping TDD & Code Reviews](https://link.segmentfault.com/?enc=nJ%2Bp8bVtaIB%2Bh0n4RaYykg%3D%3D.6S5ocNvu7AARfuYTb2JJyVmiENz7TCem87Do2Rl4Zmrb5dcjpGkQPDrSCI1Lmr25YpFpeTWHBa2cMCAm0Dv1dNwRvcdg7T3IYkZQCwDfxZN2kjWkHvA40%2F%2BzCaWB7gS%2FtwOoeB4ITN2qzHgYscYL1g%3D%3D)

扫码关注微信公众号 “深入 Go 语言”

![](https://segmentfault.com/img/remote/1460000006760444?w=430&h=430)
