---
title: Golang实现oauth2认证
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: ba77e224
toc: true
date: 2023-10-27 11:57:56
categories: 
tags: Go
sticky:
---

## oauth2.0 介绍：

这里不再多说给出参考链接 ：

[理解 OAuth 2.0](https://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html)

总的来说，OAuth 不是一个 API 或者服务，而是一个验证授权 (Authorization) 的开放标准，所有人都有基于这个标准实现自己的 OAuth。

在 OAuth 之前，HTTP Basic Authentication, 即用户输入用户名，密码的形式进行验证, 这种形式是不安全的。OAuth 的出现就是为了解决访问资源的安全性以及灵活性。OAuth 使得第三方应用对资源的访问更加安全。

oauth2.0 有四种模式分别如下：

*   授权码（authorization-code）
*   隐藏式（implicit）
*   密码式（password）：
*   客户端凭证（client credentials）

本文主要写最难理解的第一种模式： 授权码模式。

* * *

## oauth2.0 之授权码模式：


标准的 Server 授权模式，非常适合 Server 端的 Web 应用。一旦资源的拥有者授权访问他们的数据之后，他们将会被重定向到 Web 应用并在 URL 的查询参数中附带一个授权码（code）。

在客户端里，该 code 用于请求访问令牌（access_token）。并且该令牌交换的过程是两个服务端之前完成的，防止其他人甚至是资源拥有者本人得到该令牌。

另外，在该授权模式下可以通过 refresh_token 来刷新令牌以延长访问授权时间。

先介绍下四个基本名字：

*   资源拥有者（resource owner）: 通常就是用户自己，能授权访问受保护资源的一个实体，如 QQ 用户注册了 QQ 拥有对应实际账号数据资源
*   资源服务器（resource server）: 存储受保护资源，客户端通过 access token 请求资源，资源服务器响应受保护资源给客户端；其实就是 QQ 服务器，它存储着你的 QQ 账号数据。
*   授权服务器（authorization server）: 验证资源拥有者并获取授权之后，授权服务器颁发授权令牌（Access Token）给客户端，一般来说授权认证服务器与资源服务器都是一个内部体系的，不然它凭什么给你一个 access token，你就能访问对应资源了。
*   客户端（client）：一些第三方应用，其本身不存储资源，而是资源拥有者授权通过后，使用它的授权（授权令牌）访问受保护资源，然后客户端把相应的数据展示出来。“客户端” 术语不代表任何特定实现（如应用运行在一台服务器、桌面、手机或其他设备）。 比如你的网站想接入 QQ 或则微信直接登录你的平台。

demo 时序图如下：

*   用户浏览器，对应的用户其实自身就 resource owner，用于 QQ 账号
*   豆瓣网站，对应 client，它接入了 QQ 登录的方式
*   QQ 授权服务：对应 authorization server， 下图也包括内部的 resource server。

### 梳理下每一步必须要参数：

1.  首先你得拥有属于自己应用对应的 appkey、appsecret 分别对应 OAuth2.0 中的 client_id 与 client_secret，可能一些服务端会扩展一些其他的名称。并设置好你自己的 redirect_uri 跳转回调地址，用于通知给你 code 码，还可以设置好 state 附带返回参数，scope 授权范围.
2.  当你拿到 code 后，就可以换取 access_token 了。一般都必须返回至少三个参数：refresh_token、access_token、expires_in
3.  三方应用拿到 access_token 后就可以请求资源服务器获取用户数据了，如果超时则用 refresh_token 进行重刷 access_token。

参数列表：

*   response_type：表示授权类型，必选项，此处的值固定为”code”
*   client_id：表示客户端的 ID，必选项
*   redirect_uri：表示重定向 URI，可选项
*   scope：表示申请的权限范围如 user，order，可选项
*   state：表示客户端的当前状态，可以指定任意值，认证服务器会原封不动地返回这个值。
*   code：表示授权码，必选项。通常授权码只能使用该码一次，并且会设置有效时间。
*   grant_type：表示使用的授权模式，必选项，此处的值固定为”authorization_code”。
*   client_secret: 表示客户端密钥，必选项。
*   access_token：表示访问令牌，必选项。
*   token_type：表示令牌类型，该值大小写不敏感，必选项，可以是 bearer 类型或 mac 类型。
*   expires_in：表示过期时间，单位为秒。如果省略该参数，必须其他方式设置过期时间。
*   refresh_token：表示更新令牌，用来获取下一次的访问令牌，可选项。

* * *

golang 实现 oauth2.0 代码实战：
------------------------

这里直接使用开源三方 oauth2.0 库：

[GitHub - openshift/osin: Golang OAuth2 server library](https://github.com/openshift/osin)

### 谈谈该库：

优点：

*   实现代码简单易读，实现方式可借鉴学习，典型的插件化调用。
*   代码 test 和 demo 较为完整
*   storage 存储只要自己实现好 interface 就能自动存入对应表数据
*   只有三张表数据结构基本满足，其中一张为临时 code 对应 access_token 表。

缺点：

*   检验机制较为单薄，如 Authorization header 拼接参数的检验
*   没有 refresh_token 的超时设计
*   致命问题是返回的提示语没有 code 编码提示，很多错误提示都得自己看源码调试才知道原因，而且返回的错误提示大体长的都差不多。
*   另外一个问题，请求参数输入参数没有具体文档，得自己看源码研究，参数一旦错误没有明确提示得自己 debug 调试，这个把我坑惨了，不过还好源码简单。。。

### 具体 show code:

除开一些获取配置和前端联动的接口外，这里只设计了三个主要接口：

1.  根据 client_id、redirect_uri、scope、state 获取跳转地址和 code 码；

```go
func (o *OauthController) GetCodeByAppID(ctx *gin.Context) {
	// 检验参数、系统内部授权jwt验证等...
 // 开始调用三方库方法：
	serverCf := osin.NewServerConfig()
// NewOauthStorage 返回的strcut需要你自行实行对应的interface接口
	server := osin.NewServer(serverCf, service.NewOauthStorage(ctx))
// 注入你自己的Log,这样服务端才能打印对应你的日志格式
	server.Logger = log.G(ctx)
	resp := server.NewResponse()
	defer resp.Close()

// HandleAuthorizeRequest 会进行各种参数验证和类型逻辑判断
	if ar := server.HandleAuthorizeRequest(resp, ctx.Request); ar != nil {
		ar.Authorized = true
// 这里需要注入你的用户相关数据，便于框架存入表中
// UserData 是个 interface类型，需要你自己定义用户数据 strcut
		ar.UserData = model.UserData{
			ID:        sess.UID,
			Account:   sess.Account,
			AccountDB: sess.AccountDB,
		}
// FinishAuthorizeRequest 执行数据生产如token产生和赋值
		server.FinishAuthorizeRequest(resp, ctx.Request, ar)
	}
	if resp.IsError && resp.InternalError != nil {
		response.RespError(ctx, resp.InternalError)
		return
	}

// 最终输出前端 或 302跳转
	err = osin.OutputJSON(resp, ctx.Writer, ctx.Request)
	if err != nil {
		response.RespError(ctx, resp.InternalError)
		return
	}
}
```

1.  根据 code、state 换取 access_token

这个接口入参如下：

```bash
Authorization	header	  认证授权：Basic空格{加密字段f}	        string	是
grant_type	  formData	授权类型 固定填写 "authorization_code"	string	是
code	        formData	code编码	                            string	是
state	        formData	state附带参数	                      string	no

加密字段f = {client}:{secret} ==> base64 encode

golang demo:
auth := "1234" + ":" + "abcd"

base64.StdEncoding.EncodeToString([]byte(auth))
```

```go
func (o *OauthController) GetAccessToken(ctx *gin.Context) {
  // 获取参数检验...
	// 这里建议自己实现一次 参数验证，固定code返回格式便于错误定位。
	// 这里只要 接口1调通并且拿到正确的code，这里框架直接应用，会自动就生成返回数据：
	serverCf := osin.NewServerConfig()
	var server = osin.NewServer(serverCf, service.NewOauthStorage(ctx))
	resp := server.NewResponse()
	defer resp.Close()

	if ar := server.HandleAccessRequest(resp, ctx.Request); ar != nil {
		ar.Authorized = true
		server.FinishAccessRequest(resp, ctx.Request, ar)
	}

	err := osin.OutputJSON(resp, ctx.Writer, ctx.Request)
	if err != nil {
		response.RespError(ctx, resp.InternalError)
		return
	}
	return
}
```

该接口返回格式如下：

```bash
{
    "access_token": "SKb9y_ZkQrmGg9UXJHIldA",
    "expires_in": 3600,
    "refresh_token": "YfoYnjYmS3a-jpmKezSWbQ",
    "token_type": "Bearer"
}
```

1.  根据 refresh_token 重新刷新 access_token

入参：

```bash
Authorization	header	认证授权：Basic空格{加密字段f}	      string	是
grant_type	  formData	授权类型 固定填写 "refresh_token"	string	是
refresh_token	formData	refresh_token	                  string	是
state	        formData	state附带参数	                  string	no
```

```go
func (o *OauthController) GetRefreshAccessToken(ctx *gin.Context) {
	// 参数检验
	// 正式授权换token
	serverCf := osin.NewServerConfig()
// 注意这里 AllowedAccessTypes ： REFRESH_TOKEN 需要加载
	serverCf.AllowedAccessTypes = osin.AllowedAccessType{osin.REFRESH_TOKEN}
	server := osin.NewServer(serverCf, storageDao)
	server.Logger = log.G(ctx)
	resp := server.NewResponse()
	defer resp.Close()

	if ar := server.HandleAccessRequest(resp, ctx.Request); ar != nil {
		ar.Authorized = true
		server.FinishAccessRequest(resp, ctx.Request, ar)
	}

	err = osin.OutputJSON(resp, ctx.Writer, ctx.Request)
	if err != nil {
		response.RespError(ctx, resp.InternalError)
		return
	}
	return
}
```

依旧返回：

```bash
{
    "access_token": "SKb9y_ZkQrmGg9UXJHIldA",
    "expires_in": 3600,
    "refresh_token": "YfoYnjYmS3a-jpmKezSWbQ",
    "token_type": "Bearer"
}
```

主题流程就走通了，其余就是自己根据业务系统进行调整即可。

* * *

## 参考资料

- Goalng实现oauth2.0认证授权：https://driverzhang.github.io/post/golang%E5%AE%9E%E7%8E%B0oauth2%E8%AE%A4%E8%AF%81/