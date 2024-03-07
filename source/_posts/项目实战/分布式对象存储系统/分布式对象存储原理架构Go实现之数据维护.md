---
title: 分布式对象存储原理架构Go实现之数据维护
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 2301d141
toc: true
date: 2024-03-07 06:28:54
categories: 项目实战
tags: [Go,分布式,对象存储]
sticky:
---






### 删除没有元数据引用的对象数据

在对象存储系统中，对象的元数据和数据是分开存储的。元数据存储在数据库中，而数据存储在文件系统中。当一个对象被删除时，我们只是在数据库中删除了元数据，而数据文件并没有被删除。这样做的好处是可以在一定时间内恢复被误删的对象，但是也会导致数据文件越来越多，占用越来越多的存储空间。

```go
func main() {
	files, _ := filepath.Glob(os.Getenv("STORAGE_ROOT") + "/objects/*")

	for i := range files {
		hash := strings.Split(filepath.Base(files[i]), ".")[0]
		hashInMetadata, e := es.HasHash(hash)
		if e != nil {
			log.Println(e)
			return
		}
		if !hashInMetadata {
			del(hash)
		}
	}
}

func del(hash string) {
	log.Println("delete", hash)
	url := "http://" + os.Getenv("LISTEN_ADDRESS") + "/objects/" + hash
	request, _ := http.NewRequest("DELETE", url, nil)
	client := http.Client{}
	client.Do(request)
}

func HasHash(hash string) (bool, error) {
	url := fmt.Sprintf("http://%s/metadata/_search?q=hash:%s&size=0", os.Getenv("ES_SERVER"), hash)
	r, e := http.Get(url)
	if e != nil {
		return false, e
	}
	b, _ := ioutil.ReadAll(r.Body)
	var sr searchResult
	json.Unmarshal(b, &sr)
	return sr.Hits.Total != 0, nil
}
```

### 对象的检查和修复



## 小结

数据维护包括过期数据的清理以及当期数据的检查和修复。

没有什么系统是只进不出的，对象存储也一样。随着时间的推移会有越来越多的对象进入我们的系统，而我们的存储又不可能无限制增长，所以我们需要采取一定的对象版本留存策略以清理过期的对象。

当期数据可能由于硬件损坏，软件错误或数据降解等原因而被破坏，所以需要定期地进行检查和修复。

本章实现的3个工具，分别用于清除过期对象的元数据、数据，以及当期对象数据的检查和修复等。一个成熟的对象存储系统在运行的过程中一定还会出现各种新的需求，需要新的工具来处理。只要掌握了原理，读者就可以自己去根据需要实现这些工具。