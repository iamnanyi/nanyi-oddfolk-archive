# Oddfolk Archive

一个零依赖的 JavaScript 参数化人像实验。它不是调用图片生成模型，而是在 Canvas 上实时构造人物几何、五官、发型、衣领与手绘笔触。

## 本地运行

```bash
python3 -m http.server 4173
```

打开 `http://localhost:4173`。

## 原创方向

- 将随机性拆成 anatomy、features、styling、temperament、paper、hatch 等独立通道，改动某类规则不会让整张脸失控。
- 用暖纸、档案蓝和错版强调色构成“人物标本档案室”，区别于常见的纯黑白速写复刻。
- 同一 seed 稳定生成同一个人物；实时动画只改变线条噪声，不改变身份参数。
- 所有人像元素都在运行时绘制，没有位图人物素材，也不依赖第三方库。
- 支持表情覆写、笔触密度、三套套印色、静止/活墨切换、邻近 seed 浏览，并通过小红书 JSBridge 将高清 PNG 保存到系统相册。

## 小红书小工具适配

- 页面完全离线运行，不请求网络资源。
- 相册保存使用官方 `window.xhs.miniTool.writeTempFile` 与 `saveImageToPhotosAlbum`。
- 浏览器本地预览不会触发文件下载；相册能力需在小红书小工具容器中验证。
- `viewport-fit=cover`、容器安全区变量和触摸滚动均已适配。

## 文件

- `index.html`：页面语义和工作台结构
- `styles.css`：响应式编辑部档案风界面
- `app.js`：seeded random、人物参数、笔触渲染和 Canvas 绘制

## 实现边界

这是基于“参数化人脸 + 稳定随机流 + 手绘渲染器”这一通用思路重新设计的实现，没有复制任何第三方项目源码或素材。
