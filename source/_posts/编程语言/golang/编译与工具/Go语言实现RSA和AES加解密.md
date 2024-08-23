---
title: Go语言实现RSA和AES加解密
toc: true
abbrlink: 83429b98
date: 2021-08-31 00:17:42
categories: 编程语言
tags: 
    - Go
sticky:
---

密码学里目前有两大经典算法，一个是对称加解密，其中具有代表性的是 AES 加解密；另一个是非对称加解密，其中具有代表性的是 RSA 加解密。这里就以这两个经典算法为例，简单介绍一下其在Go语言中的实现。

<!-- more -->

## AES 加解密

AES 加密又分为 ECB、CBC、CFB、OFB 等几种，这里只列两种吧。

#### 1) CBC 加解密

```go
package main

import (
    "bytes"
    "crypto/aes"
    "crypto/cipher"
    "encoding/base64"
    "fmt"
)

func main() {
    orig := "http://c.biancheng.net/golang/"
    key := "123456781234567812345678"
    fmt.Println("原文：", orig)
    encryptCode := AesEncrypt(orig, key)
    fmt.Println("密文：", encryptCode)
    decryptCode := AesDecrypt(encryptCode, key)
    fmt.Println("解密结果：", decryptCode)
}
func AesEncrypt(orig string, key string) string {
    // 转成字节数组
    origData := []byte(orig)
    k := []byte(key)
    // 分组秘钥
    block, _ := aes.NewCipher(k)
    // 获取秘钥块的长度
    blockSize := block.BlockSize()
    // 补全码
    origData = PKCS7Padding(origData, blockSize)
    // 加密模式
    blockMode := cipher.NewCBCEncrypter(block, k[:blockSize])
    // 创建数组
    cryted := make([]byte, len(origData))
    // 加密
    blockMode.CryptBlocks(cryted, origData)
    return base64.StdEncoding.EncodeToString(cryted)
}
func AesDecrypt(cryted string, key string) string {
    // 转成字节数组
    crytedByte, _ := base64.StdEncoding.DecodeString(cryted)
    k := []byte(key)
    // 分组秘钥
    block, _ := aes.NewCipher(k)
    // 获取秘钥块的长度
    blockSize := block.BlockSize()
    // 加密模式
    blockMode := cipher.NewCBCDecrypter(block, k[:blockSize])
    // 创建数组
    orig := make([]byte, len(crytedByte))
    // 解密
    blockMode.CryptBlocks(orig, crytedByte)
    // 去补全码
    orig = PKCS7UnPadding(orig)
    return string(orig)
}

//补码
func PKCS7Padding(ciphertext []byte, blocksize int) []byte {
    padding := blocksize - len(ciphertext)%blocksize
    padtext := bytes.Repeat([]byte{byte(padding)}, padding)
    return append(ciphertext, padtext...)
}

//去码
func PKCS7UnPadding(origData []byte) []byte {
    length := len(origData)
    unpadding := int(origData[length-1])
    return origData[:(length - unpadding)]
}
```

其运行结果如下：

```bash
go run main.go
原文： http://c.biancheng.net/golang/
密文： m6bjY+Z9O8LPwT8nYPZ9/41JG7+k5PXxtENxYwnrii0=
解密结果： http://c.biancheng.net/golang/
```

#### 2) CFB 加解密

代码如下：

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "fmt"
    "os"
)

var commonIV = []byte{0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f}

func main() {
    //需要去加密的字符串
    plaintext := []byte("http://c.biancheng.net/golang/")
    //如果传入加密串的话，plaint就是传入的字符串
    if len(os.Args) > 1 {
        plaintext = []byte(os.Args[1])
    }
    //aes的加密字符串
    key_text := "astaxie12798akljzmknm.ahkjkljl;k"
    if len(os.Args) > 2 {
        key_text = os.Args[2]
    }
    // 创建加密算法aes
    c, err := aes.NewCipher([]byte(key_text))
    if err != nil {
        fmt.Printf("Error: NewCipher(%d bytes) = %s", len(key_text), err)
        os.Exit(-1)
    }
    //加密字符串
    cfb := cipher.NewCFBEncrypter(c, commonIV)
    ciphertext := make([]byte, len(plaintext))
    cfb.XORKeyStream(ciphertext, plaintext)
    fmt.Printf("%s=>%x\n", plaintext, ciphertext)
    // 解密字符串
    cfbdec := cipher.NewCFBDecrypter(c, commonIV)
    plaintextCopy := make([]byte, len(plaintext))
    cfbdec.XORKeyStream(plaintextCopy, ciphertext)
    fmt.Printf("%x=>%s\n", ciphertext, plaintextCopy)
}
```

其运行结果如下：

```bash
go run main.go
http://c.biancheng.net/golang/=>757fbec27b304698750a3542896e8bc5b5d49ac7dba6c589a2ec35778bca
757fbec27b304698750a3542896e8bc5b5d49ac7dba6c589a2ec35778bca=>http://c.biancheng.net/golang/
```

上面的代码如果细看和分解成加解密函数，发现是有问题的，这里再列个官方的示例：

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "io"
)

func ExampleNewCFBDecrypter() {
    key, _ := hex.DecodeString("6368616e676520746869732070617373")
    ciphertext, _ := hex.DecodeString("939e08921a34ebc7d921c641edb55916c24cc2fa6f14e91b66c22a70c38d23e588c2aed3548cad5ab4baa63a214a")
    block, err := aes.NewCipher(key)
    if err != nil {
        panic(err)
    }
    if len(ciphertext) < aes.BlockSize {
        panic("ciphertext too short")
    }
    iv := ciphertext[:aes.BlockSize]
    ciphertext = ciphertext[aes.BlockSize:]
    stream := cipher.NewCFBDecrypter(block, iv)
    stream.XORKeyStream(ciphertext, ciphertext)
    fmt.Printf("%s\n", ciphertext)
}

func ExampleNewCFBEncrypter() {
    key, _ := hex.DecodeString("6368616e676520746869732070617373")
    plaintext := []byte("http://c.biancheng.net/golang/")
    block, err := aes.NewCipher(key)
    if err != nil {
        panic(err)
    }
    ciphertext := make([]byte, aes.BlockSize+len(plaintext))
    iv := ciphertext[:aes.BlockSize]
    if _, err := io.ReadFull(rand.Reader, iv); err != nil {
        panic(err)
    }
    stream := cipher.NewCFBEncrypter(block, iv)
    stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)
    fmt.Printf("%x\n", ciphertext)
}

func main() {
    ExampleNewCFBDecrypter()
    ExampleNewCFBEncrypter()
}
```

运行结果如下：

```bash
go run main.go
http://c.biancheng.net/golang/
8bd6cefc2b436124221ae07de571d30a9071c89427340e0364b8645557dc69e5085896f121c34be0e17728263602
```

## RSA 加解密

AES 一般用于加解密文，而 RSA 算法一算用来加解密密码。这里列举一个代码示例，如下：

```go
package main

import (
    "crypto/rand"
    "crypto/rsa"
    "crypto/x509"
    "encoding/base64"
    "encoding/pem"
    "errors"
    "fmt"
)

// 可通过openssl产生
//openssl genrsa -out rsa_private_key.pem 1024
var privateKey = []byte(`
-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDfw1/P15GQzGGYvNwVmXIGGxea8Pb2wJcF7ZW7tmFdLSjOItn9
kvUsbQgS5yxx+f2sAv1ocxbPTsFdRc6yUTJdeQolDOkEzNP0B8XKm+Lxy4giwwR5
LJQTANkqe4w/d9u129bRhTu/SUzSUIr65zZ/s6TUGQD6QzKY1Y8xS+FoQQIDAQAB
AoGAbSNg7wHomORm0dWDzvEpwTqjl8nh2tZyksyf1I+PC6BEH8613k04UfPYFUg1
0F2rUaOfr7s6q+BwxaqPtz+NPUotMjeVrEmmYM4rrYkrnd0lRiAxmkQUBlLrCBiF
u+bluDkHXF7+TUfJm4AZAvbtR2wO5DUAOZ244FfJueYyZHECQQD+V5/WrgKkBlYy
XhioQBXff7TLCrmMlUziJcQ295kIn8n1GaKzunJkhreoMbiRe0hpIIgPYb9E57tT
/mP/MoYtAkEA4Ti6XiOXgxzV5gcB+fhJyb8PJCVkgP2wg0OQp2DKPp+5xsmRuUXv
720oExv92jv6X65x631VGjDmfJNb99wq5QJBAMSHUKrBqqizfMdOjh7z5fLc6wY5
M0a91rqoFAWlLErNrXAGbwIRf3LN5fvA76z6ZelViczY6sKDjOxKFVqL38ECQG0S
pxdOT2M9BM45GJjxyPJ+qBuOTGU391Mq1pRpCKlZe4QtPHioyTGAAMd4Z/FX2MKb
3in48c0UX5t3VjPsmY0CQQCc1jmEoB83JmTHYByvDpc8kzsD8+GmiPVrausrjj4p
y2DQpGmUic2zqCxl6qXMpBGtFEhrUbKhOiVOJbRNGvWW
-----END RSA PRIVATE KEY-----
`)

//openssl
//openssl rsa -in rsa_private_key.pem -pubout -out rsa_public_key.pem
var publicKey = []byte(`
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDfw1/P15GQzGGYvNwVmXIGGxea
8Pb2wJcF7ZW7tmFdLSjOItn9kvUsbQgS5yxx+f2sAv1ocxbPTsFdRc6yUTJdeQol
DOkEzNP0B8XKm+Lxy4giwwR5LJQTANkqe4w/d9u129bRhTu/SUzSUIr65zZ/s6TU
GQD6QzKY1Y8xS+FoQQIDAQAB
-----END PUBLIC KEY-----
`)

// 加密
func RsaEncrypt(origData []byte) ([]byte, error) {
    //解密pem格式的公钥
    block, _ := pem.Decode(publicKey)
    if block == nil {
        return nil, errors.New("public key error")
    }
    // 解析公钥
    pubInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err != nil {
        return nil, err
    }
    // 类型断言
    pub := pubInterface.(*rsa.PublicKey)
    //加密
    return rsa.EncryptPKCS1v15(rand.Reader, pub, origData)
}

// 解密
func RsaDecrypt(ciphertext []byte) ([]byte, error) {
    //解密
    block, _ := pem.Decode(privateKey)
    if block == nil {
        return nil, errors.New("private key error!")
    }
    //解析PKCS1格式的私钥
    priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
    if err != nil {
        return nil, err
    }
    // 解密
    return rsa.DecryptPKCS1v15(rand.Reader, priv, ciphertext)
}

func main() {
    data, _ := RsaEncrypt([]byte("http://c.biancheng.net/golang/"))
    fmt.Println(base64.StdEncoding.EncodeToString(data))
    origData, _ := RsaDecrypt(data)
    fmt.Println(string(origData))
}
```

运行结果如下：

```bash
go run main.go
z7mjbTqVg09F20pVib8TqGpZ3d/dNkYg4Hksai/elXoOJJJRH0YgRT4fqJTzj2+9DaCH5BXhiFuCgPzEOl2S3oPeTIQjEFqbYy7yBNScufWaGhh0YigrqUyseQ7JJR+oWTCZPpMNie/xKg9
vhUqJ7yH3d91v+AexHw7HOcLYHYE=
http://c.biancheng.net/golang/
```