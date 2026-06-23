# 摄像头预览网页

一个纯前端摄像头预览页面。朋友打开公开链接后，看到的是他们自己设备的摄像头画面。

## 本地运行

双击：

```text
启动摄像头网页.cmd
```

或在终端运行：

```powershell
node server.js
```

然后打开：

```text
http://localhost:5173
```

## 发给朋友使用

不要发送 `localhost` 链接。`localhost` 只代表当前这台电脑，朋友打开会访问他们自己的电脑。

要发给朋友，需要部署到支持 HTTPS 的静态网站平台，例如：

- GitHub Pages
- Netlify
- Vercel

部署后，把平台生成的 `https://...` 链接发给朋友即可。

## GitHub Pages 最小部署步骤

1. 在 GitHub 新建一个仓库。
2. 把本项目文件上传到仓库。
3. 进入仓库 `Settings` -> `Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 保存后等待 GitHub 生成公开链接。

## 隐私说明

当前版本不会上传、保存或发送摄像头画面。摄像头画面只在浏览器本地显示。
