---
title: 为什么每次都需要执行数据库逻辑函数的时候都需要db := openConn()？
categories: 问题日志
toc: true
abbrlink: 512d9d00
date: 2023-06-24 20:31:10
tags: log
sticky:
---

为什么每次都需要执行数据库逻辑函数的时候都需要db := openConn()？

<!-- more -->

```go
package dbops

import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
)

func openConn() *sql.DB {
    dbConn, err := sql.Open("mysql", "root:12345678@tcp(localhost:3306)/stmsrv?charset=utf8")
    if err != nil {
    // 如果数据库都没连接起来, 那么服务端跑起来也没什么意义
    // 在项目中, 不要轻易使用 panic
    // panic 会中断整个项目, 并且抛出这个 panic
    // 只有在确实无法正常完成业务逻辑的时候, 才使用 panic
        panic(err.Error())
    }
    return dbConn
}

func AddUserCredential(loginName string, pwd string) error {
    // openConn 的时候实际上并不会连接数据库
    // 只有在 Prepare 的时候才会真正连接数据库
    db := openConn()
}

func GetUserCredential(loginName string) (string, error) {
    db := openConn()
}
```

在这个示例中，每次执行数据库操作时都需要调用openConn()，这是因为每个数据库操作都需要一个数据库连接。当然，在某些情况下，这种方法可能会导致性能问题，特别是在高并发的场景下，因为频繁地打开和关闭数据库连接会产生额外的开销。

一种解决方案是使用数据库连接池。数据库连接池可以管理一组数据库连接，以便在需要时重用它们，而不是为每个请求创建新的连接。在Go的database/sql包中，连接池的管理是自动的。当您执行数据库操作时，sql.DB实例会自动从连接池中获取一个连接，并在操作完成后将其归还给连接池。

为了利用连接池，您可以在程序初始化时创建一个sql.DB实例，然后在整个程序中重用它，而不是在每个函数中调用openConn()。以下是修改后的示例：

```go
package dbops

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func init() {
	var err error
	db, err = sql.Open("mysql", "root:12345678@tcp(localhost:3306)/stmsrv?charset=utf8")
	if err != nil {
		panic(err.Error())
	}
}

func AddUserCredential(loginName string, pwd string) error {
	// 使用已经打开的数据库连接 db
}

func GetUserCredential(loginName string) (string, error) {
	// 使用已经打开的数据库连接 db
}
```

这样，数据库连接池将由sql.DB实例管理，您无需在每个函数中打开和关闭连接。在高并发场景下，这将提高性能。注意，这里我将openConn()函数的内容移动到了init()函数中，该函数在包导入时自动执行，这样可以确保在程序启动时创建数据库连接。