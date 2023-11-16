---
title: 对象存储分布式代理osproxy(object storage distrbuted proxy)
toc: true
categories: 项目实战
tags:
  - osproxy
abbrlink: aeeb6673
date: 2023-09-26 20:02:20
sticky:
---

`osproxy`是一个使用Go语言开发的对象存储分布式代理(object-storage-distributed-proxy)，可以作为文件存储微服务，包括但不限于以下功能：

<!-- more -->

- 分布式uid及秒传，支持相同文件不同命名
- 分片读写，大文件上传，merge接口不用等待数据合并，分片上传完直接下载
- 异步任务，易扩展的event-handler，支持分片合并及其他文件处理任务
- 统一封装，降低业务接入复杂度，业务侧只需要存储文件uid
- 代理下载，不直接暴露底层存储厂商及格式
- 支持集群部署，proxy模块处理不同机器的分片转发
- 支持Local/MinIO/腾讯COS/阿里OSS等对象存储，易于扩展
- 支持Docker一键部署

https://github.com/qinguoyi/osproxy 


这个项目你可以理解为，你现在有个需求，就是上传下载，假设你现在体量不大用的是minio，你自己封装了上传，下载。如果后期体量上来了要用阿里云或者其他云，你就要重新改接口。那么群主这个项目的意思是，我们统一了接口，不管你以后用哪家的对象存储，只需要实现我们定义好的接口就可以了，这就满足了外部代理的条件。

可以作为文件存储微服务，我的理解是一个整体的项目里，群主的这个项目作为整个项目里的一个微服务，可能也是我理解错了

分布式是部署方式，微服务是开发协作方式，这俩没啥关系

## api层，api的handler和路由管理

```go
// router.go

package api

import (
	"github.com/gin-gonic/gin"
	v0 "github.com/qinguoyi/osproxy/api/v0"
	"github.com/qinguoyi/osproxy/app/middleware"
	"github.com/qinguoyi/osproxy/bootstrap"
	"github.com/qinguoyi/osproxy/config"
	"github.com/qinguoyi/osproxy/docs"
	gs "github.com/swaggo/gin-swagger"
	"github.com/swaggo/gin-swagger/swaggerFiles"
)

func NewRouter(
	conf *config.Configuration,
	lgLogger *bootstrap.LangGoLogger,
) *gin.Engine {
	if conf.App.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()

	// middleware
	corsM := middleware.NewCors()
	traceL := middleware.NewTrace(lgLogger)
	requestL := middleware.NewRequestLog(lgLogger)
	panicRecover := middleware.NewPanicRecover(lgLogger)

	// 跨域 trace-id 日志
	router.Use(corsM.Handler(), traceL.Handler(), requestL.Handler(), panicRecover.Handler())

	// 静态资源
	router.StaticFile("/assets", "../../static/image/back.png")

	// swag docs
	docs.SwaggerInfo.BasePath = "/"
	router.GET("/swagger/*any", gs.WrapHandler(swaggerFiles.Handler))

	// 动态资源 注册 api 分组路由
	setApiGroupRoutes(router)

	return router
}

func setApiGroupRoutes(
	router *gin.Engine,
) *gin.RouterGroup {
	group := router.Group("/api/storage/v0")
	{
		//health
		group.GET("/ping", v0.PingHandler)
		group.GET("/health", v0.HealthCheckHandler)

		// resume
		group.POST("/resume", v0.ResumeHandler)
		group.GET("/checkpoint", v0.CheckPointHandler)

		// link
		group.POST("/link/upload", v0.UploadLinkHandler)
		group.POST("/link/download", v0.DownloadLinkHandler)

		// proxy
		group.GET("/proxy", v0.IsOnCurrentServerHandler)

		// upload
		group.PUT("/upload", v0.UploadSingleHandler)
		group.PUT("/upload/multi", v0.UploadMultiPartHandler)
		group.PUT("/upload/merge", v0.UploadMergeHandler)

		//download
		group.GET("/download", v0.DownloadHandler)

	}
	return group
}
```

这段 Go 语言代码定义了用于配置和初始化一个 web 服务器路由的逻辑，使用了 `gin` 框架和一些中间件。我们可以逐步分析这两个函数：

### `NewRouter` 函数

1. **函数签名**:
    - `NewRouter(conf *config.Configuration, lgLogger *bootstrap.LangGoLogger) *gin.Engine`: 这个函数接受配置 (`config.Configuration`) 和日志记录器 (`bootstrap.LangGoLogger`) 作为参数，并返回一个 `gin.Engine` 实例，它代表了整个 web 应用的路由。
2. **环境配置**:
    - 根据配置中的环境变量 (`conf.App.Env`) 判断是否是生产环境。如果是，则设置 `gin` 的模式为 `ReleaseMode`。
3. **创建路由实例**:
    - 使用 `gin.New()` 创建一个新的 `gin.Engine` 实例。
4. **中间件配置**:
    - 创建各种中间件，包括跨域处理 (`corsM`)、追踪日志 (`traceL`)、请求日志 (`requestL`) 和异常恢复 (`panicRecover`)。
    - 将这些中间件添加到路由中，以便于所有请求都经过这些处理。
5. **静态资源**:
    - 配置静态资源的路由，例如图片。
6. **API 文档**:
    - 使用 `swaggo/gin-swagger` 生成 Swagger API 文档，并设置访问路径。
7. **动态资源路由**:
    - 调用 `setApiGroupRoutes` 函数设置 API 路由。

### `setApiGroupRoutes` 函数

1. **函数签名**:
    - `setApiGroupRoutes(router *gin.Engine) *gin.RouterGroup`: 这个函数接收一个 `gin.Engine` 实例并返回一个 `gin.RouterGroup` 实例。
2. **路由分组**:
    - 创建一个路由分组 `/api/storage/v0`。
3. **API 路由**:
    - 为不同的功能（如健康检查、断点续传、文件上传和下载等）设置路由。每个路由指向 `v0` 包中相应的处理函数。
4. **返回路由组**:
    - 最后，返回创建的路由组。

总体来说，这段代码是用来设置一个基于 `gin` 框架的 web 服务器的路由，包括静态资源、API 文档和各种 API 端点。它利用中间件处理跨域请求、日志记录、请求追踪和异常恢复等功能。


```go
// osproxy/api/v0/checkpoint.go

package v0

import (
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/pkg/repo"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
	"strconv"
)

// CheckPointHandler    断点续传
//
//	@Summary		断点续传
//	@Description	断点续传
//	@Tags			断点续传
//	@Accept			application/json
//	@Param			uid	query	string	true	"文件uid"
//	@Produce		application/json
//	@Success		200	{object}	web.Response{data=[]int}
//	@Router			/api/storage/v0/checkpoint [get]
func CheckPointHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	uid, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		web.ParamsError(c, "uid参数有误")
		return
	}

	// 断点续传只看未上传且分片的数据
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	partUidInfo, err := repo.NewMetaDataInfoRepo().GetPartByUid(lgDB, uid)
	if err != nil {
		lgLogger.WithContext(c).Error("查询断点续传数据失败")
		web.InternalError(c, "")
		return
	}
	if len(partUidInfo) == 0 {
		web.ParamsError(c, "当前文件uid不存在分片数据")
		return
	}

	// 断点续传查询分片数字
	partNumInfo, err := repo.NewMultiPartInfoRepo().GetPartNumByUid(lgDB, uid)
	var partNum []int
	for _, partInfo := range partNumInfo {
		partNum = append(partNum, partInfo.ChunkNum)
	}
	web.Success(c, partNum)
	return
}
```

定义了一个名为 `CheckPointHandler` 的函数，它是用于处理断点续传的 HTTP GET 请求：

1. **函数签名和注释**:
    - `CheckPointHandler(c *gin.Context)`：这是一个处理 HTTP 请求的函数，接受一个 `gin.Context` 类型的参数 `c`。`gin` 是一个流行的 Go 语言 web 框架。
    - 注释中的标签（如 `@Summary`、`@Description`、`@Tags` 等）用于生成 API 文档，描述了这个接口的用途（断点续传）、接收的参数（`uid`）和返回的响应类型。
2. **解析请求参数**:
    - 从请求中提取名为 `uid` 的查询参数。`uid` 代表文件的唯一标识符。
    - 使用 `strconv.ParseInt` 函数将 `uid` 从字符串转换为整数。如果转换失败，则返回参数错误信息。
3. **数据库操作**:
    - 创建 `LangGoDB` 的实例并使用默认配置连接数据库。
    - 调用 `GetPartByUid` 函数从 `MetaDataInfoRepo` 仓库中获取与 `uid` 相关的分片信息。如果查询失败，记录错误并返回内部错误信息。
    - 如果没有找到相关的分片数据，返回错误信息。
4. **处理断点续传数据**:
    - 调用 `GetPartNumByUid` 函数从 `MultiPartInfoRepo` 仓库中获取分片编号信息。
    - 将获取到的分片编号添加到 `partNum` 切片中。
5. **响应**:
    - 最后，使用 `web.Success` 函数将包含分片编号的 `partNum` 切片作为响应返回给客户端。

总的来说，这个函数处理来自客户端的断点续传请求，通过 `uid` 查询分片信息，如果找到相关信息，则返回分片编号，否则返回相应的错误信息。

```go
// osproxy/api/v0/download.go

package v0

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/qinguoyi/osproxy/app/models"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/repo"
	"github.com/qinguoyi/osproxy/app/pkg/storage"
	"github.com/qinguoyi/osproxy/app/pkg/thirdparty"
	"github.com/qinguoyi/osproxy/app/pkg/utils"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
	"io"
	"net/http"
	"os"
	"path"
	"sync"
	"time"
)

/*
对象下载
*/

// DownloadHandler    下载数据
//
//	@Summary		下载数据
//	@Description	下载数据
//	@Tags			下载
//	@Accept			application/json
//	@Param			uid			query	string	true	"文件uid"
//	@Param			name		query	string	true	"文件名称"
//	@Param			online		query	string	true	"是否在线"
//	@Param			date		query	string	true	"链接生成时间"
//	@Param			expire		query	string	true	"过期时间"
//	@Param			bucket		query	string	true	"存储桶"
//	@Param			object		query	string	true	"存储名称"
//	@Param			signature	query	string	true	"签名"
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/download [get]
func DownloadHandler(c *gin.Context) {
	// 校验参数
	uidStr := c.Query("uid")
	name := c.Query("name")
	online := c.Query("online")
	date := c.Query("date")
	expireStr := c.Query("expire")
	bucketName := c.Query("bucket")
	objectName := c.Query("object")
	signature := c.Query("signature")

	if online == "" {
		online = "1"
	}
	if !utils.Contains(online, []string{"0", "1"}) {
		web.ParamsError(c, "online参数有误")
		return
	}

	uid, err, errorInfo := base.CheckValid(uidStr, date, expireStr)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}
	if !base.CheckDownloadSignature(date, expireStr, bucketName, objectName, signature) {
		web.ParamsError(c, "签名校验失败")
		return
	}

	var meta *models.MetaDataInfo
	lgRedis := new(plugins.LangGoRedis).NewRedis()
	val, err := lgRedis.Get(context.Background(), fmt.Sprintf("%s-meta", uidStr)).Result()
	// key在redis中不存在
	if err == redis.Nil {
		lgDB := new(plugins.LangGoDB).Use("default").NewDB()
		meta, err = repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
		if err != nil {
			lgLogger.WithContext(c).Error("下载数据，查询数据元信息失败")
			web.InternalError(c, "内部异常")
			return
		}
		// 写入redis
		b, err := json.Marshal(meta)
		if err != nil {
			lgLogger.WithContext(c).Warn("下载数据，写入redis失败")
		}
		lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-meta", uidStr), b, 5*60*time.Second)
	} else {
		if err != nil {
			lgLogger.WithContext(c).Error("下载数据，查询redis失败")
			web.InternalError(c, "")
			return
		}
		var msg models.MetaDataInfo
		if err := json.Unmarshal([]byte(val), &msg); err != nil {
			lgLogger.WithContext(c).Error("下载数据，查询redis结果，序列化失败")
			web.InternalError(c, "")
			return
		}
		// 续期
		lgRedis.Expire(context.Background(), fmt.Sprintf("%s-meta", uidStr), 5*60*time.Second)
		meta = &msg
	}
	bucketName = meta.Bucket
	objectName = meta.StorageName
	fileSize := meta.StorageSize
	start, end := base.GetRange(c.GetHeader("Range"), fileSize)
	c.Writer.Header().Add("Content-Length", fmt.Sprintf("%d", end-start+1))
	if online == "0" {
		c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", name))
	} else {
		c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%s", name))
	}
	c.Writer.Header().Add("Content-Type", meta.ContentType)
	c.Writer.Header().Add("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))
	c.Writer.Header().Set("Accept-Ranges", "bytes")
	if start == fileSize {
		c.Status(http.StatusOK)
		return
	}
	if end == fileSize-1 {
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusPartialContent)
	}

	ch := make(chan []byte, 1024*1024*20)
	proxyFlag := false
	// local存储: 单文件上传完uid会删除, 大文件合并后会删除
	if bootstrap.NewConfig("").Local.Enabled {
		dirName := path.Join(utils.LocalStore, uidStr)
		// 不分片：单文件或大文件已合并
		if !meta.MultiPart {
			dirName = path.Join(utils.LocalStore, bucketName, objectName)
		}
		if _, err := os.Stat(dirName); os.IsNotExist(err) {
			proxyFlag = true
		}
	}
	if proxyFlag {
		// 不在本地，询问集群内其他服务并转发
		serviceList, err := base.NewServiceRegister().Discovery()
		if err != nil || serviceList == nil {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		var wg sync.WaitGroup
		var ipList []string
		ipChan := make(chan string, len(serviceList))
		for _, service := range serviceList {
			wg.Add(1)
			go func(ip string, port string, ipChan chan string, wg *sync.WaitGroup) {
				defer wg.Done()
				res, err := thirdparty.NewStorageService().Locate(utils.Scheme, ip, port, uidStr)
				if err != nil {
					fmt.Print(err.Error())
					return
				}
				ipChan <- res
			}(service.IP, service.Port, ipChan, &wg)
		}
		wg.Wait()
		close(ipChan)
		for re := range ipChan {
			ipList = append(ipList, re)
		}
		if len(ipList) == 0 {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		proxyIP := ipList[0]
		_, bodyData, _, err := thirdparty.NewStorageService().DownloadForward(c, utils.Scheme, proxyIP,
			bootstrap.NewConfig("").App.Port)
		if err != nil {
			lgLogger.WithContext(c).Error("下载转发失败")
			web.InternalError(c, err.Error())
			return
		}
		defer bodyData.Close()
		// 避免响应体全部读入内存，导致内存溢出问题
		buffer := new(bytes.Buffer)
		_, err = io.Copy(buffer, bodyData)
		if err != nil {
			lgLogger.WithContext(c).Error("转发下载数据发送失败")
			web.InternalError(c, "转发下载数据发送失败")
			return
		}
		data := buffer.Bytes()
		for len(data) > 0 {
			chunkSize := 1024 * 1024 // 每次读取 1MB 数据
			if len(data) < chunkSize {
				chunkSize = len(data)
			}
			ch <- data[:chunkSize]
			data = data[chunkSize:]
		}

		// 关闭 channel
		close(ch)
	} else {
		// local在本地 || 其他os
		if !meta.MultiPart {
			go func() {
				step := int64(1 * 1024 * 1024)
				for {
					if start >= end {
						close(ch)
						break
					}
					length := step
					if start+length > end {
						length = end - start + 1
					}
					data, err := storage.NewStorage().Storage.GetObject(bucketName, objectName, start, length)
					if err != nil && err != io.EOF {
						lgLogger.WithContext(c).Error(fmt.Sprintf("从对象存储获取数据失败%s", err.Error()))
					}
					ch <- data
					start += step
				}
			}()

			// 这种场景，会先从minio中获取全部数据，再流式传输，所以下载前会等待一下，但会把内存打爆
			//go func() {
			//	data, err := inner.NewStorage().Storage.GetObject(bucketName, objectName, start, end-start+1)
			//	if err != nil && err != io.EOF {
			//		lgLogger.WithContext(c).Error(fmt.Sprintf("从minio获取数据失败%s", err.Error()))
			//	}
			//	ch <- data
			//	close(ch)
			//}()

		} else {
			// 分片数据传输
			var multiPartInfoList []models.MultiPartInfo
			val, err := lgRedis.Get(context.Background(), fmt.Sprintf("%s-multiPart", uidStr)).Result()
			// key在redis中不存在
			if err == redis.Nil {
				lgDB := new(plugins.LangGoDB).Use("default").NewDB()
				if err := lgDB.Model(&models.MultiPartInfo{}).Where(
					"storage_uid = ? and status = ?", uid, 1).Order("chunk_num ASC").Find(&multiPartInfoList).Error; err != nil {
					lgLogger.WithContext(c).Error("下载数据，查询分片数据失败")
					web.InternalError(c, "查询分片数据失败")
					return
				}
				// 写入redis
				b, err := json.Marshal(multiPartInfoList)
				if err != nil {
					lgLogger.WithContext(c).Warn("下载数据，写入redis失败")
				}
				lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-multiPart", uidStr), b, 5*60*time.Second)
			} else {
				if err != nil {
					lgLogger.WithContext(c).Error("下载数据，查询redis失败")
					web.InternalError(c, "")
					return
				}
				var msg []models.MultiPartInfo
				if err := json.Unmarshal([]byte(val), &msg); err != nil {
					lgLogger.WithContext(c).Error("下载数据，查询reids，结果序列化失败")
					web.InternalError(c, "")
					return
				}
				// 续期
				lgRedis.Expire(context.Background(), fmt.Sprintf("%s-multiPart", uidStr), 5*60*time.Second)
				multiPartInfoList = msg
			}

			if meta.PartNum != len(multiPartInfoList) {
				lgLogger.WithContext(c).Error("分片数量和整体数量不一致")
				web.InternalError(c, "分片数量和整体数量不一致")
				return
			}

			// 查找起始分片
			index, totalSize := int64(0), int64(0)
			var startP, lengthP int64
			for {
				if totalSize >= start {
					startP, lengthP = 0, multiPartInfoList[index].StorageSize
				} else {
					if totalSize+multiPartInfoList[index].StorageSize > start {
						startP, lengthP = start-totalSize, multiPartInfoList[index].StorageSize-(start-totalSize)
					} else {
						totalSize += multiPartInfoList[index].StorageSize
						index++
						continue
					}
				}
				break
			}
			var chanSlice []chan int
			for i := 0; i < utils.MultiPartDownload; i++ {
				chanSlice = append(chanSlice, make(chan int, 1))
			}

			chanSlice[0] <- 1
			j := 0
			for i := 0; i < utils.MultiPartDownload; i++ {
				go func(i int, startP_, lengthP_ int64) {
					for {
						// 当前块计算完后，需要等待前一个块合并到主哈希
						<-chanSlice[i]

						if index >= int64(meta.PartNum) {
							close(ch)
							break
						}
						if totalSize >= start {
							startP_, lengthP_ = 0, multiPartInfoList[index].StorageSize
						}
						totalSize += multiPartInfoList[index].StorageSize

						data, err := storage.NewStorage().Storage.GetObject(
							multiPartInfoList[index].Bucket,
							multiPartInfoList[index].StorageName,
							startP_,
							lengthP_,
						)
						if err != nil && err != io.EOF {
							lgLogger.WithContext(c).Error(fmt.Sprintf("从对象存储获取数据失败%s", err.Error()))
						}
						// 合并到主哈希
						ch <- data
						index++
						// 这里要注意适配chanSlice的长度
						if j == utils.MultiPartDownload-1 {
							j = 0
						} else {
							j++
						}
						chanSlice[j] <- 1
					}
				}(i, startP, lengthP)
			}
		}
	}

	// 在使用 Stream 响应时，需要在调用stream之前设置status
	c.Stream(func(w io.Writer) bool {
		defer func() {
			if err := recover(); err != nil {
				lgLogger.WithContext(c).Error(fmt.Sprintf("stream流式响应出错，%s", err))
			}
		}()
		data, ok := <-ch
		if !ok {
			return false
		}
		_, err := w.Write(data)
		if err != nil {
			lgLogger.WithContext(c).Error(fmt.Sprintf("写入http响应出错，%s", err.Error()))
			return false
		}
		return true
	})
	return
}
```

这段 Go 语言代码定义了一个名为 `DownloadHandler` 的函数，用于处理下载请求。该函数是一个典型的 HTTP 服务端处理逻辑，使用 `gin` web 框架，并涉及到多个组件，如 Redis 缓存、数据库操作、条件判断、文件读取、并发处理等。让我们逐步分析它：

### 函数签名和注释

- `DownloadHandler(c *gin.Context)`：这是一个处理 HTTP 请求的函数，接受一个 `gin.Context` 类型的参数 `c`。函数注释提供了 Swagger API 文档的相关信息，如参数和响应类型。

### 参数解析和校验

- 从请求中获取多个查询参数（如 `uid`, `name`, `online`, `date`, `expire`, `bucket`, `object`, `signature`）。
- 进行参数校验，包括检查 `online` 参数的有效性和签名校验。

### Redis 缓存和数据库操作

- 尝试从 Redis 中获取元数据信息。如果不存在，则从数据库中查询并存入 Redis。
- 对于分片数据，也进行类似的 Redis 缓存和数据库查询操作。

### 文件下载处理逻辑

- 根据元数据信息和请求的范围（通过 HTTP `Range` 头部指定）设置响应头。
- 通过不同条件判断决定下载资源的来源，可以是本地存储、对象存储或者通过集群其他服务代理下载。

### 本地和代理下载逻辑

- 如果数据在本地存储或对象存储中，使用 Go 的并发特性（goroutines）和通道（channels）来读取数据并以流式传输的方式发送到客户端。
- 如果数据需要通过代理下载，首先发现服务集群中可用的节点，然后从选定的节点下载数据，同样以流式传输的方式发送到客户端。

### 并发和流式响应

- 对于分片数据，使用多个 goroutine 并发读取各个分片，再通过主通道将数据发送到客户端。
- 使用 `c.Stream` 以流式方式将数据写入 HTTP 响应。这种方式适合大文件传输，因为它可以减少内存占用并提高效率。

### 错误处理和日志记录

- 在多个地方进行错误检查，并在发生错误时记录日志并发送适当的 HTTP 响应。

### 总结

这个函数是一个复杂的下载处理逻辑，涉及到许多典型的 web 开发和并发处理场景。它充分利用了 Go 的并发特性，以及中间件和框架提供的功能，以实现高效且可靠的文件下载服务。

```go
// api/v0/healthcheck.go

package v0

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
)

var lgLogger *bootstrap.LangGoLogger

// 不能提前创建，变量的初始化在main之前，导致lgDB为nil
//var lgDB = new(plugins.LangGoDB).NewDB()

// PingHandler 测试
//
//	@Summary		测试接口
//	@Description	测试接口
//	@Tags			测试
//	@Accept			application/json
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/ping [get]
func PingHandler(c *gin.Context) {
	var lgDB = new(plugins.LangGoDB).Use("default").NewDB()

	var lgRedis = new(plugins.LangGoRedis).NewRedis()

	lgDB.Exec("select now();")
	lgLogger.WithContext(c).Info("test router")

	// Redis Test
	err := lgRedis.Set(c, "key", "value", 0).Err()
	if err != nil {
		panic(err)
	}
	val, err := lgRedis.Get(c, "key").Result()
	if err != nil {
		panic(err)
	}
	lgLogger.WithContext(c).Info(fmt.Sprintf("%v", val))
	web.Success(c, "Test Router...")
	return
}

// HealthCheckHandler 健康检查
//
//	@Summary		健康检查
//	@Description	健康检查
//	@Tags			检查
//	@Accept			application/json
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/health [get]
func HealthCheckHandler(c *gin.Context) {
	web.Success(c, "Health...")
	return
}
```

这段代码定义了两个 HTTP 请求处理函数，`PingHandler` 和 `HealthCheckHandler`，使用 Go 语言编写，并用到了 `gin` 框架。这些函数位于名为 `v0` 的 Go 包中。让我们逐步解释每个部分：

### 导入的包
- `fmt`, `gin`, `web`, `bootstrap`, `plugins`: 这些包提供了用于构建 web 应用的各种功能，包括 HTTP 路由（`gin`），日志（`bootstrap` 和 `plugins`），和 web 响应处理（`web`）。

### 全局变量
- `lgLogger *bootstrap.LangGoLogger`: 定义了一个全局的日志记录器变量。它可能在应用的其他部分被初始化。

### `PingHandler` 函数
1. **函数签名和注释**:
   - `PingHandler(c *gin.Context)`: 这是一个处理 HTTP GET 请求的函数，接受一个 `gin.Context` 类型的参数 `c`。注释提供了 Swagger API 文档的相关信息。

2. **数据库连接**:
   - 在函数内部创建了一个新的数据库连接（`lgDB`），而不是使用全局变量。这是因为提前创建全局变量可能会导致 `lgDB` 为 nil（因为变量初始化在 `main` 函数之前）。

3. **数据库操作测试**:
   - 执行一个简单的 SQL 查询（`select now();`）来测试数据库连接。

4. **日志记录**:
   - 使用 `lgLogger` 记录一条信息日志。

5. **Redis 操作测试**:
   - 使用 `lgRedis`（Redis 客户端）设置和获取一个键值对来测试 Redis 连接。
   - 如果操作中有错误，会触发 panic。

6. **响应**:
   - 使用 `web.Success` 函数向客户端发送成功响应。

### `HealthCheckHandler` 函数
1. **函数签名和注释**:
   - `HealthCheckHandler(c *gin.Context)`: 同样是一个处理 HTTP GET 请求的函数，用于健康检查。
   - 注释提供了 Swagger API 文档的相关信息。

2. **响应**:
   - 向客户端发送一个表示服务健康的成功响应。

### 总结
这段代码是一个 web 服务的一部分，主要用于测试和健康检查目的。它展示了如何在 Go 语言中使用 `gin` 框架创建 HTTP 请求处理函数、如何使用日志记录、以及如何与数据库和 Redis 进行交互。这些是构建现代 web 应用的常见模式。




这段 Go 语言代码包含两个 HTTP 处理函数，`PingHandler` 和 `HealthCheckHandler`，都是定义在名为 `v0` 的包中。这些函数使用了 `gin` 框架来处理 web 请求，并且与数据库和 Redis 进行交互。让我们逐步解析这两个函数：

### `PingHandler` 函数
1. **注释**:
   - 使用 Swagger 注释来描述 API，包括接口概要、描述、标签、接收和生产的内容类型、成功响应等。

2. **函数签名**:
   - `PingHandler(c *gin.Context)`: 接收一个 `gin.Context` 对象，这是 `gin` 框架中处理请求和响应的核心对象。

3. **数据库和 Redis 实例创建**:
   - 创建 `LangGoDB` 实例并使用默认配置（`Use("default")`）来连接数据库。
   - 创建 `LangGoRedis` 实例来连接 Redis。

4. **数据库操作**:
   - 执行一个简单的 SQL 查询（`select now();`），用于测试数据库连接。

5. **Redis 操作**:
   - 使用 Redis 实例设置一个键值对（`key`, `value`），并读取这个键的值来测试 Redis 连接。
   - 错误处理：如果 Redis 操作出错，使用 `panic` 引发异常。

6. **记录日志**:
   - 使用 `lgLogger` 记录操作信息。

7. **响应**:
   - 使用 `web.Success` 发送成功响应。

### `HealthCheckHandler` 函数
1. **注释**:
   - 同样使用 Swagger 注释描述 API。

2. **函数签名**:
   - `HealthCheckHandler(c *gin.Context)`: 同样接收一个 `gin.Context` 对象。

3. **响应**:
   - 发送简单的健康检查响应。

### 总结
- 这两个函数是 web 服务的一部分，用于处理 HTTP GET 请求。`PingHandler` 用于测试数据库和 Redis 连接是否正常，`HealthCheckHandler` 用于健康检查。
- `PingHandler` 中，数据库和 Redis 的实例是在函数内创建的，以确保它们在需要时可用（而不是在程序启动时初始化）。
- 这两个函数都遵循 `gin` 框架的标准模式来处理请求和发送响应。


```go
// osproxy/api/v0/link.go

package v0

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/qinguoyi/osproxy/app/models"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/repo"
	"github.com/qinguoyi/osproxy/app/pkg/utils"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
	"go.uber.org/zap"
	"os"
	"path"
	"strconv"
	"sync"
)

/*
对象信息，生成连接(上传、下载)
*/

// UploadLinkHandler    初始化上传连接
//
//	@Summary		初始化上传连接
//	@Description	初始化上传连接
//	@Tags			链接
//	@Accept			application/json
//	@Param			RequestBody	body	models.GenUpload	true	"生成上传链接请求体"
//	@Produce		application/json
//	@Success		200	{object}	web.Response{data=models.GenUploadResp}
//	@Router			/api/storage/v0/link/upload [post]
func UploadLinkHandler(c *gin.Context) {
	var genUploadReq models.GenUpload
	if err := c.ShouldBindJSON(&genUploadReq); err != nil {
		web.ParamsError(c, fmt.Sprintf("参数解析有误，详情：%s", err))
		return
	}
	if len(genUploadReq.FilePath) > utils.LinkLimit {
		web.ParamsError(c, fmt.Sprintf("批量上传路径数量有限，最多%d条", utils.LinkLimit))
		return
	}

	// deduplication filepath
	fileNameList := utils.RemoveDuplicates(genUploadReq.FilePath)
	for _, fileName := range fileNameList {
		if base.GetExtension(fileName) == "" {
			web.ParamsError(c, fmt.Sprintf("文件[%s]后缀有误，不能为空", fileName))
			return
		}
	}

	var resp []models.GenUploadResp
	var resourceInfo []models.MetaDataInfo
	respChan := make(chan models.GenUploadResp, len(fileNameList))
	metaDataInfoChan := make(chan models.MetaDataInfo, len(fileNameList))

	var wg sync.WaitGroup
	for _, fileName := range fileNameList {
		wg.Add(1)
		go base.GenUploadSingle(fileName, genUploadReq.Expire, respChan, metaDataInfoChan, &wg)
	}
	wg.Wait()
	close(respChan)
	close(metaDataInfoChan)

	for re := range respChan {
		resp = append(resp, re)
	}
	for re := range metaDataInfoChan {
		resourceInfo = append(resourceInfo, re)
	}
	if !(len(resp) == len(resourceInfo) && len(resp) == len(fileNameList)) {
		// clean local dir
		for _, i := range resp {
			dirName := path.Join(utils.LocalStore, i.Uid)
			go func() {
				_ = os.RemoveAll(dirName)
			}()
		}
		lgLogger.WithContext(c).Error("生成链接，生成的url和输入数量不一致")
		web.InternalError(c, "内部异常")
		return
	}

	// db batch create
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	if err := repo.NewMetaDataInfoRepo().BatchCreate(lgDB, &resourceInfo); err != nil {
		lgLogger.WithContext(c).Error("生成链接，批量落数据库失败，详情：", zap.Any("err", err.Error()))
		web.InternalError(c, "内部异常")
		return
	}
	web.Success(c, resp)
}

// DownloadLinkHandler    获取下载连接
//
//	@Summary		获取下载连接
//	@Description	获取下载连接
//	@Tags			链接
//	@Accept			application/json
//	@Param			RequestBody	body	models.GenDownload	true	"下载链接请求体"
//	@Produce		application/json
//	@Success		200	{object}	web.Response{data=models.GenDownloadResp}
//	@Router			/api/storage/v0/link/download [post]
func DownloadLinkHandler(c *gin.Context) {
	var genDownloadReq models.GenDownload
	if err := c.ShouldBindJSON(&genDownloadReq); err != nil {
		web.ParamsError(c, fmt.Sprintf("参数解析有误，详情：%s", err))
		return
	}

	if len(genDownloadReq.Uid) > 200 {
		web.ParamsError(c, "uid获取下载链接，数量不能超过200个")
		return
	}
	expireStr := fmt.Sprintf("%d", genDownloadReq.Expire)
	var uidList []int64
	var resp []models.GenDownloadResp
	for _, uidStr := range utils.RemoveDuplicates(genDownloadReq.Uid) {
		uid, err := strconv.ParseInt(uidStr, 10, 64)
		if err != nil {
			web.ParamsError(c, "uid参数有误")
			return
		}

		// 查询redis
		key := fmt.Sprintf("%d-%s", uid, expireStr)
		lgRedis := new(plugins.LangGoRedis).NewRedis()
		val, err := lgRedis.Get(context.Background(), key).Result()
		// key在redis中不存在
		if err == redis.Nil {
			uidList = append(uidList, uid)
			continue
		}
		if err != nil {
			lgLogger.WithContext(c).Error("获取下载链接，查询redis失败")
			web.InternalError(c, "")
			return
		}
		var msg models.GenDownloadResp
		if err := json.Unmarshal([]byte(val), &msg); err != nil {
			lgLogger.WithContext(c).Error("查询redis结果，序列化失败")
			web.InternalError(c, "")
			return
		}
		resp = append(resp, msg)
	}

	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	metaList, err := repo.NewMetaDataInfoRepo().GetByUidList(lgDB, uidList)
	if err != nil {
		lgLogger.WithContext(c).Error("获取下载链接，查询元数据信息失败")
		web.InternalError(c, "内部异常")
		return
	}
	if len(metaList) == 0 && len(resp) == 0 {
		web.Success(c, nil)
		return
	}
	uidMapMeta := map[int64]models.MetaDataInfo{}
	for _, meta := range metaList {
		uidMapMeta[meta.UID] = meta
	}

	respChan := make(chan models.GenDownloadResp, len(metaList))
	var wg sync.WaitGroup
	for _, uid := range uidList {
		wg.Add(1)
		go base.GenDownloadSingle(uidMapMeta[uid], expireStr, respChan, &wg)
	}
	wg.Wait()
	close(respChan)

	for re := range respChan {
		resp = append(resp, re)
	}
	web.Success(c, resp)
	return
}
```

这段代码定义了两个函数，`UploadLinkHandler` 和 `DownloadLinkHandler`，都属于 `v0` 包。这些函数用于处理文件上传和下载链接的生成，使用了 `gin` 框架来处理 HTTP 请求。我们将一步步解析这两个函数：

### `UploadLinkHandler` 函数

1. **参数解析**:
    - 使用 `c.ShouldBindJSON` 解析请求体到 `models.GenUpload` 结构体。
    - 检查路径数量是否超过限制。
2. **路径去重和校验**:
    - 去重并检查每个文件路径的有效性。
3. **并发生成上传链接**:
    - 使用 `sync.WaitGroup` 和 Go 协程并发地为每个文件生成上传链接。
    - 通过两个通道 `respChan` 和 `metaDataInfoChan` 收集生成的上传链接和元数据信息。
4. **链接和元数据的收集**:
    - 从通道中收集生成的链接和元数据信息。
5. **数据一致性检查**:
    - 检查生成的链接数量与输入文件数量是否一致，不一致时清理本地目录并返回错误。
6. **批量存储元数据到数据库**:
    - 使用数据库批量操作存储元数据。
7. **返回生成的上传链接**:
    - 使用 `web.Success` 返回生成的链接。

### `DownloadLinkHandler` 函数

1. **参数解析**:
    - 解析请求体到 `models.GenDownload` 结构体。
2. **参数校验**:
    - 检查 `uid` 数量是否超过限制。
3. **Redis 查询和数据库回退**:
    - 对每个 `uid`，先尝试从 Redis 获取链接，如果不存在则记录下来，稍后从数据库查询。
4. **数据库查询**:
    - 使用记录下的 `uid` 从数据库查询元数据。
5. **并发生成下载链接**:
    - 使用 `sync.WaitGroup` 和 Go 协程为数据库查询出的元数据生成下载链接。
6. **收集生成的下载链接**:
    - 从通道中收集生成的下载链接。
7. **返回生成的下载链接**:
    - 使用 `web.Success` 返回生成的链接。

### 总结

- 这两个函数处理文件上传和下载链接的生成，涉及参数解析、数据校验、并发处理、Redis 缓存操作和数据库交互。
- 通过并发编程提高了处理效率，同时使用通道和 `sync.WaitGroup` 来同步并发操作的结果。
- 对异常情况进行了处理，包括参数错误、Redis 和数据库查询失败等，并记录相关日志。








```go
// osproxy/api/v0/proxy.go

package v0

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/utils"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"os"
	"path"
	"strconv"
)

// IsOnCurrentServerHandler   .
//
//	@Summary		询问文件是否在当前服务
//	@Description	询问文件是否在当前服务
//	@Tags			proxy
//	@Accept			application/json
//	@Param			uid	query	string	true	"uid"
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/proxy [get]
func IsOnCurrentServerHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	_, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		web.ParamsError(c, fmt.Sprintf("uid参数有误，详情:%s", err))
		return
	}
	dirName := path.Join(utils.LocalStore, uidStr)
	if _, err := os.Stat(dirName); os.IsNotExist(err) {
		web.NotFoundResource(c, "")
		return
	} else {
		ip, err := base.GetOutBoundIP()
		if err != nil {
			panic(err)
		}
		web.Success(c, ip)
		return
	}
}
```

这段代码定义了一个名为 `IsOnCurrentServerHandler` 的函数，它是一个 HTTP GET 请求处理器，用于判断特定文件是否在当前服务上。我们可以逐步分析这个函数：

### 导入的包
- `fmt`: 格式化输入输出。
- `github.com/gin-gonic/gin`: Gin 是一个用 Go (Golang) 编写的 Web 框架。
- `github.com/qinguoyi/osproxy/app/pkg/*`: 这些可能是自定义的包，用于处理应用的基本操作、工具函数和 web 相关的响应。

### 函数 `IsOnCurrentServerHandler`
1. **请求参数解析**:
   - 从请求的查询参数中获取 `uid` 字符串。

2. **参数有效性验证**:
   - 尝试将 `uid` 转换为整数。如果转换失败（即 `uid` 不是有效的整数字符串），返回参数错误信息。

3. **文件存在性检查**:
   - 使用 `path.Join` 和 `os.Stat` 来确定由 `uid` 指定的文件或目录是否存在于服务器的本地存储中。

4. **响应处理**:
   - 如果文件或目录不存在，则返回“未找到资源”的错误。
   - 如果文件或目录存在，则获取当前服务器的出站 IP 地址，并将其作为成功响应返回。

### 错误处理和响应
- 函数使用 `gin` 框架的 `c.Query` 方法来获取查询参数，并使用 `web` 包的函数来发送不同类型的响应，例如 `web.ParamsError`、`web.NotFoundResource` 和 `web.Success`。
- 在检查文件存在性时，如果有错误（除了“文件不存在”的错误），它会引发 panic。这在生产环境中可能不是最佳实践，因为 panic 会中断当前 Goroutine，可能导致服务不稳定。

### 总结
这个函数是一个 web 服务的一部分，用于检查请求的文件是否存储在当前服务的本地存储中。它首先验证输入参数的有效性，然后检查文件的存在性，并据此返回相应的响应。这个函数的实现显示了参数解析、错误处理、文件系统交互和网络操作的基本方法。








```go
// osproxy/api/v0/resume.go

package v0

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/models"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/repo"
	"github.com/qinguoyi/osproxy/app/pkg/utils"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
	"go.uber.org/zap"
	"path/filepath"
	"time"
)

/*
秒传及断点续传(上传)
*/

// ResumeHandler    秒传&断点续传
//
//	@Summary		秒传&断点续传
//	@Description	秒传&断点续传
//	@Tags			秒传
//	@Accept			application/json
//	@Param			RequestBody	body	models.ResumeReq	true	"秒传请求体"
//	@Produce		application/json
//	@Success		200	{object}	web.Response{data=[]models.ResumeResp}
//	@Router			/api/storage/v0/resume [post]
func ResumeHandler(c *gin.Context) {
	resumeReq := models.ResumeReq{}
	if err := c.ShouldBindJSON(&resumeReq); err != nil {
		web.ParamsError(c, "参数有误")
		return
	}
	if len(resumeReq.Data) > utils.LinkLimit {
		web.ParamsError(c, fmt.Sprintf("判断文件秒传，数量不能超过%d个", utils.LinkLimit))
		return
	}

	var md5List []string
	md5MapName := map[string]string{}
	for _, i := range resumeReq.Data {
		md5MapName[i.Md5] = i.Path
		md5List = append(md5List, i.Md5)
	}
	md5List = utils.RemoveDuplicates(md5List)

	md5MapResp := map[string]*models.ResumeResp{}
	for _, md5 := range md5List {
		tmp := models.ResumeResp{
			Uid: "",
			Md5: md5,
		}
		md5MapResp[md5] = &tmp
	}

	// 秒传只看已上传且完整文件的数据
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	resumeInfo, err := repo.NewMetaDataInfoRepo().GetResumeByMd5(lgDB, md5List)
	if err != nil {
		lgLogger.WithContext(c).Error("查询秒传数据失败")
		web.InternalError(c, "")
		return
	}
	// 去重
	md5MapMetaInfo := map[string]models.MetaDataInfo{}
	for _, resume := range resumeInfo {
		if _, ok := md5MapMetaInfo[resume.Md5]; !ok {
			md5MapMetaInfo[resume.Md5] = resume
		}
	}

	var newMetaDataList []models.MetaDataInfo
	for _, resume := range resumeReq.Data {
		if _, ok := md5MapMetaInfo[resume.Md5]; !ok {
			continue
		}
		// 相同数据上传需要复制一份数据
		uid, _ := base.NewSnowFlake().NextId()
		now := time.Now()
		newMetaDataList = append(newMetaDataList,
			models.MetaDataInfo{
				UID:         uid,
				Bucket:      md5MapMetaInfo[resume.Md5].Bucket,
				Name:        filepath.Base(resume.Path),
				StorageName: md5MapMetaInfo[resume.Md5].StorageName,
				Address:     md5MapMetaInfo[resume.Md5].Address,
				Md5:         resume.Md5,
				MultiPart:   false,
				StorageSize: md5MapMetaInfo[resume.Md5].StorageSize,
				Status:      1,
				ContentType: md5MapMetaInfo[resume.Md5].ContentType,
				CreatedAt:   &now,
				UpdatedAt:   &now,
			})
		md5MapResp[resume.Md5].Uid = fmt.Sprintf("%d", uid)
	}
	if len(newMetaDataList) != 0 {
		if err := repo.NewMetaDataInfoRepo().BatchCreate(lgDB, &newMetaDataList); err != nil {
			lgLogger.WithContext(c).Error("秒传批量落数据库失败，详情：", zap.Any("err", err.Error()))
			web.InternalError(c, "内部异常")
			return
		}
	}
	lgRedis := new(plugins.LangGoRedis).NewRedis()
	for _, metaDataCache := range newMetaDataList {
		b, err := json.Marshal(metaDataCache)
		if err != nil {
			lgLogger.WithContext(c).Warn("秒传数据，写入redis失败")
		}
		lgRedis.SetNX(context.Background(), fmt.Sprintf("%d-meta", metaDataCache.UID), b, 5*60*time.Second)
	}

	var respList []models.ResumeResp
	for _, resp := range md5MapResp {
		respList = append(respList, *resp)
	}
	web.Success(c, respList)
	return
}
```

这段代码定义了一个名为 `ResumeHandler` 的函数，用于处理秒传和断点续传的 HTTP POST 请求。该函数部分实现了秒传功能，即通过检查文件的 MD5 值来快速确定文件是否已经存在于服务中，从而避免重复上传。我们可以逐步解析这个函数：

### 导入的包
- 标准库和第三方库被导入，以支持网络通信、数据处理、日志记录等。

### 函数 `ResumeHandler`
1. **参数解析**:
   - 使用 `c.ShouldBindJSON` 将请求体绑定到 `models.ResumeReq` 结构体。这个结构体预计包含文件的 MD5 值和路径。

2. **参数校验**:
   - 检查请求中包含的数据项数量是否超过了预设的限制。

3. **MD5 值和路径处理**:
   - 提取并去重 MD5 值，同时建立一个从 MD5 值到文件路径的映射。

4. **数据库查询**:
   - 查询数据库，检查每个 MD5 值对应的文件是否已经存在。

5. **处理查询结果**:
   - 对于数据库中已存在的文件，准备创建新的元数据条目，表示这些文件已被上传。这里使用了 `base.NewSnowFlake().NextId()` 来生成唯一标识符（UID）。

6. **批量创建元数据**:
   - 如果有新的元数据需要创建，通过 `BatchCreate` 批量存储它们到数据库。

7. **Redis 缓存更新**:
   - 对于新创建的元数据条目，将它们序列化为 JSON 并存储到 Redis 缓存。

8. **构建响应**:
   - 将处理结果组装成响应列表，并通过 `web.Success` 发送给客户端。

### 错误处理
- 在多个地方进行错误检查，如参数绑定失败、数据库查询错误、批量创建元数据错误等，对于这些情况进行了适当的错误响应。

### 总结
`ResumeHandler` 函数实现了秒传的核心逻辑，通过检查文件的 MD5 值来确定文件是否已经存在，如果存在，则复制一份数据的元数据，并更新数据库和缓存。该函数利用了并发编程、数据库操作、缓存管理以及错误处理等多种编程技巧。






```go
// osproxy/api/v0/upload.go

package v0

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/models"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/repo"
	"github.com/qinguoyi/osproxy/app/pkg/storage"
	"github.com/qinguoyi/osproxy/app/pkg/thirdparty"
	"github.com/qinguoyi/osproxy/app/pkg/utils"
	"github.com/qinguoyi/osproxy/app/pkg/web"
	"github.com/qinguoyi/osproxy/bootstrap"
	"github.com/qinguoyi/osproxy/bootstrap/plugins"
	"go.uber.org/zap"
	"io"
	"os"
	"path"
	"strconv"
	"sync"
	"time"
)

/*
对象上传
*/

// UploadSingleHandler    上传单个文件
//
//	@Summary		上传单个文件
//	@Description	上传单个文件
//	@Tags			上传
//	@Accept			multipart/form-data
//	@Param			file		formData	file	true	"上传的文件"
//	@Param			uid			query		string	true	"文件uid"
//	@Param			md5			query		string	true	"md5"
//	@Param			date		query		string	true	"链接生成时间"
//	@Param			expire		query		string	true	"过期时间"
//	@Param			signature	query		string	true	"签名"
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/upload [put]
func UploadSingleHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	md5 := c.Query("md5")
	date := c.Query("date")
	expireStr := c.Query("expire")
	signature := c.Query("signature")

	uid, err, errorInfo := base.CheckValid(uidStr, date, expireStr)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}

	if !base.CheckUploadSignature(date, expireStr, signature) {
		web.ParamsError(c, "签名校验失败")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		web.ParamsError(c, fmt.Sprintf("解析文件参数失败，详情：%s", err))
		return
	}

	// 判断记录是否存在
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	metaData, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
	if err != nil {
		web.NotFoundResource(c, "当前上传链接无效，uid不存在")
		return
	}

	dirName := path.Join(utils.LocalStore, uidStr)
	// 判断是否上传过，md5
	resumeInfo, err := repo.NewMetaDataInfoRepo().GetResumeByMd5(lgDB, []string{md5})
	if err != nil {
		lgLogger.WithContext(c).Error("查询文件是否已上传失败")
		web.InternalError(c, "")
		return
	}
	if len(resumeInfo) != 0 {
		now := time.Now()
		if err := repo.NewMetaDataInfoRepo().Updates(lgDB, uid, map[string]interface{}{
			"bucket":       resumeInfo[0].Bucket,
			"storage_name": resumeInfo[0].StorageName,
			"address":      resumeInfo[0].Address,
			"md5":          md5,
			"storage_size": resumeInfo[0].StorageSize,
			"multi_part":   false,
			"status":       1,
			"updated_at":   &now,
			"content_type": resumeInfo[0].ContentType,
		}); err != nil {
			lgLogger.WithContext(c).Error("上传完更新数据失败")
			web.InternalError(c, "上传完更新数据失败")
			return
		}
		if err := os.RemoveAll(dirName); err != nil {
			lgLogger.WithContext(c).Error(fmt.Sprintf("删除目录失败，详情%s", err.Error()))
			web.InternalError(c, fmt.Sprintf("删除目录失败，详情%s", err.Error()))
			return
		}
		// 首次写入redis 元数据
		lgRedis := new(plugins.LangGoRedis).NewRedis()
		metaCache, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
		if err != nil {
			lgLogger.WithContext(c).Error("上传数据，查询数据元信息失败")
			web.InternalError(c, "内部异常")
			return
		}
		b, err := json.Marshal(metaCache)
		if err != nil {
			lgLogger.WithContext(c).Warn("上传数据，写入redis失败")
		}
		lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-meta", uidStr), b, 5*60*time.Second)

		web.Success(c, "")
		return
	}
	// 判断是否在本地
	if _, err := os.Stat(dirName); os.IsNotExist(err) {
		// 不在本地，询问集群内其他服务并转发
		serviceList, err := base.NewServiceRegister().Discovery()
		if err != nil || serviceList == nil {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		var wg sync.WaitGroup
		var ipList []string
		ipChan := make(chan string, len(serviceList))
		for _, service := range serviceList {
			wg.Add(1)
			go func(ip string, port string, ipChan chan string, wg *sync.WaitGroup) {
				defer wg.Done()
				res, err := thirdparty.NewStorageService().Locate(utils.Scheme, ip, port, uidStr)
				if err != nil {
					fmt.Print(err.Error())
					return
				}
				ipChan <- res
			}(service.IP, service.Port, ipChan, &wg)
		}
		wg.Wait()
		close(ipChan)
		for re := range ipChan {
			ipList = append(ipList, re)
		}
		if len(ipList) == 0 {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		proxyIP := ipList[0]
		_, _, _, err = thirdparty.NewStorageService().UploadForward(c, utils.Scheme, proxyIP,
			bootstrap.NewConfig("").App.Port, uidStr, true)
		if err != nil {
			lgLogger.WithContext(c).Error("上传单文件，转发失败")
			web.InternalError(c, err.Error())
			return
		}
		web.Success(c, "")
		return
	}
	// 在本地
	fileName := path.Join(utils.LocalStore, uidStr, metaData.StorageName)
	out, err := os.Create(fileName)
	if err != nil {
		lgLogger.WithContext(c).Error("本地创建文件失败")
		web.InternalError(c, "本地创建文件失败")
		return
	}
	src, err := file.Open()
	if err != nil {
		lgLogger.WithContext(c).Error("打开本地文件失败")
		web.InternalError(c, "打开本地文件失败")
		return
	}
	if _, err = io.Copy(out, src); err != nil {
		lgLogger.WithContext(c).Error("请求数据存储到文件失败")
		web.InternalError(c, "请求数据存储到文件失败")
		return
	}
	// 校验md5
	md5Str, err := base.CalculateFileMd5(fileName)
	if err != nil {
		lgLogger.WithContext(c).Error(fmt.Sprintf("生成md5失败，详情%s", err.Error()))
		web.InternalError(c, err.Error())
		return
	}
	if md5Str != md5 {
		web.ParamsError(c, fmt.Sprintf("校验md5失败，计算结果:%s, 参数:%s", md5Str, md5))
		return
	}
	// 上传到minio
	contentType, err := base.DetectContentType(fileName)
	if err != nil {
		lgLogger.WithContext(c).Error("判断文件content-type失败")
		web.InternalError(c, "判断文件content-type失败")
		return
	}
	if err := storage.NewStorage().Storage.PutObject(metaData.Bucket, metaData.StorageName, fileName, contentType); err != nil {
		lgLogger.WithContext(c).Error("上传到minio失败")
		web.InternalError(c, "上传到minio失败")
		return
	}
	// 更新元数据
	now := time.Now()
	fileInfo, _ := os.Stat(fileName)
	if err := repo.NewMetaDataInfoRepo().Updates(lgDB, metaData.UID, map[string]interface{}{
		"md5":          md5Str,
		"storage_size": fileInfo.Size(),
		"multi_part":   false,
		"status":       1,
		"updated_at":   &now,
		"content_type": contentType,
	}); err != nil {
		lgLogger.WithContext(c).Error("上传完更新数据失败")
		web.InternalError(c, "上传完更新数据失败")
		return
	}
	_, _ = out.Close(), src.Close()

	if err := os.RemoveAll(dirName); err != nil {
		lgLogger.WithContext(c).Error(fmt.Sprintf("删除目录失败，详情%s", err.Error()))
		web.InternalError(c, fmt.Sprintf("删除目录失败，详情%s", err.Error()))
		return
	}

	// 首次写入redis 元数据
	lgRedis := new(plugins.LangGoRedis).NewRedis()
	metaCache, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
	if err != nil {
		lgLogger.WithContext(c).Error("上传数据，查询数据元信息失败")
		web.InternalError(c, "内部异常")
		return
	}
	b, err := json.Marshal(metaCache)
	if err != nil {
		lgLogger.WithContext(c).Warn("上传数据，写入redis失败")
	}
	lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-meta", uidStr), b, 5*60*time.Second)

	web.Success(c, "")
	return
}

// UploadMultiPartHandler    上传分片文件
//
//	@Summary		上传分片文件
//	@Description	上传分片文件
//	@Tags			上传
//	@Accept			multipart/form-data
//	@Param			file		formData	file	true	"上传的文件"
//	@Param			uid			query		string	true	"文件uid"
//	@Param			md5			query		string	true	"md5"
//	@Param			chunkNum	query		string	true	"当前分片id"
//	@Param			date		query		string	true	"链接生成时间"
//	@Param			expire		query		string	true	"过期时间"
//	@Param			signature	query		string	true	"签名"
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/upload/multi [put]
func UploadMultiPartHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	md5 := c.Query("md5")
	chunkNumStr := c.Query("chunkNum")
	date := c.Query("date")
	expireStr := c.Query("expire")
	signature := c.Query("signature")

	uid, err, errorInfo := base.CheckValid(uidStr, date, expireStr)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}

	chunkNum, err := strconv.ParseInt(chunkNumStr, 10, 64)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}

	if !base.CheckUploadSignature(date, expireStr, signature) {
		web.ParamsError(c, "签名校验失败")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		web.ParamsError(c, fmt.Sprintf("解析文件参数失败，详情：%s", err))
		return
	}

	// 判断记录是否存在
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	metaData, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
	if err != nil {
		web.NotFoundResource(c, "当前上传链接无效，uid不存在")
		return
	}
	// 判断当前分片是否已上传
	var lgRedis = new(plugins.LangGoRedis).NewRedis()
	ctx := context.Background()
	createLock := base.NewRedisLock(&ctx, lgRedis, fmt.Sprintf("multi-part-%d-%d-%s", uid, chunkNum, md5))
	if flag, err := createLock.Acquire(); err != nil || !flag {
		lgLogger.WithContext(c).Error("上传多文件抢锁失败")
		web.InternalError(c, "上传多文件抢锁失败")
		return
	}
	partInfo, err := repo.NewMultiPartInfoRepo().GetPartInfo(lgDB, uid, chunkNum, md5)
	if err != nil {
		lgLogger.WithContext(c).Error("多文件上传，查询分片信息失败")
		web.InternalError(c, "内部异常")
		return
	}
	if len(partInfo) != 0 {
		web.Success(c, "")
		return
	}
	_, _ = createLock.Release()

	// 判断是否在本地
	dirName := path.Join(utils.LocalStore, uidStr)
	if _, err := os.Stat(dirName); os.IsNotExist(err) {
		// 不在本地，询问集群内其他服务并转发
		serviceList, err := base.NewServiceRegister().Discovery()
		if err != nil || serviceList == nil {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		var wg sync.WaitGroup
		var ipList []string
		ipChan := make(chan string, len(serviceList))
		for _, service := range serviceList {
			wg.Add(1)
			go func(ip string, port string, ipChan chan string, wg *sync.WaitGroup) {
				defer wg.Done()
				res, err := thirdparty.NewStorageService().Locate(utils.Scheme, ip, port, uidStr)
				if err != nil {
					fmt.Print(err.Error())
					return
				}
				ipChan <- res
			}(service.IP, service.Port, ipChan, &wg)
		}
		wg.Wait()
		close(ipChan)
		for re := range ipChan {
			ipList = append(ipList, re)
		}
		if len(ipList) == 0 {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		proxyIP := ipList[0]
		_, _, _, err = thirdparty.NewStorageService().UploadForward(c, utils.Scheme, proxyIP,
			bootstrap.NewConfig("").App.Port, uidStr, false)
		if err != nil {
			lgLogger.WithContext(c).Error("多文件上传，转发失败")
			web.InternalError(c, err.Error())
			return
		}
		web.Success(c, "")
		return
	}

	// 在本地
	fileName := path.Join(utils.LocalStore, uidStr, fmt.Sprintf("%d_%d", uid, chunkNum))
	out, err := os.Create(fileName)
	if err != nil {
		lgLogger.WithContext(c).Error("本地创建文件失败")
		web.InternalError(c, "本地创建文件失败")
		return
	}
	defer func(out *os.File) {
		_ = out.Close()
	}(out)
	src, err := file.Open()
	if err != nil {
		lgLogger.WithContext(c).Error("打开本地文件失败")
		web.InternalError(c, "打开本地文件失败")
		return
	}
	if _, err = io.Copy(out, src); err != nil {
		lgLogger.WithContext(c).Error("请求数据存储到文件失败")
		web.InternalError(c, "请求数据存储到文件失败")
		return
	}
	// 校验md5
	md5Str, err := base.CalculateFileMd5(fileName)
	if err != nil {
		lgLogger.WithContext(c).Error(fmt.Sprintf("生成md5失败，详情%s", err.Error()))
		web.InternalError(c, err.Error())
		return
	}
	if md5Str != md5 {
		lgLogger.WithContext(c).Error(fmt.Sprintf("校验md5失败，计算结果:%s, 参数:%s", md5Str, md5))
		web.ParamsError(c, fmt.Sprintf("校验md5失败，计算结果:%s, 参数:%s", md5Str, md5))
		return
	}
	// 上传到minio
	contentType := "application/octet-stream"
	if err := storage.NewStorage().Storage.PutObject(metaData.Bucket, fmt.Sprintf("%d_%d", uid, chunkNum),
		fileName, contentType); err != nil {
		lgLogger.WithContext(c).Error("上传到minio失败")
		web.InternalError(c, "上传到minio失败")
		return
	}

	// 创建元数据
	now := time.Now()
	fileInfo, _ := os.Stat(fileName)
	if err := repo.NewMultiPartInfoRepo().Create(lgDB, &models.MultiPartInfo{
		StorageUid:   uid,
		ChunkNum:     int(chunkNum),
		Bucket:       metaData.Bucket,
		StorageName:  fmt.Sprintf("%d_%d", uid, chunkNum),
		StorageSize:  fileInfo.Size(),
		PartFileName: fmt.Sprintf("%d_%d", uid, chunkNum),
		PartMd5:      md5Str,
		Status:       1,
		CreatedAt:    &now,
		UpdatedAt:    &now,
	}); err != nil {
		lgLogger.WithContext(c).Error("上传完更新数据失败")
		web.InternalError(c, "上传完更新数据失败")
		return
	}
	web.Success(c, "")
	return
}

// UploadMergeHandler     合并分片文件
//
//	@Summary		合并分片文件
//	@Description	合并分片文件
//	@Tags			上传
//	@Accept			multipart/form-data
//	@Param			uid			query	string	true	"文件uid"
//	@Param			md5			query	string	true	"md5"
//	@Param			num			query	string	true	"总分片数量"
//	@Param			size		query	string	true	"文件总大小"
//	@Param			date		query	string	true	"链接生成时间"
//	@Param			expire		query	string	true	"过期时间"
//	@Param			signature	query	string	true	"签名"
//	@Produce		application/json
//	@Success		200	{object}	web.Response
//	@Router			/api/storage/v0/upload/merge [put]
func UploadMergeHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	md5 := c.Query("md5")
	numStr := c.Query("num")
	size := c.Query("size")
	date := c.Query("date")
	expireStr := c.Query("expire")
	signature := c.Query("signature")

	uid, err, errorInfo := base.CheckValid(uidStr, date, expireStr)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}

	num, err := strconv.ParseInt(numStr, 10, 64)
	if err != nil {
		web.ParamsError(c, errorInfo)
		return
	}

	if !base.CheckUploadSignature(date, expireStr, signature) {
		web.ParamsError(c, "签名校验失败")
		return
	}

	// 判断记录是否存在
	lgDB := new(plugins.LangGoDB).Use("default").NewDB()
	metaData, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
	if err != nil {
		web.NotFoundResource(c, "当前合并链接无效，uid不存在")
		return
	}

	// 判断分片数量是否一致
	var multiPartInfoList []models.MultiPartInfo
	if err := lgDB.Model(&models.MultiPartInfo{}).Where(
		"storage_uid = ? and status = ?", uid, 1).Order("chunk_num ASC").Find(&multiPartInfoList).Error; err != nil {
		lgLogger.WithContext(c).Error("查询分片数据失败")
		web.InternalError(c, "查询分片数据失败")
		return
	}

	if num != int64(len(multiPartInfoList)) {
		// 创建脏数据删除任务
		msg := models.MergeInfo{
			StorageUid: uid,
			ChunkSum:   num,
		}
		b, err := json.Marshal(msg)
		if err != nil {
			lgLogger.WithContext(c).Error("消息struct转成json字符串失败", zap.Any("err", err.Error()))
			web.InternalError(c, "分片数量和整体数量不一致，创建删除任务失败")
			return
		}
		newModelTask := models.TaskInfo{
			Status:    utils.TaskStatusUndo,
			TaskType:  utils.TaskPartDelete,
			ExtraData: string(b),
		}
		if err := repo.NewTaskRepo().Create(lgDB, &newModelTask); err != nil {
			lgLogger.WithContext(c).Error("分片数量和整体数量不一致，创建删除任务失败", zap.Any("err", err.Error()))
			web.InternalError(c, "分片数量和整体数量不一致，创建删除任务失败")
			return
		}
		web.ParamsError(c, "分片数量和整体数量不一致")
		return
	}

	// 判断是否在本地
	dirName := path.Join(utils.LocalStore, uidStr)
	if _, err := os.Stat(dirName); os.IsNotExist(err) {
		// 不在本地，询问集群内其他服务并转发
		serviceList, err := base.NewServiceRegister().Discovery()
		if err != nil || serviceList == nil {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		var wg sync.WaitGroup
		var ipList []string
		ipChan := make(chan string, len(serviceList))
		for _, service := range serviceList {
			wg.Add(1)
			go func(ip string, port string, ipChan chan string, wg *sync.WaitGroup) {
				defer wg.Done()
				res, err := thirdparty.NewStorageService().Locate(utils.Scheme, ip, port, uidStr)
				if err != nil {
					return
				}
				ipChan <- res
			}(service.IP, service.Port, ipChan, &wg)
		}
		wg.Wait()
		close(ipChan)
		for re := range ipChan {
			ipList = append(ipList, re)
		}
		if len(ipList) == 0 {
			lgLogger.WithContext(c).Error("发现其他服务失败")
			web.InternalError(c, "发现其他服务失败")
			return
		}
		proxyIP := ipList[0]
		_, _, _, err = thirdparty.NewStorageService().MergeForward(c, utils.Scheme, proxyIP,
			bootstrap.NewConfig("").App.Port, uidStr)
		if err != nil {
			lgLogger.WithContext(c).Error("合并文件，转发失败")
			web.InternalError(c, err.Error())
			return
		}
		web.Success(c, "")
		return
	}
	// 获取文件的content-type
	firstPart := multiPartInfoList[0]
	partName := path.Join(utils.LocalStore, fmt.Sprintf("%d", uid), firstPart.PartFileName)
	contentType, err := base.DetectContentType(partName)
	if err != nil {
		lgLogger.WithContext(c).Error("判断文件content-type失败")
		web.InternalError(c, "判断文件content-type失败")
		return
	}

	// 更新metadata的数据
	now := time.Now()
	if err := repo.NewMetaDataInfoRepo().Updates(lgDB, metaData.UID, map[string]interface{}{
		"part_num":     int(num),
		"md5":          md5,
		"storage_size": size,
		"multi_part":   true,
		"status":       1,
		"updated_at":   &now,
		"content_type": contentType,
	}); err != nil {
		lgLogger.WithContext(c).Error("上传完更新数据失败")
		web.InternalError(c, "上传完更新数据失败")
		return
	}
	// 创建合并任务
	msg := models.MergeInfo{
		StorageUid: uid,
		ChunkSum:   num,
	}
	b, err := json.Marshal(msg)
	if err != nil {
		lgLogger.WithContext(c).Error("消息struct转成json字符串失败", zap.Any("err", err.Error()))
		web.InternalError(c, "创建合并任务失败")
		return
	}
	newModelTask := models.TaskInfo{
		Status:    utils.TaskStatusUndo,
		TaskType:  utils.TaskPartMerge,
		ExtraData: string(b),
	}
	if err := repo.NewTaskRepo().Create(lgDB, &newModelTask); err != nil {
		lgLogger.WithContext(c).Error("创建合并任务失败", zap.Any("err", err.Error()))
		web.InternalError(c, "创建合并任务失败")
		return
	}

	// 首次写入redis 元数据和分片信息
	lgRedis := new(plugins.LangGoRedis).NewRedis()
	metaCache, err := repo.NewMetaDataInfoRepo().GetByUid(lgDB, uid)
	if err != nil {
		lgLogger.WithContext(c).Error("上传数据，查询数据元信息失败")
		web.InternalError(c, "内部异常")
		return
	}
	b, err = json.Marshal(metaCache)
	if err != nil {
		lgLogger.WithContext(c).Warn("上传数据，写入redis失败")
	}
	lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-meta", uidStr), b, 5*60*time.Second)

	var multiPartInfoListCache []models.MultiPartInfo
	if err := lgDB.Model(&models.MultiPartInfo{}).Where(
		"storage_uid = ? and status = ?", uid, 1).Order("chunk_num ASC").Find(&multiPartInfoListCache).Error; err != nil {
		lgLogger.WithContext(c).Error("上传数据，查询分片数据失败")
		web.InternalError(c, "查询分片数据失败")
		return
	}
	// 写入redis
	b, err = json.Marshal(multiPartInfoListCache)
	if err != nil {
		lgLogger.WithContext(c).Warn("上传数据，写入redis失败")
	}
	lgRedis.SetNX(context.Background(), fmt.Sprintf("%s-multiPart", uidStr), b, 5*60*time.Second)

	web.Success(c, "")
	return
}
```

这段代码定义了三个函数：`UploadSingleHandler`, `UploadMultiPartHandler`, 和 `UploadMergeHandler`, 用于处理文件的单个上传、分片上传和分片合并。这些函数部署于 `v0` 包中，使用 `gin` 框架处理 HTTP 请求。下面是对这些函数的逐步解释：

### `UploadSingleHandler` 函数
- **参数解析和校验**: 解析请求中的 `uid`, `md5`, `date`, `expire`, `signature` 参数，并对它们进行有效性校验。
- **文件处理**: 接收和解析上传的文件。
- **数据库查询**: 检查 `uid` 对应的元数据记录是否存在，以及对应的 `md5` 值是否已上传。
- **文件处理逻辑**: 如果文件已存在，更新元数据信息并删除本地文件夹；如果文件不存在，则判断文件所在位置（本地或远程）并进行相应的处理。
- **上传至存储服务**: 如果文件在本地，将其上传到对象存储服务，如 MinIO。
- **更新数据库和缓存**: 更新元数据信息到数据库，并在 Redis 中缓存相应的元数据信息。

### `UploadMultiPartHandler` 函数
- **参数解析和校验**: 类似于 `UploadSingleHandler`，但增加了 `chunkNum` 参数来处理分片上传。
- **文件处理**: 接收和处理上传的分片文件。
- **分片上传逻辑**: 检查分片是否已上传，如果未上传，则在本地或远程存储服务中保存该分片。
- **更新数据库和缓存**: 为每个上传的分片创建元数据记录，并更新 Redis 缓存。

### `UploadMergeHandler` 函数
- **参数解析和校验**: 解析并校验 `uid`, `md5`, `num` (总分片数量), `size` (文件总大小), `date`, `expire`, `signature` 参数。
- **分片合并逻辑**: 检查所有分片是否已上传且数量一致，然后创建合并任务。
- **更新数据库和缓存**: 更新元数据信息，并在 Redis 中缓存元数据和分片信息。

### 总结
这些函数是文件上传服务的核心，包括单个文件上传、分片上传和分片合并。它们使用了并发编程、文件 I/O 操作、数据库交互和网络通信等多种编程技巧，并对异常情况进行了处理。此外，还涉及到了与存储服务和缓存服务的交互。








## app 中间件、模型及业务逻辑

```go
package app

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/qinguoyi/osproxy/app/pkg/base"
	"github.com/qinguoyi/osproxy/app/pkg/event/dispatch"
	"github.com/qinguoyi/osproxy/config"
	"go.uber.org/zap"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// App 应用结构体
type App struct {
	conf    *config.Configuration
	logger  *zap.Logger
	httpSrv *http.Server
}

func NewHttpServer(
	conf *config.Configuration,
	router *gin.Engine,
) *http.Server {
	return &http.Server{
		Addr:    ":" + conf.App.Port,
		Handler: router,
	}
}

func NewApp(
	conf *config.Configuration,
	logger *zap.Logger,
	httpSrv *http.Server,
) *App {
	return &App{
		conf:    conf,
		logger:  logger,
		httpSrv: httpSrv,
	}
}

// RunServer 启动服务
func (a *App) RunServer() {
	// 启动应用
	a.logger.Info("start app ...")
	if err := a.Run(); err != nil {
		panic(err)
	}

	// service register
	go base.NewServiceRegister().HeartBeat()

	// 启动 任务
	a.logger.Info("start task ...")
	p, consumers := dispatch.RunTask()

	// 等待中断信号以优雅地关闭应用
	quit := make(chan os.Signal)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// 关闭任务
	log.Printf("stop task ...")
	dispatch.StopTask(p, consumers)

	// 设置 5 秒的超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 关闭应用
	log.Printf("shutdown app ...")
	if err := a.Stop(ctx); err != nil {
		panic(err)
	}
}

// Run 启动服务
func (a *App) Run() error {
	// 启动 http server
	go func() {
		if err := a.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			panic(err)
		}

	}()
	return nil
}

// Stop 停止服务
func (a *App) Stop(ctx context.Context) error {
	// 关闭 http server
	if err := a.httpSrv.Shutdown(ctx); err != nil {
		return err
	}
	return nil
}
```