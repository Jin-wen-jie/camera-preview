<div align="center">
  <img src="./assets/icons/icon-192.svg" width="96" alt="语音花雨" />

  # 语音花雨 Voice Flower Rain

  **说出「花」，让花海绽放** &nbsp;·&nbsp; **Say "flower", watch petals fall**

  [![CI](https://github.com/Jin-wen-jie/camera-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/Jin-wen-jie/camera-preview/actions/workflows/ci.yml)
  [![Deploy](https://github.com/Jin-wen-jie/camera-preview/actions/workflows/deploy.yml/badge.svg)](https://github.com/Jin-wen-jie/camera-preview/actions/workflows/deploy.yml)
  [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

  [🌐 在线体验](https://jin-wen-jie.github.io/camera-preview/) &nbsp;|&nbsp; [📖 功能](#-功能特性) &nbsp;|&nbsp; [🚀 快速开始](#-快速开始) &nbsp;|&nbsp; [🛠 技术栈](#-技术栈)

</div>

---

## 📖 功能特性

一个纯前端摄像头预览 + 语音特效页面。打开页面、允许摄像头和麦克风，说出关键词即可触发视觉特效。

### 🎯 核心功能

| 功能 | 说明 |
|---|---|
| 🎤 **语音识别** | 说出「花」「雪」「爱心」触发对应特效 |
| ⌨️ **手动输入** | 在输入框打字提交也可触发特效 |
| 📷 **摄像头预览** | 实时显示摄像头画面，支持镜像翻转 |
| 🎨 **视觉特效** | 花雨、飘雪、爱心从屏幕上方飘落 |
| ↔️ **镜像翻转** | 一键翻转摄像头画面（自拍模式） |

### 🎮 语音指令

| 指令 | 触发短语 | 效果 |
|---|---|---|
| 🌸 **花** | 花、花雨、花海、浪漫、好看、花瓣 | 花瓣飘落 |
| ❄️ **雪** | 雪、下雪、雪花、雪景、飘雪 | 雪花纷飞 |
| 💕 **爱心** | 心、爱心、喜欢、爱你、比心 | 爱心飘落 |
| 🧹 **清除** | 清除、清屏、关闭、没了、去掉 | 清除所有特效 |

### ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| <kbd>F</kbd> | 触发「花」特效 |
| <kbd>S</kbd> | 触发「雪」特效 |
| <kbd>H</kbd> | 触发「爱心」特效 |
| <kbd>Esc</kbd> | 清除所有特效 |

---

## 🚀 快速开始

### 方式一：直接访问在线版

打开 [https://jin-wen-jie.github.io/camera-preview/](https://jin-wen-jie.github.io/camera-preview/) 即可使用。

### 方式二：本地运行

```bash
# 克隆项目
git clone https://github.com/Jin-wen-jie/camera-preview.git
cd camera-preview

# 启动服务
node server.js
```

或者双击 `启动摄像头网页.cmd`（Windows）。

浏览器打开 `http://localhost:5173` 即可。

> **注意**：需要浏览器支持摄像头和麦克风权限，推荐使用 Chrome 或 Edge。

---

## 📦 部署到 GitHub Pages

本项目已配置 GitHub Actions 自动部署。推送 `main` 分支后：

1. **CI 自动测试** — 运行所有测试并验证代码质量
2. **CD 自动部署** — 测试通过后自动部署到 GitHub Pages

部署地址：`https://<用户名>.github.io/<仓库名>/`

### 手动部署

也可在 GitHub 仓库 Settings → Pages 中配置：

1. Source 选择 **GitHub Actions**
2. 或选择 **Deploy from a branch** → `main` → `/root`

---

## 🗂️ 项目结构

```
camera-preview/
├── index.html               # 主页面
├── styles.css                # 全部样式（CSS 自定义属性 + Grid 布局）
├── server.js                 # 本地开发服务器（零依赖）
├── src/
│   ├── app.js                # 应用主入口，DOM 事件绑定
│   ├── camera.js             # 摄像头管理（getUserMedia）
│   ├── captions.js           # 语音识别（SpeechRecognition API）
│   ├── commands.js           # 指令定义 + 特效参数（单一数据源）
│   ├── effects.js            # 视觉特效引擎（DOM 粒子系统）
│   ├── utils.js              # 工具函数
│   └── voice-commands.js     # 语音指令匹配器
├── tests/                    # 单元测试（node --test）
├── assets/
│   ├── icons/                # 品牌图标（SVG）
│   └── og-image.svg          # Open Graph 分享图
└── .github/workflows/        # CI/CD 流水线
```

---

## 🛠 技术栈

| 分类 | 技术 |
|---|---|
| **页面结构** | HTML5 |
| **样式** | 原生 CSS（CSS 自定义属性、Grid 布局、@keyframes 动画） |
| **前端逻辑** | 原生 JavaScript ES 模块（零框架依赖） |
| **摄像头** | `navigator.mediaDevices.getUserMedia` |
| **语音识别** | `SpeechRecognition` / `webkitSpeechRecognition` |
| **开发服务器** | Node.js 原生 http 模块（零依赖） |
| **测试框架** | Node.js 内置 `node --test` |
| **CI/CD** | GitHub Actions |
| **托管** | GitHub Pages（HTTPS） |

### 浏览器兼容

| 浏览器 | 摄像头 | 语音识别 | 特效动画 |
|---|---|---|---|
| Chrome ✅ | 支持 | 支持 | 支持 |
| Edge ✅ | 支持 | 支持 | 支持 |
| Safari ⚠️ | 支持 | 部分支持 | 支持 |
| Firefox ⚠️ | 支持 | 不支持 | 支持 |

---

## 🔒 隐私说明

本项目 **纯前端运行**，摄像头画面和语音数据：

- **不会上传到任何服务器**
- **不会被录制或保存**
- **仅在浏览器本地处理**（通过 Web Speech API 进行本地语音识别）

所有特效渲染都在你的浏览器内完成，无需担心隐私泄露。

---

## 🧪 测试

```bash
# 运行全部测试
npm test

# 运行单个测试文件
node --test tests/effects.test.js
```

当前测试覆盖：指令匹配、特效引擎、摄像头管理、语音识别控制、CSS 样式断言。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交改动：`git commit -am 'Add my feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 提交 Pull Request

---

<div align="center">
  <sub>Built with ❤️ using vanilla HTML, CSS & JavaScript</sub>
  <br>
  <sub>MIT License · © 2026</sub>
</div>
