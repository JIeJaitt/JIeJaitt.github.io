---
title: 高频SQL练习
categories: 数据存储
tags: SQL
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 3f65d0e9
toc: true
date: 2024-02-29 13:48:37
sticky:
---

## 寻找今年具有正收入的客户

```sql
-- SQL Schema
Create table If Not Exists Customers (customer_id int, year int, revenue int)
Truncate table Customers
insert into Customers (customer_id, year, revenue) values ('1', '2018', '50')
insert into Customers (customer_id, year, revenue) values ('1', '2021', '30')
insert into Customers (customer_id, year, revenue) values ('1', '2020', '70')
insert into Customers (customer_id, year, revenue) values ('2', '2021', '-50')
insert into Customers (customer_id, year, revenue) values ('3', '2018', '10')
insert into Customers (customer_id, year, revenue) values ('3', '2016', '50')
insert into Customers (customer_id, year, revenue) values ('4', '2021', '20')
-- 表：Customers
+--------------+------+
| Column Name  | Type |
+--------------+------+
| customer_id  | int  |
| year         | int  |
| revenue      | int  |
+--------------+------+
(customer_id, year) 是该表的主键（具有唯一值的列的组合）。
这个表包含客户 ID 和不同年份的客户收入。
注意，这个收入可能是负数。
```

编写一个解决方案来报告 2021 年具有 正收入 的客户。

可以以 任意顺序 返回结果表。

结果格式如下示例所示。

```bash
# 示例 1:
Input:
Customers
+-------------+------+---------+
| customer_id | year | revenue |
+-------------+------+---------+
| 1           | 2018 | 50      |
| 1           | 2021 | 30      |
| 1           | 2020 | 70      |
| 2           | 2021 | -50     |
| 3           | 2018 | 10      |
| 3           | 2016 | 50      |
| 4           | 2021 | 20      |
+-------------+------+---------+

Output:
+-------------+
| customer_id |
+-------------+
| 1           |
| 4           |
+-------------+
客户 1 在 2021 年的收入等于 30 。
客户 2 在 2021 年的收入等于 -50 。
客户 3 在 2021 年没有收入。
客户 4 在 2021 年的收入等于 20 。
因此，只有客户 1 和 4 在 2021 年有正收入。
```

```sql
SELECT customer_id
FROM customers
WHERE year = 2021 AND revenue > 0;

# Write your MySQL query statement below
select t.customer_id
    from customers t
        where t.year = '2021' and t.revenue > 0;
```

审题的时候注意一下这句话：“(customer_id, year) 是这个表的主键。” 表示是不会有重复值的。。。所以不需要去重！一个人在一年是主键，只有唯一一个，不需要分组sum了，直接where就行。我是这么理解的，不知道对不对

```sql
select customer_id

from Customers

where revenue>0 and year=2021

group by customer_id,year
```

但是customer_id,year已经是主键了，就是唯一的所以不需要分组去重了

## 从不订购的客户

```sql
-- SQL Schema
Create table If Not Exists Customers (id int, name varchar(255))
Create table If Not Exists Orders (id int, customerId int)
Truncate table Customers
insert into Customers (id, name) values ('1', 'Joe')
insert into Customers (id, name) values ('2', 'Henry')
insert into Customers (id, name) values ('3', 'Sam')
insert into Customers (id, name) values ('4', 'Max')
Truncate table Orders
insert into Orders (id, customerId) values ('1', '3')
insert into Orders (id, customerId) values ('2', '1')

Customers 表：

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| id          | int     |
| name        | varchar |
+-------------+---------+
在 SQL 中，id 是该表的主键。
该表的每一行都表示客户的 ID 和名称。
Orders 表：

+-------------+------+
| Column Name | Type |
+-------------+------+
| id          | int  |
| customerId  | int  |
+-------------+------+
在 SQL 中，id 是该表的主键。
customerId 是 Customers 表中 ID 的外键( Pandas 中的连接键)。
该表的每一行都表示订单的 ID 和订购该订单的客户的 ID。
```

找出所有从不点任何东西的顾客。

以 任意顺序 返回结果表。

结果格式如下所示。

```text
示例 1：

输入：
Customers table:
+----+-------+
| id | name  |
+----+-------+
| 1  | Joe   |
| 2  | Henry |
| 3  | Sam   |
| 4  | Max   |
+----+-------+
Orders table:
+----+------------+
| id | customerId |
+----+------------+
| 1  | 3          |
| 2  | 1          |
+----+------------+
输出：
+-----------+
| Customers |
+-----------+
| Henry     |
| Max       |
+-----------+
```
判断客户是否曾经下过订单的条件是：如果一个客户 ID 在 `orders` 表中不存在，这就意味着他们从未下过订单。

因此，我们可以使用行过滤来移除不满足条件的客户 ID。请注意，要求只返回满足条件的名称，并将列 `name` 重命名为 `Customers`。

```sql
select customers.name as 'Customers'
from customers
where customers.id not in
(
    select customerid from orders
);
```

在 customers 上进行左连接（Left Join）

```sql
SELECT name AS 'Customers'
FROM Customers
LEFT JOIN Orders ON Customers.Id = Orders.CustomerId
WHERE Orders.CustomerId IS NULL
```



## 计算特殊奖金


## 