## 读文件夹下音频时长。
#### 适用情形
1. 音频格式为 wav
2. 文件目录为如下形式
![2]("./imgs/1.png")
#### 安装步骤
1. 安装sox并配置path。sox可读取音频的文件信息
2. 安装node。
3. 安装vscode。修改代码（非必须安装）

#### 操作步骤
1. 找到程序所在文件夹。比如：D:\readWavsTime
2. 用 vscode 打开 readWavsTime文件夹 。
3. 复制待读文件夹的路径。如实例中test文件夹的路径为：E:\test
4. 将步骤3中的地址粘贴至config.js中entry后的引号内，并将路径中'\'修改为'/'
5. 在命令行窗口输入：npm start 后按下enter键
6. 等待窗口提示已生成文件...即可
7. 读其他文件夹时，重复步骤3-6