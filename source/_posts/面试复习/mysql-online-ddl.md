---
title: mysql online ddl
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 1244b485
toc: true
date: 2023-03-08 11:46:28
categories: 期末考试
tags: 期末考试
sticky:
---

MySQL Online DDL 原理和踩坑
======================

MySQL 的 DDL(Data Definition Language) 包括增减字段、增减索引等操作。在 MySQL 5.6 之前，MySQL 的 DDL 操作会按照原来的表复制一份，并做相应的修改，例如，对表 A 进行 DDL 的具体过程如下：

1.  按照表 A 的定义新建一个表 B
2.  对表 A 加写锁
3.  在表 B 上执行 DDL 指定的操作
4.  将 A 中的数据拷贝到 B
5.  释放 A 的写锁
6.  删除表 A
7.  将表 B 重命名为 A

在 2-4 的过程中，如果表 A 数据量比较大，拷贝到表 B 的过程会消耗大量时间，并占用额外的存储空间。此外，由于 DDL 操作占用了表 A 的写锁，所以表 A 上的 DDL 和 DML 都将阻塞无法提供服务。

因此，MySQL 5.6 增加了 Online DDL，允许在不中断数据库服务的情况下进行 DDL 操作。

用法
--

```
ALTER TABLE tbl_name ADD PRIMARY KEY (column), ALGORITHM=INPLACE, LOCK=NONE;
```

ALTER 语句中可以指定参数 ALGORITHM 和 LOCK 分别指定 DDL 执行的方式和 DDL 期间 DML 的兵法控制

1.  ALGORITHM=INPLACE 表示执行 DDL 的过程中不发生表拷贝，过程中允许并发执行 DML（INPLACE 不需要像 COPY 一样占用大量的磁盘 I/O 和 CPU，减少了数据库负载。同时减少了 buffer pool 的使用，避免 buffer pool 中原有的查询缓存被大量删除而导致的性能问题）。
    
    如果设置 ALGORITHM=COPY，DDL 就会按 MySQL 5.6 之前的方式，采用表拷贝的方式进行，过程中会阻塞所有的 DML。另外也可以设置 ALGORITHEM=DAFAULT，让 MySQL 以尽量保证 DML 并发操作的原则选择执行方式。
    
2.  LOCK=NONE 表示对 DML 操作不加锁，DDL 过程中允许所有的 DML 操作。此外还有 EXCLUSIVE（持有排它锁，阻塞所有的请求，适用于需要尽快完成 DDL 或者服务库空闲的场景）、SHARED（允许 SELECT，但是阻塞 INSERT UPDATE DELETE，适用于数据仓库等可以允许数据写入延迟的场景）和 DEFAULT（根据 DDL 的类型，在保证最大并发的原则下来选择 LOCK 的取值）
    

不过并不是所有的 DDL 操作都能用 INPLACE 的方式执行，具体的支持情况可以在 [MySQL Reference Manual — Online DDL Operations](https://link.juejin.cn?target=https%3A%2F%2Fdev.mysql.com%2Fdoc%2Frefman%2F5.6%2Fen%2Finnodb-online-ddl-operations.html "https://dev.mysql.com/doc/refman/5.6/en/innodb-online-ddl-operations.html") 中查看。

例如 Table 14.10 中显示修改列的数据类型不支持 INPLACE

<table><thead><tr><th>Operation</th><th>In Place</th><th>Rebuilds Table</th><th>Permits Concurrent DML</th><th>Only Modifies Metadata</th></tr></thead><tbody><tr><td>Changing the column data type</td><td>No</td><td>Yes</td><td>No</td><td>No</td></tr></tbody></table>

这时尝试将原类型为 FLOAT 的 column_name 改为 INT

```
ALTER TABLE tbl_name MODIFY COLUMN column_name INT, ALGORITHM=INPLACE, LOCK=NONE;
```

会报错

```
ERROR: 1846 (0A000): ALGORITHM=INPLACE is not supported. Reason: Cannot change column type INPLACE. Try ALGORITHM=COPY.
```

执行过程
----

1.  初始化：根据存储引擎、用户指定的操作、用户指定的 ALGORITHM 和 LOCK 计算 DDL 过程中允许的并发量，这个过程中会获取一个 shared metadata lock，用来保护表的结构定义
2.  执行 DDL：根据第一步的情况决定是否将 shared metadata lock 升级为 exclusive metadata lock（仅在语句准备阶段），然后生成语句并执行。执行期间的 shared metadata lock 保证了不会同时执行其他的 DDL，但 DML 能可以正常执行
3.  提交：将 shared metadata lock 升级为 exclusive metadata lock，然后删除旧的表定义，提交新的表定义

![](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/7/21/1736f449b39809e9~tplv-t2oaga2asx-jj-mark:3024:0:0:0:q75.awebp)

Online DDL 过程中占用 exclusive MDL 的步骤执行很快，所以几乎不会阻塞 DML 语句。

不过，在 DDL 执行前或执行时，其他事务可以获取 MDL。由于需要用到 exclusive MDL，所以必须要等到其他占有 metadata lock 的事务提交或回滚后才能执行上面两个涉及到 MDL 的地方。

踩坑
--

前面提到 Online DDL 执行过程中需要获取 MDL，MDL (metadata lock) 是 MySQL 5.5 引入的表级锁，在访问一个表的时候会被自动加上，以保证读写的正确性。当对一个表做 DML 操作的时候，加 MDL 读锁；当做 DDL 操作时候，加 MDL 写锁。

为了在大表执行 DDL 的过程中同时保证 DML 能并发执行，前面使用了 ALGORITHM=INPLACE 的 Online DDL，但这里仍然存在死锁的风险，问题就出在 Online DDL 过程中需要 exclusive MDL 的地方。

例如，Session 1 在事务中执行 SELECT 操作，此时会获取 shared MDL。由于是在事务中执行，所以这个 shared MDL 只有在事务结束后才会被释放。

```
# Session 1
> START TRANSACTION;
> SELECT * FROM tbl_name;
# 正常执行
```

这时 Session 2 想要执行 DML 操作也只需要获取 shared MDL，仍然可以正常执行。

```
# Session 2
> SELECT * FROM tbl_name;
# 正常执行
```

但如果 Session 3 想执行 DDL 操作就会阻塞，因为此时 Session 1 已经占用了 shared MDL，而 DDL 的执行需要先获取 exclusive MDL，因此无法正常执行。

```
# Session 3
> ALTER TABLE tbl_name ADD COLUMN n INT;
# 阻塞
```

通过 `show processlist` 可以看到 ALTER 操作正在等待 MDL。

```
+----+-----------------+------------------+------+---------+------+---------------------------------+-----------------+
| Id | User            | Host             | db   | Command | Time | State                           | Info            |
│----+-----------------+------------------+------+---------+------+---------------------------------+-----------------+
| 11 | root            | 172.17.0.1:53048 | demo | Query   |    3 | Waiting for table metadata lock | alter table ... |
+----+-----------------+------------------+------+---------+------+---------------------------------+-----------------+
```

由于 exclusive MDL 的获取优先于 shared MDL，后续尝试获取 shared MDL 的操作也将会全部阻塞

```
# Session 4
> SELECT * FROM tbl_name;
# 阻塞
```

到这一步，后续无论是 DML 和 DDL 都将阻塞，直到 Session 1 提交或者回滚，Session 1 占用的 shared MDL 被释放，后面的操作才能继续执行。

上面这个问题主要有两个原因：

1.  Session 1 中的事务没有及时提交，因此阻塞了 Session 3 的 DDL
2.  Session 3 Online DDL 阻塞了后续的 DML 和 DDL

对于问题 1，不少 ORM（例如 pymysql）都默认将用户语句封装成事务执行，如果客户端程序中断退出，还没来得及提交或者回滚事务，就会出现 Session 1 中的情况。这时可以在 `infomation_schema.innodb_trx` 中找出未完成的事务对应的线程，并强制退出

```
> SELECT * FROM information_schema.innodb_trx\G
*************************** 1. row ***************************
                    trx_id: 421564480355704
                 trx_state: RUNNING
               trx_started: 2020-07-21 01:49:41
     trx_requested_lock_id: NULL
          trx_wait_started: NULL
                trx_weight: 0
       trx_mysql_thread_id: 9
                 trx_query: NULL
       trx_operation_state: NULL
         trx_tables_in_use: 0
         trx_tables_locked: 0
          trx_lock_structs: 0
     trx_lock_memory_bytes: 1136
           trx_rows_locked: 0
         trx_rows_modified: 0
   trx_concurrency_tickets: 0
       trx_isolation_level: REPEATABLE READ
         trx_unique_checks: 1
    trx_foreign_key_checks: 1
trx_last_foreign_key_error: NULL
 trx_adaptive_hash_latched: 0
 trx_adaptive_hash_timeout: 0
          trx_is_read_only: 0
trx_autocommit_non_locking: 0
       trx_schedule_weight: NULL
1 row in set (0.0025 sec)
```

可以看到 Session 1 正在执行的事务对应的 trx_mysql_thread_id 为 9，然后执行 `KILL 9` 即可中断 Session 1 中的事务。

对于问题 2，在查询很多的情况下，会导致阻塞的 session 迅速增多，对于这种情况，可以先中断 DDL 操作，防止对服务造成过大的影响。也可以尝试在从库上修改表结构后进行主从切换或者使用 pt-osc 等第三方工具。