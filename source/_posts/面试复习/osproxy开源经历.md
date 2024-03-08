---
title: osproxy一次pr经历
date: 2024-03-08T16:57:54+08:00
categories: 
tags: 
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true
sticky: 9000
---




## 过期大文件上传链接

第一种，后面觉得麻烦放弃了

```go
	// 标记旧的文件链接为过期，以防止被重复使用
	if err := repo.NewMetaDataInfoRepo().MarkLinkAsExpired(lgDB, uid); err != nil {
		lgLogger.WithContext(c).Error("标记文件链接为过期失败", zap.Any("err", err.Error()))
		web.InternalError(c, "标记文件链接为过期失败")
		return
	}

// 设置字段为过期
func (r *metaDataInfoRepo) MarkLinkAsExpired(db *gorm.DB, uid int64) error {
	return db.Model(&models.MetaDataInfo{}).Where("uid = ?", uid).Update("is_expired", true).Error
}   

```

第二种

```go

```