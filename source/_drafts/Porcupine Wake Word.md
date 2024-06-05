---
title: Porcupine Wake Word
tags:
---


## 创建虚拟环境

```bash
python3 -m venv venv

source venv/bin/activate 
```

## 帮我用Porcupine Wake Word写一个m1 mac上的语音唤醒程序

要在 M1 Mac 上使用 Porcupine Wake Word 引擎来实现语音唤醒程序，你需要安装 Porcupine SDK，并编写相应的 Python 代码。以下是一个详细的步骤和代码示例：

### 1. 安装 Porcupine SDK

首先，你需要安装 Porcupine SDK。可以使用 pip 安装：

```bash
pip install pvporcupine
```

### 2. 下载 Porcupine 模型和关键词文件

你需要下载 Porcupine 提供的模型和关键词文件。你可以从官方 [Picovoice Console](https://console.picovoice.ai/) 获取这些文件。

### 3. 编写 Python 代码

编写以下 Python 代码来实现语音唤醒功能：

```python
import pvporcupine
import pyaudio
import struct

# 替换成你的 Porcupine access key
access_key = "YOUR_ACCESS_KEY"

# 初始化 Porcupine
porcupine = pvporcupine.create(
    access_key=access_key,
    keyword_paths=["path/to/your/keyword/file.ppn"]
)

pa = pyaudio.PyAudio()

# 开启音频流
audio_stream = pa.open(
    rate=porcupine.sample_rate,
    channels=1,
    format=pyaudio.paInt16,
    input=True,
    frames_per_buffer=porcupine.frame_length
)

try:
    print("Listening for wake word...")
    while True:
        pcm = audio_stream.read(porcupine.frame_length)
        pcm = struct.unpack_from("h" * porcupine.frame_length, pcm)

        keyword_index = porcupine.process(pcm)
        if keyword_index >= 0:
            print("Wake word detected!")

except KeyboardInterrupt:
    print("Stopping...")

finally:
    if porcupine is not None:
        porcupine.delete()

    if audio_stream is not None:
        audio_stream.close()

    if pa is not None:
        pa.terminate()
```

### 4. 运行代码

保存以上代码为 `wake_word.py`，然后在终端运行：

```bash
python wake_word.py
```

### 注意事项

1. **Access Key**: 你需要一个有效的 Porcupine access key，可以在 Picovoice Console 上获取。
2. **Keyword File**: 确保你已经下载并正确指定了关键词文件的路径。
3. **依赖库**: 确保已安装 pyaudio 库。如果没有安装，可以通过以下命令安装：
   ```bash
   pip install pyaudio
   ```

通过上述步骤，你就可以在 M1 Mac 上实现一个简单的 Porcupine Wake Word 语音唤醒程序。

## (venv) ➜  WakeWord pip install pyaudio                                 
```bash
Collecting pyaudio
  Using cached PyAudio-0.2.14.tar.gz (47 kB)
  Installing build dependencies ... done
  Getting requirements to build wheel ... done
  Preparing metadata (pyproject.toml) ... done
Building wheels for collected packages: pyaudio
  Building wheel for pyaudio (pyproject.toml) ... error
  error: subprocess-exited-with-error
  
  × Building wheel for pyaudio (pyproject.toml) did not run successfully.
  │ exit code: 1
  ╰─> [18 lines of output]
      running bdist_wheel
      running build
      running build_py
      creating build
      creating build/lib.macosx-14.0-arm64-cpython-312
      creating build/lib.macosx-14.0-arm64-cpython-312/pyaudio
      copying src/pyaudio/__init__.py -> build/lib.macosx-14.0-arm64-cpython-312/pyaudio
      running build_ext
      building 'pyaudio._portaudio' extension
      creating build/temp.macosx-14.0-arm64-cpython-312
      creating build/temp.macosx-14.0-arm64-cpython-312/src
      creating build/temp.macosx-14.0-arm64-cpython-312/src/pyaudio
      clang -fno-strict-overflow -Wsign-compare -Wunreachable-code -fno-common -dynamic -DNDEBUG -g -O3 -Wall -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX14.sdk -DMACOS=1 -I/usr/local/include -I/usr/include -I/opt/homebrew/include -I/Users/jiejaitt/Desktop/WakeWord/venv/include -I/opt/homebrew/opt/python@3.12/Frameworks/Python.framework/Versions/3.12/include/python3.12 -c src/pyaudio/device_api.c -o build/temp.macosx-14.0-arm64-cpython-312/src/pyaudio/device_api.o
      src/pyaudio/device_api.c:9:10: fatal error: 'portaudio.h' file not found
      #include "portaudio.h"
               ^~~~~~~~~~~~~
      1 error generated.
      error: command '/usr/bin/clang' failed with exit code 1
      [end of output]
  
  note: This error originates from a subprocess, and is likely not a problem with pip.
  ERROR: Failed building wheel for pyaudio
Failed to build pyaudio
ERROR: Could not build wheels for pyaudio, which is required to install pyproject.toml-based projects
```
在 Mac M1 上安装 PyAudio 可能会遇到一些兼容性问题，尤其是缺少 PortAudio 依赖。以下是解决方法：

### 1. 安装 PortAudio

首先，你需要安装 PortAudio。可以使用 Homebrew 来安装：

```bash
brew install portaudio
```

### 2. 设置环境变量

确保 Homebrew 安装的库路径被正确识别。在终端中运行以下命令：

```bash
export LDFLAGS="-L/opt/homebrew/lib"
export CPPFLAGS="-I/opt/homebrew/include"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig"
```

### 3. 安装 PyAudio

在设置了环境变量后，再尝试安装 PyAudio：

```bash
pip install pyaudio
```

如果以上方法仍然无法解决问题，可以尝试通过源代码手动安装：

### 4. 手动安装 PyAudio

下载 PyAudio 源代码并手动编译和安装：

```bash
git clone https://github.com/jleb/pyaudio.git
cd pyaudio
python setup.py install
```

### 5. 替代方案

如果 PyAudio 依然无法安装成功，可以考虑使用 `sounddevice` 作为替代，它也是一个广泛使用的音频库：

```bash
pip install sounddevice
```

并修改代码使用 `sounddevice` 代替 `pyaudio`：

```python
import pvporcupine
import sounddevice as sd
import numpy as np

# 替换成你的 Porcupine access key
access_key = "YOUR_ACCESS_KEY"

# 初始化 Porcupine
porcupine = pvporcupine.create(
    access_key=access_key,
    keyword_paths=["path/to/your/keyword/file.ppn"]
)

def audio_callback(indata, frames, time, status):
    pcm = np.frombuffer(indata, dtype=np.int16)
    keyword_index = porcupine.process(pcm)
    if keyword_index >= 0:
        print("Wake word detected!")

try:
    with sd.InputStream(channels=1, samplerate=porcupine.sample_rate, blocksize=porcupine.frame_length, callback=audio_callback):
        print("Listening for wake word...")
        while True:
            sd.sleep(1000)
except KeyboardInterrupt:
    print("Stopping...")
finally:
    if porcupine is not None:
        porcupine.delete()
```

使用 `sounddevice` 不需要安装额外的系统依赖，且在 macOS 上兼容性更好。以上代码会监听音频输入并在检测到唤醒词时打印消息。

## 这个能输出一个唤醒率吗？

为了输出唤醒词被正确识别的次数，可以在检测到唤醒词时记录计数器。以下是修改后的代码示例，包括统计唤醒词被检测到的次数并输出唤醒率。

### 修改代码以统计唤醒次数

```python
import pvporcupine
import sounddevice as sd
import numpy as np
import time

# 替换成你的 Porcupine access key
access_key = "YOUR_ACCESS_KEY"

# 初始化 Porcupine
porcupine = pvporcupine.create(
    access_key=access_key,
    keyword_paths=["path/to/your/macos/keyword/file.ppn"]
)

# 计数器和开始时间
wake_word_count = 0
start_time = time.time()

def audio_callback(indata, frames, time, status):
    global wake_word_count
    pcm = np.frombuffer(indata, dtype=np.int16)
    keyword_index = porcupine.process(pcm)
    if keyword_index >= 0:
        wake_word_count += 1
        print(f"Wake word detected! Total count: {wake_word_count}")

try:
    with sd.InputStream(channels=1, samplerate=porcupine.sample_rate, blocksize=porcupine.frame_length, callback=audio_callback):
        print("Listening for wake word...")
        while True:
            sd.sleep(1000)
except KeyboardInterrupt:
    print("Stopping...")
finally:
    if porcupine is not None:
        porcupine.delete()

    if sd is not None:
        sd.stop()

    # 计算并输出唤醒率
    elapsed_time = time.time() - start_time
    wake_word_rate = wake_word_count / elapsed_time * 60  # 每分钟唤醒率
    print(f"Total wake word count: {wake_word_count}")
    print(f"Elapsed time: {elapsed_time / 60:.2f} minutes")
    print(f"Wake word rate: {wake_word_rate:.2f} wake words per minute")
```

### 解释代码

1. **初始化计数器和时间**: 使用 `wake_word_count` 记录唤醒词检测到的次数，`start_time` 记录开始时间。
2. **在回调函数中更新计数器**: 每次检测到唤醒词时，增加计数器并打印当前总数。
3. **计算并输出唤醒率**: 在程序结束时（按 Ctrl+C 停止），计算运行的总时间，并根据检测到的唤醒词总数计算每分钟的唤醒率。

### 运行代码

保存修改后的代码并运行。你会看到实时输出唤醒词被检测到的次数，以及程序结束时的总计和每分钟的唤醒率。

确保在安静的环境下测试，以减少噪音干扰，提高唤醒词的准确性。


## 论文

```py
import pvporcupine
import pyaudio
import struct
import os
import subprocess
import logging
import tkinter as tk
from threading import Thread, Event
from ttkbootstrap import Style
from ttkbootstrap.constants import SUCCESS
from ttkbootstrap.widgets import Button

logging.basicConfig(level=logging.INFO)

# 替换成你的 Porcupine access key
access_key = "3EBIY7+mtcbduhM2YQelLyBiDXXYvigf2lSnKgi8Le5CA3E5f7KE5A=="

# 关键词模型文件的绝对路径
keyword_path = "/Users/jiejaitt/Desktop/WakeWord/Hey-Snips_en_mac_v3_0_0.ppn"

def create_audio_stream(pa, porcupine):
    return pa.open(
        rate=porcupine.sample_rate,
        channels=1,
        format=pyaudio.paInt16,
        input=True,
        frames_per_buffer=2 * porcupine.frame_length  # 增加缓冲区大小
    )

def close_audio_stream(stream):
    try:
        if stream.is_active():
            stream.stop_stream()
    except OSError as e:
        logging.error(f"Error stopping stream: {e}")
    try:
        stream.close()
    except OSError as e:
        logging.error(f"Error closing stream: {e}")

def listen_for_wake_word(trigger_event):
    try:
        # 初始化 Porcupine
        porcupine = pvporcupine.create(
            access_key=access_key,
            keyword_paths=[keyword_path]
        )
    except pvporcupine.PorcupineActivationError as e:
        logging.error(f"Porcupine activation error: {e}")
        exit(1)

    pa = pyaudio.PyAudio()
    audio_stream = create_audio_stream(pa, porcupine)

    try:
        logging.info("Listening for wake word...")
        while True:
            try:
                pcm = audio_stream.read(porcupine.frame_length, exception_on_overflow=False)
                pcm = struct.unpack_from("h" * porcupine.frame_length, pcm)

                keyword_index = porcupine.process(pcm)
                if keyword_index >= 0:
                    logging.info("Wake word detected!")
                    trigger_event.set()  # 设置事件标志，通知主线程
            except IOError as e:
                logging.error(f"IOError: {e}")
                logging.info("Restarting audio stream...")
                close_audio_stream(audio_stream)
                audio_stream = create_audio_stream(pa, porcupine)

    except KeyboardInterrupt:
        logging.info("Stopping...")

    finally:
        if porcupine is not None:
            porcupine.delete()

        if audio_stream is not None:
            close_audio_stream(audio_stream)

        if pa is not None:
            pa.terminate()

def open_wechat():
    """打开微信应用程序"""
    subprocess.call(["open", "-a", "WeChat"])

def open_browser():
    """打开默认浏览器"""
    subprocess.call(["open", "-a", "Safari"])

def open_notepad():
    """打开记事本"""
    subprocess.call(["open", "-a", "TextEdit"])

def show_assistant(trigger_event):
    """显示类似Siri助手的窗口"""
    style = Style(theme='flatly')
    root = style.master
    root.title("Assistant")
    root.geometry("400x400")
    root.attributes("-topmost", True)
    root.attributes("-alpha", 0.9)  # 设置窗口透明度
    root.overrideredirect(True)

    frame = tk.Frame(root, bg='white', bd=2, relief="flat")
    frame.place(relx=0.5, rely=0.5, anchor=tk.CENTER, width=300, height=300)

    # 添加按钮
    button_wechat = Button(frame, text="启动微信", command=open_wechat, bootstyle=SUCCESS)
    button_wechat.place(x=100, y=50, width=100, height=50)

    button_browser = Button(frame, text="启动浏览器", command=open_browser, bootstyle=SUCCESS)
    button_browser.place(x=100, y=120, width=100, height=50)

    button_notepad = Button(frame, text="启动记事本", command=open_notepad, bootstyle=SUCCESS)
    button_notepad.place(x=100, y=190, width=100, height=50)

    def check_event():
        if trigger_event.is_set():
            root.deiconify()  # 显示窗口
            trigger_event.clear()  # 重置事件标志
        root.after(100, check_event)  # 每100毫秒检查一次事件

    root.withdraw()  # 初始隐藏窗口
    check_event()
    root.mainloop()

if __name__ == "__main__":
    trigger_event = Event()

    # 启动监听唤醒词的线程
    listen_thread = Thread(target=listen_for_wake_word, args=(trigger_event,))
    listen_thread.daemon = True
    listen_thread.start()

    # 在主线程中显示助手窗口
    show_assistant(trigger_event)
```



## loss

在机器学习和深度学习中，训练损失和验证损失是评估模型性能的两个关键指标，它们各自有着不同的含义和重要性：

1. **训练损失（Training Loss）**：
   - **定义**：训练损失是模型在训练数据集上计算得到的损失，它反映了模型对训练数据的拟合程度。
   - **作用**：训练损失用来指导模型的学习过程，即模型参数的更新是为了最小化训练损失。
   - **特点**：理想情况下，训练损失应该随着训练的进行逐渐降低，因为模型正在学习如何更好地适应训练数据。如果训练损失持续减少，表明模型学习是有效的。

2. **验证损失（Validation Loss）**：
   - **定义**：验证损失是模型在一个独立的验证数据集上计算得到的损失，这个验证集不参与模型的训练。验证数据集用于模拟模型面对未知数据时的表现。
   - **作用**：验证损失用于评估模型的泛化能力，即模型对新、未见过的数据的适应能力。通过观察验证损失，我们可以检测模型是否出现过拟合或欠拟合。
   - **特点**：如果验证损失随着训练的进行开始增加，同时训练损失还在下降，这通常是过拟合的标志；如果验证损失很高且训练损失也很高，可能是模型欠拟合。

### 为何两者都重要？

- **优化与评估**：训练损失帮助优化模型（即调整模型参数），而验证损失帮助评估模型的泛化能力。
- **防止过拟合**：通过同时监控训练损失和验证损失，可以有效防止过拟合。例如，当训练损失持续降低而验证损失开始增加时，可以停止训练或采取如增加数据、调整模型复杂度等措施。
- **模型选择**：在多个模型或多种参数设置之间进行选择时，通常会考虑验证损失作为主要的评判标准，选择验证损失最低的模型。

综上所述，训练损失和验证损失共同帮助我们理解模型在学习过程中的表现，以及模型对新数据的适应能力，是进行有效模型训练和选择的关键指标。