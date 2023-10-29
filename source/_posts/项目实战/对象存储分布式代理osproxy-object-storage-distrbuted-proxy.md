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
