---
title: Gorm单元测试源码
excerpt: 
abbrlink: f6514f61
toc: true
date: 2024-08-20 12:22:50
categories:
tags:
sticky:
---

阅读一下这段代码并向我解释清楚，同时给出三个我可能想继续问的问题：

<!-- more -->

```go
package tests_test

import (
  "testing"

  "gorm.io/gorm"
  . "gorm.io/gorm/utils/tests"
)

func TestBelongsToAssociation(t *testing.T) {
  user := *GetUser("belongs-to", Config{Company: true, Manager: true})

  if err := DB.Create(&user).Error; err != nil {
    t.Fatalf("errors happened when create: %v", err)
  }

  CheckUser(t, user, user)

  // Find
  var user2 User
  DB.Find(&user2, "id = ?", user.ID)
  pointerOfUser := &user2
  if err := DB.Model(&pointerOfUser).Association("Company").Find(&user2.Company); err != nil {
    t.Errorf("failed to query users, got error %#v", err)
  }
  user2.Manager = &User{}
  DB.Model(&user2).Association("Manager").Find(user2.Manager)
  CheckUser(t, user2, user)

  // Count
  AssertAssociationCount(t, user, "Company", 1, "")
  AssertAssociationCount(t, user, "Manager", 1, "")

  // Append
  company := Company{Name: "company-belongs-to-append"}
  manager := GetUser("manager-belongs-to-append", Config{})

  if err := DB.Model(&user2).Association("Company").Append(&company); err != nil {
    t.Fatalf("Error happened when append Company, got %v", err)
  }

  if company.ID == 0 {
    t.Fatalf("Company's ID should be created")
  }

  if err := DB.Model(&user2).Association("Manager").Append(manager); err != nil {
    t.Fatalf("Error happened when append Manager, got %v", err)
  }

  if manager.ID == 0 {
    t.Fatalf("Manager's ID should be created")
  }

  user.Company = company
  user.Manager = manager
  user.CompanyID = &company.ID
  user.ManagerID = &manager.ID
  CheckUser(t, user2, user)

  AssertAssociationCount(t, user2, "Company", 1, "AfterAppend")
  AssertAssociationCount(t, user2, "Manager", 1, "AfterAppend")

  // Replace
  company2 := Company{Name: "company-belongs-to-replace"}
  manager2 := GetUser("manager-belongs-to-replace", Config{})

  if err := DB.Model(&user2).Association("Company").Replace(&company2); err != nil {
    t.Fatalf("Error happened when replace Company, got %v", err)
  }

  if company2.ID == 0 {
    t.Fatalf("Company's ID should be created")
  }

  if err := DB.Model(&user2).Association("Manager").Replace(manager2); err != nil {
    t.Fatalf("Error happened when replace Manager, got %v", err)
  }

  if manager2.ID == 0 {
    t.Fatalf("Manager's ID should be created")
  }

  user.Company = company2
  user.Manager = manager2
  user.CompanyID = &company2.ID
  user.ManagerID = &manager2.ID
  CheckUser(t, user2, user)

  AssertAssociationCount(t, user2, "Company", 1, "AfterReplace")
  AssertAssociationCount(t, user2, "Manager", 1, "AfterReplace")

  // Delete
  if err := DB.Model(&user2).Association("Company").Delete(&Company{}); err != nil {
    t.Fatalf("Error happened when delete Company, got %v", err)
  }
  AssertAssociationCount(t, user2, "Company", 1, "after delete non-existing data")

  if err := DB.Model(&user2).Association("Company").Delete(&company2); err != nil {
    t.Fatalf("Error happened when delete Company, got %v", err)
  }
  AssertAssociationCount(t, user2, "Company", 0, "after delete")

  if err := DB.Model(&user2).Association("Manager").Delete(&User{}); err != nil {
    t.Fatalf("Error happened when delete Manager, got %v", err)
  }
  AssertAssociationCount(t, user2, "Manager", 1, "after delete non-existing data")

  if err := DB.Model(&user2).Association("Manager").Delete(manager2); err != nil {
    t.Fatalf("Error happened when delete Manager, got %v", err)
  }
  AssertAssociationCount(t, user2, "Manager", 0, "after delete")

  // Prepare Data for Clear
  if err := DB.Model(&user2).Association("Company").Append(&company); err != nil {
    t.Fatalf("Error happened when append Company, got %v", err)
  }

  if err := DB.Model(&user2).Association("Manager").Append(manager); err != nil {
    t.Fatalf("Error happened when append Manager, got %v", err)
  }

  AssertAssociationCount(t, user2, "Company", 1, "after prepare data")
  AssertAssociationCount(t, user2, "Manager", 1, "after prepare data")

  // Clear
  if err := DB.Model(&user2).Association("Company").Clear(); err != nil {
    t.Errorf("Error happened when clear Company, got %v", err)
  }

  if err := DB.Model(&user2).Association("Manager").Clear(); err != nil {
    t.Errorf("Error happened when clear Manager, got %v", err)
  }

  AssertAssociationCount(t, user2, "Company", 0, "after clear")
  AssertAssociationCount(t, user2, "Manager", 0, "after clear")

  // unexist company id
  unexistCompanyID := company.ID + 9999999
  user = User{Name: "invalid-user-with-invalid-belongs-to-foreign-key", CompanyID: &unexistCompanyID}
  if err := DB.Create(&user).Error; err == nil {
    tidbSkip(t, "not support the foreign key feature")
    t.Errorf("should have gotten foreign key violation error")
  }
}

func TestBelongsToAssociationForSlice(t *testing.T) {
  users := []User{
    *GetUser("slice-belongs-to-1", Config{Company: true, Manager: true}),
    *GetUser("slice-belongs-to-2", Config{Company: true, Manager: false}),
    *GetUser("slice-belongs-to-3", Config{Company: true, Manager: true}),
  }

  DB.Create(&users)

  AssertAssociationCount(t, users, "Company", 3, "")
  AssertAssociationCount(t, users, "Manager", 2, "")

  // Find
  var companies []Company
  if DB.Model(&users).Association("Company").Find(&companies); len(companies) != 3 {
    t.Errorf("companies count should be %v, but got %v", 3, len(companies))
  }

  var managers []User
  if DB.Model(&users).Association("Manager").Find(&managers); len(managers) != 2 {
    t.Errorf("managers count should be %v, but got %v", 2, len(managers))
  }

  // Append
  DB.Model(&users).Association("Company").Append(
    &Company{Name: "company-slice-append-1"},
    &Company{Name: "company-slice-append-2"},
    &Company{Name: "company-slice-append-3"},
  )

  AssertAssociationCount(t, users, "Company", 3, "After Append")

  DB.Model(&users).Association("Manager").Append(
    GetUser("manager-slice-belongs-to-1", Config{}),
    GetUser("manager-slice-belongs-to-2", Config{}),
    GetUser("manager-slice-belongs-to-3", Config{}),
  )
  AssertAssociationCount(t, users, "Manager", 3, "After Append")

  if err := DB.Model(&users).Association("Manager").Append(
    GetUser("manager-slice-belongs-to-test-1", Config{}),
  ).Error; err == nil {
    t.Errorf("unmatched length when update user's manager")
  }

  // Replace -> same as append

  // Delete
  if err := DB.Model(&users).Association("Company").Delete(&users[0].Company); err != nil {
    t.Errorf("no error should happened when deleting company, but got %v", err)
  }

  if users[0].CompanyID != nil || users[0].Company.ID != 0 {
    t.Errorf("users[0]'s company should be deleted'")
  }

  AssertAssociationCount(t, users, "Company", 2, "After Delete")

  // Clear
  DB.Model(&users).Association("Company").Clear()
  AssertAssociationCount(t, users, "Company", 0, "After Clear")

  DB.Model(&users).Association("Manager").Clear()
  AssertAssociationCount(t, users, "Manager", 0, "After Clear")

  // shared company
  company := Company{Name: "shared"}
  if err := DB.Model(&users[0]).Association("Company").Append(&company); err != nil {
    t.Errorf("Error happened when append company to user, got %v", err)
  }

  if err := DB.Model(&users[1]).Association("Company").Append(&company); err != nil {
    t.Errorf("Error happened when append company to user, got %v", err)
  }

  if users[0].CompanyID == nil || users[1].CompanyID == nil || *users[0].CompanyID != *users[1].CompanyID {
    t.Errorf("user's company id should exists and equal, but its: %v, %v", users[0].CompanyID, users[1].CompanyID)
  }

  DB.Model(&users[0]).Association("Company").Delete(&company)
  AssertAssociationCount(t, users[0], "Company", 0, "After Delete")
  AssertAssociationCount(t, users[1], "Company", 1, "After other user Delete")
}

func TestBelongsToDefaultValue(t *testing.T) {
  type Org struct {
    ID string
  }
  type BelongsToUser struct {
    OrgID string
    Org   Org `gorm:"default:NULL"`
  }

  tx := DB.Session(&gorm.Session{})
  tx.Config.DisableForeignKeyConstraintWhenMigrating = true
  AssertEqual(t, DB.Config.DisableForeignKeyConstraintWhenMigrating, false)

  tx.Migrator().DropTable(&BelongsToUser{}, &Org{})
  tx.AutoMigrate(&BelongsToUser{}, &Org{})

  user := &BelongsToUser{
    Org: Org{
      ID: "BelongsToUser_Org_1",
    },
  }
  err := DB.Create(&user).Error
  AssertEqual(t, err, nil)
}

func TestBelongsToAssociationUnscoped(t *testing.T) {
  type ItemParent struct {
    gorm.Model
    Logo string `gorm:"not null;type:varchar(50)"`
  }
  type ItemChild struct {
    gorm.Model
    Name         string `gorm:"type:varchar(50)"`
    ItemParentID uint
    ItemParent   ItemParent
  }

  tx := DB.Session(&gorm.Session{})
  tx.Migrator().DropTable(&ItemParent{}, &ItemChild{})
  tx.AutoMigrate(&ItemParent{}, &ItemChild{})

  item := ItemChild{
    Name: "name",
    ItemParent: ItemParent{
      Logo: "logo",
    },
  }
  if err := tx.Create(&item).Error; err != nil {
    t.Fatalf("failed to create items, got error: %v", err)
  }

  // test replace
  if err := tx.Model(&item).Association("ItemParent").Unscoped().Replace(&ItemParent{
    Logo: "updated logo",
  }); err != nil {
    t.Errorf("failed to replace item parent, got error: %v", err)
  }

  var parents []ItemParent
  if err := tx.Find(&parents).Error; err != nil {
    t.Errorf("failed to find item parent, got error: %v", err)
  }
  if len(parents) != 1 {
    t.Errorf("expected %d parents, got %d", 1, len(parents))
  }

  // test delete
  if err := tx.Model(&item).Association("ItemParent").Unscoped().Delete(&parents); err != nil {
    t.Errorf("failed to delete item parent, got error: %v", err)
  }
  if err := tx.Find(&parents).Error; err != nil {
    t.Errorf("failed to find item parent, got error: %v", err)
  }
  if len(parents) != 0 {
    t.Errorf("expected %d parents, got %d", 0, len(parents))
  }
}
```

这段 Go 代码是使用 GORM（Go ORM）库进行数据库操作的测试套件的一部分，重点是数据库中的 “属于（Belongs To）” 关联。它包含几个测试函数（`TestBelongsToAssociation`、`TestBelongsToAssociationForSlice`、`TestBelongsToDefaultValue` 和 `TestBelongsToAssociationUnscoped`），旨在验证通过模型管理数据库中相关数据的不同方面。

### [](#TestBelongsToAssociation-函数解释： "TestBelongsToAssociation 函数解释：")`TestBelongsToAssociation` 函数解释：

此测试函数探讨了与关联操作相关的各种操作，特别是使用 `User`、`Company` 和 `Manager` 模型的 “属于” 关系：

*   **创建（Create）**：向数据库插入一个新用户及其关联的公司和经理，并检查是否有任何错误。
*   **查找（Find）**：通过其 ID 检索用户，并获取其关联的公司和经理。
*   **计数（Count）**：验证关联实体的数量。
*   **追加（Append）**：向现有用户添加新的关联实体。
*   **替换（Replace）**：用新的关联实体替换当前的关联。
*   **删除（Delete）**：从用户中移除关联。
*   **清除（Clear）**：清除给定用户的所有关联。
*   **不存在的外键（Unexist Foreign Key）**：检查使用无效外键时的行为，期望外键违规错误。

### [](#您可能接下来想问的问题： "您可能接下来想问的问题：")您可能接下来想问的问题：

1.  **这个测试套件中涉及哪些模型？**（了解 `User`、`Company` 和 `Manager` 模型的结构和字段）
2.  **这段代码中 GORM 如何处理事务和错误？**（了解事务完整性和错误处理）
3.  **`AssertAssociationCount` 函数是如何工作的？**（这会涉及该函数如何验证关联中的预期记录数，这对于确保单元测试中的数据完整性至关重要）

这些问题可以帮助您深入了解代码的具体细节以及测试数据库操作涉及的更广泛概念。

[](#Claude "Claude")Claude
--------------------------

这段代码是一个 Go 语言的测试文件，主要测试了 GORM（一个流行的 Go 语言 ORM 库）中的”belongs to” 关联关系。以下是主要内容的解释：

1.  测试文件定义了几个主要的测试函数，如 TestBelongsToAssociation、TestBelongsToAssociationForSlice 等。
2.  这些测试函数检查了”belongs to” 关联的各种操作，包括创建、查找、计数、追加、替换、删除和清除。
3.  测试使用了 User、Company 和 Manager 等模型来模拟真实世界的关系。
4.  测试覆盖了单个对象和对象切片的情况，确保 GORM 能正确处理这两种情况。
5.  还包括了一些边缘情况的测试，如外键约束、默认值设置、软删除（使用 Unscoped）等。
6.  测试使用了一些辅助函数如 AssertAssociationCount 来验证关联关系的正确性。

这个测试文件的目的是确保 GORM 的”belongs to” 关联功能在各种情况下都能正确工作，包括基本的 CRUD 操作和一些特殊情况。

以下是三个你可能想继续问的问题：

1.  GORM 中的”belongs to” 关联具体是如何工作的？它与其他类型的关联（如”has many” 或”many to many”）有什么区别？
2.  这个测试文件中使用的 AssertAssociationCount 函数是如何实现的？它在测试中起到了什么作用？
3.  为什么测试中要特别处理软删除（Unscoped）的情况？这在实际应用中有什么意义？