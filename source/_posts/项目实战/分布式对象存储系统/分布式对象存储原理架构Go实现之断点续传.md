---
title: 分布式对象存储原理架构Go实现之断点续传
date: 2022-03-07T10:29:30+08:00
categories: 项目实战
tags: [Go,分布式,对象存储]
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: breakpoint-resume-upload
toc: true
sticky:
---

我们在上一章介绍了数据冗余技术，并利用RS纠删码实现了数据冗余和即时修复。本章我们要在此基础上实现断点续传功能。断点续传功能分两部分，分别是断点下载和断点上传。

## 为什么对象存储需要支持断点续传

在实验室的理想环境里网络永远通畅，对象存储系统并不需要断点续传这个功能。但在现实世界，对象存储服务在数据中心运行，而客户端在客户本地机器上运行，它们之间通过互联网连接。互联网的连接速度慢且不稳定，有可能由于网络故障导致断开连接。在客户端上传或下载一个大对象时，因网络断开导致上传下载失败的概率就会变得不可忽视。为了解决这个问题，对象存储服务必须提供断点续传功能，允许客户端从某个检查点而不是从头开始上传或下载对象。

### 断点下载流程

断点下载的实现非常简单，客户端在GET对象请求时通过设置Range头部来告诉接口服务需要从什么位置开始输出对象的数据，见图6-1。

接口服务的处理流程在生成对象流之前和上一章没有任何区别，但是在成功打开了对象数据流之后，接口服务会额外调用 rs.RSGetStream.Seek 方法跳至客户端请求的位置，然后才开始输出数据。

<img width="665" alt="断点下载流程" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/67ffd48c-970a-4153-91ab-e8b1a4e1fa4b">

### 断点上传流程

断点上传的流程则要比断点下载复杂得多，这是由HTTP服务的特性导致的。客户端在下载时并不在乎数据的完整性，一旦发生网络故障，数据下到哪算哪，下次继续从最后下载的数据位置开始续传就可以了。

但是对于上传来说，接口服务会对数据进行散列值校验，当发生网络故障时，如果上传的数据跟期望的不一致，那么整个上传的数据都会被丢弃。所以断点上传在一开始就需要客户端和接口服务做好约定，使用特定的接口进行上传，见图6-2。

客户端在知道自己要上传大对象时就主动改用对象POST接口，提供对象的散列值和大小。接口服务的处理流程和上一章处理对象PUT一样，搜索6个数据服务并分别POST临时对象接口。数据服务的地址以及返回的uuid会被记录在一个token里返回给客户端。

客户端POST对象后会得到一个token。对token进行PUT可以上传数据，见图6-3。在上传时客户端需要指定range头部来告诉接口服务上传数据的范围。接口服务对token进行解码，获取6个分片所在的数据服务地址以及uuid,分别调用PATCH将数据写入6个临时对象。

<img width="723" alt="对象POST接口" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/05d90532-14f6-4140-b6ee-a15ee292a32f">

<img width="750" alt="用PUT方法访问token上传数据" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/3eec8ac5-5141-4bb6-a05d-76df63b11266">

通过PUT上传的数据并不一定会被接口服务完全接收。我们在第5章已经知道，经过RS分片的数据是以块的形式分批写入4个数据片的，每个数据片一次写入8000字节，4个数据片一共写入32000字节。所以除非是最后一批数据，否则接口服务只接收32000字节的整数倍进行写入。这是一个服务端的行为逻辑，我们不能要求客户端知道接口服务背后的逻辑，所以接口服务必须提供token的HEAD操作，让客户端知道服务端上该token目前的写入进度，见图6-4。

<img width="644" alt="用HEAD方法访问token获取当前已上传了多少数据" src="https://github.com/JIeJaitt/goDistributed-Object-storage/assets/77219045/dc2e6232-51cc-493e-9a2c-3568a6f8c78c">

客户端每次用PUT方法访问token之前都需要先用HEAD方法获取当前已上传了多少数据。接口服务对token进行解码，获取6个分片所在的数据服务地址以及uuid,仅对第一个分片调用HEAD获取该分片当前长度，将这个数字乘以4，作为Content-Length响应头部返回给客户端。

### 接口服务的REST接口
首先，接口服务的objects接口GET方法新增了Range请求头部，用于告诉接口服务需要的对象数据范围。
```bash
GET /objects/<object_name>
```
请求头部
- `Range:bytes=<first>-`
响应头部
- `Content-Range:bytes <first>-<size>/<size>`

响应正文
- 从first开始的对象内容
Range请求头部定义在RFC7233中，是HTTP/1.1协议的一部分。给GET请求加上Range头部意味着这个请求期望的只是全体数据的一个或多个子集。Range请求主要支持以字节为单位的byte Range(虽然协议本身也支持其他自定义的Range单位，但是如果实现者没有在LANA申请注册这个自定义的单位，那么就只有自己写的客户端和服务端之间可以互相理解)，byte range的格式是固定字符串“bytes=”开头，后面跟上一个或多个数字的范围，由逗号分隔。假设我们的整体数据是10000字节，那么合法的byte range格式可以有以下几个例子：

- 请求最后500个字节(9500~9999)。
bytes=-500
或
bytes=9500-
- 请求第一个和最后一个字节（字节0和9999）。
bytes=0-0,-1
- 其他几个合法但不常见的请求第500~999个字节的格式。
bytes=500-600,601-999
bytes-=500-700,601-999

本书的对象存储系统实现的格式是`bytes=<first>-`。客户端通过指定first的值告诉接口服务下载对象的数据范围，接口服务返回的数据从first开始，first之前的对象数
据会在服务端被丢弃。根据Range请求的协议规范，接口服务需要返回HTTP错误代码`206 Partial Content`,并设置Content-Range响应头部告知返回数据的范围`<frst>-<size>/<size>`,其中`<first>`是客户端要求的起始位置，`<size>`是对象的大小。

objects接口还新增了POST方法，用于创建token。
`POST /objects/<object name>`
请求头部
- Digest::SHA-256=<对象散列值的Base64编码>
- Size:<对象内容的长度>
响应头部
- Location:<访问temp/token的URI>
token被放在Location头部返回给客户端，客户端拿到后可以直接访问该URI。
除了objects接口发生的改变以外，接口服务还新增temp接口。
`HEAD /temp/<token>`
响应头部
- `Content-Length:<token当前的上传字节数>`
`PUT /temp/<token>`
请求头部
- `Range:bytes=<first>-<last>`
请求正文
- 对象的内容，字节范围为first~last
客户端通过Range头部指定上传的范围，first必须跟token当前的上传字节数一致，否则接口服务会返回`416 Range Not Satisfiable`。如果上传的是最后一段数据，`<last>`为空。

### 数据服务的REST接口

数据服务的temp接口新增了HEAD和GET两个方法，HEAD方法用于获取某个分片临时对象当前的大小；而GET方法则用于获取临时对象的数据。
`HEAD /temp/<uuid>`
响应头部
- Content-Length:<临时对象当前的上传字节数>
`GET /temp/<uuid>`
响应正文
- 临时对象的内容
客户端将对象所有的数据上传完毕之后，接口服务需要调用这个方法从数据服务读取各分片临时对象的内容并进行数据校验，只有在验证了对象的散列值符合预期的情况下，服务端才认为该对象的上传是成功的，进而将临时对象转正。

## G0语言实现

### 接口服务

接口服务的main函数以及objects包发生了改变，且新增了temp包，versions/locate/heartbeat包没有变化。

首先让我们看main函数

```diff
# 接口服务的main函数
# /apiServer/apiServer.go
func main() {
	go heartbeat.ListenHeartbeat()
	http.HandleFunc("/objects/", objects.Handler)
+	http.HandleFunc("/temp/", temp.Handler)
	http.HandleFunc("/locate/", locate.Handler)
	http.HandleFunc("/versions/", versions.Handler)
	log.Fatal(http.ListenAndServe(os.Getenv("LISTEN_ADDRESS"), nil))
}
```

相比于第三章，main函数多了一个 temp.Handler 函数用于处理的对 /temp/ 的请求。在深入temp包的实现之前，让我们先去看看objects包发生的改动。

- 接口服务的objects包

首先是 objects.Handler 函数，
```diff
# object.Handler函数
func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
+	if m == http.MethodPost {
+		post(w, r)
+		return
+	}
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
相比于第三章，我们可以看到本张的Handler多了一个对POST方法的处理函数post，相关函数如下：


objects.post相关函数
```go
func post(w http.ResponseWriter, r *http.Request) {
	// 定位散列值
	name := strings.Split(r.URL.EscapedPath(), "/")[2]
	size, e := strconv.ParseInt(r.Header.Get("size"), 0, 64)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	hash := utils.GetHashFromHeader(r.Header)
	if hash == "" {
		log.Println("missing object hash in digest header")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if locate.Exist(url.PathEscape(hash)) {
		e = es.AddVersion(name, hash, size)
		if e != nil {
			log.Println(e)
			w.WriteHeader(http.StatusInternalServerError)
		} else {
			w.WriteHeader(http.StatusOK)
		}
		return
	}
	// 随机选出6个数据节点
	ds := heartbeat.ChooseRandomDataServers(rs.ALL_SHARDS, nil)
	if len(ds) != rs.ALL_SHARDS {
		log.Println("cannot find enough dataServer")
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	// 创建分块上传流
	stream, e := rs.NewRSResumablePutStream(ds, name, url.PathEscape(hash), size)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
    // 调用其ToToken方法生成一个字符串token,放入Location响应头部，并返回HTTP代码201 Created
	w.Header().Set("location", "/temp/"+url.PathEscape(stream.ToToken()))
	w.WriteHeader(http.StatusCreated)
}
type resumableToken struct {
    Name    string    // 文件名
    Size    int64     // 文件大小
    Hash    string    // 文件哈希值
    Servers []string  // 数据服务器列表
    Uuids   []string  // 对象流的唯一标识符列表
}

type RSResumablePutStream struct {
    *RSPutStream       // RSPutStream对象
    *resumableToken    // resumableToken对象
}

// NewRSResumablePutStream创建一个新的RSResumablePutStream对象
// 参数：
//   - dataServers：数据服务器列表
//   - name：文件名
//   - hash：文件哈希值
//   - size：文件大小
// 返回值：
//   - *RSResumablePutStream：新创建的RSResumablePutStream对象
//   - error：如果创建过程中发生错误，则返回相应的错误
func NewRSResumablePutStream(dataServers []string, name, hash string, size int64) (*RSResumablePutStream, error) {
    putStream, e := NewRSPutStream(dataServers, hash, size)
    if e != nil {
        return nil, e
    }
    // 从putStream的成员writers数组中获取6个分片的uuid
    uuids := make([]string, ALL_SHARDS)
    for i := range uuids {
        uuids[i] = putStream.writers[i].(*objectstream.TempPutStream).Uuid
    }
    // 利用获得的uuid创建resumableToken结构体token
    token := &resumableToken{name, size, hash, dataServers, uuids}
    return &RSResumablePutStream{putStream, token}, nil
}
```

post函数和put函数的处理流程在前半段是一样的，都是从请求的URL中获得对象的名字，从请求的相应头部获得对象的大小和散列值，然后对散列值进行定位。如果该散列值己经存在，那么我们可以直接往元数据服务添加新版本并返回200 OK；如果散列值不存在，那么随机选出6个数据节点，然后调用rs.NewRSResumablePutStream生成数据流stream,并调用其ToToken方法生成一个字符串token,放入Location响应头部，并返回HTTP代码201 Created。

rs.NewRSResumablePutStream创建的stream的类型是一个指向RSResumablePutStream结构体的指针。该结构体内嵌了RSPutStream和resumableToken。RSPutStream我们在上一章已经讲述过了。resumableToken中保存了对象的名字、大小、散列值，另外还有6个分片所在的数据服务节点地址和uud,分别以数组的形式保存。

rs.NewRSResumablePutStream函数的输入参数分别是保存数据服务节点地址的dataServers数组，对象的名字name,对象的散列值hash和对象的大小size。它首先调用NewRSPutStream创建一个类型为RSPutStream的变量putStream,然后从putStream的成员writers数组中获取6个分片的uuid,保存在uuids数组，然后创建resumableToken结构体token,最后将putStream和token作为RSResumablePutStream的成员返回。

RSResumablePutStream.ToToken方法将自身数据以JSON格式编入，然后返回经过Base64编码后的字符串。

注意，任何人都可以将Base64编码的字符串解码，本书的实现代码并未对token加密，任何人都可以轻易从接口服务返回的响应头部中获取RSResum㎡ablePutStream结构体的内部信息。这是一个很大的信息泄露。本书旨在介绍和实现对象存储的各种功能，而信息安全不属于本书的范畴。对信息安全有要求的读者需要自行实现对tokn的加密和解密操作。

objects包除了新增post函数以外，还修改了get函数，见例6-4。

object.get相关函数

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
	hash := url.PathEscape(meta.Hash)
	stream, e := GetStream(hash, meta.Size)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	offset := utils.GetOffsetFromHeader(r.Header)
	if offset != 0 {
		stream.Seek(offset, io.SeekCurrent)
		w.Header().Set("content-range", fmt.Sprintf("bytes %d-%d/%d", offset, meta.Size-1, meta.Size))
		w.WriteHeader(http.StatusPartialContent)
	}
	io.Copy(w, stream)
	stream.Close()
}

func GetOffsetFromHeader(h http.Header) int64 {
	byteRange := h.Get("range")
	if len(byteRange) < 7 {
		return 0
	}
	if byteRange[:6] != "bytes=" {
		return 0
	}
	bytePos := strings.Split(byteRange[6:], "-")
	offset, _ := strconv.ParseInt(bytePos[0], 0, 64)
	return offset
}

func (s *RSGetStream) Seek(offset int64, whence int) (int64, error) {
	if whence != io.SeekCurrent {
		panic("only support SeekCurrent")
	}
	if offset < 0 {
		panic("only support forward seek")
	}
	for offset != 0 {
		length := int64(BLOCK_SIZE)
		if offset < length {
			length = offset
		}
		buf := make([]byte, length)
		io.ReadFull(s, buf)
		offset -= length
	}
	return offset, nil
}
```

和第5章相比，本章的`objects.get`函数在调用`GetStream`生成`stream`之后，还调用`utils.GetOffsetFromHeader`函数从HTTP请求的Range头部获得客户端要求的偏移量offset,如果offset不为O,那么需要调用stream的Seek方法跳到offset位置，设置Content-Range响应头部以及HTTP代码`206 Partial Content`。然后继续通过io.Copy输出数据。

`utils.GetOffsetFromHeader`函数获取HTTP的Range头部，Range头部的格式必须是“`bytes=<first>-`”开头，我们调用`strings.Split`将`<first>`部分切取出来并调用`strconv.ParseInt`将字符串转化成`int64`返回。

`RSGetStream.Seek`方法有两个输入参数，offset表示需要跳过多少字节，whence表示起跳点。我们的方法只支持从当前位置(io.SeekCurrent).起跳，且跳过的字节数不能为负。我们在一个for循环中每次读取32000字节并丢弃，直到读到offset位置为止。

objects包的变化介绍完了，接下来我们去看看temp包的实现。

- 接口服务的temp包

temp包一共有3个函数，Handler用于注册HTTP处理函数，head和put分别处理相应的访问方法。首先让我们看看temp.Handler函数，见例6-5。

例6-5temp.Handler函数

```go
func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m == http.MethodHead {
		head(w, r)
		return
	}
	if m == http.MethodPut {
		put(w, r)
		return
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
}
```

temp.Handler函数首先检查访问方式，如果是HEAD则调用head函数，如果是PUT
则调用put函数，否则返回405 Method Not Allowed.。put相关函数见例6-6。
例6-6

temp.put相关函数

```go
func put(w http.ResponseWriter, r *http.Request) {
	token := strings.Split(r.URL.EscapedPath(), "/")[2]
	stream, e := rs.NewRSResumablePutStreamFromToken(token)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	current := stream.CurrentSize()
	if current == -1 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	offset := utils.GetOffsetFromHeader(r.Header)
	if current != offset {
		w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
		return
	}
	bytes := make([]byte, rs.BLOCK_SIZE)
	for {
		n, e := io.ReadFull(r.Body, bytes)
		if e != nil && e != io.EOF && e != io.ErrUnexpectedEOF {
			log.Println(e)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		current += int64(n)
		if current > stream.Size {
			stream.Commit(false)
			log.Println("resumable put exceed size")
			w.WriteHeader(http.StatusForbidden)
			return
		}
		if n != rs.BLOCK_SIZE && current != stream.Size {
			return
		}
		stream.Write(bytes[:n])
		if current == stream.Size {
			stream.Flush()
			getStream, e := rs.NewRSResumableGetStream(stream.Servers, stream.Uuids, stream.Size)
			hash := url.PathEscape(utils.CalculateHash(getStream))
			if hash != stream.Hash {
				stream.Commit(false)
				log.Println("resumable put done but hash mismatch")
				w.WriteHeader(http.StatusForbidden)
				return
			}
			if locate.Exist(url.PathEscape(hash)) {
				stream.Commit(false)
			} else {
				stream.Commit(true)
			}
			e = es.AddVersion(stream.Name, stream.Hash, stream.Size)
			if e != nil {
				log.Println(e)
				w.WriteHeader(http.StatusInternalServerError)
			}
			return
		}
	}
}

func NewRSResumablePutStream(dataServers []string, name, hash string, size int64) (*RSResumablePutStream, error) {
	putStream, e := NewRSPutStream(dataServers, hash, size)
	if e != nil {
		return nil, e
	}
	uuids := make([]string, ALL_SHARDS)
	for i := range uuids {
		uuids[i] = putStream.writers[i].(*objectstream.TempPutStream).Uuid
	}
	token := &resumableToken{name, size, hash, dataServers, uuids}
	return &RSResumablePutStream{putStream, token}, nil
}

func (s *RSResumablePutStream) CurrentSize() int64 {
	r, e := http.Head(fmt.Sprintf("http://%s/temp/%s", s.Servers[0], s.Uuids[0]))
	if e != nil {
		log.Println(e)
		return -1
	}
	if r.StatusCode != http.StatusOK {
		log.Println(r.StatusCode)
		return -1
	}
	size := utils.GetSizeFromHeader(r.Header) * DATA_SHARDS
	if size > s.Size {
		size = s.Size
	}
	return size
}
```

put函数首先从URL中获取`<token>`,然后调用rs.NewRSResumablePutStreamFromToken根据`<token>`中的内容创建RSResumablePutStream结构体并获得指向该结构体的指针stream,然后调用CurrentSize方法获得token当前大小，如果大小为-1,则说明该token不存在。接下来我们调用utils.GetOffsetFromHeader从Range头部获得offset。如果offset和当前的大小不一致，则接口服务返回416 Range Not Satisfiable。

如果offset和当前大小一致，我们在一个for循环中以32000字节为长度读取HTTP请求的正文并写入stream。如果读到的总长度超出了对象的大小，说明客户端上传的数据有误，接口服务删除临时对象并返回4O3 Forbidden。如果某次读取的长度不到32000字节且读到的总长度不等于对象的大小，说明本次客户端上传结束，还有后续数据需要上传。此时接口服务会丢弃最后那次读取的长度不到32000字节的数据。

为什么接口服务需要丢弃数据，而不是将这部分数据写入临时对象或缓存在接口服务的内存里？

因为将这部分数据缓存在接口服务的内存里没有意义，下次客户端不一定还访问同一个接口服务节点。而如果我们将这部分数据直接写入临时对象，那么我们就破坏了每个数据片以8000字节为一个块写入的约定，在读取时就会发生错误。

最后如果读到的总长度等于对象的大小，说明客户端上传了对象的全部数据。我们调用stream的Flush方法将剩余数据写入临时对象，然后调用rs.NewRSResumableGetStream生成一个临时对象读取流getStream,读取getStream中的数据并计算散列值。如果散列值不一致，则说明客户端上传的数据有误，接口服务删除临时对象并返回403 Forbidden。如果散列值一致，则继续检查该散列值是否已经存在：如果存在，则删除临时对象；否则将临时对象转正。最后调用es.AddVersion添加新版本。

NewRSResumablePutStreamFromToken函数对token进行Base64解码，然后将JSON数据编出形成resumableToken结构体t,t的Servers和Uuids数组中保存了当初创建的6个分片临时对象所在的数据服务节点地址和uuid,我们根据这些信息创建6个objectstream.TempPutStream保存在writers数组，以writers数组为参数创建encoder结构体enc,以enc为内嵌结构体创建RSPutStream,并最终以RSPutStream和t为内嵌结构体创建RSResumablePutStream返回。

RSResumablePutStream.CurrentSize以HEAD方法获取第一个分片临时对象的大小并乘以4作为size返回。如果size超出了对象的大小，则返回对象的大小。

最后让我们来看temp.head相关函数，见例6-7。

```go
func head(w http.ResponseWriter, r *http.Request) {
	token := strings.Split(r.URL.EscapedPath(), "/")[2]
	stream, e := rs.NewRSResumablePutStreamFromToken(token)
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusForbidden)
		return
	}
	current := stream.CurrentSize()
	if current == -1 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.Header().Set("content-length", fmt.Sprintf("%d", current))
}
```

head函数相比put简单很多，只需要根据token恢复出stream后调用CurrentSize获取当前大小并放在Content-Length头部返回。

### 数据服务

数据服务这边只有temp包发生了改动，新增get和head两个方法，见例6-8。
例6-8数据服务temp包的变化

```go
func Handler(w http.ResponseWriter, r *http.Request) {
	m := r.Method
	if m == http.MethodHead {
		head(w, r)
		return
	}
	if m == http.MethodGet {
		get(w, r)
		return
	}
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

func get(w http.ResponseWriter, r *http.Request) {
	uuid := strings.Split(r.URL.EscapedPath(), "/")[2]
	f, e := os.Open(os.Getenv("STORAGE_ROOT") + "/temp/" + uuid + ".dat")
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	defer f.Close()
	io.Copy(w, f)
}

func head(w http.ResponseWriter, r *http.Request) {
	uuid := strings.Split(r.URL.EscapedPath(), "/")[2]
	f, e := os.Open(os.Getenv("STORAGE_ROOT") + "/temp/" + uuid + ".dat")
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusNotFound)
		return
	}
	defer f.Close()
	info, e := f.Stat()
	if e != nil {
		log.Println(e)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("content-length", fmt.Sprintf("%d", info.Size()))
}
```

Handler函数相比第4章多了对HEAD/PUT方法的处理。如果接口服务以HEAD方式访问数据服务的temp接口，Handler会调用head;如果接口服务以GET方式访问
数据服务的temp接口，则Handler会调用get。

get函数打开`$STORAGE_ROOT/temp/<uuid>.dat`文件并将其内容作为HTTP的响应正文输出。

head函数则将`$STORAGE_ROOT/temp/<uuid>.dat`文件的大小放在Content-Length响应头部返回。


## 功能测试

首先，让我们生成一个长度为100000字节的随机文件，并计算散列值。
```bash
➜  dd if=/dev/urandom of=/tmp/file bs=1000 count=100
100+0 records in
100+0 records out
100000 bytes(100kB) copied, 0.0085559 s, 11.7MB/s

➜  openssl dgst -sha256-binary /tmp/file | base64
mXNXv6rY7k+jc6jKT4LFhVL5ONslk+rSGLoKbseE5nc=
```
接下来，我们需要将这个文件分段上传为test6对象。
```bash
➜  curl -v 10.29.2.1:12345/objects/test6 -XPOST -H "Digest:SHA-256=mXNXv6rY7k+ jc6jKT4LFhVL5ONslk+rSGLoKbseE5nc="-H "Size:100000"
Hostname was NOT found in DNS cache
*Trying10.29.2.1..
*Connected to10.29.2.1(10.29.2.1)port12345(#0)
POST /objects/test6 HTTP/1.1
User-Agent:curl/7.38.0
>Host:10.29.2.1:12345
Accept:*/*
Digest:SHA-256=mXNXv6rY7k+jC6jKT4LFhVL5ONslk+rSGLoKbSeE5nc=
>size:100000
>
< HTTP/1.1 201 Created
< Location:/temp/eyJOYWllIjoidGVzdDYiLCJTaXplIjoxMDAwMDAsIkhhc2gioiJtWE5YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyuodMbotiU2VENW5jPSIsI1Nlcnz1cnMiolsiMTAuMj kuMS410jEyMzQlIiwiMTAuMjkuMs4yojEyMzQ1IiwiMTAuMjkuMS4xojEyMzQlIiwiMTAuMjkuMS400jEyMzQlIiwiMTAuMjkuMS4zojEyMzQlIiwiMTAuMjkuMS420jEyMzQ1I10sIlV1aWRzIjpbIjhjZTI2ZDBkLTJhN2MtNGVizi1hNGJjLTgwYmU4YTZjY2VkMiIsIjJmNDE2YTcyLTN1ZDAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIj1kNjQ3Y2JhLWE0ZmItNDA1MC1iNWNhLTZhYjE3YjgxOGE4MiIs ImF1NmNhMWYOLTQ4MzQtNGMyMCO5MDk2LTIZZTI5YTQ3MTE5ZiIsImUONjU4ZmY3LTQXNDMtNDF1ZS1iYWJmLTQwYmU4MzNIMTk1NCIsIjdiYmYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==
< Date:Tue,15 Aug 2017 17:10:05 GMT
< Content-Length:0
< Content-Type:text/plain;charset=utf-8
< 
< Connection #0 to host 10.29.2.1 left intact
```

接口服务将token放在Location响应头部返回，我们利用这个URI进行HEAD和PUT操作，先上传随机文件的前50000字节。

```bash
➜  curl -I 10.29.2.1:12345/temp/eyJOYW1lIjoidGVzdDYiLCJTaXplIjoxMDAWMDAsIkhhc2gioiJtWE5YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyuOdMbotiU2VFNW5jPSIsI1NlcnZ1cnMiolsiMTAuMjkuMS410jEyMzQ1IiwiMTAuMj kuMs4yojEyMzQlIiwiMTAuMjkuMS4xojEyMzQ1IiwiMTAuMj kuMs400jEyMzQ1IiwiMTAuMj kuMs4zojEyMzQ1IiwiMTAuMjkuMS420jEyMzQ1I10sI1V1aWRzIjpbIjhjZTI22DBkLTJhN2MtNGVizi1hNGJjLTgwYmU4YTZjY2VkMiIsIjJmNDE2YTcyLTNIZDAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIj1kNjQ3Y2JhLWE0ZmItNDA1MC1iNWNhLTZhYjE3YjgxOGE4MiIs ImF1NmNhMWYOLTQ4MzQtNGMyMC05MDk2LTIZZTI5YTQ3MTE5ZiIsImUONjU4ZmY3LTQXNDMtNDF1ZS1iYWJmLTQWYmU4MZNIMTk1NCIsIjdiYmYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==
HTTP/1.1 200 OK
Content-Length:0
Date:Tue,15 Aug 2017 17:12:05 GMT
Content-Type:text/plain;charset-utf-8   
➜  dd if=/tmp/file of=/tmp/first bs=1000 count=50
50+0 records in
50+0 records out
➜  curl -v -XPUT --data-binary @/tmp/first 10.29.2.1:12345/temp/eyJoYwllIjoidGVzdDYiLCJTaXplIjoxMDAwMDAsIkhhc2gioiJtWE5YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyUOdMbotiU2VFNW5jPSIsIlNIcnZlcnMiolsiMTAuMjkuMs410jEyMzQlIiwiMTAuMjkuMs4yojEyMzQ1IiwiMTAuMj kuMS4xojEyMzQ1IiwiMTAuMj kuMs400jEyMzQ1IiwiMTAuMjkuMS4zojEyMzQlIiwiMTAuMjkuMs420jEyMzQ1I10sI1V1aWRzIjpbIjhjZTI2ZDBkLTJhN2MtNGViZi1hNGJjLTgwYmU4YTZjY2VkMiIsIjJmNDE2YTcyLTN12DAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIjlkNjQ3Y2JhLWE0ZmItNDA1MCliNWNhLTZhYjE3YjgxOGE4MiIsImF1NmNhMWYOLTQ4MzQtNGMyMC05MDk2LTIZZTI5YTQ3MTE5ZiIs ImUONjU4ZmY3LTQxNDMtNDF12S1iYWJmLTQwYmU4MZNIMTkINCIsIjdiYmYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==
* Hostname was NOT found in DNS cache
★ Trying 10.29.2.1...
* Connected to10.29.2.1(10.29.2.1)port12345(#0)
> PUT /temp/eyJOYW11IjoidGVzdDYiLCJTaXplIjoxMDAWMDASIkhhc2gioiJtWE5YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyUOdMbotiU2VFNW5jPSIsI1N1cn21cnMiolsiMTAuMjkuMS410jEyMzQ1IiwiMTAuMjkuMS4yojEyMzQ1IiwiMTAuMjkuMs4xojEyMzQ1IiwiMTAuMjkuMS400jEyMzQ1IiwiMTAuMjkuMS4zojEyMzQlIiwiMTAuMjkuMS420jEyMzQ1I10sI1VlaWRzIjpbIjhj2TI2ZDBkLTJhN2MtNGVizi1hNGJjLTgwYmU4YTZjY2VkMiIsIjJmNDE2YTcyLTN12DAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIjlkNjQ3Y2JhLWE0ZmItNDA1MC1iNWNhLTZhYjE3YjgxOGE4MiIs ImF1NmNhMWYOLTQ4MzQtNGMyMCO5MDk2LTIZZTI5YTQ3MTE5ZiIs ImUONjU4ZmY3LTQXNDMtNDF1Zs1iYWJmLTQwYmU4MzNIMTkINCIsIjdiYmYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==HTTP/1.1
> User-Agent:curl/7.38.0
> Host:10.29.2.1:12345
> Accept:*/
> Content-Length:50000
> Content-Type:application/x-www-form-urlencoded
> Expect:100-continue
>
< HTTP/1.1 100 Continue
< HTTP/1.12000K
< Date:Tue,15 Aug 2017 17:13:28 GMT
< Content-Length:0
< Content-Type:text/plain;charset=utf-8
< 
* Connection #0 to host 10.29.2.1 left intact
50000 bytes(50kB)copied,0.000433249s,115MB/s
```

可以看到，我们的PUT命令上传了50000字节，且接口服务返回了200OK。但是实际写入token的数据有多少呢？让我们用HEAD命令查看。
```bash
➜  curl -I 10.29.2.1:12345/temp/eyJOYW1lIjoidGVzdDYiLCJTaXplIjoxMDAwMDAsIkhhc2gioiJtWE5YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyU0dMb0tiU2VENW5jPSIsIlNlcnZ1cnMiolsiMTAuMjkuMs410jEyMzQ1IiwiMTAuMjkuMS4yojEyMzQlIiwiMTAuMjkuMS4xojEyMzQlIiwiMTAuMj kuMS400jEyMzQlIiwiMTAuMj kuMs4zojEyMzQlIiwiMTAuMj kuMS420jEyMzQ1I10sIlV1aWRzIjpbIjhjZTI2ZDBkLTJhN2MtNGViZi1hNGJjLTgwYmU4YTZjY2VkMiIsIj JmNDE2YTcyLTN1ZDAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIj1kNjQ3Y2JhLWEOZmItNDA1MC1iNWNhLTZhYjE3YjgxOGE4MiIs ImFlNmNhMWYOLTQ4MzQtNGMyMC05MDk2LTIZZTI5YTQ3MTE5ZiIsImUONjU4ZmY3LTQxNDMtNDF1ZS1iYWJmLTQwYmU4MZNIMTk1NCIsIjdiYmY0NzdkLWQxNjgtNDMxYi1iN2M2LTU3NDgwZWEwY2UyNyJdfQ==
HTTP/1.12000K
Content-Length:32000
Date:Tue,15 Aug 2017 17:24:07 GMT
Content-Type:text/plain;charset=utf-8
```

我们可以看到写入的数据只有32000个字节，所以下一次PUT要从32000字节
开始，让我们一次性把剩下的数据全部上传。
```bash
➜  dd if=/tmp/file of=/tmp/second bs=1000 skip=32 count=68
68+0 records in
68+0 records out
68000 bytes(68kB)copied,0.000775909s,87.6MB/s
➜  curl -v -XPUT --data-binary @/tmp/second -H "range:bytes=32000-"10.29.2.1:
12345/temp/eyJOYW11IjoidGVzdDYiLCJTaXplIjoxMDAwMDAsIkhhc2gioiJtWE5YdjZ
yWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyU0dMbotiU2VFNW5jPSIsIlN1cnZ1cnMiolsiM
TAuMjkuMs410jEyMzQ1IiwiMTAuMjkuMs4yojEyMzQ1IiwiMTAuMjkuMS4xojEyMzQ1Iiw
iMTAuMjkuMs400jEyMzQ1IiwiMTAuMjkuMs4zojEyMzQlIiwiMTAuMj kuMS420jEyMzQ1I
10sI1VlaWRzIjpbIjhjZTI2ZDBkLTJhN2MtNGVizi1hNGJjLTgwYmU4YTZjY2VkMiIsIjJ
mNDE2YTcyLTN1ZDAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIj1kNjQ3Y2JhLWE0ZmItN
DAIMC1iNWNhLTZhYjE3YjgxOGE4MiIs ImF1NmNhMWYOLTQ4MzQtNGMyMCO5MDk2LTIZZTI
5YTQ3MTE5ZiIsImUONjU4ZmY3LTQXNDMtNDF1ZS1iYWJmLTQwYmU4MZNIMTk1NCIsIjdiY
mYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==
Hostname was NOT found in DNS cache
*Trying10.29.2.1..
*Connected to10.29.2.1(10.29.2.1)port12345(t0)
PUT /temp/eyJOYW11IjoidGVzdDYiLCJTaXplIjoxMDAwMDAsIkhhc2gioiJtWE5
YdjZyWTdrK2pDNmpLVDRMRmhWTDVPTnNsaytyuodMbotiU2VENW5jPSIsI1N1cnz1cnMiol
siMTAuMj kuMS410jEyMzQ1IiwiMTAuMj kuMs4yojEyMzQ1IiwiMTAuMj kuMS4xojEyMzQ1
IiwiMTAuMjkuMS400jEyMzQ1IiwiMTAuMj kuMS4zojEyMzQ1IiwiMTAuMjkuMS420jEyMz
Q1I10sIlV1aWRzIjpbIjhjZTI2ZDBkLTJhN2MtNGVizilhNGJjLTgwYmU4YTZjY2VkMiIs
IjJmNDE2YTeyLTNIZDAtNGQwZS1hMjAyLTNjZDEzMjAxYzIzNyIsIjlkNjQ3Y2JhLWEOZm
ItNDA1MC1iNWNhLTZhYjE3YjgxOGE4MiIsImF1NmNhMWYOLTQ4MzQtNGMyMC05MDk2LTIz
ZTI5YTQ3MTE5ZiIsImUONjU4ZmY3LTQXNDMtNDF12S1iYWJmLTQwYmU4MzNIMTkINCIsIj
diYmYONzdkLWQxNjgtNDMxYiliN2M2LTU3NDgwZWEwY2UyNyJdfQ==HTTP/1.1
User-Agent:curl/7.38.0
>Host:10.29.2.1:12345
Accept:*/
range:bytes=32000-
Content-Length:68000
Content-Type:application/x-www-form-urlencoded
Expect:100-continue
>
HTTP/1.1 100 Continue
HTTP/1.1 200 OK
Date:Tue,15 Aug 2017 17:28:31 GMT
Content-Length:0
Content-Type:text/plain;charset=utf-8
Connection #0 to host 10.29.2.1 left intact
```
现在让我们GET这个对象对比一下数据。
```bash
➜  curl 10.29.2.1:12345/objects/test6 /tmp/output
$Total Received Xferd Average Speed TimeTime Time Current
Dload Upload Total Spent Left Speed
100 97k 0 97k 0 0 2922k 0--:--:----:--:----:--:--2959k
➜  diff -s /tmp/output /tmp/file
Files /tmp/output and /tmp/file are identical
```
接下来让我们试试用range头部指定下载test6对象的后68KB数据。
```bash
➜  curl 10.29.2.1:12345/objects/test6-H "range:bytes=32000-">/tmp/output2
 % Total % Received % Xferd Average Speed Time TimeTime Current
Dload Upload Total Spent Left Speed
10068000.068000002084k0--:--:----:--:----:--:--2075k
➜  diff -s /tmp/output2 /tmp/second
Files /tmp/output2 and /tmp/second are identical
```
## 6.4小结

对象存储系统为了抵御现实世界不良的网络环境，不得不提供断点续传的功能，允许客户端向服务端指明需要传输的数据范围。

本章实现了对象数据的断点续传。断点下载通过Range请求头部实现，客户端可
以在调用对象的GET接口时，通过Range头部告知服务端下载数据的偏移量，接口服
务将该偏移量之前的对象数据流丢弃并将剩下的部分返回给客户端。

断点上传则比较复杂，由于HTTP服务的特点，需要使用新的对象POST接口创
建一个token,并通过接口服务的temp接口访问token上传数据。客户端需要根据上传
对象的大小自行选择上传的方式：对于小对象，客户端可以使用之前的PUT方法上传：
对于大对象，客户端需要选择POST方法并自行分块上传。

除非正好将对象完整上传，否则接口服务每次只接受32000字节的整数倍，不足
的部分将被丢弃。如果客户端的分块小于32000字节，那么上传的数据就会被全部丢
弃。客户端需要在PUT每一块之前调用HEAD检查该token当前的进度，并选择合适
的偏移量和分块大小。

在下一章中，我们将讨论几个关于数据压缩的问题。


