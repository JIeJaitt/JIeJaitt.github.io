---
title: 分布式对象存储原理架构Go实现之数据冗余和即时修复
categories: 项目实战
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: data-redundancy-and-real-time-repair
toc: true
date: 2022-03-06 13:02:09
tags: [Go,分布式,对象存储]
sticky: 
---

我们将要在本章介绍数据冗余的概念和RS纠删码技术，介绍在Go语言下如何利用RS码实现对象存储系统的数据冗余策略，并详细阐述即时修复的实现方式。


## 数据冗余的概念

在上一章，我们花了很大力气实现了去重，现在又要来做冗余，看上去似乎是在开倒车。但实际上这完全是两码事。去重是帮助我们避免同一个对象在系统中到处都被保存一份副本，而冗余是在完全受我们控制的情况下增加这个对象数据的稳定性。在讨论数据的冗余和修复之前，我们首先要理解保存在对象存储系统上的数据在什么情况下会丢失和不可用。


### 数据丢失和数据不可用

数据丢失是指信息在存储，传输或处理的过程中由于错误或遗漏而发生损失。

数据在传输过程中的丢失通常是由于网络不稳定导致的，对数据进行校验可以有效检测出传输过程中发生的数据丢失，然后服务端就可以拒绝接收有损的数据。

数据处理过程中的丢失则可能是由于软件或人为的错误而造成的。对于软件错误，我们需要对其进行修复并重新部署：对于人为错误，我们需要制定严格的操作规范，或者尽量使用脚本来代替人工操作。但无论是软件还是人为错误，已经丢失的数据是无法恢复的。

存储硬件损坏是数据在存储过程中丢失的最常见的原因，可能发生的硬件损坏从某个硬盘出现坏道到整个数据中心受灾等不一而足，使用数据备份以及灾难恢复可以在一定程度上弥补损失，但是这通常都会造成几小时到几天不等的停机时间，而且系统最后一次备份点之后加入的数据也依然是无法恢复的。

服务器的维护可能导致数据暂时的不可用，比如预先安排的服务器重启等。和永久性的数据丢失不同，数据不可用是暂时性的，当服务器重启完成后，数据就会恢复可用的状态。但是在服务器重启过程中如果恰好有用户需要对其上的对象进行访问，那么同样会表现成数据丢失。

除了硬件损坏和服务器维护以外，还有一种大多数人不太了解的数据丢失原因，叫作数据降解。数据降解是由数据存储设备的非关键故障累积导致的数据逐渐损坏，即使在没有发生任何软件错误或硬件损坏的情况下，存储介质上的数据依然有可能随时间的推移而丢失。比如说，固态硬盘会由于存在缺陷的绝缘封装工艺而导致其中保存的电荷慢慢流失：磁盘上保存的比特会随时间的推移而消磁：潮湿温暖的空气会加速磁性材质的降解等。

可以说，单个数据的损坏和丢失是不可避免的。所以为了保护用户的数据，在计算机存储领域，我们依靠数据冗余来对抗数据丢失。数据冗余不仅可以在一定程度上克服数据丢失，而且在发生数据丢失的时候还可以帮助我们对其进行修复。

### 数据冗余

在计算机领域，数据冗余是指在存储和传输的过程中，除了实际需要的数据，还存在一些额外数据用来纠正错误。这些额外的数据可以是一份简单的原始数据的复制，也可以是一些经过精心选择的校验数据，允许我们在一定程度上检测并修复损坏的数据。

比如说，ECC(Error-correcting memory)内存在其每一个存储字中会额外包含存储数据的校验和，可以检测并修正一个比特的错误；RAID 1使用两个硬盘组成单个逻辑存储单元，在任何一个硬盘发生故障的情况下依然可以有效运行；Btrfs和ZFS这样的文件系统通过结合使用校验和以及数据复制这两种方式来检测并修正硬盘上的数据降解等。

在对象存储领域，我们也有很多数据冗余的策略。

### 对象存储系统的数据冗余策略

最显而易见的冗余策略是每个对象都保留两个或更多副本，由接口服务负责将其存储在不同的数据服务节点上。跟去重之前完全无控制的状况不同，多副本冗余是受接口服务控制的有限副本冗余，副本对象的数量有限，而不是散落在每一个数据服务节点上。多副本冗余的概念很简单，实现也很方便，任何一台数据服务节点停机都不会影响数据的可用性，因为在另外一台数据服务节点上还存在一个副本。

多副本冗余的策略胜在实现简单，但是代价也比较高，本书将要介绍和实现的冗余策略比多副本冗余复杂，叫作ReedSolomon纠删码。在编码理论学中，RS纠删码属于非二进制循环码，它的实现基于有限域上的一元多项式，并被广泛应用于CD、DVD、蓝光、QR码等消费品技术，DSL、WiMAX等数据传输技术，DVB、ATSC等广播技术以及卫星通信技术等。

RS纠删码允许我们选择数据片和校验片的数量，本书选择了4个数据片加两个校验片，也就是说会把一个完整的对象平均分成6个分片对象，其中包括4个数据片对象，每个对象的大小是原始对象大小的25%，另外还有两个校验片，其大小和数据片一样。这6个分片对象被接口服务存储在6个不同的数据服务节点上，只需要其中任意4个就可以恢复出完整的对象。

要在对象存储系统中评价一个冗余策略的好坏，主要是衡量该策略对存储空间的要求和其抗数据损坏的能力。对存储空间的要求是指我们采用的冗余策略相比不使用冗余要额外支付的存储空间，以百分比表示；抗数据损坏的能力以允许损坏或丢失的对象数量来衡量。

比如说，在没有任何冗余策略的情况下，我们的对象占用存储空间的大小就是它本身的大小，而一旦该对象损坏，我们就丢失了这个对象，那么它对存储空间的要求是100%，而抵御能力则是0；如果采用双副本冗余策略，当任何一个副本损坏或丢失时，我们都可以通过另外一个副本将其恢复出来。也就是说，这个冗余策略对我们的存储空间要求是200%，抵御数据损坏的能力是1（可以丢失两个副本中的任意1个），而使用4+2的RS码的策略，我们的存储空间要求是150%，抵御能力是2（可以丢失6个分片对象中的任意两个）。总的来说，对于一个M+N的RS码(M个数据片加N个校验片)，其对存储空间的要求是(M+N)/M*100%,抵御能力是N。

可以看到，RS码冗余策略对存储空间的要求更低，而抵御数据损坏的能力却更强。选择RS码还有一个好处，就是它会将一个大对象拆分成多个分片对象分别存储，有助于数据服务层的负载均衡。

使用了RS码冗余策略之后，对象存储系统单个节点的维护就不会导致整个系统的停机。只要我们每次维护的节点数小于N,那么任意对象的分片数依然大于M,对象就可以正确恢复。

## 数据冗余的实现

### REST接口

底层使用的数据冗余策略对上层的接口不产生任何影响。

### 对象PUT流程

本书使用数据冗余策略后的对象PUT流程见图5-1。为了方便起见，这里略过了那些没有发生变化的地方，比如接口服务计算对象散列值以及当散列值不一致时的处理流程。

<img width="636" alt="使用 4+2RS 码冗余策略的对象PUT流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/fa8b9ebd-0862-44b4-a0b5-64b40b8e44ab">

接口服务会将客户端PUT上来的数据流切成4+2的分片，然后向6个数据服务节点上传临时对象`<hash>.X`,同时计算对象散列值。如果散列值一致，6个临时对象会被转成正式的分片对象`<hash>.X`,其内容被保存在`$STORAGE_ROOT/objects/.<hash>.X.<hash of shard X>`文件中。 其中， X的取值范围为`0~5`的整数，表示该分片的id,`0~3`是数据片，4和5则是校验片。`<hash of shard X>`是该分片的散列值，在转正时通过计算临时对象的内容得到。


### 对象GET流程

对象GET的流程见图5-2，和PUT流程一样，这里略过了没有发生变化的地方。

<img width="705" alt="使用 4+2RS 码冗余策略的对象GET流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/5cfabda4-9a05-4143-889c-7d89073f1a91">

接口服务发送针对对象散列值`<hash>`的定位信息，含有该对象分片的数据服务共有6个，它们都会发送反馈的消息。接口服务在收到所有反馈消息后向响应的数据服务分别GET分片对象`<hash>.X`。数据服务读取分片X的内容，并响应接口服务的请求。然后接口服务将数据片0到3的内容组合成对象来响应客户端的请求。

接口服务在进行定位时的超时和之前一样是1s，如果在1s内收到所有6个定位反馈则定位成功：如果在1s超时后收到的定位反馈大于等于4，那么我们依然可以恢复出完整的对象；如果定位反馈小于等于3，则定位失败。

当数据服务的接口收到的请求对象是`<hash>.X`,数据服务需要自己去`$STORAGE_ROOT/objects`目录下寻找`<hash>.X`开头的文件`<hash>X.<hash of shard X>`,然后在返回该文件内容时还需要进行数据校验，确保其内容的散列值和`<hash of shard X>`一致。如果不一致，则需要删除该分片对象并返回`404 Not Found`。这是为了防止该分片对象被上一节介绍过的数据降解破坏。

接口服务可能由于分片定位失败或分片散列值不一致等原因无法获取某个分片的数据。如果失败的分片数小于等于2，接口服务会根据成功获取的分片重塑数据，并将新的分片写入随机的数据服务；如果失败的分片数大于等于3，我们对这样的数据丢失无能为力，只能向客户端返回404 Not Found。

在下一节，我们不仅会介绍使用RS码冗余策略的对象存储系统的具体实现，同时还会实现即时修复功能，让我们能在GET对象的同时进行修复。


## Go语言实现

### 接口服务

为了实现RS码，接口服务的locate、heartbeat和objects包都需要发生变化，首先让我们来看一下接口服务locate包发生的改变。

- 接口服务的locate包

locate包相比第2章发生改变的函数见例5-1,没有发生变化的函数略。

```go
// 接口服务的locate包的变化

func Locate(name string) (locateInfo map[int]string) {
	q := rabbitmq.New(os.Getenv("RABBITMQ_SERVER"))
	q.Publish("dataServers", name)
	c := q.Consume()
	go func() {
		time.Sleep(time.Second)
		q.Close()
	}()
	locateInfo = make(map[int]string)
	for i := 0; i < rs.ALL_SHARDS; i++ {
		msg := <-c
		if len(msg.Body) == 0 {
			return
		}
		var info types.LocateMessage
		json.Unmarshal(msg.Body, &info)
		locateInfo[info.Id] = info.Addr
	}
	return
}

func Exist(name string) bool {
	return len(Locate(name)) >= rs.DATA_SHARDS
}
```

locate包的Handler函数和第2章相比没有发生变化，这里略过。在第2章，我们的Locate函数从接收定位反馈消息的临时消息队列中只获取1条反馈消息，现在我们需要一个for循环来获取最多6条消息，每条消息都包含了拥有某个分片的数据服务节点的地址和分片的id,并被放在输出参数的locateInfo变量中返回。`rs.ALL_SHARDS`是rs包的常数6，代表一共有4+2个分片。locateInfo的类型是以int为键、string为值的map,它的键是分片的id,而值则是含有该分片的数据服务节点地址。1s超时发生时，无论当前收到了多少条反馈消息都会立即返回。

Exist函数判断收到的反馈消息数量是否大于等于4，为true则说明对象存在，否则说明对象不存在（或者说就算存在我们也无法读取）。

- 接口服务的heartbeat包

接口服务的heartbeat包也需要进行改动，将原来的返回一个随机数据服务节点的ChooseRandomDataServer函数改为能够返回多个随机数据服务节点的ChooseRandomData


Servers函数，见例5-2。

```go
// heartbeat.ChooseRandomDataServers函数
func ChooseRandomDataServers(n int, exclude map[int]string) (ds []string) {
	candidates := make([]string, 0)
	reverseExcludeMap := make(map[string]int)
	for id, addr := range exclude {
		reverseExcludeMap[addr] = id
	}
	servers := GetDataServers()
	for i := range servers {
		s := servers[i]
		_, excluded := reverseExcludeMap[s]
		if !excluded {
			candidates = append(candidates, s)
		}
	}
	length := len(candidates)
	if length < n {
		return
	}
	p := rand.Perm(length)
	for i := 0; i < n; i++ {
		ds = append(ds, candidates[p[i]])
	}
	return
}
```

ChooseRandomDataServers函数有两个输入参数，整型n表明我们需要多少个随机数据服务节点，exclude参数的作用是要求返回的随机数据服务节点不能包含哪些节点。这是因为当我们的定位完成后，实际收到的反馈消息有可能不足6个，此时我们需要进行数据修复，根据目前已有的分片将丢失的分片复原出来并再次上传到数据服务，所以我们需要调用ChooseRandomDataServers函数来获取用于上传复原分片的随机数据服务节点。很显然，目前已有的分片所在的数据服务节点需要被排除。

exclude的类型和之前 locate.Locate的输出参数 locateInfo一致，其 map的值是数据服务节点地址。但是当我们实现查找算法时这个数据使用起来并不方便，所以需要进行一下键值转换。转换后的reverseExcludeMap以地址为键，这样我们在后面遍历当前所有数据节点时就可以更容易检查某个数据节点是否需要被排除，不需要被排除的加入candidates数组。如果最后得到的candidates数组长度length小于n,那么我们无法满足要求的n个数据服务节点，返回一个空数组，否则调用rand.Perm将`0`到`length-1`的所有整数乱序排列返回一个数组，取前n个作为candidates数组的下标取数据节点地址返回。

- 接口服务的objects包

和之前一样，我们略过未改变的部分，只示例objects包中需要改变的函数。首先是PUT对象时需要用到的putStream函数。它使用了新的`heartbeat.ChooseRandomDataServers`函数获取随机数据服务节点地址，并调用`rs.NewRSPutStream`来生成一个数据流，见例5-3.

```go
// object.putStream
func putStream(hash string, size int64) (*rs.RSPutStream, error) {
	servers := heartbeat.ChooseRandomDataServers(rs.ALL_SHARDS, nil)
	if len(servers) != rs.ALL_SHARDS {
		return nil, fmt.Errorf("cannot find enough dataServer")
	}

	return rs.NewRSPutStream(servers, hash, size)
}
```

`rs.NewRSPutStream`返回的是一个指向rs.RSPutStream结构体额指针。相关代码见下面：

```go
// 创建rs.RSPutStream的代码
const (
	DATA_SHARDS     = 4
	PARITY_SHARDS   = 2
	ALL_SHARDS      = DATA_SHARDS + PARITY_SHARDS
	BLOCK_PER_SHARD = 8000
	BLOCK_SIZE      = BLOCK_PER_SHARD * DATA_SHARDS
)

type RSPutStream struct {
	*encoder
}

func NewRSPutStream(dataServers []string, hash string, size int64) (*RSPutStream, error) {
	if len(dataServers) != ALL_SHARDS {
		return nil, fmt.Errorf("dataServers number mismatch")
	}

    // 根据size计算出每个分片的大小perShard,也就是size/4再向上取整
	perShard := (size + DATA_SHARDS - 1) / DATA_SHARDS
	writers := make([]io.Writer, ALL_SHARDS)
	var e error
	for i := range writers {
		writers[i], e = objectstream.NewTempPutStream(dataServers[i],
			fmt.Sprintf("%s.%d", hash, i), perShard)
		if e != nil {
			return nil, e
		}
	}
	enc := NewEncoder(writers)

	return &RSPutStream{enc}, nil
}

type encoder struct {
	writers []io.Writer
	enc     reedsolomon.Encoder
	cache   []byte
}

func NewEncoder(writers []io.Writer) *encoder {
	enc, _ := reedsolomon.New(DATA_SHARDS, PARITY_SHARDS)
	return &encoder{writers, enc, nil}
}
```

RSPutStream结构体内了一个encoder结构体。

Go语言没有面向对象语言常见的继承机制，而是通过内嵌来连接对象之间的关系。当结构体A包含了指向结构体B的无名指针时，我们就说A内嵌了B。A的使用者可以像访问A的方法或成员一样访问B的方法或成员。

NewRSPutStream函数有3个输入参数，dataServers是一个字符串数组，用来保存6个数据服务节点的地址，hash和size分别是需要PUT的对象的散列值和大小。我们首先检查dataServers的长度是否为6，如果不为6，则返回错误。然后根据size计算出每个分片的大小perShard,也就是size/4再向上取整。然后我们创建了一个长度为6的io.Writers数组，其中每一个元素都是一个objectstream.TempPutStream,用于上传一个分片对象。最后我们调用NewEncoder函数创建一个encoder结构体的指针enc并将其作为RSPutStream的内嵌结构体返回。

encoder结构体包含了一个io.Writers数组 writers,一个`reedsolomon.Encoder`接口的enc以及一个用来做输入数据缓存的字节数组cache。

NewEncoder函数调用`reedsolomon.New`生成了一个具有4个数据片加两个校验片的RS码编码器enc,并将输入参数writers和enc作为生成的encoder结构体的成员返回。

reedsolomon包是一个RS编解码的开源库，读者需要用以下命令下载该包：
```bash
go get github.com/klauspost/reedsolomon
```

objects包处理对象PUT相关的其他部分代码并没有发生改变，但是在对象PUT过程中，我们写入对象数据的流调用的是`rs.RSPutStream`,所以实际背后调用的Write方法也不一样，见例5-5。

```go
// rs.RSPutStream的Write方法
func (e *encoder) Write(p []byte) (n int, err error) {
	length := len(p)
	current := 0
	for length != 0 {
		next := BLOCK_SIZE - len(e.cache)
		if next > length {
			next = length
		}
		e.cache = append(e.cache, p[current:current+next]...)
		if len(e.cache) == BLOCK_SIZE {
			e.Flush()
		}
		current += next
		length -= next
	}
	return len(p), nil
}

func (e *encoder) Flush() {
	if len(e.cache) == 0 {
		return
	}
	shards, _ := e.enc.Split(e.cache)
	e.enc.Encode(shards)
	for i := range shards {
		e.writers[i].Write(shards[i])
	}
	e.cache = []byte{}
}
```

RSPutStream本身并没有实现Write方法，所以实现时函数会直接调用其内嵌结构体encoder的Write方法。

encoder的Write方法在for循环里将p中待写入的数据以块的形式放入缓存，如果缓存已满就调用Flush方法将缓存实际写入writers。缓存的上限是每个数据片8000
字节，4个数据片共32000字节。如果缓存里剩余的数据不满32000字节就暂不刷新，等待Write方法下一次被调用。

Flush方法首先调用encoder的成员变量enc的Split方法将缓存的数据切成4个数据片，然后调用enc的Encode方法生成两个校验片，最后在for循环中将6个片的数
据依次写入writers并清空缓存。和之前objectstream一样，用户上传的对象数据经过散列值校验后，RSPutStream也需要一个Commit方法用来将临时对象转正或删除，见例5-6。

例5-6rs.RSPutStream.Commit方法关函数
```go
func (s *RSPutStream) Commit(success bool) {
	s.Flush()
	for i := range s.writers {
		s.writers[i].(*objectstream.TempPutStream).Commit(success)
	}
}
```

Commit方法首先调用其内嵌结构体encoder的Flush方法将缓存中最后的数据写入，然后对encoder的成员数组writers中的元素调用Commit方法将6个临时对象依次
转正或删除。

objects包PUT相关函数的变化到此为止，接下来让我们关注GET相关的函数。和PUT一样，我们省略未发生变化的部分，见例5-7。

```go
// objects包发生变化的GET相关函数
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
	hash := url.PathEscape(meta.Hash)
	stream, e := GetStream(hash, meta.Size)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	_, e = io.Copy(w, stream)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	stream.Close()
}

func GetStream(hash string, size int64) (*rs.RSGetStream, error) {
	locateInfo := locate.Locate(hash)
	if len(locateInfo) < rs.DATA_SHARDS {
		return nil, fmt.Errorf("object %s locate fail, result %v", hash, locateInfo)
	}
	dataServers := make([]string, 0)
	if len(locateInfo) != rs.ALL_SHARDS {
		dataServers = heartbeat.ChooseRandomDataServers(rs.ALL_SHARDS-len(locateInfo), locateInfo)
	}
	return rs.NewRSGetStream(locateInfo, dataServers, hash, size)
}
```

我们可以看到，原本调用getStream的地方变成调用GetStream且其参数多了一个size。大小写的变化是为了将该函数导出给包外部使用，我们在之前已经多次提到Go语言这一个特性了。增加size参数是因为RS码的实现要求每一个数据片的长度完全一样，在编码时如果对象长度不能被4整除，函数会对最后一个数据片进行填充。因此在解码时必须提供对象的准确长度，防止填充数据被当成原始对象数据返回。

在调用io.Copy将对象数据流写入HTTP响应时，如果返回错误，说明对象数据在RS解码过程中发生了错误，这意味着该对象已经无法被读取，我们返回`404 Not Found`,如果没有返回错误，我们需要在get函数最后调用stream.Close方法。GetStream返回的stream的类型是一个指向rs.RSGetStream结构体的指针，我们在GET对象时会对缺失的分片进行即时修复，修复的过程也使用数据服务的temp接口，RSGetStream的Close方法用于在流关闭时将临时对象转正。

GetStream函数首先根据对象散列值hash定位对象，如果反馈的定位结果locateInfo数组长度小于4，则返回错误；如果locateInfo数组的长度不为6，说明该对象有部分分片丢失，我们调用`heartbeat.ChooseRandomDataServers`随机选取用于接收恢复分片的数据服务节点，以数组的形式保存在dataServers里。最后我们以locateInfo、dataServers、hash以及对象的大小size为参数调用rs.NewRSGetStream函数创建rs.RSGetStream,相关函数见例5-8。

例5-8创建rs.RSGetStream的代码

```go
type RSGetStream struct {
	*decoder
}

func NewRSGetStream(locateInfo map[int]string, dataServers []string, hash string, size int64) (*RSGetStream, error) {
	if len(locateInfo)+len(dataServers) != ALL_SHARDS {
		return nil, fmt.Errorf("dataServers number mismatch")
	}

	// 用于读取六个分片的数据
	readers := make([]io.Reader, ALL_SHARDS)
	for i := 0; i < ALL_SHARDS; i++ {
		server := locateInfo[i]
		if server == "" {
			locateInfo[i] = dataServers[0]
			dataServers = dataServers[1:]
			continue
		}
		// 创建相应的临时对象写入流用于恢复分片
		reader, e := objectstream.NewGetStream(server, fmt.Sprintf("%s.%d", hash, i))
		if e == nil {
			readers[i] = reader
		}
	}

	writers := make([]io.Writer, ALL_SHARDS)
	perShard := (size + DATA_SHARDS - 1) / DATA_SHARDS
	var e error
	for i := range readers {
		if readers[i] == nil {
			writers[i], e = objectstream.NewTempPutStream(locateInfo[i], fmt.Sprintf("%s.%d", hash, i), perShard)
			if e != nil {
				return nil, e
			}
		}
	}

	dec := NewDecoder(readers, writers, size)
	return &RSGetStream{dec}, nil
}

type decoder struct {
	readers   []io.Reader
	writers   []io.Writer
	enc       reedsolomon.Encoder
	size      int64
	cache     []byte
	cacheSize int
	total     int64
}

func NewDecoder(readers []io.Reader, writers []io.Writer, size int64) *decoder {
	enc, _ := reedsolomon.New(DATA_SHARDS, PARITY_SHARDS)
	return &decoder{readers, writers, enc, size, nil, 0, 0}
}
```

RSGetStream结构体内 decoder结构体。NewRSGetStream函数先检查locateInfo和dataServers的总数是否为6，满足4+2RS码的需求。如果不满足，则返回错误。然后我们需要创建一个长度为6的io.Reader数组readers,用于读取6个分片的数据。我们用一个for循环遍历6个分片的id,在locateInfo中查找该分片所在的数据服务节点地址，如果某个分片id相对的数据服务节点地址为空，说明该分片丢失，我们需要取一个随机数据服务节点补上；如果数据服务节点存在，我们调用objectstream.NewGetStream打开一个对象读取流用于读取该分片数据，打开的流被保存在readers数组相应的元素中。

readers第一次遍历处理完毕后，有两种情况会导致readers数组中某个元素为nil,一种是该分片数据服务节点地址为空；而另一种则是数据服务节点存在但打开流失败。我们用for循环再次遍历readers,如果某个元素为nil,则调用objectstream.NewTempPutStream创建相应的临时对象写入流用于恢复分片。打开的流被保存在writers数组相应的元素中。

处理完成后，readers和writers数组形成互补的关系，对于某个分片id,要么在readers中存在相应的读取流，要么在writers中存在相应的写入流。我们将这样的两个数组以及对象的大小size作为参数调用NewDecoder生成decoder结构体的指针dec,并将其作为RSGetStream的内嵌结构体返回。

decoder结构体除了readers,writers两个数组以外还包含若干成员，enc的类型是reedsolomon.Encoder接口用于 RS解码， size是对象的大小， cache和 cacheSize用于缓
存读取的数据，total表示当前已经读取了多少字节。

NewDecoder函调用reedsolomon.New创建4+2RS码的码器enc,并设置decoder结构体中相应的属性后返回。

objects包处理对象GET相关的其他部分代码并没有发生改变，但是在对象GET过程中，我们读取对象数据的流调用的是rs.RSGetStream,所以实际背后调用的Read方法也
不一样，见例5-9。

```go
// rs.RSGetStream的Read方法相关函数
func (d *decoder) Read(p []byte) (n int, err error) {
	if d.cacheSize == 0 {
		e := d.getData()
		if e != nil {
			return 0, e
		}
	}
	length := len(p)
	if d.cacheSize < length {
		length = d.cacheSize
	}
	d.cacheSize -= length
	copy(p, d.cache[:length])
	d.cache = d.cache[length:]
	return length, nil
}

func (d *decoder) getData() error {
	if d.total == d.size {
		return io.EOF
	}
	shards := make([][]byte, ALL_SHARDS)
	repairIds := make([]int, 0)
	for i := range shards {
		if d.readers[i] == nil {
			repairIds = append(repairIds, i)
		} else {
			shards[i] = make([]byte, BLOCK_PER_SHARD)
			n, e := io.ReadFull(d.readers[i], shards[i])
			if e != nil && e != io.EOF && e != io.ErrUnexpectedEOF {
				shards[i] = nil
			} else if n != BLOCK_PER_SHARD {
				shards[i] = shards[i][:n]
			}
		}
	}
	e := d.enc.Reconstruct(shards)
	if e != nil {
		return e
	}
	for i := range repairIds {
		id := repairIds[i]
		d.writers[id].Write(shards[id])
	}
	for i := 0; i < DATA_SHARDS; i++ {
		shardSize := int64(len(shards[i]))
		if d.total+shardSize > d.size {
			shardSize -= d.total + shardSize - d.size
		}
		d.cache = append(d.cache, shards[i][:shardSize]...)
		d.cacheSize += int(shardSize)
		d.total += shardSize
	}
	return nil
}

```

RSGetStream的Read方法就是其内嵌结构体decoder的Read方法。decoder的Read方法当cache中没有更多数据时会调用getData方法获取数据，如果getData返回的e不为nil,说明我们没能获取更多数据，则返回0和这个e通知调用方。length是Read方法输入参数p的数组长度，如果length超出当前缓存的数据大小，我们令length等于缓存的数据大小。我们用copy函数将缓存中length长度的数据复制给输入参数p,然后调整缓存，仅保留剩下的部分。最后Read方法返回length,通知调用方本次读取一共有多少数据被复制到p中。

getData方法首先判断当前已经解码的数据大小是否等于对象原始大小，如果已经相等，说明所有数据都已经被读取，我们返回io.EOF;如果还有数据需要读取，我们会创建一个长度为6的数组shards,以及一个长度为0的整型数组repairlds。shards数组中每一个元素都是一个字节数组，用于保存相应分片中读取的数据。我们在一个for循环中遍历6个shards,如果某个分片对应的reader是nil,说明该分片已丢失，我们会在repairlds中添加该分片的id;如果对应的reader不为nil,那么对应的shards需要被初始化成一个长度为8000的字节数组，然后调用io.ReadFull从reader中完整读取8000字节的数据保存在shards里；如果发生了非EOF失败，该shards会被置为nil,如果读取的数据长度n不到8000字节，我们将该shards实际的长度缩减为n。

遍历读取一轮之后，要么每个shards中保存了读取自对应分片的数据，要么因为分片丢失或读取错误，该shards被置为nil。我们调用成员enc的Reconstruct方法尝试将被置为nil的shards恢复出来，这一步如果返回错误，说明我们的对象已经遭到了不可修复的破坏，我们只能将错误原样返回给上层。如果修复成功，6个shards中都保存了对应分片的正确数据，我们遍历repairlds,将需要恢复的分片的数据写入相应的writer。

最后，我们遍历4个数据分片，将每个分片中的数据添加到缓存cache中，修改缓存当前的大小cacheSize以及当前已经读取的全部数据的大小total。

恢复分片的写入需要用到数据服务的temp接口，所以objects.get函数会在最后调用stream.Close方法将用于写入恢复分片的临时对象转正，该方法的实现见例5-10。

```go
// RSGetStream.Close方法
func (s *RSGetStream) Close() {
	for i := range s.writers {
		if s.writers[i] != nil {
			s.writers[i].(*objectstream.TempPutStream).Commit(true)
		}
	}
}
```

Close方法遍历writers成员，如果某个分片的writer不为nil,则调用其Commit方法，参数为true,意味着临时对象将被转正。objectstream.TempPutStream的详细实现见第4章。

### 数据服务

数据服务这边的改动比较小，首先是处理对象定位的locate包。

- 数据服务的locate包

由于在磁盘上保存的对象文件名格式发生了变化，我们的locate包也有相应的变化，见下面的代码：

```go
// 接口服务的locate包发生变化的函数
func Locate(hash string) int {
	mutex.Lock()
	id, ok := objects[hash]
	mutex.Unlock()
	if !ok {
		return -1
	}
	return id
}

func Add(hash string, id int) {
	mutex.Lock()
	objects[hash] = id
	mutex.Unlock()
}

func StartLocate() {
	q := rabbitmq.New(os.Getenv("RABBITMQ_SERVER"))
	defer q.Close()
	q.Bind("dataServers")
	c := q.Consume()
	for msg := range c {
		hash, e := strconv.Unquote(string(msg.Body))
		if e != nil {
			panic(e)
		}
		id := Locate(hash)
		if id != -1 {
			q.Send(msg.ReplyTo, types.LocateMessage{Addr: os.Getenv("LISTEN_ADDRESS"), Id: id})
		}
	}
}

func CollectObjects() {
	files, _ := filepath.Glob(os.Getenv("STORAGE_ROOT") + "/objects/*")
	for i := range files {
		file := strings.Split(filepath.Base(files[i]), ".")
		if len(file) != 3 {
			panic(files[i])
		}
		hash := file[0]
		id, e := strconv.Atoi(file[1])
		if e != nil {
			panic(e)
		}
		objects[hash] = id
	}
}
```

相比第4章，我们的Locate函数不仅要告知某个对象是否存在，同时还需要告知本节点保存的是该对象哪个分片，所以我们返回一个整型，用于返回分片的id。如果对象不存在，则返回-1。

Add函数用于将对象及其分片id加入缓存。
Del函数未发生变化，故未打印。
StartLocate函数读取来自接口服务需要定位的对象散列值hash后，调用Locate获得分片id,如果id不为-1,则将自身的节点监听地址和id打包成一个types.LocateMessage结构体作为反馈消息发送。types..LocateMessage的定义比较简单，见例。

```go
// types.LocateMessage结构体
type LocateMessage struct {
	Addr string
	Id   int
}
```

由于该结构体需要同时被接口服务的数据服务引用，所以放在typs包里。

CollectObjects函数调用filepath.Glob获取`$STORAGE ROOT/objects/`目录下所有文件，并以‘.’分割其基本文件名，获得对象的散列值hash以及分片id,加入定位缓存。

- 数据服务的temp包

temp包的改动主要在处理临时对象转正时，也就是commitTempObject函数，见例

```go
func (t *tempInfo) hash() string {
	s := strings.Split(t.Name, ".")
	return s[0]
}

func (t *tempInfo) id() int {
	s := strings.Split(t.Name, ".")
	id, _ := strconv.Atoi(s[1])
	return id
}

func commitTempObject(datFile string, tempinfo *tempInfo) {
	f, _ := os.Open(datFile)
	d := url.PathEscape(utils.CalculateHash(f))
	f.Close()
	os.Rename(datFile, os.Getenv("STORAGE_ROOT")+"/objects/"+tempinfo.Name+"."+d)
	locate.Add(tempinfo.hash(), tempinfo.id())
}
```

我们回顾一下第4章，commitTempObject的实现非常简单，只需要将临时对象的数据文件重命名为`$STORAGE_ROOT/objects/<hash>`,`<hash>`是该对象的散列值。而在本章，正式对象文件名是`$STORAGE_ROOT/objects/<hash>.X.<hash of shard X>`。所以在重命名时，commitTemp Object函数需要读取临时对象的数据并计算散列值`<hash of shard X>`。最后我们调用locate.Add,以`<hash>`为键、分片的id为值添加进定位缓存。

- 数据服务的objects包

objects包发生变化的只有一个getFile函数

```go
// 数据服务的objects.getFile函数
func getFile(name string) string {
	files, _ := filepath.Glob(os.Getenv("STORAGE_ROOT") + "/objects/" + name + ".*")
	if len(files) != 1 {
		return ""
	}
	file := files[0]
	h := sha256.New()
	sendFile(h, file)
	d := url.PathEscape(base64.StdEncoding.EncodeToString(h.Sum(nil)))
	hash := strings.Split(file, ".")[2]
	if d != hash {
		log.Println("object hash mismatch, remove", file)
		locate.Del(hash)
		os.Remove(file)
		return ""
	}
	return file
}
```

数据服务对象接口使用的对象名的格式是`<hash>.X`,getFile函数需要在`$STORAGE_ROOT/objects/`目录下查找所有以`<hash>.X`开头的文件，如果找不到则返回空字符串。找到之后计算其散列值，如果跟`<hash of shard X>`的值不匹配则删除该对象并返回空字符串，否则返回该对象的文件名。

## 功能测试

在启动服务前记得清空数据服务节点的`$STORAGE ROOT/objects/`目录，避免由于上一章测试遗留的对象文件格式不匹配造成错误。

我们用curl命令作为客户端来访问服务节点10.29.2.2:12345，PUT一个名为test5的对象。

```bash
➜  echo -n "this object will be separate to 4+2 shards" | openssl dgst -sha256 -binary | base64
MBMxWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpLZza8=

➜  curl -v 10.29.2.1:12345/objects/test5 -XPUT -d "this object will be separate to 4+2 shards" -H "Digest: SHA-256=MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8="
* Hostname was NOT found in DNS cache
* Trying10.29.2.1..
* Connected to 10.29.2.1 (10.29.2,1）port 12345(#0)
> PUT /objects/test5 HTTP/1.1
> User-Agent:curl/7.38.0
> Host:10.29.2.1:12345
> Accept:*/*
> Digest:SHA-256-MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=
> Content-Length:42
> Content-Type:application/x-www-form-urlencoded
>
* upload completely sent off:42 out of 42 bytes
< HTTP/1,1 200 OK
< Date:Wed,09 Aug 2017 18:07:28 GMT
< Content-Length:0
< Content-Type:text/plain;charset-utf-8
< 
< Connection 0 to host 10.29.2.1 left intact
```

我们可以看到仅在一个数据服务节点上存在JXcivgseFM+SpiBgl0Tz5rfXsqEfFZXK%2FyakriPVM3A=文件。

由于我们在同一台服务器上启动6个数据服务，所以只需要一条命令就可以检查6个分片是否都已经正确上传。
```bash
➜  ls /tmp/?/objects
/tmp/1/objects:
MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.4.i8xiyIws02eRJwnmk04ieUV9v26H6e8tu5Y82F30p32F4zE-

/tmp/2/objects:
MBMxWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpL2zaB=.5.wGW6r6pLkHAJC2G1Yxfk45FdUTTv31c57INXIUjmhz8=

/tmp/3/objects:
MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.3.9cMmcwZQE+dlbz27iekkG282FL4raiYzUUSvebfE9xUKw=

/tmp/4/objects:
MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.0.XVFHp582F5kZ89051XQo6UEkWWBOGzyXwLWS4Ln9fONeg=

/tmp/5/objects:
MBMXWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpLZza8=.2.pV2SP82Fi3jK9KGs5BtQS++TJEeeq82782FYaUnSRPU1IX8=

/tmp/6/objects:
MBMxWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpLZza8=.1.DigCAigrm32FBMDzVIPdjPp+LZMHY9ktSKNX9A9eQShAQ=
```

我们可以看到原本对象的内容“this object will be separate to4+2 shards”是如何被分成4个数据片的。
```bash
➜  cat /tmp/4/objects/MBMxWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpLZzaB\=.0.XVFHp532F 5kZ89051XQ06UEKWW80GzyXwLWS4Ln9fONcg\=
this object
➜  cat /tmp/6/objects/MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8\=.1.DjgCAigrm% 2FBMDzVlPdjPp+LZMHY9ktSKNX9A9eQShAQ\=
will be se
➜  cat /tmp/5/objects/MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZzaB\=.2.pV2SP82Fi 3jK9KGs5BtQs++TJEecq82782FYaUnSRPU1IX8\=
parate to 4
➜  cat /tmp/3/objeets/MBMxWHrPMsuOBaVYHkwSeZORyTRMOyiKp2oelpL2za8\=.3.9cMmcwZQE+ dlbz27iekkG282FL4raiYzUUSvebfE9xUKw\=
+2 shards
```

尝试GET和定位对象。
```bash
➜  curl 10.29.2.1:12345/objects/test5
this object will be separate to 4+2 shards

➜  curl 10.29.2.1:12345/locate/MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=
("0":"10.29.1.4:12345","1":"10.29.1.6:12345","2":"10.29.1.5:12345","3":"10.29.1.3:12345","4":"10.29.1.1:12345","5":"10.29.1.2:12345"}
```

接下来我们删除分片0并修改分片1的内容，看看即时修复能不能将这些数据恢复出来。
```bash
➜  rm /tmp/4/objects/MBMxWHrPMsuOBaVYHkwScZORyTRMQyiKp2oelpLZza8\=.0.
XVFHp582F5kZ 89051XQo6UEkWW80GzyXwLWS4Ln9fONcg\=

➜  echo some_garbage /tmp/6/objects/MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8\ =.1.DjgCAigrm%2FBMDzVIPdjPp+LZMHY9ktSKNX9A9eQShAQ\=

➜  curl 10.29.2.1:12345/objects/test5
this object will be separate to 4+2 shards

```


test5对象的数据可以正确读出。让我们再次检查数据节点上的内容。

```bash
➜  ls/tmp/?/objects
/tmp/1/objects:
MBMXWHrPMsuOBaVYHkwSeZORyTRMQyiKp2oelpLZzaB=.4.18xiyIwS02cRJwnmko4ieUv9v26H6e8tu5Yt2F30p62F4zE=
/tmp/2/objects:
MBMxWHrPMsuOBaVYHkwSe2QRyTRMQyiKp2oelpLZza8=.5.wGW6r6pLkHAJC2G1Yxfk45FdUTTv31e57INXIUjmh28=
/tmp/3/objects:
MBMxWHrPMsuOBaVYHkwSeZQRyTRMQyiKp2oelpLZza8=.3.9eMmew2QE+dlbz27iekkG282FL4raiYzUUSvcbfE9xUKw=
/tmp/4/objects:
MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.0.XVFHp5t2F5kZ89051XQo6UEkWW8OGzyXwLWS4Ln9fONcg=
/tmp/5/objects:
MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.2.pV2SP32Fi3jK9KGs5BtQS++TJEecqB27t2FYaUnSRPU1IX8=
/tmp/6/objects:
MBMXWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8=.1.DjgCAigrmt2FBMDzV1PdjPp+LZMHY9ktSKNX9A9eQShAQ=

➜  cat /tmp/4/objects/MBMxWHrPMauOBaVYHkwScZQRyTRMQyiKp2oelpLZza8\=.0.XVFHp582F5kZ89051XQo6UEkWW8OGzyXwLWS4Ln9E0Neg\=
this object
➜  cat /tmp/6/objects/MBMxWHrPMsuOBaVYHkwScZQRyTRMQyiKp2oelpLZza8\=.1.DjgCAigrm32FBMDzVlPdjPp+LZMHY9ktSKNX9A9eQShAQ\=
will be se
```

可以看到，分片0和分片1的数据都已经被成功恢复。

提问环节：如果我们破坏了3个或3个以上分片，又会发生什么呢？

解答：此时对象已无法正常读取，接口服务返回4O4 Not Found。


## 小结

本章介绍了数据损坏的成因以及用数据冗余防止数据损坏的技术，并实现了4+2RS码的数据冗余策路。使用这种数据分片技术的冗余策略的好处是在抵御数据丢失风险的同时，并没有显著增加对存储空间的要求，而且变相提高了整个存储系统的负载均衡。而缺点则是实现较为复杂，参与单个对象上传下载流程的节点数量显著增加。

我们在本章实现了在GET对象时检查并即时修复对象的技术。作为本书的示例，我们采取了比较激进的修复策略：查到任何数据发生丢失都会立即进行修复。对象存储服务在上线以后，由于软件升级、硬件维护、服务器宕机等各种原因导致的暂时性数据不可用十分常见，我们的修复策酪需要考虑到这样的情况，而适当放宽修复的标准。比如，我们可以放过还有5个分片的对象，只修复仅有4个分片的对象。如果读者担心4个分片太接近修复的底线，别忘了我们的RS码可以配置数据片和校验片的数量，校验片数量越多，我们的修复余地就越大。数据的修复不能只依靠本章提供的即时修复技术来进行，有些对象可能因为长期没有发生GET操作而始终得不到修复，最终由于损坏的数据片过多而无法修复。所以我们还需要一种后台修复工具，能持续检查对象存储系统上的所有对象并进行修复。我们会在第8章实现这个工具。

在下一章，我们会介绍对于对象存储服务来说十分重要的功能一断点续传。受到网络环境的彩响，身处云端对外提供服务的对象存储服务和客户端之间的连接可能会异常断开，因此提供断点续传功能很有必要，它可以帮助客户端更为轻松地上传和下载较大的对象。