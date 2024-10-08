---
title: golang常用库：字段参数验证库-validator使用
date: 2024-10-08T13:42:46+08:00
categories: 开源精选
tags: Go
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 
toc: true 
sticky: 
---


> 本文由 [简悦 SimpRead](http://ksria.com/simpread/) 转码， 原文地址 [www.cnblogs.com](https://www.cnblogs.com/jiujuan/p/13823864.html)

[golang 常用库：gorilla/mux-http 路由库使用](https://www.cnblogs.com/jiujuan/p/12768907.html)  
[golang 常用库：配置文件解析库 / 管理工具 - viper 使用](https://www.cnblogs.com/jiujuan/p/13799976.html)  
[golang 常用库：操作数据库的 orm 框架 - gorm 基本使用](https://www.cnblogs.com/jiujuan/p/12676195.html)  
[golang 常用库：字段参数验证库 - validator 使用](https://www.cnblogs.com/jiujuan/p/13823864.html)

一、背景[#](#858194385)
-------------------

在平常开发中，特别是在 web 应用开发中，为了验证输入字段的合法性，都会做一些验证操作。比如对用户提交的表单字段进行验证，或者对请求的 API 接口字段进行验证，验证字段的合法性，保证输入字段值的安全，防止用户的恶意请求。

一般的做法是用正则表达式，一个字段一个字段的进行验证。一个一个字段验证的话，写起来比较繁琐。那有没更好的方法，进行字段的合法性验证？有， 这就是下面要介绍的 [validator](https://github.com/go-playground/validator) 这个验证组件。

代码地址：  
[https://github.com/go-playground/validator](https://github.com/go-playground/validator)

文档地址：  
[https://github.com/go-playground/validator/blob/master/README.md](https://github.com/go-playground/validator/blob/master/README.md)

二、功能介绍[#](#339427344)
---------------------

这个验证包 [github.com/go-playground/validator](https://github.com/go-playground/validator) 验证功能非常多。

### 标记之间特殊符号说明[#](#1544883614)

*   逗号 ( `,` )：把多个验证标记隔开。`注意`：隔开逗号之间不能有空格, `validate:"lt=0,gt=100"`，逗号那里不能有空格，否则 panic
*   横线 ( `-` )：跳过该字段不验证
*   竖线 ( `|` )：使用多个验证标记，但是只需满足其中一个即可
*   required：表示该字段值必输设置，且不能为默认值
*   omitempty：如果字段未设置，则忽略它

### 范围比较验证[#](#2591928224)

> doc: [https://github.com/go-playground/validator/blob/master/README.md#comparisons](https://github.com/go-playground/validator/blob/master/README.md#comparisons)

范围验证: 切片、数组和 map、字符串，验证其长度；数值，验证大小范围

*   lte：小于等于参数值，`validate:"lte=3"` (小于等于 3)
*   gte：大于等于参数值，`validate:"lte=120,gte=0"` (大于等于 0 小于等于 120)
*   lt：小于参数值，`validate:"lt=3"` (小于 3)
*   gt：大于参数值，`validate:"lt=120,gt=0"` (大于 0 小于 120)
*   len：等于参数值，`validate:"len=2"`
*   max：最大值，小于等于参数值，`validate:"max=20"` (小于等于 20)
*   min：最小值，大于等于参数值，`validate:"min=2,max=20"` (大于等于 2 小于等于 20)
*   ne：不等于，`validate:"ne=2"` (不等于 2)
*   oneof：只能是列举出的值其中一个，这些值必须是数值或字符串，以空格分隔，如果字符串中有空格，将字符串用单引号包围，`validate:"oneof=red green"`

例子：

```
type User struct {
    Name string `json:"name" validate:"min=0,max=35"`
    Age  unit8  `json:"age" validate:"lte=90,gte=0"`
}
```

更多功能请参看文档 [validator comparisons doc](https://github.com/go-playground/validator/blob/master/README.md#comparisons)

### 字符串验证[#](#1496435413)

> doc: [https://github.com/go-playground/validator/blob/master/README.md#strings](https://github.com/go-playground/validator/blob/master/README.md#strings)

*   contains：包含参数子串，`validate:"contains=tom"` (字段的字符串值包含 tom)
*   excludes：包含参数子串，`validate:"excludes=tom"` (字段的字符串值不包含 tom)
*   startswith：以参数子串为前缀，`validate:"startswith=golang"`
*   endswith：以参数子串为后缀，`validate:"startswith=world"`

例子：

```
type User struct { 
    Name string `validate:"contains=tom"` 
    Age int `validate:"min=1"`
}
```

更多功能请参看文档 [validator strings doc](https://github.com/go-playground/validator/blob/master/README.md#strings)

### 字段验证[#](#2726150705)

> doc: [https://github.com/go-playground/validator/blob/master/README.md#fields](https://github.com/go-playground/validator/blob/master/README.md#fields)

*   eqcsfield：跨不同结构体字段验证，比如说 Struct1 Filed1，与结构体 Struct2 Field2 相等，

```
type Struct1 struct {
    Field1 string `validate:eqcsfield=Struct2.Field2`
    Struct2 struct {
        Field2 string 
    }
}
```

*   necsfield：跨不同结构体字段不相等
    
*   eqfield：同一结构体字段验证相等，最常见的就是输入 2 次密码验证
    

```
type User struct { 
    Name string `validate:"lte=4"` 
    Age int `validate:"min=20"` 
    Password string `validate:"min=10"`
    Password2 string `validate:"eqfield=Password"`
}
```

*   nefield：同一结构体字段验证不相等

```
type User struct {
    Name string `validate:"lte=4"` 
    Age int `validate:"min=20"` 
    Password string `validate:"min=10,nefield=Name"`
}
```

*   gtefield：大于等于同一结构体字段，`validate:"gtefiled=Field2"`
*   ltefield：小于等于同一结构体字段

更多功能请参看文档：[validator Fields DOC](https://github.com/go-playground/validator/blob/master/README.md#fields)

### 网络验证[#](#3939421644)

> doc: [https://github.com/go-playground/validator/blob/master/README.md#network](https://github.com/go-playground/validator/blob/master/README.md#network)

*   ip：字段值是否包含有效的 IP 地址，`validate:"ip"`
*   ipv4：字段值是否包含有效的 ipv4 地址，`validate:"ipv4"`
*   ipv6：字段值是否包含有效的 ipv6 地址，`validate:"ipv6"`
*   uri：字段值是否包含有效的 uri，`validate:"uri"`
*   url：字段值是否包含有效的 uri，`validate:"url"`

更多功能请参看文档：[validator network DOC](https://github.com/go-playground/validator/blob/master/README.md#network)

### Format[#](#3045676790)

> doc: [https://github.com/go-playground/validator/blob/master/README.md#format](https://github.com/go-playground/validator/blob/master/README.md#format)

*   base64：字段值是否包含有效的 base64 值

更多功能请参看文档 [validator strings doc](https://github.com/go-playground/validator/blob/master/README.md#strings)

### 其他[#](#121094057)

> 请参看文档: [https://github.com/go-playground/validator/blob/master/README.md#other](https://github.com/go-playground/validator/blob/master/README.md#other)

三、安装[#](#1023042593)
--------------------

go get:

> go get github.com/go-playground/validator/v10

在文件中引用 validator 包：

> import "github.com/go-playground/validator/v10"

四、validator 使用[#](#169917952)
-----------------------------

> 文档：[https://github.com/go-playground/validator/blob/master/README.md#examples](https://github.com/go-playground/validator/blob/master/README.md#examples)

### 例子 1：验证单个字段变量值[#](#3684141116)

validation1.go

```
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

func main() {
	validate := validator.New()

	var boolTest bool
	err := validate.Var(boolTest, "required")
	if err != nil {
		fmt.Println(err)
	}
	var stringTest string = ""
	err = validate.Var(stringTest, "required")
	if err != nil {
		fmt.Println(err)
	}

	var emailTest string = "test@126.com"
	err = validate.Var(emailTest, "email")
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("success") // 输出： success。 说明验证成功
	}

	emailTest2 := "test.126.com"
	errs := validate.Var(emailTest2, "required,email")
	if errs != nil {
		fmt.Println(errs) // 输出: Key: "" Error:Field validation for "" failed on the "email" tag。验证失败
	}

	fmt.Println("\r\nEnd!!")
    
    
}
```

运行输出：

> go run simple1.go  
> Key: ''Error:Field validation for'' failed on the 'required' tag  
> Key: ''Error:Field validation for'' failed on the 'required' tag  
> success  
> Key: ''Error:Field validation for'' failed on the 'email' tag
> 
> End!!

### 例子 2：验证结构体 struct[#](#1275197741)

> from：[struct validate](https://github.com/go-playground/validator/blob/master/_examples/simple/main.go)

validation_struct.go，这个程序还列出了效验出错字段的一些信息，

```
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type User struct {
	FirstName string     `validate:"required"`
	LastName  string     `validate:"required"`
	Age       uint8      `validate:"gte=0,lte=130"`
	Email     string     `validate:"required,email"`
	Addresses []*Address `validate:"required,dive,required"`
}

type Address struct {
	Street string `validate:"required"`
	City   string `validate:"required"`
	Planet string `validate:"required"`
	Phone  string `validate:"required"`
}

func main() {
	address := &Address{
		Street: "Eavesdown Docks",
		Planet: "Persphone",
		Phone:  "none",
	}

	user := &User{
		FirstName: "Badger",
		LastName:  "Smith",
		Age:       135,
		Email:     "Badger.Smith@gmail.com",
		Addresses: []*Address{address},
	}

	validate := validator.New()
	err := validate.Struct(user)
	if err != nil {
		fmt.Println("=== error msg ====")
		fmt.Println(err)

		if _, ok := err.(*validator.InvalidValidationError); ok {
			fmt.Println(err)
			return
		}

		fmt.Println("\r\n=========== error field info ====================")
		for _, err := range err.(validator.ValidationErrors) {
           // 列出效验出错字段的信息
			fmt.Println("Namespace: ", err.Namespace())
			fmt.Println("Fild: ", err.Field())
			fmt.Println("StructNamespace: ", err.StructNamespace())
			fmt.Println("StructField: ", err.StructField())
			fmt.Println("Tag: ", err.Tag())
			fmt.Println("ActualTag: ", err.ActualTag())
			fmt.Println("Kind: ", err.Kind())
			fmt.Println("Type: ", err.Type())
			fmt.Println("Value: ", err.Value())
			fmt.Println("Param: ", err.Param())
			fmt.Println()
		}

		// from here you can create your own error messages in whatever language you wish
		return
	}
}
```

运行 输出：

> $ go run validation_struct.go  
> === error msg ====  
> Key: 'User.Age' Error:Field validation for 'Age' failed on the 'lte' tag  
> Key: 'User.Addresses[0].City' Error:Field validation for 'City' failed on the 'required' tag
> 
> =========== error field info ====================  
> Namespace: User.Age  
> Fild: Age  
> StructNamespace: User.Age  
> StructField: Age  
> Tag: lte  
> ActualTag: lte  
> Kind: uint8  
> Type: uint8  
> Value: 135  
> Param: 130
> 
> Namespace: User.Addresses[0].City  
> Fild: City  
> StructNamespace: User.Addresses[0].City  
> StructField: City  
> Tag: required  
> ActualTag: required  
> Kind: string  
> Type: string  
> Value:  
> Param:

还可以给字段加一些其他 tag 信息，方面 form，json 的解析，如下：

```
type User struct {
    FirstName string     `form:"firstname" json:"firstname" validate:"required"`
	LastName  string     `form:"lastname" json:"lastname" validate:"required"`
	Age       uint8      ` form:"age" json:"age"validate:"gte=0,lte=130"`
	Email     string     ` form:"email" json:"email" validate:"required,email"`
}
```

### 例子 2.2：验证 slice map[#](#2609434942)

#### slice[#](#1982055576)

slice 验证中用到一个 tag 关键字 `dive` , 意思深入一层验证。

validate_slice.go

```
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

func main() {
	sliceone := []string{"123", "onetwothree", "myslicetest", "four", "five"}

	validate := validator.New()
	err := validate.Var(sliceone, "max=15,dive,min=4")
	if err != nil {
		fmt.Println(err)
	}

	slicetwo := []string{}
	err = validate.Var(slicetwo, "min=4,dive,required")
	if err != nil {
		fmt.Println(err)
	}
}
```

运行输出：

> $ go run validate_slice.go  
> Key: '[0]' Error:Field validation for '[0]' failed on the 'min' tag  
> Key: ''Error:Field validation for'' failed on the 'min' tag

说明：

```
sliceone := []string{"123", "onetwothree", "myslicetest", "four", "five"}
validate.Var(sliceone, "max=15,dive,min=4")
```

> 第二个参数中 tag 关键字 `dive` 前面的 max=15，验证 [] , 也就是验证 slice 的长度，`dive` 后面的 min=4，验证 slice 里的值长度，也就是说 dive 后面的 tag 验证 slice 的值

**那如果是二维 slice 验证呢**？如：

```
slicethree := [][]string{}
validate.Var(slicethree, "min=2,dive,len=2,dive,required")

validate.Var(slicethree, "min=2,dive,dive,required")
```

说明：

> 这里有 2 个 dive，刚好深入到二维 slice，但他们也有不同之处，第二个表达式的第一个 dive 后没有设置 tag。  
> 第一个验证表达式：  
> min=2：验证第一个 [] 方括号的值长度 ;  
> len=2：验证第二个 []string 长度;  
> required：验证 slice 里的值

> 第二个验证表达式：  
> min=2：验证第一个 [] 方括号的值长度 ;  
> dive： 后没有设置 tag 值，**不验证第二个 []string** ;  
> required： 验证 slice 里的值

#### map[#](#4066876594)

map 的验证中也需要 tag 关键字 `dive`， 另外，它还有 `keys` 和 `endkeys` 两 tag，验证这 2 个 tag 之间 map 的 key，而不是 value 值。

validate_map.go

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

func main() {
	var mapone map[string]string

	mapone = map[string]string{"one": "jimmmy", "two": "tom", "three": ""}

	validate := validator.New()
	err := validate.Var(mapone, "gte=3,dive,keys,eq=1|eq=2,endkeys,required")
	if err != nil {
		fmt.Println(err)
	}
}
```

运行输出：

> $ go run validate_map.go  
> Key: '[three]' Error:Field validation for '[three]' failed on the 'eq=1|eq=3' tag  
> Key: '[three]' Error:Field validation for '[three]' failed on the 'required' tag  
> Key: '[one]' Error:Field validation for '[one]' failed on the 'eq=1|eq=3' tag  
> Key: '[two]' Error:Field validation for '[two]' failed on the 'eq=1|eq=3' tag

说明：

> gte=3：验证 map 自己的长度；  
> dive 后的 keys,eq=1|eq=2,endkeys：验证 map 的 keys 个数，也就是验证 [] 里值。上例中定义了一个 string，所以明显报了 3 个错误。  
> required：验证 map 的值 value

**那嵌套 map 怎么验证**？  
如：map[[3]string]string，和上面 slice 差不多，使用多个 `dive`

```
var maptwo map[[3]string]string{}
validate.Var(maptwo, "gte=3,dive,keys,dive,eq=1|eq=3,endkeys,required")
```

说明：

> gte=3： 验证 map 的长度；  
> keys,dive,eq=1|eq=3,endkeys：keys 和 endkeys 中有一个 dive(深入一级)，验证 map 中 key 的数组每一个值  
> required： 验证 map 的值

### 用户自定义函数验证[#](#3939301809)

用户自定义函数验证字段是否合法，效验是否正确。

### 例子 3: 通过字段 tag 自定义函数[#](#1523788315)

##### validate.RegisterValidation

customer_tag.go：

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type User struct {
	Name string `form:"name" json:"name" validate:"required,CustomerValidation"` //注意：required和CustomerValidation之间不能有空格，否则panic。CustomerValidation：自定义tag-函数标签
	Age  uint8  ` form:"age" json:"age" validate:"gte=0,lte=80"`                 //注意：gte=0和lte=80之间不能有空格，否则panic
}

var validate *validator.Validate

func main() {
	validate = validator.New()
	validate.RegisterValidation("CustomerValidation", CustomerValidationFunc) //注册自定义函数，前一个参数是struct里tag自定义，后一个参数是自定义的函数

	user := &User{
		Name: "jimmy",
		Age:  86,
	}

	fmt.Println("first value: ", user)
	err := validate.Struct(user)
	if err != nil {
		fmt.Printf("Err(s):\n%+v\n", err)
	}

	user.Name = "tom"
	user.Age = 29
	fmt.Println("second value: ", user)
	err = validate.Struct(user)
	if err != nil {
		fmt.Printf("Err(s):\n%+v\n", err)
	}
}

// 自定义函数
func CustomerValidationFunc(f1 validator.FieldLevel) bool {
    // f1 包含了字段相关信息
    // f1.Field() 获取当前字段信息
    // f1.Param() 获取tag对应的参数
    // f1.FieldName() 获取字段名称
    
	return f1.Field().String() == "jimmy"
}
```

运行输出：

> $ go run customer.go  
> first value: &{jimmy 86}  
> Err(s):  
> Key: 'User.Age' Error:Field validation for 'Age' failed on the 'lte' tag  
> second value: &{tom 29}  
> Err(s):  
> Key: 'User.Name' Error:Field validation for 'Name' failed on the 'CustomerValidation' tag

** 注意：

上面代码`user struct`定义中 ，`validate`里的 required 和 CustomerValidation 之间不能有空格，否则运行时报 panic 错误：`panic: Undefined validation function ' CustomerValidation' on field 'Name'`

### 例子 4：自定义函数 - 直接注册函数 1[#](#3087403480)

不通过字段 tag 自定义函数，直接注册函数。

##### RegisterStructValidation

> [https://github.com/go-playground/validator/blob/master/_examples/struct-level/main.go](https://github.com/go-playground/validator/blob/master/_examples/struct-level/main.go)

customer1.go

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type User struct {
	FirstName      string `json:firstname`
	LastName       string `json:lastname`
	Age            uint8  `validate:"gte=0,lte=130"`
	Email          string `validate:"required,email"`
	FavouriteColor string `validate:"hexcolor|rgb|rgba"`
}

var validate *validator.Validate

func main() {
	validate = validator.New()

	validate.RegisterStructValidation(UserStructLevelValidation, User{})

	user := &User{
		FirstName:      "",
		LastName:       "",
		Age:            30,
		Email:          "TestFunc@126.com",
		FavouriteColor: "#000",
	}

	err := validate.Struct(user)
	if err != nil {
		fmt.Println(err)
	}
}

func UserStructLevelValidation(sl validator.StructLevel) {
	user := sl.Current().Interface().(User)

	if len(user.FirstName) == 0 && len(user.LastName) == 0 {
		sl.ReportError(user.FirstName, "FirstName", "firstname", "firstname", "")
		sl.ReportError(user.LastName, "LastName", "lastname", "lastname", "")
	}
}
```

运行输出：

> $ go run customer1.go  
> Key: 'User.FirstName' Error:Field validation for 'FirstName' failed on the 'firstname' tag  
> Key: 'User.LastName' Error:Field validation for 'LastName' failed on the 'lastname' tag

### 例子 5：自定义函数 - 直接注册函数 2[#](#3765106871)

##### RegisterCustomTypeFunc

> [https://github.com/go-playground/validator/blob/master/_examples/custom/main.go](https://github.com/go-playground/validator/blob/master/_examples/custom/main.go)

[validate.RegisterCustomTypeFunc](https://github.com/go-playground/validator/blob/d6b17fd90bd4dd9d16a594c3035ceadc3de0193a/validator_instance.go#L241%22)：验证类型的自定义函数

customer2.go：

```go
package main

import (
	"database/sql"
	"database/sql/driver"
	"fmt"
	"reflect"

	"github.com/go-playground/validator/v10"
)

type DbBackedUser struct {
	Name sql.NullString `validate:"required"`
	Age  sql.NullInt64  `validate:"required"`
}

var validate *validator.Validate

func main() {
	validate = validator.New()

	validate.RegisterCustomTypeFunc(ValidateValuer, sql.NullString{}, sql.NullInt64{}, sql.NullBool{}, sql.NullFloat64{})

	// build object for validation
	x := DbBackedUser{Name: sql.NullString{String: "", Valid: true}, Age: sql.NullInt64{Int64: 0, Valid: false}}

	err := validate.Struct(x)
	if err != nil {
		fmt.Printf("Err(s):\n%+v\n", err)
	}
}

func ValidateValuer(field reflect.Value) interface{} {
	if valuer, ok := field.Interface().(driver.Valuer); ok {
		val, err := valuer.Value()
		if err == nil {
			return val
		}
		// handle the error how you want
	}
	return nil
}
```

运行输出：

> $ go run customer.go  
> Err(s):  
> Key: 'DbBackedUser.Name' Error:Field validation for 'Name' failed on the 'required' tag  
> Key: 'DbBackedUser.Age' Error:Field validation for 'Age' failed on the 'required' tag

**注意，这个函数**：  
[RegisterCustomTypeFunc](https://github.com/go-playground/validator/blob/d6b17fd90bd4dd9d16a594c3035ceadc3de0193a/validator_instance.go#L241%22)，它上面有 2 行注释：

> // RegisterCustomTypeFunc registers a CustomTypeFunc against a number of types  
> //  
> // NOTE: this method is not thread-safe it is intended that these all be registered prior to any validation

它是一个验证数据类型自定义函数，NOTE: 这个方法不是线程安全的

### 例子 6：两字段比较[#](#3397954413)

**两个字段比较，有一种是密码比较验证**，用户注册时候验证 2 次密码输入是否相同。用 tag `eqfield` 比较两字段。。

verify_pwd.go:

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

// 注册用户 user struct
type User struct {
	UserName  string `json:"username" validate:"lte=14,gte=4"`
	Password  string `json:"password" validate:"max=20,min=6"`
	Password2 string `json:"password2" validate:"eqfield=Password"`
}

func main() {
	validate := validator.New()

	user1 := User{
		UserName:  "jim",
		Password:  "123456",
		Password2: "12345",
	}
	fmt.Println("validate user1 value: ", user1)
	err := validate.Struct(user1)
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println("====================")

	user2 := User{
		UserName:  "jimy",
		Password:  "123456",
		Password2: "123456",
	}
	fmt.Println("validate user2 value: ", user2)
	err = validate.Struct(user2)
	if err != nil {
		fmt.Println(err)
	}
}
```

运行输出：

> $ go run verify_pwd.go  
> validate user1 value: {jim 123456 12345}  
> Key: 'User.UserName' Error:Field validation for 'UserName' failed on the 'gte' tag  
> Key: 'User.Password2' Error:Field validation for 'Password2' failed on the 'eqfield' tag  
> ====================  
> validate user2 value:

**还有一种是 2 变量字段比较**，见下面例子 eq_field.go:

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

func main() {
	field1 := "tom"
	field2 := "jimmy"

	validate := validator.New()

	fmt.Println("tag nefield: ")
	err := validate.VarWithValue(field1, field2, "nefield")
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("correct")
	}

	fmt.Println("===========================")

	fmt.Println("tag eqfield: ")
	err = validate.VarWithValue(field1, field2, "eqfield")
	if err != nil {
		fmt.Println(err)
	}
}
```

运行输出：

> $ go run eq_field.go  
> tag nefield:  
> correct  
> ===========================  
> tag eqfield:  
> Key: ''Error:Field validation for'' failed on the 'eqfield' tag

### 例子 7：翻译 / 自定义字段错误[#](#1214570972)

*   [universal-translator](https://github.com/go-playground/universal-translator/tree/master/_examples)
*   [i10n](https://github.com/go-playground/locales)

```go
package main

import (
	"fmt"
	"strings"

	"github.com/go-playground/locales/en"
	"github.com/go-playground/locales/zh"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"

	zhtrans "github.com/go-playground/validator/v10/translations/zh"
	// entrans "github.com/go-playground/validator/v10/translations/en"
)

type Student struct {
	Name  string `validate:required`
	Email string `validate:"email"`
	Age   int    `validate:"max=30,min=12"`
}

func main() {
	en := en.New() //英文翻译器
	zh := zh.New() //中文翻译器

	// 第一个参数是必填，如果没有其他的语言设置，就用这第一个
	// 后面的参数是支持多语言环境（
	// uni := ut.New(en, en) 也是可以的
	// uni := ut.New(en, zh, tw)
	uni := ut.New(en, zh)
	trans, _ := uni.GetTranslator("zh") //获取需要的语言

	student := Student{
		Name:  "tom",
		Email: "testemal",
		Age:   40,
	}
	validate := validator.New()

	zhtrans.RegisterDefaultTranslations(validate, trans)

	err := validate.Struct(student)
	if err != nil {
		// fmt.Println(err)

		errs := err.(validator.ValidationErrors)
		fmt.Println(removeStructName(errs.Translate(trans)))
	}
}

func removeStructName(fields map[string]string) map[string]string {
	result := map[string]string{}

	for field, err := range fields {
		result[field[strings.Index(field, ".")+1:]] = err
	}
	return result
}
```

运行输出：

> $ go run customer_err_info3.go  
> map[Age:Age 必须小于或等于 30 Email:Email 必须是一个有效的邮箱]

也可以到我的公众号：[九卷技术录 - 字段参数验证库 - validator 使用](https://mp.weixin.qq.com/s/xcBo3iaUNQRHpLxvgzmb7w) 继续讨论此文

五、参考[#](#1200214996)
--------------------

*   [https://github.com/go-playground/validator/blob/master/README.md](https://github.com/go-playground/validator/blob/master/README.md)
*   [https://github.com/go-playground/validator/tree/master/_examples](https://github.com/go-playground/validator/tree/master/_examples)
*   [https://github.com/go-playground/universal-translator/tree/master/_examples](https://github.com/go-playground/universal-translator/tree/master/_examples)
*   [https://github.com/go-playground/validator/issues/633](https://github.com/go-playground/validator/issues/633)
*   [validator translator](https://www.liwenzhou.com/posts/Go/validator_usages/#autoid-1-0-2)