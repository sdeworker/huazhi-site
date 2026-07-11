# 娄底华智科技官网 · 部署指南

一份从零到上线的傻瓜步骤。全程免费（除域名年费约 ¥70），预计 **40 分钟** 跑通。

---

## 这个仓库里有什么

```
huazhi-site/
├── index.html     ← 官网主页（整站就这一个文件，改它就是改网站）
├── 404.html       ← 找不到页面时显示的页面
├── .nojekyll      ← 必需的空文件，别删（不然 GitHub 会乱处理文件）
├── robots.txt     ← 允许搜索引擎收录
└── README.md      ← 你正在看的这份
```

整站是**纯静态**的，不需要服务器、不需要数据库、不需要装任何东西。

---

## 第一步：注册 GitHub 账号（5 分钟）

1. 打开 https://github.com ，点右上角 **Sign up**
2. 填邮箱、设密码、起一个用户名（比如 `huazhi-sde`，这个名字以后会出现在网址里）
3. 去邮箱点验证链接

已有账号就跳过。

---

## 第二步：把代码传上 GitHub（10 分钟）

**不用装 Git，网页上传就行。**

1. 登录后，点右上角 **`+`** → **New repository**（新建仓库）
2. 填写：
   - **Repository name**：`huazhi-site`
   - **Public**（必须公开，免费版托管只支持公开仓库）
   - 下面的 "Add a README" 等选项**都不要勾**
3. 点 **Create repository**
4. 新页面上找到 **uploading an existing file** 这个链接，点它
5. 把本仓库的 4 个文件（`index.html`、`404.html`、`robots.txt`、`README.md`）**拖进去**
6. 底下点 **Commit changes**

> ⚠️ `.nojekyll` 是隐藏文件，网页拖拽可能拖不上去。如果传不上，没关系——下面我们用 Cloudflare Pages，不受这个影响。

---

## 第三步：买域名（10 分钟）

推荐两个渠道：

| 渠道 | 优点 | 备注 |
|---|---|---|
| **Cloudflare Registrar**（cloudflare.com/products/registrar）| 按成本价卖，不加价，续费不涨 | 需要国际信用卡 |
| **阿里云 / 腾讯云** | 支付宝微信付款方便 | 价格略高，首年常有优惠 |

域名建议（`.com` 最通用）：
- `huazhi-sde.com`
- `demai-sde.com`（如果主打德麦品牌）
- `sde-tech.com`

买完先别管，下一步会用到。

---

## 第四步：用 Cloudflare Pages 上线（10 分钟）⭐ 核心

**为什么用 Cloudflare Pages 而不是 GitHub Pages**：Cloudflare 的节点在国内访问相对稳一些，而且自带免费 HTTPS、免费 CDN、绑域名更简单。

1. 打开 https://dash.cloudflare.com 注册/登录
2. 左侧菜单点 **Workers & Pages** → **Create** → 选 **Pages** 标签 → **Connect to Git**
3. 授权 Cloudflare 访问你的 GitHub，选中刚才那个 `huazhi-site` 仓库
4. 配置页面（**关键，照抄**）：
   - **Framework preset**：`None`
   - **Build command**：**留空**（什么都别填）
   - **Build output directory**：填 `/`（一个斜杠）
5. 点 **Save and Deploy**

等 1 分钟，会给你一个网址，像 `huazhi-site.pages.dev` —— **网站已经上线了**，现在就能打开看。

---

## 第五步：把自己的域名绑上去（5 分钟）

1. 先在 Cloudflare 主面板点 **Add a site**，输入你买的域名，按提示把域名的 **Nameserver（DNS 服务器）** 改成 Cloudflare 给的那两个
   - 如果域名是在阿里云/腾讯云买的：去那边的域名管理 → DNS 修改 → 填 Cloudflare 给的地址
   - 如果域名是在 Cloudflare 买的：这步自动完成，跳过
   - 生效要等几分钟到几小时
2. 回到 **Workers & Pages** → 你的项目 → **Custom domains** → **Set up a custom domain**
3. 输入你的域名（`huazhi-sde.com`），点确认

搞定。HTTPS 证书 Cloudflare 自动签发，不用管。

---

## 以后怎么改网站

**最省事的办法**：把改好的 `index.html` 在 GitHub 网页上直接编辑或重新上传，Cloudflare 会**自动检测到变化并重新部署**，一两分钟后线上就更新了。

具体操作：
1. 打开你的仓库 → 点 `index.html` → 点右上角铅笔图标 ✏️
2. 改完点 **Commit changes**
3. 等 1 分钟，刷新网站，改动就上去了

**或者**：把新的 index.html 发给我，我改好还给你，你重新上传覆盖即可。

---

## ⚠️ 国内访问这件事，必须先说清楚

Cloudflare Pages 在国内**能访问，但速度不保证稳定**——不同地区、不同运营商差别很大，有时候快，有时候要等好几秒。

**先按上面这套跑通，实际测一下速度。** 如果发现：

- 你和几个同事在国内打开都还行 → 就这么用着，零成本，够用
- 打开很慢或时通时不通，而这个站主要是给国内客户/学员看的 → 那必须换方案

**国内方案（慢但稳）**：
1. 域名必须做 **ICP 备案**（用娄底华智科技的营业执照去备案，周期 2–4 周）
2. 买一台国内云服务器（阿里云/腾讯云最便宜的轻量服务器，约 ¥100/年）或用国内的对象存储 + CDN
3. 把 `index.html` 传上去

备案是绕不开的——只要服务器在境内，法规要求必须备案。好消息是你们有营业执照（统一社会信用代码 91431300MA4RDMLN1T），备案材料是齐的。

**我的建议**：现在先用 Cloudflare 这条路把站跑起来、内容填满、迭代到满意（反正免费）。**同时并行去做备案**（反正要等几周）。等备案下来，再决定要不要迁到国内服务器。两条路不冲突。

---

## 各家分工（王德生老师那套路线）

| 环节 | 用什么 |
|---|---|
| 域名 + 解析 + HTTPS + CDN | Cloudflare |
| 代码托管 | GitHub |
| 文章、配图 | GPT |
| PPT | Codex / Seedance |
| 写代码、上线、改版 | Claude |

---

## 卡住了怎么办

把报错截图或那一步的界面截图发我，我看着给你指。最常出问题的两个地方：

1. **Cloudflare Pages 构建配置填错** → Build command 必须留空，output directory 填 `/`
2. **域名 Nameserver 没改对或还没生效** → 等几小时再看，或者用 `whois 你的域名` 查一下 NS 记录有没有变
