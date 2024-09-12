---
title: SQL IFNULL()函数详细解析
categories: 数据存储
tags: SQL
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 933f1c25
toc: true
date: 2024-09-07 08:55:49
sticky:
---

> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [blog.csdn.net](https://blog.csdn.net/weixin_47343544/article/details/119876890#/)

**解析**：IFNULL() 函数用于判断第一个表达式是否为 NULL，如果为 NULL 则返回第二个参数的值，如果不为 NULL 则返回第一个参数的值。

```sql
IFNULL() 函数语法格式为：
IFNULL(expression, alt_value)
```

如果第一个参数的表达式 expression 为 NULL，则返回第二个参数的备用值。

参数说明:

<table><thead><tr><th>参数</th><th>解析</th></tr></thead><tbody><tr><td>expression</td><td>必须，要测试的值</td></tr><tr><td>alt_value</td><td>必须，expression 表达式为 NULL 时返回的值</td></tr></tbody></table>

**参数 描述**

实例

```sql
第一个参数为 NULL：
SELECT IFNULL(NULL, "RUNOOB");
```

以上实例输出结果为：

```bash
RUNOOB
```

第一个参数不为 NULL：

```sql
SELECT IFNULL("Hello", "RUNOOB");
```

以上实例输出结果为：

```bash
Hello
```

```sql
IFNULL(expression-1,expression-2 [,expression-3])

{fn IFNULL(expression-1,expression-2)}
```

参数

```sql
expression-1 - 要计算以确定是否为NULL的表达式。
expression-2 - 如果expression-1为NULL，则返回的表达式。
expression-3 - 可选-如果expression-1不是NULL返回的表达式。 如果没有指定expression-3，则当expression-1不是NULL时返回NULL值。
```

返回的数据类型描述如下。

描述

支持 IFNULL 作为 SQL 通用函数和 ODBC 标量函数。 请注意，虽然这两个执行非常相似的操作，但它们在功能上是不同的。 SQL 通用函数支持三个参数。 ODBC 标量函数支持两个参数。 SQL 通用函数和 ODBC 标量函数的双参数形式是不一样的; 当 expression-1 不为空时，它们返回不同的值。

SQL 通用函数计算表达式 1 是否为 NULL。 它永远不会返回 expression-1:

```sql
如果expression-1为NULL，则返回expression-2。
如果expression-1不为NULL，则返回expression-3。
如果expression-1不为NULL，并且没有expression-3，则返回NULL。
ODBC标量函数计算expression-1是否为NULL。 它要么返回expression-1，要么返回expression-2:

如果expression-1为NULL，则返回expression-2。
如果expression-1不为NULL，则返回expression-1。
```

返回值数据类型

`IFNULL(expression-1,expression-2)`:  
返回 expression-2 的数据类型。 如果 expression-2 是数值字面值，则字符串字面值或 NULL 返回数据类型 VARCHAR。  
`IFNULL(expression-1,expression-2,expression-3)`:  
如果 expression-2 和 expression-3 具有不同的数据类型，则返回数据类型优先级更高 (包容性更强) 的数据类型。 如果 expression-2 或 expression-3 是数值字面值或字符串字面值，则返回数据类型 VARCHAR。 如果 expression-2 或 expression-3 为 NULL，则返回非 NULL 参数的数据类型。  
如果 expression-2 和 expression-3 的长度、精度或比例不同，则 IFNULL 返回两个表达式的更大长度、精度或比例。

`{fn IFNULL(expression-1,expression-2)}`  
: 返回 expression-1 的数据类型。 如果 expression-1 是数字字面值、字符串字面值或 NULL，则返回数据类型 VARCHAR。