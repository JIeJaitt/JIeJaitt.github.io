---
title: 高频SQL练习
categories: 数据存储
tags: SQL
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: high-frequency-sql-practice
toc: true
date: 2024-02-29 13:48:37
sticky:
---

## SQL查询相关

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

思路是基于共同的客户 ID（在 customers 表中的 id 列和 orders 表中的 customerId 列），将表 customers 与表 orders 进行连接。

通过进行左连接，并选择 customerId 为 null 的记录，我们可以确定哪些客户没有下过订单。

我们使用左连接（Left Join）在 customers 上，因为我们希望将所有来自 customers 的客户都包括进来，无论他们是否下过订单。
因此，通过使用左连接，我们可以保留所有来自左表（customers）的行，并将它们与右表（orders）中基于 id 和 customerId 进行匹配的相应行分别对应。


```sql
-- 使用排除条件过滤数据
SELECT customers.name AS 'Customers'
FROM customers
where customers.id not in
(
    select customerid from orders
);

-- 在 customers 上进行左连接（Left Join）
SELECT customers.name AS 'Customers'
FROM Customers
LEFT JOIN Orders ON Customers.Id = Orders.CustomerId
WHERE Orders.CustomerId IS NULL
```



## 计算特殊奖金

```sql
Create table If Not Exists Employees (employee_id int, name varchar(30), salary int)
Truncate table Employees
insert into Employees (employee_id, name, salary) values ('2', 'Meir', '3000')
insert into Employees (employee_id, name, salary) values ('3', 'Michael', '3800')
insert into Employees (employee_id, name, salary) values ('7', 'Addilyn', '7400')
insert into Employees (employee_id, name, salary) values ('8', 'Juan', '6100')
insert into Employees (employee_id, name, salary) values ('9', 'Kannon', '7700')

表: Employees

+-------------+---------+
| 列名        | 类型     |
+-------------+---------+
| employee_id | int     |
| name        | varchar |
| salary      | int     |
+-------------+---------+
employee_id 是这个表的主键(具有唯一值的列)。
此表的每一行给出了雇员id ，名字和薪水。
```

编写解决方案，计算每个雇员的奖金。如果一个雇员的 id 是 奇数 并且他的名字不是以 `'M'` 开头，那么他的奖金是他工资的 `100%` ，否则奖金为 `0` 。

返回的结果按照 `employee_id` 排序。

返回结果格式如下面的例子所示。

```text
输入：
Employees 表:
+-------------+---------+--------+
| employee_id | name    | salary |
+-------------+---------+--------+
| 2           | Meir    | 3000   |
| 3           | Michael | 3800   |
| 7           | Addilyn | 7400   |
| 8           | Juan    | 6100   |
| 9           | Kannon  | 7700   |
+-------------+---------+--------+
输出：
+-------------+-------+
| employee_id | bonus |
+-------------+-------+
| 2           | 0     |
| 3           | 0     |
| 7           | 7400  |
| 8           | 0     |
| 9           | 7700  |
+-------------+-------+
解释：
因为雇员id是偶数，所以雇员id 是2和8的两个雇员得到的奖金是0。
雇员id为3的因为他的名字以'M'开头，所以，奖金是0。
其他的雇员得到了百分之百的奖金。
```

在 SQL 中，我们使用条件函数 IF 来执行条件检查，并根据条件的结果返回不同的值。IF 函数的语法如下：
```sql
IF(condition, value_if_true, value_if_false)
```

`condition` 由两部分组成，用关键字 AND 分隔：
- `employee_id % 2 = 1`：这个条件检查 `employee_id` 是否为奇数。
- `name NOT REGEXP '^M'`：我们使用关键字 REGEXP 进行正则表达式模式匹配，它检查名字是否不以字母 "M" 开头（`^M` 表示一个正则表达式模式，匹配任何以 "M" 开头的名字）。

因此，在我们的情况下，IF 函数如下所示：

```sql
IF(employee_id % 2 = 1 AND name NOT REGEXP '^M', salary, 0)
```

AS子句用于给上面计算的列一个别名 `bonus`。如果两个条件都满足，则 `bonus` 将设置为员工的工资。否则，它将设置为0。然后，结果集根据 `employee_id` 列按升序排序。完整的代码如下所示：

```sql
SELECT 
    employee_id,
    IF(employee_id % 2 = 1 AND name NOT REGEXP '^M', salary, 0) AS bonus 
FROM 
    employees 
ORDER BY 
    employee_id

select employee_id, if(employee_id%2=1 and left(name,1)!='M',salary,0)as bonus
from Employees
order by employee_id
```


## 每位学生的最高成绩

## 购买了产品 A 和产品 B 却没有购买产品 C 的顾客