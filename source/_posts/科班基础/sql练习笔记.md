---
title: sql｜Structured Query Language
categories: 数据存储
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: sql
toc: true
sticky: 
---

Character Set：utf8mb3


# 什么是窗口函数？
窗口函数是一种SQL函数，它允许我们在执行聚合操作（如 SUM、AVG、MAX、MIN 等）时，按照特定的窗口（也称为分组）进行操作，以便在结果中包含更多的列和信息。

在使用传统的聚合函数进行查询时，结果只包含聚合后的值。例如，如果我们要查询某个表中的每个类别的总销售额，那么传统的查询将只返回总销售额。但是，在实际应用中，我们可能还需要在结果集中包含其他信息，例如每个类别的销售额排名、销售额占比等等。这时就可以使用窗口函数。

窗口函数可以用来计算与当前行相关的聚合值，而不是对整个结果集执行聚合操作。它们允许我们将一个大的结果集分成更小的分组，并对每个分组执行聚合操作，同时仍然可以在结果中返回每个分组的详细信息。

窗口函数在使用时，通常需要指定 OVER 子句来定义窗口的范围和排序方式。窗口可以按照一些列进行排序，然后根据这些排序后的列的值来计算聚合值。例如，我们可以使用窗口函数来计算某个员工的平均薪资，而不仅仅是整个公司的平均薪资。

常见的窗口函数包括 RANK、ROW_NUMBER、DENSE_RANK、NTILE、LEAD、LAG、SUM、AVG、MAX、MIN 等。

窗口函数和聚合函数有一些相似之处，但它们是不同的。聚合函数计算一组数据的总和、平均值、最大值、最小值等等，返回一个单一的汇总结果，而且通常用于 GROUP BY 语句中。窗口函数在处理数据时可以类似于聚合函数，但它们不会合并行并返回单一结果。相反，它们将结果返回到每个行中，并与其他行的结果进行比较。窗口函数不会修改原始数据集，而是返回一个新的数据集。因此，虽然窗口函数和聚合函数都可以用于对数据进行计算和处理，但它们的结果集不同，窗口函数可以提供更多的灵活性和控制，通常在需要对行级数据进行计算和处理的情况下使用。

以下是一些窗口函数的实际使用示例：

1. 使用 RANK() 函数来计算销售额排名

```sql
SELECT
    product_name,
    sales_amount,
    RANK() OVER (ORDER BY sales_amount DESC) AS sales_rank
FROM
    sales
```

2. 使用 ROW_NUMBER() 函数来为每个分组分配序号

```sql
SELECT
    customer_id,
    order_date,
    order_amount,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date ASC) AS order_num
FROM
    orders
```

3. 使用 NTILE() 函数将行分组到 n 个组中

```sql
SELECT
    customer_name,
    order_amount,
    NTILE(4) OVER (ORDER BY order_amount DESC) AS quartile
FROM
    orders
```

4. 使用 SUM() 函数来计算移动平均值

```sql
SELECT
    date,
    sales_amount,
    SUM(sales_amount) OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_average
FROM
    sales
```

5. 使用 LEAD() 和 LAG() 函数来比较当前行与前一行或后一行的值

```sql
SELECT
    date,
    sales_amount,
    LEAD(sales_amount, 1) OVER (ORDER BY date) AS next_day_sales,
    LAG(sales_amount, 1) OVER (ORDER BY date) AS previous_day_sales
FROM
    sales
```

这些示例只是窗口函数的一部分用例，实际上，窗口函数可以用于许多其他用途，例如计算百分比、累计求和、行间差异、数据填充等等。

##  寻找今年具有正收入的客户 
```sql
CREATE TABLE IF NOT EXISTS Customers (
	customer_id INT,
	year INT,
	revenue INT
);

TRUNCATE TABLE Customers;

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('1', '2018', '50');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('1', '2021', '30');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('1', '2020', '70');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('2', '2021', '-50');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('3', '2018', '10');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('3', '2016', '50');

INSERT INTO Customers (customer_id, year, revenue)
VALUES ('4', '2021', '20');

SELECT customer_id AS 'customer_id'
FROM Customers
WHERE year = 2021
	AND revenue > 0;
```

表：`Customers`

```
+--------------+------+
| Column Name  | Type |
+--------------+------+
| customer_id  | int  |
| year         | int  |
| revenue      | int  |
+--------------+------+
(customer_id, year) 是这个表的主键。
这个表包含客户 ID 和不同年份的客户收入。
注意，这个收入可能是负数。
```

写一个 SQL 查询来查询 2021 年具有 **正收入** 的客户。

可以按 **任意顺序** 返回结果表。

查询结果格式如下例。

```sql
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

Result table:
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

## 从不订购的客户
```sql
select customers.name as 'Customers'
from customers
where customers.id not in
(
    select customerid from orders
);
```



