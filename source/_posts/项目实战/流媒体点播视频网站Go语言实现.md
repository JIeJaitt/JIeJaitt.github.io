---
title: 流媒体点播视频网站Go语言实现
excerpt: 本博客暂不显示摘要，请大家谅解
toc: true
categories: 项目实战
tags: streaming
abbrlink: 63de6ed3
date: 2021-09-15 17:04:22
sticky:
---

## scheduler 调度器模块实现

```bash
scheduler             
├─ dbops              
│  ├─ api.go          
│  ├─ conn.go         
│  └─ internal.go     
├─ taskrunner         
│  ├─ defs.go         
│  ├─ runner.go       
│  ├─ runner_test.go  
│  ├─ tasks.go        
│  └─ trmain.go       
├─ handlers.go        
├─ main.go            
└─ response.go        
```

```go
// scheduler/main.go
package main

import (
	"github.com/julienschmidt/httprouter"
	"net/http"
	"imooc/Go语言实战流媒体视频网站/video_server/shceduler/taskrunner"
)

func RegisterHanders() *httprouter.Router {
	router := httprouter.New()
	router.GET("/video-delete-record/:vid-id", vidDelRecHandler)

	return router
}

func main()  {
	go taskrunner.Start()

	r := RegisterHanders()
	http.ListenAndServe(":25601", r)
}
```

```go
// scheduler/handlers.go
package main

import (
	"net/http"
	"github.com/julienschmidt/httprouter"
	"imooc/Go语言实战流媒体视频网站/video_server/shceduler/dbops"
)

func vidDelRecHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params)  {
	vid := p.ByName("vid-id")
	if len(vid) == 0 {
		sendResponse(w, 400, "video id should not be empty!")
		return
	}

	err := dbops.AddVideoDeletionRecord(vid)
	if err != nil{
		sendResponse(w, 500, "Internal server error")
		return
	}

	sendResponse(w, 200, "delete video successfully")
	return
}
```

```go
// scheduler/response.go
package main

import (
	"net/http"
	"io"
)

func sendResponse(w http.ResponseWriter, sc int, resp string)  {
	w.WriteHeader(sc)
	io.WriteString(w, resp)
}
```

dbops 层

```go
// scheduler/dbops/api.go
package dbops

import "log"

// 将要删除的vid加到待删除数据库中
func AddVideoDeletionRecord(vid string) error {
	stmtDel, err := dbConn.Prepare("INSERT INTO video_del_rec (video_id) VALUES (?)")
	if err != nil{
		log.Printf("Prepare AddVideoDeletionRecord error: %v\n", err)
		return err
	}
	_, err = stmtDel.Exec(vid)
	if err!=nil{
		log.Printf("Exec AddVideoDeletionRecord error: %v", err)
		return err
	}
	defer stmtDel.Close()
	return nil
}
```

```go
// scheduler/dbops/conn.go
package dbops

import (
	_ "github.com/go-sql-driver/mysql"
	"database/sql"
)

var (
	dbConn *sql.DB
	err error
)

// 初始化数据库连接
func init()  {

	dbConn,err = sql.Open("mysql", "root:9830@tcp(localhost:3306)/video_server?charset-utf8")
	if err != nil{
		panic(err.Error())
	}
}
```

```go
// scheduler/dbops/internal.go
package dbops

import "log"

// 读取要删除的数据,批量拿取
func ReadVideoDeletionRecord(count int) ([]string, error) {
	stmtOut, err := dbConn.Prepare("SELECT video_id FROM video_del_rec LIMIT ?")
	var ids []string
	if err != nil{
		log.Printf("Prepare ReadVideoDeletionRecord error: %v\n", err)
		return nil, err
	}

	rows, err := stmtOut.Query(count)
	if err != nil{
		log.Printf("Query ReadVideoDeletionRecord error: %v\n", err)
		return nil, err
	}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil{
			log.Printf("Scan ReadVideoDeletionRecord error: %v\n", err)
			return nil, err
		}
		log.Printf("get del video id: %s\n", id)
		ids = append(ids, id)
	}
	defer stmtOut.Close()
	return ids, nil
}


// 删除
func DelVideoDeltionRecord(vid string) error {
	stmtDel, err := dbConn.Prepare("DELETE FROM video_del_rec WHERE video_id = ?")
	if err != nil{
		log.Printf("Prepare DelVideoDeltionRecord error: %v\n", err)
		return err
	}

	_, err = stmtDel.Exec(vid)
	if err != nil{
		log.Printf("Exec DelVideoDeltionRecord error: %v\n", err)
		return err
	}

	defer stmtDel.Close()
	return nil
}
```

taskrunner 层

```go
// scheduler/taskrunner/defs.go
package taskrunner

// 定义controlChan中的消息体
const (
	READY_TO_DISPATCH = "d"
	READY_TO_EXECUTE = "e"
	CLOSE = "c"

	VIDEO_PATH = "./videos/"
)

// 控制部分
type controlChan chan string

// 数据channel，由于数据类型不确定使用interface
type dataChan chan interface{}

// 生产消费函数
type fn func(dc dataChan) error
```

```go
// scheduler/taskrunner/runner.go
package taskrunner

import "log"

// 定义i
type Runner struct {
	Controller controlChan
	Error controlChan
	Data dataChan
	dataSize int
	longLived bool // 是否长期存活
	Dispatcher fn
	Executor fn
}

func NewRunner(size int, longlived bool, d fn, e fn) *Runner {
	return &Runner{
		Controller: make(chan string, 1),
		Error: make(chan string, 1),
		Data: make(chan interface{}, size),
		dataSize: size,
		longLived: longlived,
		Dispatcher: d,
		Executor: e,
	}
}


// 常驻任务
func (r *Runner) startDispatch()  {
	// 非常驻函数杀掉进程
	defer func() {
		if !r.longLived {
			close(r.Controller)
			close(r.Data)
			close(r.Error)
		}
	}()

	for {
		select {
		case c:= <- r.Controller:
			// 处理状态为DISPATCH情况
			if c == READY_TO_DISPATCH {
				err := r.Dispatcher(r.Data)
				log.Printf("startDispatch Controller add data: %v\n", r.Data)
				if err != nil{
					r.Error <- CLOSE
				}else {
					// 改变Controller状态
					r.Controller <- READY_TO_EXECUTE
				}
			}

			if c == READY_TO_EXECUTE {
				err := r.Executor(r.Data)
				log.Printf("startDispatch Controller execute data: %v\n", r.Data)
				if err != nil{
					r.Error <- CLOSE
				} else {
					r.Controller <- READY_TO_DISPATCH
				}
			}

		// 处理出错情况
		case e:= <- r.Error:
			if e == CLOSE {
				return
			}
		//default:

		}
	}
}


// 启动ruuner
func (r *Runner) StartAll ()  {
	// 启动前需要前内置一个READY_TO_DISPATCH来激活程序
	r.Controller <- READY_TO_DISPATCH
	r.startDispatch()
}
```

```go
// scheduler/taskrunner/runner_test.go
package taskrunner

import (
	"testing"
	"log"
	"time"
)

func TestRunner(t *testing.T)  {
	d := func(dc dataChan) error {
		for i:=0; i<30; i++{
			dc <- i
			log.Printf("Dispatcher sent: %v", i)
		}
		return nil
	}

	e := func(dc dataChan) error {
		forloop:
			for{
				select {
				case d :=<- dc:
					log.Printf("EXECUTE recevied: %v", d)

				default:
					break forloop
			}
		}
		//return errors.New("exit")
		return nil
	}

	runner := NewRunner(30, false, d, e)
	// 不加goroutine会一直循环下去
	//runner.StartAll()
	// 加了goroutine才会执行到下一行
	go runner.StartAll()
	time.Sleep(3 * time.Second)
}

```

```go
// scheduler/taskrunner/tasks.go
package taskrunner

import (
	"errors"
	"imooc/Go语言实战流媒体视频网站/video_server/shceduler/dbops"
	"log"
	"os"
	"sync"
)

// 删除物理文件
func deleteVideo(vid string) error {
	err := os.Remove(VIDEO_PATH + vid)

	// 当错误不是文件不存在错误时表示文件没有删除，将错误返回
	if err != nil && !os.IsNotExist(err) {
		log.Printf("Deleting video error: %v\n", err)
		return err
	}
	return nil
}

// 获取要删除的videoId加载到dataChan中
func VideoClearDispatcher(dc dataChan) error {
	log.Printf("start VideoClearDispatcher!\n")
	res, err := dbops.ReadVideoDeletionRecord(3)
	if err != nil {
		log.Printf("Video clear dispatcher error: %v\n", err)
		return err
	}

	// 没有获取到数据，返回
	if len(res) == 0 {
		log.Printf("VideoClearDispatcher dataChan is zero : %v\n", err)
		return errors.New("all tasks finished")
	}

	// 将取到的id写道dataChan中
	for _, id := range res {
		log.Printf("VideoClearDispatcher add vid: %s\n", id)
		dc <- id
	}
	log.Printf("VideoClearDispatcher Normal ")
	return nil
}

func VideoClearExecutor(dc dataChan) error {
	log.Printf("start VideoClearExecutor!\n")
	// 定义一个装错误的map
	errMap := &sync.Map{}
	var err error

forloop:
	for {
		select {
		case vid := <-dc:
			log.Printf("VideoClearExecutor get vid: %s\n", vid)
			go func(id interface{}) {
				// 删除数据库前先把文件删掉
				if err := deleteVideo(id.(string)); err != nil {
					log.Printf("VideoClearExecutor deleteVideo error: %v\n", err)
					errMap.Store(id, err)
					return
				}

				if err := dbops.DelVideoDeltionRecord(id.(string)); err != nil {
					log.Printf("VideoClearExecutor DelVideoDeltionRecord error: %v\n", err)
					errMap.Store(id, err)
					return
				}
			}(vid)
		default:
			log.Printf("VideoClearExecutor go to forloop!\n")
			break forloop
		}
	}

	// 遍历errMap
	errMap.Range(func(k, v interface{}) bool {
		err = v.(error)
		if err != nil {
			return false
		}
		return true
	})
	log.Printf("errMap: %v\n", err)
	return err
}

```

```go
// scheduler/taskrunner/trmain.go
package taskrunner

import (
	"time"
	"log"
)

type Worker struct {
	ticket *time.Ticker
	runner *Runner
}

func NewWorker(interval time.Duration, r *Runner) *Worker {
	return &Worker{
		//ticket: time.NewTicker(interval*time.Second),
		ticket: time.NewTicker(interval * time.Second),
		runner: r,
	}
}

func (w *Worker) startWorker() {
	for {
		select {
		case <- w.ticket.C:
			log.Printf("ticket run start--------------------\n")
			go w.runner.StartAll()
			log.Printf("ticket run end--------------------\n")
		}
	}
}


func Start()  {
	r := NewRunner(3, true, VideoClearDispatcher, VideoClearExecutor)
	w := NewWorker(3, r)
	go w.startWorker()
}
```



## 参考资料

- Go语言实战流媒体视频网站 RESTful API设计要点 / 架构解耦 / Cloud native应用上云：https://coding.imooc.com/class/227.html