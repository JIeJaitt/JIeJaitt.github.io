---
title: 分布式对象存储原理架构Go实现
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
abbrlink: goDistributed-Object-storage
date: 2022-08-01 22:03:43
categories: 项目实战
tags: [Go,分布式,对象存储]
sticky: 9999
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

- 接口服务的main函数

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


- 接口服务的 versions 包

versions 包比较简单，只有Handler 函数，其主要工作都是调用es 包的函数来完成的，见例 3-2。

```go
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

接下来我们会在一个无限 for 循环中调用 es 包的 SearchAlIVersions 函数并将 name、from 和 size 作为参数传递给该函数。from 从0开始，size 则固定为1000。es.SearchAIIVersions 函数会返回一个元数据的数组，我们遍历该数组，将元数据一一写入HTTP 响应的正文。如果返回的数组长度不等于 size，说明元数据服务中没有更多的数据了，此时我们让函数返回；否则我们就把from 的值增加1000进行下一个选代。

es 包封装了我们访问元数据服务的各种 API 的操作，本章后续会有详细介绍。

- 接口服务的objects包

本章加入元数据服务以后，接口服务的objects包与上一章相比发生了较大的变化，除了多了一个对象的DELETE方法以外，对象的PUT和GET方法也都有所改变，它们需要跟元数据服务互动。首先让我们从Handler函数的改变开始看起，见例3-3。


```go
// goDistributed-Object-storage/apiServer/objects/handler.go

func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m == http.MethodPut {
		put(w, r)
		return
	}
	if m == http.MethodGet {
		get(w, r)
		return
	}
	if m == http.MethodDelete {
		del(w, r)
		return
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
}
```

可以看到，跟上一章相比，在Handler里多出了对DELETE方法的处理函数del。其具体实现见例3-4。

```go
// goDistributed-Object-storage/apiServer/objects/del.go

func del(w http.ResponseWriter, r *http.Request) {
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	version, e := es.SearchLatestVersion(name)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	e = es.PutMetadata(name, version.Version+1, 0, "")
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
```

del函数用同样的方式从URL中获取`<object name>`并赋值给name。然后它以name为参数调用cs.SearchLatestVersion,搜索该对象最新的版本。接下来函数调用es.PutMetadata插入一条新的元数据。es.PutMetadata接受4个输入参数，分别是元数据的name、version、size和hash。我们可以看到，函数参数中name就是对象的名字，version就是该对象最新版本号加1,size为O,hash为空字符串，以此表示这是一个删除标记。

objects包put相关的函数见例3-5。

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
	c, e := storeObject(r.Body, url.PathEscape(hash))
	if e != nil {
		log.Println(e)
		w.WriteHeader(c)
		return
	}
	if c != http.StatusOK {
		w.WriteHeader(c)
		return
	}

	// 从 URL 中获取对象的名称
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	// 从请求头中获取对象的大小
	size := utils.GetSizeFromHeader(r.Header)
	// 将对象的元数据添加到 Elasticsearch 中
	e = es.AddVersion(name, hash, size)
	// 异步方式将对象的元数据添加到 Elasticsearch 中
	// go func() {
	// 	err = es.AddVersion(name, hash, size)
	// 	if err != nil {
	// 		log.Println(err)
	// 	}
	// }()
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
	}

	// 返回 HTTP 状态码 200 表示成功
	w.WriteHeader(http.StatusOK)
}

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

func GetSizeFromHeader(h http.Header) int64 {
	size, _ := strconv.ParseInt(h.Get("content-length"), 0, 64)
	return size
}

```

在第2 章中，我们以`<object_name>`为参数调用 storeObject。而本章我们首先调用`utils.GetHashFromHeader` 从 HTTP 请求头部获取对象的散列值，然后以散列值为参数调用 storeObject。之后我们从 URL 中获取对象的名字并且调用 `utils.GetSizeFromHeader`从 HTTP 请求头部取对象的大小，然后以对象的名字、散列值和大小为参数调用`es.AddVersion` 给该对象添加新版本。

`GetHashFromHeader` 和 `GetSizeFromHeader` 是 utils 包提供的两个函数。

`GetHashFromHeader` 函数首先调用 `h.Get` 获取 “digest” 头部。`r` 的类型是一个指向 `http.Request` 的指针。它的 Header 成员类型则是一个http.Header，用于记录 HTTP 的头部，其Get 方法用于根据提供的参数获取相对应的头部的值。在这里，我们获取的就是 HTTP 请求中 digest 头部的值。我们检查该值的形式是否为“`SHA-256=<hash>`”，如果不是以“SHA-256=”开头我们返回空字符串，否则返回其后的部分。

同样， `GetSizeFromHeader` 也是调用 `h.Get` 获取“content-length”头部，并调用strconv.Parselnt 将字符串转化为 int64 输出。`strconv.ParseInt` 和例3-6中 strconv.Atoi这两个函数的作用都是将一个字符串转换成一个数字。它们的区别在于 Parselnt 返回的类型是 int64 而 Atoi返回的类型是 int，且 ParseInt 的功能更加复杂，它额外的输入参数用于指定转换时的进制和结果的比特长度。比如说 ParseInt 可以将一个字符串“OxFF”以十六进制的方式转换为整数255，而 Atoi 则只能将字符串“255”转换为整数255。

objects.get函数的变化见例3-6。

```go
func get(w http.ResponseWriter, r *http.Request) {
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	versionId := r.URL.Query()["version"]
	version := 0
	var e error
	if len(versionId) != 0 {
		version, e = strconv.Atoi(versionId[0])
		if e != nil {
			log.Println(e)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}
	meta, e := es.GetMetadata(name, version)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if meta.Hash == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	object := url.PathEscape(meta.Hash)
	stream, e := getStream(object)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	io.Copy(w, stream)
}
```

跟第2章相比，本章的objects.get函数从URL获取了对象的名字之后还需要从URL的查询参数中获取“version”参数的值。r.URL的类型是*url.URL,它是指向url.URL结构体的指针。url.URL结构体的Query方法会返回一个保存URL所有查询参数的map,该map的键是查询参数的名字，而值则是一个字符串数组，这是因为HTTP的URL查询参数允许存在多个值。以“version”为key就可以得到URL中该查询参数的所有值，然后赋值给versionId变量。如果URL中并没有“version”这个查询参数，versionld变量则是空数组。由于我们不考虑多个“version”查询参数的情况，所以我们始终以versionId数组的第一个元素作为客户端提供的版本号，并将其从字符串转换为整型赋值给version变量。

然后我们以对象的名字和版本号为参数调用es.GetMetadata,得到对象的元数据meta。meta.Hash就是对象的散列值。如果散列值为空字符串说明该对象该版本是一个删除标记，我们返回404 Not Found；否则以散列值为对象名从数据服务层获取对象并输出。getStream函数我们在上一章已经介绍过了，本章略。

### es包

我们的es包封装了以HTTP访问ES的各种API的操作，由于代码较长不能全部列出，我们在这里只列出了本章用到的一部分函数和结构体，首先是getMetadata,见例3-7。

```go

type Metadata struct {
	Name    string
	Version int
	Size    int64
	Hash    string
}

func getMetadata(name string, versionId int) (meta Metadata, e error) {
	url := fmt.Sprintf("http://%s/metadata/objects/%s_%d/_source",
		os.Getenv("ES_SERVER"), name, versionId)
	r, e := http.Get(url)
	if e != nil {
		return
	}
	if r.StatusCode != http.StatusOK {
		e = fmt.Errorf("fail to get %s_%d: %d", name, versionId, r.StatusCode)
		return
	}
	result, _ := ioutil.ReadAll(r.Body)
	json.Unmarshal(result, &meta)
	return
}
```

getMetadata用于根据对象的名字和版本号来获取对象的元数据，其URL中的服务器地址来自环境变量ES_SERVER,索引是metadata,类型是objects,文档的id由对象的名字和版本号拼接而成。通过这种方式GET这个URL可以直接获取该对象的元数据，这样就免除了耗时的搜索操作。ES返回的结果经过JSON解码后被es、SearchLatestVerson函数的实现见例3-8，保存在meta变量返回。meta的类型是Metadata结构体，其结构和ES映射中定义的objects类型的属性一一对应，同样是包含Name、Version、Size和Hash。

```go
type hit struct {
	Source Metadata `json:"_source"`
}

type searchResult struct {
	Hits struct {
		Total int
		Hits  []hit
	}
}

func SearchLatestVersion(name string) (meta Metadata, e error) {
	url := fmt.Sprintf("http://%s/metadata/_search?q=name:%s&size=1&sort=version:desc",
		os.Getenv("ES_SERVER"), url.PathEscape(name))
	r, e := http.Get(url)
	if e != nil {
		return
	}
	if r.StatusCode != http.StatusOK {
		e = fmt.Errorf("fail to search latest metadata: %d", r.StatusCode)
		return
	}
	result, _ := ioutil.ReadAll(r.Body)
	var sr searchResult
	json.Unmarshal(result, &sr)
	if len(sr.Hits.Hits) != 0 {
		meta = sr.Hits.Hits[0].Source
	}
	return
}
```

例3-8显示了es包的SearchLatestVersion函数，它以对象的名字为参数，调用ES搜索API。它在URL中指定了对象的名字，且版本号以降序排列只返回第一个结果。
ES返回的结果被JSON解码到一个searchResult结构体，这个结构体和ES搜索API返回的结构保持一致，以方便我们读取搜索到的元数据并赋值给mta返回。如果ES返回的结果长度为O,说明没有搜到相对应的元数据，我们直接返回。此时mta中各属性都为初始值：字符串为空字符串“”，整型为0。

es.GetMetadata函数的实现见例3-9。

```go
// es.GetMetadata函数

func GetMetadata(name string, version int) (Metadata, error) {
	if version == 0 {
		return SearchLatestVersion(name)
	}
	return getMetadata(name, version)
}
```

GetMetadata函数的功能类似getMetadata,输入对象的名字和版本号返回对象，区别在于当version为O时，我们会调用SearchLatestVersion获取当前最新的版本。

es.PutMetadata函数的实现见例3-l0。

```go
// es.PutMetadata函数

func PutMetadata(name string, version int, size int64, hash string) error {
	doc := fmt.Sprintf(`{"name":"%s","version":%d,"size":%d,"hash":"%s"}`,
		name, version, size, hash)
	client := http.Client{}
	url := fmt.Sprintf("http://%s/metadata/objects/%s_%d?op_type=create",
		os.Getenv("ES_SERVER"), name, version)
	request, _ := http.NewRequest("PUT", url, strings.NewReader(doc))
	r, e := client.Do(request)
	if e != nil {
		return e
	}
	if r.StatusCode == http.StatusConflict {
		return PutMetadata(name, version+1, size, hash)
	}
	if r.StatusCode != http.StatusCreated {
		result, _ := ioutil.ReadAll(r.Body)
		return fmt.Errorf("fail to put metadata: %d %s", r.StatusCode, string(result))
	}
	return nil
}
```

PutMetadata函数用于向ES服务上传一个新的元数据。它的4个输入参数对应元数据的4个属性，函数会将它们拼成一个ES文档，一个ES的文档相当于数据库的一条记录。我们用PUT方法把这个文档上传到metadata索引的objects类型，且文档id由元数据的name和version拼成，方便我们GET。

我们使用了op_type=create参数，如果同时有多个客户端上传同一个元数据，结果会发生冲突，只有第一个文档被成功创建。之后的PUT请求，ES会返回409 Conflict。此时，我们的函数会让版本号加1并递归调用自身继续上传。

es.AddVersion函数的实现见例3-l1。

```go
// es.AddVersion函数

func AddVersion(name, hash string, size int64) error {
	version, e := SearchLatestVersion(name)
	if e != nil {
		return e
	}
	return PutMetadata(name, version.Version+1, size, hash)
}
```

AddVersion函数首先调用SearchLatestVersion获取对象最新的版本，然后在版本号上加1调用PutMetadata。

es.SearchAllVersions函数的实现见例3-12。


```go
// es.SearchAllVersions函数

func SearchAllVersions(name string, from, size int) ([]Metadata, error) {
	url := fmt.Sprintf("http://%s/metadata/_search?sort=name,version&from=%d&size=%d",
		os.Getenv("ES_SERVER"), from, size)
	if name != "" {
		url += "&q=name:" + name
	}
	r, e := http.Get(url)
	if e != nil {
		return nil, e
	}
	metas := make([]Metadata, 0)
	result, _ := ioutil.ReadAll(r.Body)
	var sr searchResult
	json.Unmarshal(result, &sr)
	for i := range sr.Hits.Hits {
		metas = append(metas, sr.Hits.Hits[i].Source)
	}
	return metas, nil
}
```

SearchAllVersions函数用于搜索某个对象或所有对象的全部版本。它的输入参数name表示对象的名字，如果name不为空字符串则搜索指定对象的所有版本，否则搜索所有对象的全部版本。输入参数from和size指定分页的显示结果，其功能和ES搜索API的from和size参数一致。搜索的结果按照对象的名字和版本号排序，并被保存在Metadata的数组里用于返回。

G0语言的实现已经全部介绍完成，接下来我们需要进行功能测试来验证我们的系统能否正常工作。

### 功能测试

保持第2章的环境设置不变。同时，我们让之前的RabbitMQ服务器(10.29.102.173)兼任ES服务器，在其上安装elasticsearch。
```bash
sudo apt-get install elasticsearch
```
在作者的机器上elasticsearch包自带的启动脚本有点问题，没能正常启动ES,让我们手动启动。
```bash
sudo /usr/share/elasticsearch/bin/elasticsearch /dev/null
```
元数据服务启动以后，我们还需要在其上创建metadata索引以及objects类型的
映射。
```bash
curl 10.29.102.173:9200/metadata -XPUT -d'{"mappings":{"objects":{"properties":{"name":{"type":"string","index":"not analyzed"},"version":{"type":"integer"},"size":{"type":"integer"},"hash":{"type":"string"}}}}}'
```
创建索引和映射的语法详见ES映射API其官方网站。

ES服务器就绪。现在，和上一章一样，我们同时启动8个服务程序（注意apiServer.go的启动命令变了，增加了ES_SERVER环境变量的设置）。
```bash
export RABBITMQ_SERVER=amqp://test:test@10.29.102.173:5672
export ES SERVER=10.29.102.173:9200
LISTEN_ADDRESS=10.29.1.1:12345 STORAGE ROOT=/tmp/1 go run dataserver/
dataServer.go
LISTEN ADDRESS=10.29.1.2:12345 STORAGE ROOT=/tmp/2 go run dataserver/
dataServer.go&
LISTEN ADDRESS=10.29.1.3:12345 STORAGE ROOT=/tmp/3 go run dataserver/
dataserver.go
LISTEN ADDRESS=10.29.1.4:12345 STORAGE ROOT=/tmp/4 go run dataserver/
dataServer.go
LISTEN ADDRESS=10.29.1.5:12345 STORAGE ROOT=/tmp/5 go run dataserver/
dataServer.go
LISTEN ADDRESS=10.29.1.6:12345 STORAGE ROOT=/tmp/6 go run dataserver/
dataserver.go
LISTEN ADDRESS=10.29.2.1:12345 go run apiserver/apiserver.go
LISTEN ADDRESS=10.29.2.2:12345 go run apiserver/apiserver.go
```

接下来我们用curl命令作为客户端来访问服务节点10.29.2.2：12345，PUT一个名为test3的对象。


```bash
➜  goDistributed-Object-storage git:(main) ✗ curl -v 10.29.2.2:12345/objects/test3 -XPUT -d"this is object test3"
*   Trying 10.29.2.2:12345...
* Connected to 10.29.2.2 (10.29.2.2) port 12345
> PUT /objects/test3 HTTP/1.1
> Host: 10.29.2.2:12345
> User-Agent: curl/8.4.0
> Accept: */*
> Content-Length: 20
> Content-Type: application/x-www-form-urlencoded
> 
< HTTP/1.1 400 Bad Request
< Date: Thu, 29 Feb 2024 07:47:21 GMT
< Content-Length: 0
< 
* Connection #0 to host 10.29.2.2 left intact
```

这里出现400错误是因为我们没有提供对象的散列值。我们可以用openssl命令轻松计算出这个对象的散列值。

```bash
echo -n "this is object test3" | openssl dgst -sha256 -binary | openssl enc -base64
➜  tools git:(main) ✗ echo -n "this is object test3" | openssl dgst -sha256 -binary | openssl enc -base64
GYqqAdFPt+CScnUDc0/Gcu3kwcWmOADKNYpiZtdbgsM=
```

现在我们把散列值加入PUT请求的Digest头部。

```bash
➜  curl -v 10.29.2.2:12345/objects/test3 -XPUT -d"this is object test3" -H "Digest:SHA-256=GYqqAdEPt+CScnUDc0/Gcu3kwcWmOADKNYpiZtdbgsM="
* Trying 10.29.2.2...
* Connected to10.29.2.2(10.29.2.2) port 12345 (#0)
> PUT /objects/test3 HTTP/1.1
> Host: 10.29.2.2:12345
> User-Agent: curl/7.47.0
> Accept: */*
> Digest: SHA-256=GYqqAdFPt+CScnUDc0/Gcu3kwcWmOADKNYpiZtdbgsM=
> Content-Length: 20
> Content-Type:application/x-www-form-urlencoded
>
* upload completely sent off: 20 out of 20 bytes
< HTTP/1.1 200 OK
< Date: Mon,03 Jul 2017 09:41:10 GMT
< Content-Length: 0
< Content-Type: text/plain; charset=utf-8
<
* Connection #0 to host 10.29.2.2 left intact
```

接下来我们往10.29.2.1这个节点PUT一个test3的新版本。
```bash
➜  echo -n "this is object test3 version 2" | openssl dgst -sha256 -binary | base64
cAPvsxZelPR54zIESQy0BaxClpYJIvaHSF3qEOZYYIo=
➜  curl -v 10.29.2.1:12345/objects/test3 -XPUT -d"this is object test3 version 2" -H "Digest: SHA-256=cAPvsxZelPR54zIESQy0BaxClpYJIvaHSF3qEOZYYIo="
* Trying10.29.2.1...
* Connected to 10.29.2.1(10.29.2.1) port 12345 (#0)
> PUT /objects/test3 HTTP/1.1
> Host: 10.29.2.1:12345
> User-Agent: curl/7.47.0
> Accept: */*
> Digest: SHA-256=cAPvsxZelPR54zIESQyOBaxc1pYJIvaHSF3qEOZYYIo=
> Content-Length: 30
> Content-Type: application/x-www-form-urlencoded
>
* upload completely sent off: 30 out of 30 bytes
< HTTP/1.1 200 OK
< Date: Mon, 03 Jul 2017 13:05:48 GMT
< Content-Length: 0
< Content-Type: text/plain; charset=utf-8
<
* Connection #0 to host 10.29.2.1 left intact
```

现在我们一共上传了两个test3对象，其散列值分别是“GYqqAdFPt+-CScnUDc0/Gcu3kwcWmOADKNYpiZtdbgsM="和"cAPvsxZelPR54zIESQy0BaxC1pYJIvaHSF3q
EOZYYIo=”。下面我们用locate命令看看它们分别被保存在哪个存储节点上。

```bash
➜  curl 10.29.2.1:12345/locate/GYqqAdFPt+CScnUDc0%2FGcu3kwcWmOADKNYpiZtdbgsM=
"10.29.1.6:12345"
➜  curl 10.29.2.1:12345/locate/cAPvsxZelPR54zIESQyOBaxClpYJIvaHSF3qEOZYYIO=
"10.29.1.3:12345"
```

注意我们的URL中需要定位的散列值是经过转义的，原因在第1章说过了。

现在让我们查看一下test3对象的版本。

```bash
➜  curl 10.29.2.1:12345/versions/test3
{"Name":"test3","Version":1,"Size"20,"Hash":"GYqqAdFPt+CScnUDc0/Gcu3kwcWmOADKNYpiztdbgsM="}
("Name":"test3","Version":2,"Size":30,"Hash":"cAPvsxZe1PR54ZIESQyOBaxclpYJIvaHSF3qEOZYYIo=")
```

很好，test3对象现在一共有两个版本，让我们用GET方法获取它们。
```bash
curl 10.29.2.1:12345/objects/test3?version=1
this is object test3
curl 10.29.2.1:12345/objects/test3
this is object test3 version 2
```
现在让我们删除test3对象。
```bash
➜  curl -v 10.29.2.1:12345/objects/test3 -XDELETE
*Trying10.29.2.1..·
*Connected to10.29.2.1(10.29.2.1)port12345(#0)
DELETE /objects/test3 HTTP/1.1
>Host:10.29.2.1:12345
User-Agent:curl/7.47.0
Accept:*/
>
<HTTP/1.12000K
<Date:Mon,03Ju1201713:33:33GMT
Content-Length:0
Content-Type:text/plain;charset=utf-8
<
Connection #0 to host 10.29.2.1 left intact

➜  curl -v 10.29.2.1:12345/objects/test3
*Trying10.29.2.1..
*Connected to10.29.2.1(10.29.2.1)port12345(t0)
GET /objects/test3 HTTP/1.1
>Host:10.29.2,1:12345
User-Agent:cur1/7.47.0
Accept:*/
小
HTTP/1.1 404 Not Found
<Date:Mon,03Ju1201713:33:48GMr
Content-Length:0
Content-Type:text/plain;charset=utf-8
Connection #0 to host 10.29.2.1 left intact
```

对象被删除后，我们的GET请求返回404 Not Found。.此时再次查看test3的版本。

```bash
curl 10.29.2.1:12345/versions/test3
{"Name":"test3","Version":1,"Size":20,"Hash":"GYqgAdFPt+CScnUDc0/Gcu3kwcWmOADKNYpiZtdbgsM="}
{"Name""test3","Version":2,"Size"30,"Hash":"cAPvsxZe1PR54ZIESQy0BaxclpYJIvaHSF3qEOZYYIo="}
{"Name":"test3","Version":3,"Size"0,"Hash":""}
```
我们可以发现虽然从接口服务看tst3对象已经不存在，但是在元数据服务中现在有3个版本，最新的那个版本的Size为0，Hash为空字符串。

而且我们依然可以指定版本号获取test3的旧版本。
```bash
➜  curl 10.29.2.1:12345/objects/test3?version=1
this is object test3
➜  curl 10.29.2.1:12345/objects/test3?version=2
this is object test3 version 2
```






### 小结

我们在本章加入了对象存储服务的最后一块主要拼图：元数据服务。有了元数据服务，我们可以在不实际删除数据的情况下实现对象的删除功能：我们可以实现对象的版本控制：我们还确保了对象数据的一致性和GET方法的幂等性。这些都是因为元数据服务可以保存对象的元数据。

本章的接口服务会要求客户端提供对象的散列值作为其全局唯一的标识符，也就是数据服务存储的对象名，但是我们没有对这个散列值进行校验，用户提供的对象散列值和数据有可能是不一致的，产生不一致的原因有很多，我们会在下一章详细介绍，并把数据校验加入我们的服务。

在第2章，我们简单介绍过对象存储服务中一个极其重要的概念：去重。但是由于当时设计的限制，我们无法实现去重。现在有了本章的元数据服务，去重的前期准备工作已就绪，我们会在下一章着手实现它。






## 数据检验和去重

我们在上一章给对象存储系统添加了一个重要的组件：元数据服务。有了元数据服务，我们就可以将对象的散列值作为数据服务层对象的名字进行引用。我们将在本章介绍和实现对客户端提供的散列值进行数据校验的原因和方法，并实现对象存储的去重功能。同时，本章还会对数据服务的对象定位性能进行优化。

### 何为去重

去重是一种消除重复数据多余副本的数据压缩技术。对于一个对象存储系统来说，通常都会有来自不同（或相同）用户的大量重复数据。如果没有去重，每一份重复的数据都会占据我们的存储空间。去重能够让重复数据在系统中只保留一个实体，是一个极好的节省存储空间、提升存储利用率的技术。

一个很常见的去重的例子是邮件的转发。假设某个邮件内含一个大小为1MB的附件，如果该邮件被转发了100次，那么邮件服务器上就保存了100个一模一样的附件，总共占用100MB的空间。每次管理员对该邮件服务器进行云备份，都会上传100个一模一样的附件对象到对象存储系统。如果这个对象存储系统使用了数据去重技术，那么无论这个管理员备份多少次，在对象存储系统中，这个附件所代表的对象就只有一份。

本书实现的去重基于对象的全局唯一标识符，也就是通过对该对象的散列值进行单例检查(Single Instance Storage,SIS)来实现。具体来说，每次当接口服务节点接收到对象的PUT请求之后，我们都会进行一次定位，如果PUT对象的散列值已经存在于数据服务中，我们就会跳过之后的数据服务PUT请求，直接生成该对象的新版本插入元数据服务：如果PUT对象的散列值不存在于数据服务中，说明这是一个全新的对象。接口服务会读取PUT请求的正文，写入数据服务。

但是在实现去重之前，我们还有一个步骤要做，就是数据校验。

### 需要数据校验的原因

一般来说，客户端上传的数据不一致可能由以下几种情况导致。
- 客户端是一个恶意客户端，故意上传不一致的数据给服务器。
- 客户端有bug,计算出来的数据是错误的。
- 客户端计算的数据正确，但是传输过程中发生了错误。

对象存储是一个服务，如果我们全盘接收来自客户端的数据，而不对这个散列值进行校验，那么恶意客户端就可以通过随意编造散列值的方式上传大量内容和散列值不符的对象来污染我们的数据；且即使是善意的客户端也难免因为软件错误或上传的数据损坏而导致对象数据和散列值不符。如果我们不对数据进行校验，允许错误的对象数据被保存在系统中，那么当另一个用户上传的数据的散列值恰好跟错误数据的相同时，就会因为SS检查而导致其数据并没有被真正上传。然后当这个用户需要下载自己的对象时，下载到的就会是那个错误的数据。

为了防止这种情况发生，我们必须进行数据校验，验证客户端提供的散列值和我们自己根据对象数据计算出来的散列值是否一致。有了数据校验，我们才能确保数据服务中保存的对象数据和散列值一致，然后放心对后续上传的对象根据散列值进行去重。

那么现在问题来了：一直以来我们都是以数据流的形式处理来自客户端的请求，接口服务调用io.Copy从对象PUT请求的正文中直接读取对象数据并写入数据服务。这是因为客户端上传的对象大小可能超出接口服务节点的内存，我们不能把整个对象读入内存后再进行处理。而现在我们必须等整个对象都上传完以后才能算出散列值，然后才能决定是否要存进数据服务。这就形成了一个悖论：在客户端的对象完全上传完毕之前，我们不知道要不要把这个对象写入数据服务：但是等客户端的对象上传完毕之后再开始写入我们又做不到，因为对象可能太大，内存里根本放不下。

有些读者看到这里，心里可能会想：要解决这个悖论太容易了，只需要在数据服务节点进行数据校验，将校验一致的对象保留，不一致的删除不就可以了吗？这样的设计在本章是没问题的。在数据服务节点上进行数据校验的前提是数据服务节点上的数据和用户上传的数据完全相同，本章的设计满足这个前提。但是我们在本书的后续章节中会看到，随着对象存储系统的不断完善，最终我们保存在数据服务节点上的对象数据和用户上传的对象数据可能截然不同。那时，我们就无法在数据服务节点上进行数据校验。数据校验这一步骤必须在接口服务节点完成。

### 实现数据校验的方法

为了真正解决上述矛盾，我们需要在数据服务上提供对象的缓存功能，接口服务不需要将用户上传的对象缓存在自身节点的内存里，而是传输到某个数据服务节点的一个临时对象里，并在传输数据的同时计算其散列值。当整个数据传输完毕以后，散列值计算也同步完成，如果一致，接口节点需要将临时对象转成正式对象；如果不一致，则将临时对象删除。

### 给数据服务加入缓存功能

本章接口服务的功能没有发生变化，数据服务删除了objects接口的PUT方法并新增了temp接口的POST、PATCH、PUT、DELETE4种方法作为替代。

- 数据服务的RESP接口

```text
POST /temp/<hash>
请求头部
- Size:<需要缓存的对象的大小>
响应正文
- uuid
```
接口服务以POST方法访问数据服务temp接口，在URL的`<hash>`部分指定对象散列值，并提供一个名为siz的HTTP请求头部，用于指定对象的大小。这会在数据服务节点上创建一个临时对象。该接口返回一个随机生成的uuid(见其官方网站)用以标识这个临时对象，后续操作通过uuid进行。

```text
PATCH /temp/<uuid>
请求正文
- 对象的内容
接口服务以PATCH方法访问数据服务节点上的临时对象，HTTP请求的正文会被写入该临时对象。
- PUT /temp/<uuid>
接口服务数据校验一致，调用PUT方法将该临时文件转正。
DELETE /temp/<uuid>
接口服务数据校验不一致，调用DELETE方法将该临时文件删除。
```

### 对象PUT流程

<img width="754" alt="加入数据校验的对象PUT流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/02254045-a4c6-4c60-81da-bf056d9ad810">

客户端在PUT对象时需要提供对象的散列值和大小。接口服务首先在数据服务层定位散列值，如果已经存在，则直接添加元数据：如果不存在，则用POST方法访问数据服务节点的temp接口，提供对象的散列值和大小。数据服务节点返回一个uuid。然后接口服务用PATCH方法将客户端的数据上传给数据服务，同时计算数据的散列值。客户端数据上传完毕后核对计算出的散列值和客户端提供的散列值是否一致，如果一致则用PUT方法将临时对象转正；否则用DELETE方法删除临时对象。临时对象的内容首先被保存在数据服务本地磁盘的`$STORAGE_ROOT/temp/uuid>.dat`文件，转
正后会被重命名为`$STORAGE_ROOT/objects/<hash>`文件。

本章对象GET流程相比上一章没有发生很大的变化。

### GO语言实现接口服务的变化

```go 
// object.put 相关函数
// apiServer/object/put.go
func put(w http.ResponseWriter, r *http.Request) {
	// 计算哈希
	hash := utils.GetHashFromHeader(r.Header)
	if hash == "" {
		log.Println("missing object hash in digest header")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// 从请求中获取对象的信息
	size := utils.GetSizeFromHeader(r.Header)
	c, e := storeObject(r.Body, hash, size)
	if e != nil {
		log.Println(e)
		w.WriteHeader(c)
		return
	}
	if c != http.StatusOK {
		w.WriteHeader(c)
		return
	}

	// 添加元数据
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	e = es.AddVersion(name, hash, size)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
	}
}

// apiServer/object/store.go
func storeObject(r io.Reader, hash string, size int64) (int, error) {
	// 本地存在返回http.StatusOK,
	if locate.Exist(url.PathEscape(hash)) {
		return http.StatusOK, nil
	}

	// 本地不存在，上传到数据服务
	stream, e := putStream(url.PathEscape(hash), size)
	if e != nil {
		return http.StatusInternalServerError, e
	}

    // 上传到数据服务
	reader := io.TeeReader(r, stream)
	// 计算哈希值
	d := utils.CalculateHash(reader)
	// 比较哈希值
	if d != hash {
		// 哈希值不一致，删除临时对象
		stream.Commit(false)
		return http.StatusBadRequest, fmt.Errorf("object hash mismatch, calculated=%s, requested=%s", d, hash)
	}
	// 哈希值一致，转正
	stream.Commit(true)
	return http.StatusOK, nil
}

// src/lib/utils.go
func CalculateHash(r io.Reader) string {
	h := sha256.New()
	io.Copy(h, r)
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// apiServer/objects/put_stream.go
func putStream(hash string, size int64) (*objectstream.TempPutStream, error) {
	// 选择一个数据服务
	server := heartbeat.ChooseRandomDataServer()
	if server == "" {
		return nil, fmt.Errorf("cannot find any dataServer")
	}

    // 上传到数据服务临时磁盘
	return objectstream.NewTempPutStream(server, hash, size)
}
```  

跟第3章的实现相比，put函数唯一的区别在于storeObject多了一个size参数。这是因为我们新的PUT流程需要在一开始就确定临时对象的大小。

storeObject函数首先调用locate.Exist定位对象的散列值，如果已经存在，则跳过后续上传操作直接返回200OK;否则调用putStream生成对象的写入流stream用于写入。注意，这里进行定位的散列值和之后作为参数调用putStream的散列值都经过`url.PathEscape`的处理，原因在之前的章节已经讲过，是为了确保这个散列值可以被放在URL中使用。

io.TeeReader的功能类似Unix的tee命令，它有两个输入参数，分别是作为`io.Reader`的`r`和作为`io.Writer`的`stream`,它返回的reader也是一个`io.Reader`。当reader被读取时，其实际的内容读取自`r`,同时会写入stream。我们用`utils.CalculateHash`从`reader`中读取数据的同时也写入了`stream`。

`utils.CalculateHash`函数调用`sha256.New`生成的变量`h`,类型是`sha256.digest`结构体，实现的接口则是`hash.Hash`。`io.Copy`从参数`r`中读取数据并写入`h`,`h`会对写入的数据计算其散列值，这个散列值可以通过`h.Sum`方法读取。我们从`h.Sum`读取到的散列值是一个二进制的数据，还需要用`base64.StdEncoding.EncodeToString`函数进行Base64编码，然后跟对象的散列值hash进行比较，如果不一致，则调用`stream.Commit(false)`删除临时对象，并返回`400 Bad Request`;如果一致，则调用`stream.Commit(true)`将临时对象转正并返回200OK。


putStream唯一的变化在于：第2章的putStream调用objectstream.NewPutStream生成一个对象的写入流，而本章的putStream调用的则是objectstream.NewTempPutStream,这是因为数据服务的temp接口代替了原先的对象PUT接口。TempPutStream相关代码见例4-2。

```go
// objectstream.NewTempPutStream相关代码
// src/lib/objectstream/temp.go

type TempPutStream struct {
	Server string
	Uuid   string
}

func NewTempPutStream(server, object string, size int64) (*TempPutStream, error) {
	request, e := http.NewRequest("POST", "http://"+server+"/temp/"+object, nil)
	if e != nil {
		return nil, e
	}
	request.Header.Set("size", fmt.Sprintf("%d", size))
	client := http.Client{}
	response, e := client.Do(request)
	if e != nil {
		return nil, e
	}
	uuid, e := ioutil.ReadAll(response.Body)
	if e != nil {
		return nil, e
	}
	return &TempPutStream{server, string(uuid)}, nil
}

func (w *TempPutStream) Write(p []byte) (n int, err error) {
	request, e := http.NewRequest("PATCH", "http://"+w.Server+"/temp/"+w.Uuid, strings.NewReader(string(p)))
	if e != nil {
		return 0, e
	}
	client := http.Client{}
	r, e := client.Do(request)
	if e != nil {
		return 0, e
	}
	if r.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("dataServer return http code %d", r.StatusCode)
	}
	return len(p), nil
}

func (w *TempPutStream) Commit(good bool) {
	method := "DELETE"
	if good {
		method = "PUT"
	}
	request, _ := http.NewRequest(method, "http://"+w.Server+"/temp/"+w.Uuid, nil)
	client := http.Client{}
	client.Do(request)
}
```

TempPutStream结构体包含Server和Uuid字符串。NewTempPutStream函数的输入参数分别是server,hash和size。server参数表明了数据服务的节点地址，hash和siz分别是对象的散列值和大小。我们根据这些信息以POST方法访问数据服务的temp接口从而获得uuid,并将server和uuid保存在TempPutStream结构体的相应属性中返回。

TempPutStream.Write方法根据Server和Uuid属性的值，以PATCH方法访问数据服务的temp接口，将需要写入的数据上传。

TempPutStream.Commit方法根据输入参数good决定用PUT还是DELETE方法访问数据服务的temp接口。

接口服务的变化就是这些，接下来我们来看看数据服务的实现。


### Go语言实现数据服务的变化

数据服务的main函数

```diff
func main() {
+	locate.CollectObjects()
	go heartbeat.StartHeartbeat()
	go locate.StartLocate()
	http.HandleFunc("/objects/", objects.Handler)
+	http.HandleFunc("/temp/", temp.Handler)
	log.Fatal(http.ListenAndServe(os.Getenv("LISTEN_ADDRESS"), nil))
}
```

和第2章相比我们的main函数多了一个locate.CollectObjects的函数调用并引入temp.Handler处理函数的注册。

数据服务的locate包是用来对节点本地磁盘上的对象进行定位的。在第2章，我们的定位通过调用os.Stat检查对象文件是否存在来实现。这样的实现意味着每次定位请求都会导致一次磁盘访问。这会对整个系统带来很大的负担。别忘了我们不止在PUT去重的时候需要进行一次定位，GET的时候也一样要做，可以说定位是对象存储系统最频繁的操作。

为了减少对磁盘访问的次数，从而提高磁盘的性能，本章的数据服务定位功能仅在程序启动的时候扫描一遍本地磁盘，并将磁盘中所有的对象散列值读入内存，之后在定位的时候就不需要再次访问磁盘，只需要搜索内存就可以了。

```go
// 数据服务的locate包
// dataServer/locate/locate.go

// 缓存所有对象
var objects = make(map[string]int)
// 保护对objects的读写操作
var mutex sync.Mutex

func Locate(hash string) bool {
	mutex.Lock()
	_, ok := objects[hash]
	mutex.Unlock()
	return ok
}

func Add(hash string) {
	mutex.Lock()
	objects[hash] = 1
	mutex.Unlock()
}

func Del(hash string) {
	mutex.Lock()
	delete(objects, hash)
	mutex.Unlock()
}

func StartLocate() {
	q := rabbitmq.New(os.Getenv("RABBITMQ_SERVER"))
	defer q.Close()
	q.Bind("dataServers")
	c := q.Consume()
	// 将RabbitMQ消息队列里收到的对象散列值作为Locate参数
	for msg := range c {
		hash, e := strconv.Unquote(string(msg.Body))
		if e != nil {
			panic(e)
		}
		exist := Locate(hash)
		if exist {
			q.Send(msg.ReplyTo, os.Getenv("LISTEN_ADDRESS"))
		}
	}
}

func CollectObjects() {
	files, _ := filepath.Glob(os.Getenv("STORAGE_ROOT") + "/objects/*")
	for i := range files {
		hash := filepath.Base(files[i])
		objects[hash] = 1
	}
}
```

例4-4显示了数据服务的locate包的实现，函数中的包变量objects是一个以字符串为键，整型为值的map,它用于缓存所有对象。mutex互斥锁用于保护对objects的读写操作。Locate函数利用Go语言的map操作判断某个散列值是否存在于objects中，如果存在返回true,否则返回false。

Add函数用于将一个散列值加入缓存，其输入参数hash作为存入map的键，值为1。

Del函数则相反，用于将一个散列值移出缓存。

StartLocate函数大半部分和第2章一样，第2章的StartLocate函数需要拼出完整的文件名作为Locate的参数，本章则直接将RabbitMQ消息队列里收到的对象散列值作为Locate参数。

CollectObjects函数首先调用`filepath.Glob`读取`STORAGE_ROOT/objects/`目录里的所有文件，对这些文件一一调用`filepath.Base`获取其基本文件名，也就是对象的散列
值，将它们加入`objects`缓存。

- 数据服务的temp包

```go
// 数据服务的temp包

// dataServer/temp/handler.go
func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m == http.MethodPut {
		put(w, r)
		return
	}
	if m == http.MethodPatch {
		patch(w, r)
		return
	}
	if m == http.MethodPost {
		post(w, r)
		return
	}
	if m == http.MethodDelete {
		del(w, r)
		return
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
}
```

Handler函数针对访问temp接口的HTTP方法分别调用相应的处理函数put、patch、post和del。

P0ST方法的相关函数见例4-6。

```go
// dataServer/temp/post.go

// 临时对象
type tempInfo struct {
	Uuid string
	Name string
	Size int64
}

// 在本地磁盘记录对象的元数据并且创建一个保存对象内容的临时文件
// 并通过HTTP响应返回uuid给接口服务
func post(w http.ResponseWriter, r *http.Request) {
	output, _ := exec.Command("uuidgen").Output()
	uuid := strings.TrimSuffix(string(output), "\n")
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	size, e := strconv.ParseInt(r.Header.Get("size"), 0, 64)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	t := tempInfo{uuid, name, size}
	e = t.writeToFile()
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	os.Create(os.Getenv("STORAGE_ROOT") + "/temp/" + t.Uuid + ".dat")
	w.Write([]byte(uuid))
}

func (t *tempInfo) writeToFile() error {
	f, e := os.Create(os.Getenv("STORAGE_ROOT") + "/temp/" + t.Uuid)
	if e != nil {
		return e
	}
	defer f.Close()
	b, _ := json.Marshal(t)
	f.Write(b)
	return nil
}
```

结构体tempInfo用于记录临时对象的uuid、名字和大小。post函数用于处理HTTP请求，它会生成一个随机的uuid,从请求的URL获取对象的名字，也是散列值。从Size头部读取对象的大小，然后拼成一个tempInfo结构体，调用tempInfo的writeToFile方法将该结构体的内容写入磁盘上的文件。然后它还会在`$STORAGE_ROOT/temp/`目录里创建一个名为`<uuid>.dat`的文件(`<uuid>`心为实际生成的uuid的值)，用于保存该临时对象的内容，最后将该uuid通过HTTP响应返回给接口服务。

tempInfo的writeToFile方法会在`$STORAGE_ROOT/temp/`目录里创建一个名为`<uuid>`的文件，并将自身的内容经过JSON编码后写入该文件。注意，这个文件是用于保存临时对象信息的，跟用于保存对象内容的`<uuid>.dat`是不同的两个文件。

接口服务在调用了POST方法之后会从数据服务获得一个uuid,这意味着数据服务已经为这个临时对象做好了准备。之后接口服务还需要继续调用PATCH方法将数据上传，PATCH方法相关函数见例4-7。

```go
// temp包的patch函数

func patch(w http.ResponseWriter, r *http.Request) {
	uuid := strings.Split(r.URL.EscapedPath(), "/")[2]
	tempinfo, e := readFromFile(uuid)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	infoFile := os.Getenv("STORAGE_ROOT") + "/temp/" + uuid
	datFile := infoFile + ".dat"
	f, e := os.OpenFile(datFile, os.O_WRONLY|os.O_APPEND, 0)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer f.Close()
	_, e = io.Copy(f, r.Body)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	info, e := f.Stat()
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	actual := info.Size()
	if actual > tempinfo.Size {
		os.Remove(datFile)
		os.Remove(infoFile)
		log.Println("actual size", actual, "exceeds", tempinfo.Size)
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func readFromFile(uuid string) (*tempInfo, error) {
	f, e := os.Open(os.Getenv("STORAGE_ROOT") + "/temp/" + uuid)
	if e != nil {
		return nil, e
	}
	defer f.Close()
	b, _ := ioutil.ReadAll(f)
	var info tempInfo
	json.Unmarshal(b, &info)
	return &info, nil
}
```

patch函数首先获取请求URL的`<uuid>`部分，然后从相关信息文件中读取tempInfo结构体，如果找不到相关的信息文件，我们就返回`4O4 Not Found`;如果相关信息文件存在，则用`os.OpenFile`打开临时对象的数据文件，并用`io.Copy`将请求的正文写入数据文件。写完后调用`f.Stat`方法获取数据文件的信息info,用`info.Size`获取数据文件当前的大小，如果超出
了tempInfo中记录的大小，我们就删除信息文件和数据文件并返回`500 Internal Server Error`。

`readFromFile`函数的输入参数是uuid,它用`os.Open`打开`$STORAGE_ROOT/temp/<uuid>`文件，读取其全部内容并经过JSON解码成一个tempInfo结构体返回。

接口服务调用PATCH方法将整个临时对象上传完毕后，自己也已经完成了数据校验的工作，根据数据校验的结果决定是调用PUT方法将临时文件转正还是调
DELETE方法删除临时文件，PUT方法相关函数见例4-8。

```go
// temp包的put函数
func put(w http.ResponseWriter, r *http.Request) {
	uuid := strings.Split(r.URL.EscapedPath(), "/")[2]
	tempinfo, e := readFromFile(uuid)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	infoFile := os.Getenv("STORAGE_ROOT") + "/temp/" + uuid
	datFile := infoFile + ".dat"
	f, e := os.Open(datFile)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer f.Close()
	info, e := f.Stat()
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	actual := info.Size()
	os.Remove(infoFile)
	if actual != tempinfo.Size {
		os.Remove(datFile)
		log.Println("actual size mismatch, expect", tempinfo.Size, "actual", actual)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	commitTempObject(datFile, tempinfo)
}

func commitTempObject(datFile string, tempinfo *tempInfo) {
	os.Rename(datFile, os.Getenv("STORAGE_ROOT")+"/objects/"+tempinfo.Name)
	locate.Add(tempinfo.Name)
}
```

和patch函数类似，put函数一开始也是获取uuid,打开信息文件读取tempInfo结构体，打开数据文件读取临时对象大小并进行比较，如果大小一致，则调用commitTempObject将临时对象转正。

commitTempObject函数会调用os.Rename将临时对象的数据文件改名为`$STORAGE_ROOT/objects/<hash>`。`<hash>`是对象的名字，也是散列值。之后还会调用`locate.Add`
将`<hash>`加入数据服务的对象定位缓存。

DELETE方法相关函数见例4-9。

```go
// temp包的del函数
func del(w http.ResponseWriter, r *http.Request) {
	uuid := strings.Split(r.URL.EscapedPath(), "/")[2]
	infoFile := os.Getenv("STORAGE_ROOT") + "/temp/" + uuid
	datFile := infoFile + ".dat"
	os.Remove(infoFile)
	os.Remove(datFile)
}
```

DELETE方法相关函数只有temp.del,它读取uuid,并删除相应的信息文件和数据文件。

数据服务的objects包

数据服务除了新增temp包用于处理temp接口的请求以外，原来的objects包也需要进行改动，第一个改动的地方是删除objects接口的PUT方法，见例4-10。

```go
// object.Handler函数
package objects

import "net/http"

func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m == http.MethodGet {
		get(w, r)
		return
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
}
```

跟第2章的数据服务相比，本章的objects.Handler去除了处理PUT方法的put函数。这是因为现在数据服务的对象上传完全依靠temp接口的临时对象转正，所以不再需要objects接口的PUT方法。

第二个改动则是在读取对象时进行一次数据校验，见例4-11。

```go
// object.get函数
func get(w http.ResponseWriter, r *http.Request) {
	file := getFile(strings.Split(r.URL.EscapedPath(), "/")[2])
	if file == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	sendFile(w, file)
}

func getFile(hash string) string {
	file := os.Getenv("STORAGE_ROOT") + "/objects/" + hash
	f, _ := os.Open(file)
	d := url.PathEscape(utils.CalculateHash(f))
	f.Close()
	if d != hash {
		log.Println("object hash mismatch, remove", file)
		locate.Del(hash)
		os.Remove(file)
		return ""
	}
	return file
}


func sendFile(w io.Writer, file string) {
	f, _ := os.Open(file)
	defer f.Close()
	io.Copy(w, f)
}
```

get函数首先从URL中获取对象的散列值，然后以散列值为参数调用getFile获得对象的文件名fle,如果fle为空字符串则返回404 Not Found;否则调用sendFile将该对象文件的内容输出到HTTP响应。

getFile函数的输入参数是对象的散列值`<hash>`,它根据这个参数找到`$STORAGE_ROOT/objects/<hash>`对象文件，然后对这个对象的内容计算`SHA-256`散列值，并用`url.PathEscape`转义，最后得到的就是可用于URL的散列值字符串。我们将该字符串和对象的散列值进行比较，如果不一致则打印错误日志，并从缓存和磁盘上删除对象，返回空字符串；如果一致则返回对象的文件名。

sendfile有两个输入参数，分别是用于写入对象数据的w和对象的文件名file。调用os.open打开对象文件，并用io.copy将文件的内容写入w。

有读者可能要质疑这里的数据校验没有必要，因为在对象上传的时候已经在接口服务进行过数据校验了。事实上这里的数据校验是用于防止存储系统的数据降解，哪怕在上传时正确的数据也有可能随着时间的流逝而逐渐发生损坏，我们会在下一章介绍数据降解的成因。

对数据安全有要求的读者可能会进一步要求在临时文件转正时进行一次数据校验，以此来确保从接口服务传输过来的数据没有发生损坏。然而这一步骤仅在本章可行。我们在本章开头也讲过，随着我们的系统功能不断完善，最终保存在数据服务节点上的对象数据和用户的对象数据可能截然不同，我们无法根据用户对象的散列值校验数据服务节点上的对象数据。

### 功能测试

开始测试前记得先创建`$STORAGE_ROOT/temp/`目录。
```bash
for i in 'seq 1 6';do mkdir -p /tmp/si/temp;done
```

我们用cul命令作为客户端来访问服务节点10.29.2.1：12345，连续PUT多个名字不同而内容相同的对象。

```bash
➜  echo -n "this object will have only 1 instance" ｜ openssl dgst -sha256 -binary ｜ base64
aWKQ2BipX94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY=
➜  curl -v 10.29.2.1:12345/objects/test4_1 -XPUT -d "this object will have only 1 instance"-H "Digest:SHA-256=aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY="
Hostname was NOT found in DNS cache
* Trying 10.29.2.1...
* Connected to 10.29.2.1 (10.29.2.1) port 12345 (#0)
> PUT /objects/test4_1 HTTP/1.1
> User-Agent: curl/7.38.0
> Host: 10.29.2.1:12345
> Accept: */*
> Digest: SHA-256=aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY=
> Content-Length:37
> Content-Type:application/x-www-form-urlencoded
>
* upload completely sent off:37 out of 37 bytes
< HTTP/1.1 200 OK
< Date:Thu,03 Aug 2017 16:35:46 GMT
< Content-Length:0
< Content-Type:text/plain;charset=utf-8
<
* Connection #0 to host 10.29.2.1 left intact

➜  curl -v 10.29.2.1:12345/objects/test4 2 -XPUT -d "this object will have only 1 instance"-H "Digest:SHA-256=aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY="
* Hostname was NOT found in DNS cache
* Trying 10.29.2.1...
* Connected to 10.29.2.1 (10.29.2.1) port 12345 (#0)
> PUT /objects/test4_ 2 HTTP/1.1
> User-Agent:cur1/7.38.0
> Host:10.29.2.1:12345
> Accept:*/*
> Digest:SHA-256=aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY=
> Content-Length:37
> Content-Type:application/x-www-form-urlencoded
>
* upload completely sent off:37 out of 37 bytes
< HTTP/1.1 200 OK
< Date:Thu,03 Aug 2017 16:36:19 GMT
< Content-Length:0
< Content-Type:text/plain;charset=utf-8
<
* Connection #0 to host 10.29.2.1 left intact
```

我们可以用定位命令查看该对象被保存在哪个数据服务节点上。

```bash
➜  curl 10.29.2.1:12345/locate/aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY=
"10.29.1.1:12345"
```

我们还可以用ls命令访问各数据服务节点的`$STORAGE_ROOT/objects`目录。
```bash
➜  ls /tmp/?/objects/aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY\=
/tmp/1/objects/aWKQ2Bipx94sb+h3xdTbWYAulyzjn5vyFG2SOwUQIXY=
```

可以看到仅在一个数据服务节点上存在aWKQ2BipX94sb+h3xdTbWYAulyzjn5yFG2SowUQIXY=文件（注意，在我们的测试环境中所有的数据服务节点运行都在同一个服务器上且存储根目录都在/tmp的子目录里，所以可以使用“？”通配符。如果读者自己的测试环境跟我们不同，则需要分别访问相应的数据服务节点的存储根目录)。

尝试GET对象。
```bash
$ curl 10.29.2.1:12345/objects/test41
this object will have only 1 instance
$ curl 10.29.2.1:12345/objects/test42
this object will have only 1 instance
```

两个对象都可以GET。

尝试PUT一个散列值不正确的对象。
```bash
➜  curl -v 10.29.2.1:12345/objects/test4 1 -XPUT -d "this object will have only 1 instance" -H "Digest:SHA-256=incorrecthash"
* Hostname was NOT found in DNS cache
* Trying 10.29.2.1...
* Connected to10.29.2.1(10.29.2.1)port12345(#0)
> PUT /objects/test4 1 HTTP/1.1
> User-Agent:curl/7.38.0
> Host:10.29.2.1:12345
> Accept:*/*
> Digest:SHA-256=incorrecthash
> Content-Length:37
> Content-Type:application/x-www-form-urlencoded
>
* upload completely sent off:37 out of 37 bytes
< HTTP/1.1 400 Bad Request
< Date:Thu,03 Aug 2017 16:40:06 GMT
< Content-Length:0
< Content-Type:text/plain;charset-utf-8
< Connection 0 to host 10.29.2.1 left intact
```
收到预期的400 Bad Request。

### 去重导致的性能问题

有实际动手兴趣的读者在功能测试的时候应该已经发现了，我们的系统在第一次PUT对象时等待了约1s。这是我们locate定位的超时时间。为了去重，每一个新对象上传时都不得不等待这个时间以确保数据服务中不存在散列值相等的对象。实际使用中大多数情况下上传的都是内容不同的新对象，这是一个很严重的性能问题。减少定位的超时时间可以减少用户的等待时间，但这并不算是从根本上解决了问题，且超时时间设置过短也会提升 SIS 检查的失败概率（比如某个对象其实存在于数据服务中但没能及时返回定位消息），这么做得不偿失。

有一个看上去可行的解决方案是免除小对象的去重：对于大对象，其上传的时间本来就比较长，比如1个10MB的对象在20 Mbit/s上行带宽的连接上需要4s的传输时间，1s的定位超时只是25%的额外时间，看上去这个并不特别突出。而一个10KB的对象上传只需要0.004s,25000%的额外等待就显得无法忍受了。如果我们免除小对象的去重，看上去性能会好很多，小对象本身占用的空间也不大，不去重似乎也可以接受。

真的是这样吗？

很可惜这样是不行的，原因有两点：首先，对小对象不去重会导致它们在对象存储系统的每一个数据服务节点上都存在一个备份，这就会占用大量的磁盘资源。更重要的原因在于，一旦接口服务定位一个这样的小对象，所有的数据服务节点都会响应，然后每一个节点都会反馈一个消息以通知该对象的存在。渐渐的消息队列会塞满反馈消息。而如果有用户在同一时间下载大量小对象（比如用户从云端恢复客户机的操作系统），那就成了系统的灾难，要知道，真正的生产环境可不会像实验室这样只有寥寥几台数据服务节点，而是可能有成千上万的数据节点。

很遗憾，这个性能问题单靠对象存储服务端是无法解决的。一个有效的解决方案是优化客户端的行为。如果客户端能将多个小对象尽量打包成一个大对象上传而不是分别上传，那么1s的等待时间就可以忽略。而且，当客户端下载小对象时，就需要下载含有该小对象的大对象，然后从中取出小对象。这样看上去有些烦琐，但是在需要一次性恢复大量小对象时非常有利，因为无须为每个小对象而频繁访问对象存储服务。
### 小结

本章优化了数据服务的定位性能，通过在程序启动时扫描磁盘，一次性将全部对象缓存起来，从而避免了每次定位时的磁盘访问。这样做的好处是减免了磁盘访问的次数，从而提升磁盘的io效率，但是缺点是会占用大量的内存且拖慢节点启动速度。假设一个对象存储系统的对象平均大小为100KB,如果数据节点使用的磁盘大小是2TB,那么一共能存放大约20兆个对象。而我们一个SHA-256散列值经过Base64编码后长度是44B,缓存20兆个对象总共需要占用880MB内存（如果我们使用未经Base64编码的二进制的散列值，则是32B,依然需要占用640MB内存）。而节点启动时需要扫描整个磁盘，一次性将所有的对象导入缓存，耗时也需要数分钟至数十分钟不等。

我们在本章的接口服务上实现了用户对象散列值和内容的校验，为了实现这样的数据校验，我们将用户上传的对象作为临时对象缓存在数据服务节点上。如果接口服务的数据校验成功，这些临时对象会被重命名成正式对象保存；如果接口服务的数据校验失败，这些临时对象则会被删除。然而需要当心的是，删除操作并不一定每次都会成功，接口服务崩溃或网络错误都有可能导致漏做删除操作。因此我们需要定期检查并删除这些临时对象，一个检查`$STORAGE_ROOT/temp/`目录下所有临时对象文件创建时间的cro工作就足以完成这样的清理。本书没有实现这样的一个清理工具，有
兴趣的读者可以自行实现。

本章以SIS（安全仪表系统）检查的方式实现了对象去重，确保一个对象在系统中只有一份实体。这对于节省磁盘空间来说很有用，但是对于保护用户数据来说却很危险。因为一旦这唯一的存储实体损坏或丢失，用户的数据就丢失了。在计算机存储领域，我们通过数据冗余来解决这个问题。我们会在下一章详细介绍并实现这一重要的技术。




## 参考资料

- 项目仓库：https://github.com/stuarthu/go-implement-your-object-storage/
- 