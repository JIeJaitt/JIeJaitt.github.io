---
title: 理解 Gorm 使用与源码分析
categories: 开源精选
toc: true
abbrlink: bd899c4c
date: 2023-06-24 20:49:04
tags:
sticky:
---

GORM是一个用于Go语言的ORM（对象关系映射）库，它提供了一种简洁、强大的方式来操作数据库。GORM可以轻松地处理数据库查询、插入、更新和删除等操作，同时还支持事务处理、关联查询、预加载、软删除等多种功能。

<!-- more -->

以下是GORM框架的主要特点：

1. 简单易用：GORM提供了直观的API，使得开发者能够快速上手并使用它来操作数据库。它使用链式调用的风格，让操作代码更加简洁和易读。
2. 支持不同数据库：GORM与多种关系型数据库（如MySQL、PostgreSQL、SQLite等）兼容，并提供了特定数据库的驱动，让开发者可以无缝切换数据库而无需更改代码。
3. CRUD操作：GORM提供了方便的方法来进行数据库的增删改查操作。你可以使用简单的API来执行诸如创建、读取、更新和删除记录等操作。
4. 关联查询：GORM支持关联查询，可以使用预加载（Preload）和延迟加载（Lazy loading）等方式来获取相关联的数据。这使得在处理复杂的数据库关系时变得更加容易。
5. 事务处理：GORM提供了事务支持，可以确保数据库操作的原子性。你可以使用事务来执行多个操作，并保障在出现异常时进行回滚操作。
6. 自动迁移：GORM支持数据库的自动迁移，它可以根据定义的模型（Model）自动创建表、更新表结构或删除表，省去了手动处理数据库迁移的工作。
7. 钩子函数：GORM提供了钩子函数（Hooks），可以在执行数据库操作的不同阶段注入自定义逻辑。你可以使用钩子函数来执行一些额外的操作，如数据验证、日志记录等。

GORM拥有广泛的应用和活跃的社区支持。借助于GORM的强大功能和易用性，开发者可以更加便捷地进行数据库操作，提高开发效率。无论是开始一个新项目还是在现有项目中使用，GORM都是一个很好的选择。

# 安装
```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/sqlite
```

# 快速入门
```go
package main

import (
  "gorm.io/gorm"
  "gorm.io/driver/sqlite"
)

type Product struct {
  gorm.Model
  Code  string
  Price uint
}

func main() {
  db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
  if err != nil {
    panic("failed to connect database")
  }

  // 迁移 schema
  db.AutoMigrate(&Product{})

  // Create
  db.Create(&Product{Code: "D42", Price: 100})

  // Read
  var product Product
  db.First(&product, 1) // 根据整型主键查找
  db.First(&product, "code = ?", "D42") // 查找 code 字段值为 D42 的记录

  // Update - 将 product 的 price 更新为 200
  db.Model(&product).Update("Price", 200)
  // Update - 更新多个字段
  db.Model(&product).Updates(Product{Price: 200, Code: "F42"}) // 仅更新非零值字段
  db.Model(&product).Updates(map[string]interface{}{"Price": 200, "Code": "F42"})

  // Delete - 删除 product
  db.Delete(&product, 1)
}
```
`db.AutoMigrate(&Product{})`这段代码使用了 GORM 库的 AutoMigrate 方法，作用是将 Go 语言中的 Product 结构体映射到数据库中的表，并自动创建或更新表结构以匹配 Product 结构体的定义。

具体来说，&Product{} 是一个指向 Product 结构体的指针，传入 AutoMigrate 方法中表示需要将 Product 对象的属性映射到数据库表的字段上。如果数据库中已经存在名为 products 的表，则 AutoMigrate 方法会检查该表的结构是否与 Product 结构体匹配，如果不匹配则会自动更新表结构以适应 Product 的定义。如果数据库中不存在 products 表，则 AutoMigrate 方法会自动创建该表，并根据 Product 结构体的定义创建相应的字段和约束。

通过这段代码，我们可以方便地将 Go 语言中的结构体类型映射到数据库表，并保持二者的同步。这是一种方便的 ORM（对象关系映射）技术，可以大大简化数据库操作的代码。



## 参考资料

- [GORM中文文档](https://gorm.io/zh_CN/)
- https://www.topgoer.com/%E6%95%B0%E6%8D%AE%E5%BA%93%E6%93%8D%E4%BD%9C/gorm/gorm%E4%BB%8B%E7%BB%8D.html?q=