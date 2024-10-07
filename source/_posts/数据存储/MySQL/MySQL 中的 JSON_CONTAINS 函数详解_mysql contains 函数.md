---
title: MySQL 中的 JSON_CONTAINS 函数详解_mysql contains 函数
date: 2024-10-07T10:51:55+08:00
categories: 数据存储
tags: MySQL
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [blog.csdn.net](https://blog.csdn.net/mcband/article/details/135328703)

### 前言

在处理 MySQL 中的 [JSON 数据](https://so.csdn.net/so/search?q=JSON%20%E6%95%B0%E6%8D%AE&spm=1001.2101.3001.7020)时，我们经常需要检查一个 JSON 文档是否包含特定的值。这时，JSON_CONTAINS 函数就显得非常有用。

### JSON_CONTAINS 函数介绍

JSON_CONTAINS 是 MySQL 提供的一个 [JSON](https://so.csdn.net/so/search?q=JSON&spm=1001.2101.3001.7020) 函数，用于测试一个 JSON 文档是否包含特定的值。如果包含则返回 1，否则返回 0。该函数接受三个参数：

1.  target: 待搜索的目标 JSON 文档。
2.  candidate: 在目标 JSON 文档中要搜索的值。
3.  path（可选）： 路径表达式，指示在哪里搜索候选值。

一般的使用语法为：

```
JSON_CONTAINS(target, candidate[, path])
```

### JSON_CONTAINS 函数实例演示

假设我们有一个名为 products 的表，其中包含了一些产品信息：

```
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    details JSON
);
 
INSERT INTO products (details)
VALUES 
('{"name": "Product 1", "tags": ["tag1", "tag2", "tag3"]}'),
('{"name": "Product 2", "tags": ["tag1", "tag4"]}');
```

现在，我们想要找出 tags 字段中所有包含 “tag1” 标签的产品。我们可以利用 JSON_CONTAINS 函数来实现这个需求：

```
SELECT * FROM products WHERE JSON_CONTAINS(details->'$.tags', '"tag1"');
```

### JSON_CONTAINS 函数的路径参数

JSON_CONTAINS 函数提供了一个可选的 path 参数，用于指定应在 JSON 文档的哪个部分搜索候选值。这个参数的值应该是一个 JSON 路径表达式。

```
SELECT * FROM products WHERE JSON_CONTAINS(details, '"red"', '$.metadata.color');
```

在这条查询中，$.metadata.color 是路径表达式，表示我们要在 details JSON 文档的 metadata.color 段中搜索 “red” 值。

### JSON_CONTAINS 函数的两种使用方式比较

虽然 JSON_CONTAINS(details, ‘“red”’, ’ $ .metadata.color’) 和 JSON_CONTAINS(details->‘$ .metadata.color’, ‘“red”’) 在大多数情况下的结果是相同的，但是它们在某些特殊场景下的处理策略是有区别的。

1.  details->‘$.metadata.color’ 这种写法先从 details 字段的 metadata.color  
    部分取出值，然后以此为基础进行 JSON_CONTAINS 操作。如果你想在获取的 JSON 片段上进行进一步的操作，这种方式会更方便。
2.  JSON_CONTAINS(details, ‘“red”’, ‘$.metadata.color’) 直接在 details  
    字段中执行了 JSON_CONTAINS，在查找过程中指定了路径。它是一个单独的表达式，不能直接用于进一步提取或操作 JSON  
    数据。但如果你只是简单地检查指定路径下是否包含特定值，那么这种方法就足够了。

实际使用哪种方式，取决于你的具体需求和场景。

总的来说，JSON_CONTAINS 是一个功能强大的函数，使我们能够以灵活、高效的方式在 MySQL 中处理 JSON 数据。希望本文能帮助你更好地理解和使用这个函数。