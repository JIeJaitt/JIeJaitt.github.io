---
title: Go 语言数据库操作
categories: 项目实战
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 2dba0c93
toc: true
---

# **数据库连接建立和增删改查基本实现**

前面学院君给大家介绍了 Go 语言中的内存存储和文件存储，文件存储的好处是可以持久化数据，但是并不是 Web 应用数据存储的终极方案，因为这样存储起来的数据检索和管理起来非常麻烦，为此又诞生了数据库管理系统来处理数据的增删改查。数据库又可以划分为关系型数据库（RDBMS）和非关系型数据库（NoSQL），前者比如 MySQL、Oracle，后者比如 Redis、MongoDB，这里我们以当前最流行的开源关系型数据库 MySQL 为例进行介绍。

### **初始化数据库**

开始之前，我们先要连接到 MySQL 服务器初始化数据库和数据表。

> 注：如果你还没有在本地安装 MySQL 数据库，需要先进行安装，使用 Docker 启动或者去 MySQL 官网下载安装包安装均可，Mac 系统中还可以使用 [Homebrew](https://brew.sh/) 进行安装，然后选择一个自己喜欢的 [GUI 客户端](https://laravelacademy.org/post/21654#toc-4)，学院君本地使用的是 [TablePlus](https://tableplus.com/)。
> 



做好上述准备工作连接到 MySQL 服务端之后，就可以创建一个名为 `test_db` 的数据库：

![Untitled](https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F86a908ed-c559-42d3-9ae1-1150d9b4564e%2FUntitled.png?table=block&id=1dda39e6-cc7f-4c57-bc51-69c5021b606a&spaceId=25d94046-010b-46e4-b3ba-d29544fd8280&width=1780&userId=689676ce-14e6-4fad-acfb-9a08baa4798f&cache=v2)

然后在这个数据库中创建一张名为 `posts` 的测试数据表用来存储文章信息：

```sql
CREATE TABLE `posts` (
  `id` bigint unsigned AUTO_INCREMENT,
  `title` varchar(100) DEFAULT NULL,
  `content` text,
  `author` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```

![Untitled](https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fdc5f73ba-50c9-40de-be4b-209bd2836167%2FUntitled.png?table=block&id=8197a6a8-c6b4-4391-bfc1-4d3ea8826160&spaceId=25d94046-010b-46e4-b3ba-d29544fd8280&width=2000&userId=689676ce-14e6-4fad-acfb-9a08baa4798f&cache=v2)

### **建立数据库连接**

接下来，我们就可以在 Go 程序中编写代码建立与数据库的连接，然后对 `posts` 表进行增删改查操作了。

Go 语言并没有提供 MySQL 客户端扩展包的官方实现，只是提供了一个抽象的 `database/sql` 接口，只要第三方数据库客户端实现该接口声明的方法，用户就可以在不同的第三方数据库客户端扩展包实现之间进行切换，而不需要调整任何业务代码。

实现 `database/sql` 接口的 MySQL 第三方扩展包很多，比较流行的有 [go-sql-driver/mysql](https://github.com/go-sql-driver/mysql) 和 ORM 扩展包 [go-gorm/gorm](https://github.com/go-gorm/gorm)，我们先来看看如何通过 `go-sql-driver/mysql` 在 Go 程序中与 MySQL 数据库交互。

我们可以在测试代码 `db.go` 中编写一段 `init` 方法，在每次代码执行 `main` 入口函数之前先建立数据库连接：

```go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
)

var Db *sql.DB
   
func init()  {
    var err error
    Db, err = sql.Open("mysql", "root:root@/test_db?charset=utf8mb4&parseTime=true")
    if err != nil {
        panic(err)
    }
}
```

`sql.DB` 是一个用于操作数据库的结构体，维护的是一个数据库连接池。数据库连接通过 `sql.Open` 方法设置，该方法接收一个数据库驱动（这里是 `mysql`）和数据源名称字符串（按照位置填充即可，更多细节请参考[该数据库包的官方文档](https://github.com/go-sql-driver/mysql#dsn-data-source-name)）：

```bash
[username[:password]@][protocol[(address)]]/dbname[?param1=value1&...&paramN=valueN]

```

> 注：如果 MySQL 服务器运行在本地，则 address 字段（IP + 端口号）留空。
> 

成功后返回一个 `sql.DB` 指针，然后你就可以拿着这个指针操作数据库了。

需要注意的是 `Open` 方法并没有真正建立连接，也不回对传入的参数做任何验证，它只是负责初始化 `sql.DB` 结构体字段而已，数据库连接只有在后面真正需要的时候才会建立，是一个懒加载的过程。这样做的好处是提升应用性能，避免不必要的数据库连接开销。

另外，`sql.DB` 也不需要关闭，`sql.DB` 维护的是一个连接池，在我们的示例代码中定义了一个全局的 `Db` 变量来指向它，你还可以在创建 `sql.DB` 后将其传递给要操作数据库的方法。

接下来，我们来看下 `Open` 方法的参数，第一个参数是数据库驱动，要支持这个驱动需要调用 `sql.Register` 方法进行注册，由于我们使用了 `go-sql-driver/mysql` 这个第三方包，这一步是在 `mysql` 包的 `init` 方法中完成的（`driver.go`）：

```go
func init() {
    sql.Register("mysql", &MySQLDriver{})
}

```

后面的驱动结构体需要实现 `sql` 包的 `driver.Driver` 接口。

当我们通过下面这段代码引入 `mysql` 包时：

```go
_ "github.com/go-sql-driver/mysql"

```

就会调用 `mysql` 包的 `init` 方法。

Go 官方没有提供任何数据库驱动包，只是在 `sql.Driver` 中声明了接口，第三方驱动包只要实现这些接口就好了。另外，我们在导入第三方包的时候，需要在前面加上短划线 `_`，这样做的好处是不会直接使用第三方包中的方法，只能使用官方 `database/sql` 中提供的方法，当第三方包升级或者需要调整数据库驱动时，不需要修改应用中的代码。

> 注：如果你对这一块接口与实现的细节不清楚，可以回顾 Go 入门教程中的面向对象编程部分。
> 

### 增删改查示例代码

数据库初始化完成并设置好连接配置之后，就可以在 Go 应用中与数据库进行交互了。我们将编写一段对文章表进行增删改查的示例代码来演示 Go 语言中的数据库操作。

> 注：以下所有示例代码都是在 db.go 中编写。
> 

### 定义 Post 结构体

首先我们需要定义一个表示文章表数据结构的结构体：

```go
type Post struct {
    Id int
    Title string
    Content string
    Author string
}

```

### 创建新文章

然后我们编写在数据库中创建文章记录的 `Create` 方法，其实就是在上述全局 `Db` 数据库连接上执行 SQL 插入语句而已，对应的示例代码如下：

```go
func (post *Post) Create() (err error) {
    sql := "insert into posts (title, content, author) values (?, ?, ?)"
    stmt, err := Db.Prepare(sql)
    if err != nil {
        panic(err)
    }
    defer stmt.Close()

    res, err := stmt.Exec(post.Title, post.Content, post.Author)
    if err != nil {
        panic(err)
    }

    postId, _ := res.LastInsertId()
    post.Id = int(postId)
    return
}

```

> 注：这里我们使用了预处理语句，以避免 SQL 注入攻击，如果你有 PHP 或者其他语言数据库编程基础的话，应该很容易看懂这些代码。
> 

实际上，我们还可以通过 `stmt.QueryRow(post.Title, post.Content, post.Author)` 来执行插入操作，效果是一样的，也可以直接通过 `Db.Exec` 执行插入操作：

```go
res, err := Db.Exec(sql, post.Title, post.Content, post.Author)

```

### 获取单篇文章

创建完文章后，可以通过 `Db.QueryRow` 执行一条 SQL 查询语句查询单条记录并将结果映射到 `Post` 结构体中。

```go
func GetPost(id int) (post Post, err error) {
    post = Post{}
    err = Db.QueryRow("select id, title, content, author from posts where id = ?", id).
        Scan(&post.Id, &post.Title, &post.Content, &post.Author)
    return
}

```

### 获取文章列表

我们可以使用 `sql.DB` 提供的 `Query` 方法来查询多条文章记录：

```go
func Posts(limit int) (posts []Post, err error) {
    rows, err := Db.Query("select id, title, content, author from posts limit ?", limit)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    for rows.Next() {
        post := Post{}
        err = rows.Scan(&post.Id, &post.Title, &post.Content, &post.Author)
        if err != nil {
            panic(err)
        }
        posts = append(posts, post)
    }
    return
}

```

该方法返回的是 `sql.Rows` 接口，它是一个迭代器，你可以通过循环调用其 `Next` 方法返回其中的每个 `sql.Row` 对象，直到 `sql.Rows` 中的记录值为空（此时返回 `io.EOF`）。

在循环体中，我们将每个 `sql.Row` 对象映射到 `Post` 对象，再将这个 `Post` 对象添加到 `posts` 切片中。

其实对于单条记录，也可以使用类似的方式实现，毕竟单条记录查询是 SELECT 查询的特例：

```go
func GetPost(id int) (post Post, err error) {
    rows, err := Db.Query("select id, title, content, author from posts where id = ? limit 1", id)
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    for rows.Next() {
        post = Post{}
        err = rows.Scan(&post.Id, &post.Title, &post.Content, &post.Author)
        if err != nil {
            panic(err)
        }
    }
    return
}

```

当然，前面的 `Db.Query` 也可以调整为预处理语句实现，只是更繁琐一些：

```go
stmt, err := Db.Prepare("select id, title, content, author from posts limit ?")
if err != nil {
	panic(err)
}
defer stmt.Close()
rows, err := stmt.Query(limit)
if err != nil {
	panic(err)
}
... // 后续其他操作代码

```

### 更新文章

对于已存在的文章记录，可以通过执行 SQL 更新语句进行修改：

```go
func (post *Post) Update() (err error)  {
    stmt, err := Db.Prepare("update posts set title = ?, content = ?, author = ? where id = ?")
    if err != nil {
        return
    }
    stmt.Exec(post.Title, post.Content, post.Author, post.Id)
    return
}

```

当然，也可以通过 `stmt.QueryRow` 以及 `Db.Exec` 这两种方式来处理上述操作，使用 `Db.Exec` 方法更简洁：

```go
func (post *Post) Update() (err error)  {
    _, err = Db.Exec("update posts set title = ?, content = ?, author = ? where id = ?",
        post.Title, post.Content, post.Author, post.Id)
    return
}

```

`Db.Exec` 方法返回的是 `sql.Result` 接口，该接口支持以下两个方法：

![Untitled](https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fc3b5022b-9972-4f12-afa1-77e29e8926de%2FUntitled.png?table=block&id=4af22cfd-3084-4d95-9de8-6ab7a15cced3&spaceId=25d94046-010b-46e4-b3ba-d29544fd8280&width=2000&userId=689676ce-14e6-4fad-acfb-9a08baa4798f&cache=v2)

我们不需要处理这个 `Result` 对象，所以通过 `_` 将其忽略。

### 删除文章

删除操作和更新操作类似，只是将 UPDATE 语句调整为 DELETE 语句而已：

```go
func (post *Post) Delete() (err error) {
    stmt, err := Db.Prepare("delete from posts where id = ?")
    if err != nil {
        return
    }
    stmt.Exec(post.Id)
    return
}

```

当然上述操作可以通过 `stmt.QueryRow` 或 `Db.Exec` 方法来实现：

```go
func (post *Post) Delete() (err error) {
    _, err = Db.Exec("delete from posts where id = ?", post.Id)
    return
}

```

### 整体测试

最后，我们在 `db.go` 中编写入口函数 `main` 测试一下上述数据库增删改查操作是否可以正常运行：

```go
func main()  {
    post := Post{Title: "Go 语言数据库操作", Content: "基于第三方 go-sql-driver/mysql 包实现 MySQL 数据库增删改查", Author: "学院君"}

    // 创建记录
    post.Create()
    fmt.Println(post)

    // 获取单条记录
    dbPost, _ := GetPost(post.Id)
    fmt.Println(dbPost)

    // 更新记录
    dbPost.Title = "Golang 数据库操作"
    dbPost.Update()

    // 获取文章列表
    posts, _ := Posts(1)
    fmt.Println(posts)

    // 删除记录
    dbPost.Delete()
}

```

> 注：运行前，记得通过 Go Module 下载 go-sql-driver/mysql 依赖。
> 

在终端运行 `db.go`，输出如下，表示这段数据库增删改查代码可以正常运行：

![Untitled](https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F79df5317-395e-4066-9076-d9a455b473ff%2FUntitled.png?table=block&id=225c7840-13d9-4060-aa09-8a60aeea03da&spaceId=25d94046-010b-46e4-b3ba-d29544fd8280&width=2000&userId=689676ce-14e6-4fad-acfb-9a08baa4798f&cache=v2)

好了，关于数据库增删改查基本操作就简单介绍到这里，下篇教程，我们来看看如何在 MySQL 数据库中实现不同表之间的关联查询和更新。

### 完整代码【可直接运行】

```go
package main

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
)

var Db *sql.DB

type Post struct {
	Id      int
	Title   string
	Content string
	Author  string
}

func init() {
	var err error
	Db, err = sql.Open("mysql", "root:password@/test_db?charset=utf8mb4&parseTime=true")
	if err != nil {
		panic(err)
	}
}

func (post *Post) Create() (err error) {
	sql := "insert into posts (title, content, author) values (?, ?, ?)"
	stmt, err := Db.Prepare(sql)
	if err != nil {
		panic(err)
	}
	defer stmt.Close()

	res, err := stmt.Exec(post.Title, post.Content, post.Author)
	if err != nil {
		panic(err)
	}

	postId, _ := res.LastInsertId()
	post.Id = int(postId)
	return
}

func GetPost(id int) (post Post, err error) {
	post = Post{}
	err = Db.QueryRow("select id, title, content, author from posts where id = ?", id).
		Scan(&post.Id, &post.Title, &post.Content, &post.Author)
	return
}

func Posts(limit int) (posts []Post, err error) {
	rows, err := Db.Query("select id, title, content, author from posts limit ?", limit)
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	for rows.Next() {
		post := Post{}
		err = rows.Scan(&post.Id, &post.Title, &post.Content, &post.Author)
		if err != nil {
			panic(err)
		}
		posts = append(posts, post)
	}
	return
}

func (post *Post) Update() (err error) {
	stmt, err := Db.Prepare("update posts set title = ?, content = ?, author = ? where id = ?")
	if err != nil {
		return
	}
	stmt.Exec(post.Title, post.Content, post.Author, post.Id)
	return
}

func (post *Post) Delete() (err error) {
	stmt, err := Db.Prepare("delete from posts where id = ?")
	if err != nil {
		return
	}
	stmt.Exec(post.Id)
	return
}

func main() {
	post := Post{Title: "Go 语言数据库操作", Content: "基于第三方 go-sql-driver/mysql 包实现 MySQL 数据库增删改查", Author: "学院君"}

	// 创建记录
	post.Create()
	fmt.Println(post)

	// 获取单条记录
	dbPost, _ := GetPost(post.Id)
	fmt.Println(dbPost)

	// 更新记录
	dbPost.Title = "Golang 数据库操作"
	dbPost.Update()

	// 获取文章列表
	posts, _ := Posts(1)
	fmt.Println(posts)

	// 删除记录
	dbPost.Delete()

}
```