---
title: hot100 go语言实现
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: cfce5271
toc: true
date: 2023-03-11 04:41:21
categories: 期末考试
tags: 期末考试
sticky:
---

<style>
.example-tab-container {
  margin: 0 0 20px 0;
  padding: 10px 20px 20px 20px;
  border-radius: 6px;
  box-shadow: 0 0.5em 0.75em -0.125em rgba(10,10,10,0.1), 0 0px 0 1px rgba(10,10,10,0.02);
}
</style>

## 二叉树

### 二叉树的中序遍历





<div class="example-tab-container">
{% tabs %}
<!-- tab id:cpp title:递归 active -->

```go
func inorderTraversal(root *TreeNode) (res []int) {
	var inorder func(node *TreeNode)
	inorder = func(node *TreeNode) {
		if node == nil {
			return
		}
		inorder(node.Left)
		res = append(res, node.Val)
		inorder(node.Right)
	}
	inorder(root)
	return
}
```
<!-- endtab -->
<!-- tab id:go title:迭代 -->
```go
func inorderTraversal(root *TreeNode) (res []int) {
	stack := []*TreeNode{}
	for root != nil || len(stack) > 0 {
		for root != nil {
			stack = append(stack, root)
			root = root.Left
		}
		root = stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		res = append(res, root.Val)
		root = root.Right
	}
	return
}
```
<!-- endtab -->
{% endtabs %}
</div>

### 不同的二叉搜索树

```go
func numTrees(n int) int {
    G := make([]int, n + 1)
    G[0], G[1] = 1, 1
    for i := 2; i <= n; i++ {
        for j := 1; j <= i; j++ {
            G[i] += G[j-1] * G[i-j]
        }
    }
    return G[n]
}
```

### 验证二叉搜索树

```go
func isValidBST(root *TreeNode) bool {
    return helper(root, math.MinInt64, math.MaxInt64)
}

func helper(root *TreeNode, lower, upper int) bool {
    if root == nil {
        return true
    }
    if root.Val <= lower || root.Val >= upper {
        return false
    }
    return helper(root.Left, lower, root.Val) && helper(root.Right, root.Val, upper)
}
```

## 对称二叉树

```go
// 在【100. 相同的树】的基础上稍加改动
func isSameTree(p, q *TreeNode) bool {
    if p == nil || q == nil {
        return p == q
    }
    return p.Val == q.Val && isSameTree(p.Left, q.Right) && isSameTree(p.Right, q.Left)
}

func isSymmetric(root *TreeNode) bool {
    return isSameTree(root.Left, root.Right)
}
```

### 二叉树的最大深度

```go
func isSymmetric(root *TreeNode) bool {
    return check(root, root)
}

func check(p, q *TreeNode) bool {
    if p == nil && q == nil {
        return true
    }
    if p == nil || q == nil {
        return false
    }
    return p.Val == q.Val && check(p.Left, q.Right) && check(p.Right, q.Left) 
}
```

### 二叉树的直径

```go
func diameterOfBinaryTree(root *TreeNode) (ans int) {
    var dfs func(*TreeNode) int
    dfs = func(node *TreeNode) int {
        if node == nil {
            return -1 // 下面 +1 后，对于叶子节点就刚好是 0
        }
        lLen := dfs(node.Left) + 1  // 左子树最大链长+1
        rLen := dfs(node.Right) + 1 // 右子树最大链长+1
        ans = max(ans, lLen+rLen)   // 两条链拼成路径
        return max(lLen, rLen)      // 当前子树最大链长
    }
    dfs(root)
    return
}

func max(a, b int) int { if a < b { return b }; return a }
```

### 合并二叉树

```go
func mergeTrees(root1, root2 *TreeNode) *TreeNode {
    if root1 == nil {
        return root2
    }
    if root2 == nil {
        return root1
    }
    return &TreeNode{root1.Val + root2.Val,
        mergeTrees(root1.Left, root2.Left),   // 合并左子树
        mergeTrees(root1.Right, root2.Right)} // 合并右子树
}
```

## 链表

## 反转链表

```go
func reverseList(head *ListNode) *ListNode {
    var pre, cur *ListNode = nil, head
    for cur != nil {
        nxt := cur.Next
        cur.Next = pre
        pre = cur
        cur = nxt
    }
    return pre
}
```

## 合并两个有序链表

```go
func mergeTwoLists(list1, list2 *ListNode) *ListNode {
    dummy := &ListNode{} // 用哨兵节点简化代码逻辑
    cur := dummy // cur 指向新链表的末尾
    for list1 != nil && list2 != nil {
        if list1.Val < list2.Val {
            cur.Next = list1 // 把 list1 加到新链表中
            list1 = list1.Next
        } else { // 注：相等的情况加哪个节点都是可以的
            cur.Next = list2 // 把 list2 加到新链表中
            list2 = list2.Next
        }
        cur = cur.Next
    }
    // 拼接剩余链表
    if list1 != nil {
        cur.Next = list1
    } else {
        cur.Next = list2
    }
    return dummy.Next
}
```

## 环形链表

```go
func hasCycle(head *ListNode) bool {
    slow, fast := head, head // 乌龟和兔子同时从起点出发
    for fast != nil && fast.Next != nil {
        slow = slow.Next // 乌龟走一步
        fast = fast.Next.Next // 兔子走两步
        if fast == slow { // 兔子追上乌龟（套圈），说明有环
            return true
        }
    }
    return false // 访问到了链表末尾，无环
}
```

## 相交链表

```go
func getIntersectionNode(headA, headB *ListNode) *ListNode {
    vis := map[*ListNode]bool{}
    for tmp := headA; tmp != nil; tmp = tmp.Next {
        vis[tmp] = true
    }
    for tmp := headB; tmp != nil; tmp = tmp.Next {
        if vis[tmp] {
            return tmp
        }
    }
    return nil
}
```



## 回文链表

```go
func isPalindrome(head *ListNode) bool {
    vals := []int{}
    for ; head != nil; head = head.Next {
        vals = append(vals, head.Val)
    }
    n := len(vals)
    for i, v := range vals[:n/2] {
        if v != vals[n-1-i] {
            return false
        }
    }
    return true
}
```