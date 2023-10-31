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