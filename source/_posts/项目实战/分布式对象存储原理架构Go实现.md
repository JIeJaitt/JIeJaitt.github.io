---
title: 分布式对象存储原理架构Go实现
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: f6782cca
date: 2022-08-01 22:03:43
categories: 项目实战
tags: 
- Go
- 分布式
- 对象存储
sticky:
---

## 元数据服务

实现了对象存储服务包括了接口服务和数据服务之后，它只是一个分布式对象存储的雏形。这个雏形的问题是无法区分同一个对象的不同版本。为了记录对象版本以及其他一些元数据，我们会在本章将一个新的组件加入我们的架构：元数据服务。

### 元数据服务简介

- `系统定义的元数据`：和数据服务类似，元数据服务就是提供对元数据的存取功能的服务。我们在第1章已经介绍过，元数据指的是对象的描述信息，为了和对象的数据本身区分开来，我们就赋予了它这个名称。那么对象的哪些信息可以被称为元数据呢？举例来说，有对象的名字、版本、大小以及散列值等。这些都是系统定义的元数据，因为它们的存在对一个对象存储系统有实际意义，比如说客户端和接口服务之间根据对象的名字来引用一个对象；一个对象可以有多个版本，除了删除标记外，每个版本实际都指向数据服务节点上的一份数据存储。
- `用户自定义的元数据`：除了那些系统定义的元数据以外，用户也可以为这个对象添加自定义的元数据，通常是以键值对形式保存的任意描述信息，比如一张照片的拍摄时间和拍摄地点，一首歌的作者和演唱者等。对象存储系统不关心这些元数据，但是用户需要将它们添加到对象存储系统中，作为该对象的元数据进行保存。

### 散列值和散列函数

对象的散列值是一种非常特殊的元数据，因为对象存储通常将对象的散列值作为其全局唯一的标识符。在此前，数据服务节点上的对象都是用名字来引用的，如果两个对象名字不同，那么我们无法知道它们的内容是否相同。这让我们无法实现针对不同对象的去重。现在，以对象的散列值作为标识符，我们就可以将接口服务层访问的对象和数据服务存取的对象数据解耦合。客户端和接口服务通过对象的名字来引用一个对象，而实际则是通过其散列值来引用存储在数据节点上的对象数据，只要散列值相同则可以认为对象的数据相同，这样就可以实现名字不同但数据相同的对象之间的去重。

对象的散列值是通过散列函数计算出来的，散列函数会将对象的数据进行重复多轮的数学运算，这些运算操作包括按位与、按位或、按位异或等，最后计算出来一个
长度固定的数字，作为对象的散列值。一个理想的散列函数具有以下5个特征。
- 操作具有决定性，同样的数据必定计算出同样的散列值。
- 无论计算任何数据都很快。
- 无法根据散列值倒推数据，只能遍历尝试所有可能的数据。
- 数据上微小的变化就会导致散列值的巨大改变，新散列值和旧散列值不具有相关性。
- 无法找到两个能产生相同散列值的不同数据。

可惜这只是理想的情况，现实世界里不可能完全满足。在现实世界，一个散列函数hash的安全级别根据以下3种属性决定。
- 抗原像攻击：给定一个散列值h,难以找到一个数据m令h=hash(m)。这个属性称为函数的单向性。欠缺单向性的散列函数易受到原像攻击。
- 抗第二原像攻击：给定一个数据m1,难以找到第二个数据m2令hash(m1)=hash(m2)。欠缺该属性的散列函数易受到第二原像攻击。
- 抗碰撞性：难以找到两个不同的数据m1和m2令hash(m1)=hash(m2)。这样的一对数据被称为散列碰撞。

本项目的实现使用的散列函数是SHA-256,该函数使用64轮的数学运算，产生一个长度为256位的二进制数字作为散列值，目前在全世界还没有报告过一起散列碰撞事件。这样的函数对于我们来说已经足够好。对安全性有特殊要求的读者也可以自行选用SHA-512或其他更高位数的散列函数。更多散列函数信息请参见其官方网站。

本项目实现的元数据服务较为简单，它将只保存系统定义的元数据，也就是对象的名字、版本、大小和散列值，因为这些直接影响到我们的存储功能。至于用户自定义的元数据对我们没有直接影响，所以本书并没有实现。不过一个成熟的对象存储系统通常都会支持对用户自定义元数据的高级搜索功能，有兴趣的读者可以自行实现。

### 加入元数据服务的架构

见图，和第2章的架构相比，加入元数据服务的架构其他组件不变，而多了一个ElasticSearch(以下简称ES),那就是我们选择的元数据服务。需要说明的是能做元数据服务的并不只有ES一种，任何一个分布式数据库都可以做我们的元数据服务。我们选择ES的原因是它足够好且实现方便。和RabbitMQ一样，ES本身当然也支持集群，但是在本书的测试环境中我们只使用了一个服务节点。ES使用的也是REST接口，我们的接口服务节点作为客户端通过HTTP访问ES的索引(index)。ES的索引就相当于一个数据库，而类型(type)则相当于数据库里的一张表。我们会创建一个名为metadata的索引，其中有一个名为objects的类型。

<img width="607" alt="加入元数据服务的架构" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/9d606786-a319-479e-871b-e623aadfa659">

需要注意的是，目前ES的索引的主分片(primary shards)数量一旦被创建就无法更改，对于对象存储来说这会导致元数据服务的容量无法自由扩容。本书的实现由于数据量较小并没有考虑扩容的问题，而是直接使用了固定的索引。对于有扩展性需求的读者，本书推荐的一种解决方法是使用ES滚动索引(rollover index)。使用滚动索引之后，只要当前索引中的文档数量超出设定的阈值，E$就会自动创建一个新的索引用于数据的插入，而数据的搜索则依然可以通过索引的别名访问之前所有的旧索引。当然，这个解决方案只是代码层面的，硬件的扩容还是需要运维人员的帮助。

### REST接口

有了元数据服务之后，就可以给我们的接口服务增加新的功能，首先是给对象的GET方法增加一个参数version。
```
GET /objects/<object name>?version=<version id>
```
响应正文
- 对象的数据：这个参数可以告诉接口服务客户端需要的是该对象的第几个版本，默认是最新的那个。

```
PUT /objects/<object name>
```
请求头部(Request Header)
- Digest:SHA-256=<对象散列值的Base64编码>
- Content-Length:<对象数据的长度>\
请求正文
- 对象的内容如下：
PUT方法没变，但是每次客户端PUT一个对象时，必须提供一个名为Digest的HTTP请求头部，它记录了用SHA-256散列函数计算出来的对象散列值(https://tools.ietf.org/html/rfc3230)。

HTTP头部分为请求头部(Request Header)和响应头部(Response Header),它允许客户端和服务器在HTTP的请求和响应中交换额外的信息。一个头部由3个部分组成：一个大小写不敏感的名字，后面跟着一个冒号“：”，然后是该头部的值。注意头部的值不能包含回车。

Digest头部的名字是Digest,后面跟着一个冒号，然后是Digest头部的值，也就是“SHA-256=<对象散列值的Base64编码>”。SHA-256是我们要求使用的散列函数，根据RFC3230的要求，客户端需要在Digest头部提供计算散列值时使用的散列函数，如果服务器发现客户端使用的散列函数跟服务器使用的散列函数不一致则会拒绝整个请求。SHA-256计算出的散列值是一个256位的二进制数字，客户端还需要对其进行Bas64编码，将数字转化成ASCI字符串格式，以确保不包含回车的二进制数字。

Bas64编码规则选定了64个不同的字符，分别代表1个6位的二进制数字。对一个256位的二进制数字进行编码，首先要将其切成11个24位的二进制数字（不足的位在最后一个数字用0补齐），然后每个数字正好用4个Base64字符来表示。

经过Bas64编码后的散列值将作为该对象的全局唯一标识符，也是数据服务节点储存的对象名。也就是说，只要对象内容发生了变化，那么原来在数据服务节点上储
存的数据不会被更新，而是会储存一个新的对象。

除了Digest头部以外，客户端还必须提供一个名为Content-Length的HTTP请求头部用来告诉服务端该对象数据的长度。客户端提供的对象散列值和长度会作为元数据被保存在元数据服务中。

将数据服务层存取的对象名和接口服务层访问的对象名区分开对于去重来说至关重要。现在，无论接口服务层收到的对象名是什么，只要从数据服务层角度看到的对象名一致，就可以认为是对象的内容一致，去重就只需要简单地根据数据服务层的对象名来实现就可以了。

PUT成功后，在元数据服务中该对象就会添加一个新的版本，版本号从1开始递增。

除了对象的GET和PUT方法发生了变化以外，我们还可以添加新的功能，首先是对象的DELETE方法。
```
DELETE /objects/<object name>
```
我们使用DELETE方法来删除一个对象。

在此之前，我们都没有实现对象的删除功能，这是有原因的。对象存储的去重会让名字不同的对象共享同一份数据存储，而删除一个对象意味着要将该对象和数据存储之间的联系断开。在把对象的名字和对象的数据存储解耦合之前，我们无法做到在删除一个对象的同时保留对象的数据存储。现在有了元数据服务，我们在删除一个对象时，只需要在元数据中给对象添加一个表示删除的特殊版本，而在数据节点上保留其数据。

在GET时，如果该对象的最新版本是一个删除标记，则返回404 Not Found.

除了对象的删除功能之外，我们还需要提供对象的列表功能，用于查询所有对象或指定对象的所有版本。
```
GET /versions/
```
响应正文
- 所有对象的所有版本：客户端通过该接口GET全体对象的版本列表。接口服务会向元数据服务搜索当前所有的元数据，并将来自ES的元数据在HTTP响应中逐条输出，每条元数据的结构如下。
```json
{
  Name:string,
  Version:int,
  Size:int,
  Hash:string
}
```
Name就是对象名字。Version是对象的版本。Size是对象该版本的大小，Hash是对象该版本的散列值。如果某个版本是一个删除标记，其Size为0，Hash为空字符串。
```
GET /versions/<object name>
```
响应正文
- 指定对象的所有版本：客户端GET某个指定对象的版本列表，接口服务节点返回该对象的所有版本。HTTP响应内容结构同上。

### ES接口

- `ES映射结构`：熟悉ES的读者从上面的接口应该已经能够猜测出来，这里metadata索引使用的映射(mappings)结构如下：

```json
{
  "mappings": {
    "objects": {
      "properties": {
        "name": {
          "type": "string",
          "index": "not analyzed"
        },
        "version": {
          "type": "integer"
        },
        "size": {
          "type": "integer"
        },
        "hash": {
          "type": "string"
        }
      }
    }
  }
}
```

之前说过，ES的索引相当于数据库而类型相当于数据库的表，那么现在这个映射则相当于定义表结构。这个映射会在创建metadata索引时作为参数一并被引入，该索引只有一个类型就是objects,其中包括4个属性分别是name、version、size和hash,相当于数据库表的4个列。

name属性有个额外的要求"index":"not_analyzed",这是为了在搜索时能够精确匹配name。默认的analyzed index会对name进行分词匹配。这有可能导致不相关的匹配结果。比如我们有一个元数据的name是“little cat'”,如果使用analyzed index,那么它会被分成little和cat两个词，之后任何包含little或cat的搜索都会导致“little cat'”被选中。

- `添加对象元数据的步骤`：当客户端PUT或DELETE对象时，我们都需要往元数据服务添加新版本，处理步骤见图。

<img width="531" alt="往元数据服务添加新版本" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/6d20a287-411a-4b3f-baa0-4e2b457a4926">

上图显示了我们往元数据服务添加新版本的流程，当接口服务需要给某个对象添加一个新版本时，我们首先会去查询该对象当前最新版本的元数据，如果该对象不存在，
则新版本从1开始：否则新版本为当前最新版本加1，然后将其添加进元数据服务。

GET对象时分两种情况，如果没有指定版本号，我们同样需要搜索对象最新版本的元数据：如果指定了版本号，我们可以根据对象的名字和版本号直接获取对象指定版本的元数据。

- `用到的ES API`
要想获取对象当前最新版本的元数据需要使用ES搜索API。
```
GET /metadata/_search?q=name:<object_name>&size=1&sort=version:desc
```
给对象添加一个新版本需要使用ES索引API。
```
PUT /metadata/objects/<object_name>_<version>?op_type=create
```

在这里，我们特地将`<object_name>_<version>`作为_id创建。这是为了当客户端指定版本GET对象时可以直接根据对象名和版本号拼出相对应的id来从ES中获取元数据，从而免除了搜索的步骤。

使用`op_type=create`可以确保当多个客户端同时上传同一个对象时不至于发生数据丢失，因为只有第一个请求能成功上传给ES。其他请求会收到HTTP错误代码`409 Conflict`,这样接口服务节点就能知道发生了版本冲突并重新上传。

当客户端GET对象时分两种情况，如果没有指定版本号，我们使用和之前同样的ES搜索API来获取对象的最新版本。

如果客户端指定版本号GET对象，我们则使用ES Get API直接获取对象指定版本的元数据。
```
GET /metadata/objects/<object_name>_<version_id>/_source
```

当客户端GET全体对象版本列表时，我们使用ES搜索API方法如下：
```
GET /metadata/_search?sort=name,version&from=<from>&size=<size>
```
其中，from和size用于分页显示。在不指定from和size的情况下，ES默认的分页是从0开始显示10条。

当客户端GET指定对象版本列表时，我们使用ES搜索API方法如下：
```
GET /metadata/_search?sort=name,version&from=<from>&size=<size>&q=name:<object name>
```
这里多了一个q参数用于指定name。

### 对象PUT流程和对象GET流程

- 对象PUT流程

<img width="696" alt="加入元数据服务的对象PUT流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/6c665989-b4f5-4155-b677-c8930ee8cb51">

客户端的HTTP请求提供了对象的名字、散列值和大小，接口服务以散列值作为数据服务的对象名来保存对象，然后在元数据服务中根据对象的名字搜索当前最新的元数据，使其版本号加1并添加一个新版本的元数据。

- 对象GET流程

<img width="694" alt="加入元数据服务的对象GET流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/928cb452-ac4e-47cc-913a-3eeea89768de">

客户端在HTTP请求中指定对象的名字，可在URL的查询参数中指定版本号。如果指定版本号，则接口服务根据对象的名字和版本号获取元数据；否则根据对象的名字搜索最新元数据。然后从元数据中获得对象的散列值作为数据服务的对象名来读取对象。


### Go语言实现

加入元数据服务的方法和元数据服务的互动完全在接口服务层实现，数据服务的实现和上一章相比没有发生变化，因此本章不再赘述。

- 接口服务

由于接口服务的locate包和heartbeat包与上一章相比也没有发生变化，我们会略过对它们的代码示例，需要回顾的读者可自行翻阅上一章的相关内容。

接口服务这边首先发生变化的是main函数。

```diff
func main() {
	go heartbeat.ListenHeartbeat()
	http.HandleFunc("/objects/", objects.Handler)
	http.HandleFunc("/locate/", locate.Handler)
+	http.HandleFunc("/versions/", versions.Handler)
	log.Fatal(http.ListenAndServe(os.Getenv("LISTEN_ADDRESS"), nil))
}
```

相比上一章，本章的接口服务main函数多了一个用于处理/versions/的函数，名字叫versions.Handler。读者现在应该已经对这样的写法很熟悉了，明白这是versions包的Handler函数。


### 接口服务的 versions 包

versions 包比较简单，只有Handler 函数，其主要工作都是调用es 包的函数来完成的，见例 3-2。

```go
package versions

import (
	"encoding/json"
	"goDistributed-Object-storage/src/lib/es"
	"log"
	"net/http"
	"strings"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	from := 0
	size := 1000
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	for {
		metas, e := es.SearchAllVersions(name, from, size)
		if e != nil {
			log.Println(e)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		for i := range metas {
			b, _ := json.Marshal(metas[i])
			w.Write(b)
			w.Write([]byte("\n"))
		}
		if len(metas) != size {
			return
		}
		from += size
	}
}
```

这个函数首先检查 HTTP 方法是否为GET，如果不为 GET，则返回 405 Method Not Allowed；如果方法为 GET，则获取 URL 中`<object_name＞` 的部分，获取的方式跟之前一样，调用 strings.Split 函数将 URL 以 ”/“ 分隔符切成数组并取第三个元素赋值给 name。这里要注意的是，如果客户端的 HTTP 请求的 URL 是“/versions/”而不含 `<object_name>` 部分，那么 name 就是空字符串。

接下来我们会在一个无限 for 循环中调用 es 包的 SearchAlIVersions 函数并将 name、from 和 size 作为参数传递给该函数。from 从0开始，size 则固定为1000。es.SearchAIIVersions 函数会返回一个元数据的数组，我们遍历该数组，将元数据一一写入HTTP 响应的正文。如果返回的数组长度不等于 size，说明元数据服务中没有更多的数据了，此时我们让函数返回；否则我们就把fom 的值增加1000进行下一个选代。

es 包封装了我们访问元数据服务的各种 API 的操作，本章后续会有详细介绍。




### objects 包 put 逻辑相关的函数如下所示

```go
// goDistributed-Object-storage/apiServer/objects/put.go

func put(w http.ResponseWriter, r *http.Request) {
	// 从请求头中获取对象的哈希值
	hash := utils.GetHashFromHeader(r.Header)
	if hash == "" {
		log.Println("missing object hash in digest header")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// 将对象存储到存储系统中
	statusCode, err := storeObject(r.Body, url.PathEscape(hash))
	if err != nil {
		log.Println(err)
		w.WriteHeader(statusCode)
		return
	}
	if statusCode != http.StatusOK {
		w.WriteHeader(statusCode)
		return
	}

	// 从 URL 中获取对象的名称
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	// 从请求头中获取对象的大小
	size := utils.GetSizeFromHeader(r.Header)
	// 将对象的元数据添加到 Elasticsearch 中
	err = es.AddVersion(name, hash, size)
	// 异步方式将对象的元数据添加到 Elasticsearch 中
	// go func() {
	// 	err = es.AddVersion(name, hash, size)
	// 	if err != nil {
	// 		log.Println(err)
	// 	}
	// }()
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
	}

	// 返回 HTTP 状态码 200 表示成功
	w.WriteHeader(http.StatusOK)
}
```

在第2 章中，我们以`<object_name>`为参数调用 storeObject。而本章我们首先调用`utils.GetHashFromHeader` 从 HTTP 请求头部获取对象的散列值，然后以散列值为参数调用 storeObject。之后我们从 URL 中获取对象的名字并且调用 `utils.GetSizeFromHeader`从 HTTP 请求头部取对象的大小，然后以对象的名字、散列值和大小为参数调用`es.AddVersion` 给该对象添加新版本。

```go
func GetHashFromHeader(h http.Header) string {
	digest := h.Get("digest")
	if len(digest) < 9 {
		return ""
	}
	if digest[:8] != "SHA-256=" {
		return ""
	}
	return digest[8:]
}
```

```go
func GetSizeFromHeader(h http.Header) int64 {
	size, _ := strconv.ParseInt(h.Get("content-length"), 0, 64)
	return size
}
```

`GetHashFromHeader` 和 `GetSizeFromHeader` 是 utils 包提供的两个函数。

`GetHashFromHeader` 函数首先调用 `h.Get` 获取 “digest” 头部。`r` 的类型是一个指向 `http.Request` 的指针。它的 Header 成员类型则是一个http.Header，用于记录 HTTP 的头部，其Get 方法用于根据提供的参数获取相对应的头部的值。在这里，我们获取的就是 HTTP 请求中 digest 头部的值。我们检查该值的形式是否为“SHA-256=<hash>”，如果不是以“SHA-256=”开头我们返回空字符串，否则返回其后的部分。

同样， `GetSizeFromHeader` 也是调用 `h.Get` 获取“content-length”头部，并调用strconv.Parselnt 将字符串转化为 int64 输出。strconv.ParseInt 和例3-6中 strconv.Atoi这两个函数的作用都是将一个字符串转换成一个数字。它们的区别在于 Parselnt 返回的类型是 int64 而 Atoi返回的类型是 int，且 ParseInt 的功能更加复杂，它额外的输入参数用于指定转换时的进制和结果的比特长度。比如说 ParseInt 可以将一个字符串“OxFF”以十六进制的方式转换为整数255，而 Atoi 则只能将字符串“255”转换为整数255。

