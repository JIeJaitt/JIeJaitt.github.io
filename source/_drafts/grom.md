---
title: grom
tags:
---

## gorm如何联表查询

要在 GORM 中进行联表查询，可以使用 Preload 方法。例如，如果你有一个名为 User 的模型和一个名为 Profile 的模型，并且想要在查询用户时同时加载其配置文件，可以这样做：

```go
var user User
db.Preload("Profile").First(&user, 1)
```

这将在加载用户时同时加载其配置文件。你还可以使用其它条件和链式 Preload 方法来进行更复杂的联表查询。

## 把这段sql改成gorm语句：

```sql
SELECT wo.*, fo.batchId FROM t_wealth_order wo JOIN t_wealth_fund_order fo ON fo.orderId = wo.id WHERE  productType in('1','9') and fo.batchId like '%USD%'
```

可以使用 GORM 的 Select 和 Joins 方法来编写该查询语句，以下是你可以尝试的示例代码：

```go
var orders []WealthOrder
db.Select("t_wealth_order.*, t_wealth_fund_order.batchId").
    Joins("JOIN t_wealth_fund_order ON t_wealth_fund_order.orderId = t_wealth_order.id").
    Where("productType IN ? AND t_wealth_fund_order.batchId LIKE ?", []string{"1", "9"}, "%USD%").
    Find(&orders)
```

在这个示例中，假设 WealthOrder 和 WealthFundOrder 是你的模型，其中 WealthOrder 包含 t_wealth_order 表的结构，WealthFundOrder 包含 t_wealth_fund_order 表的结构。Joins 方法用于执行联接操作，Select 方法用于选择返回的字段，Where 方法用于添加条件。

## 你这不还是原生的sql吗？

对不起，我误解了你的要求。让我来纠正一下。

在 GORM 中，你可以使用 Preload 方法执行联表查询。你可以这样尝试：

```go
var orders []WealthOrder
db.Preload("FundOrder", "productType IN (?, ?) AND batchId LIKE ?", "1", "9", "%USD%").Find(&orders)
```

假设 WealthOrder 拥有一个名为 FundOrder 的关联模型，上面的代码将在加载 WealthOrder 时同时加载关联的 FundOrder，并且只选择 productType 符合条件并且 batchId 含有 "USD" 的记录。