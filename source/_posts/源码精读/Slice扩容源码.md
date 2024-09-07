---
title: Slice扩容源码
date: 2024-09-07T15:24:57+08:00
categories: 源码精读
tags: Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---

在Go语言中，slice的扩容是在添加元素时自动处理的。当slice容量不足以容纳新的元素时，它会自动扩展。扩容的过程涉及到重新分配内存和数据复制。

扩容的具体实现细节在不同版本的Go语言中可能有所不同，但基本的逻辑是相似的。以下是扩容的一个简化版本的伪代码：

```go
func growslice(et *_type, old slice, cap int) slice {
    newcap := old.cap
    doublecap := newcap + newcap
    if cap > doublecap {
        newcap = cap
    } else {
        if old.len < 1024 {
            newcap = doublecap
        } else {
            // Check 0 < newcap < old.cap.
            for 0 < newcap && newcap < old.cap {
                newcap += newcap / 4
            }
            if newcap <= old.cap {
                newcap = old.cap
            }
        }
    }
 
    // 根据新的容量分配内存
    newlen := old.len
    p := malloc(et, newcap)
    if p == nil {
        panic(memerr)
    }
 
    // 复制旧的数据到新的内存地址
    memmove(p, old.array, uintptr(newlen)*et.size)
    return slice{et, p, newlen, newcap}
}
```

这个伪代码展示了扩容函数的基本逻辑。实际的扩容逻辑可能更加复杂，包括了边界条件检查和性能优化。扩容的最终结果是为slice分配一个新的，更大的底层数组，并将旧数组中的元素复制到新数组中。


## 参考资料

- https://www.cnblogs.com/xiangshihua/p/15771993.html