---
name: huazhi-website-ops
description: |
  huazhi-sde.com（娄底华智科技官网）管理、更新与部署的完整运维 Skill —— 仓库坐标、推送令牌、Cloudflare 自动部署管线、加文章标准流程、内容与技术红线、故障排查。当对话涉及以下任何话题时立即加载本 Skill，这是不可商量的强制规则：华智官网、huazhi-sde.com、huazhi-site、娄底华智网站、改华智首页、三视角智慧专栏（加文章/改卡片/改互链）、纠缠球（首页粒子球）、sanshijiao 页面、华智页脚联系方式、华智品牌色、华智智能体六卡、华智网站推送/回滚/构建失败/没更新。**触发场景**：用户说"华智官网加一篇文章""把华智首页 X 改成 Y 推上去""华智网站怎么没变""新对话接手华智官网"。**与 sde-website-ops 分工**：那个管 sdeuniverses.com（SIOWDS 账号），本 Skill 管 huazhi-sde.com（sdeworker 账号）——两站两账号两令牌，互不通用。凡要对 huazhi-sde.com 动手，先加载本 Skill。
---

# huazhi-sde.com 华智官网运维 Skill

> ⚠ **本副本存放于公开 git 仓库，已脱敏。** 推送令牌（PAT）不写入此文件——公开仓库中的活令牌等于公开钥匙。真实令牌由王德生私密保管（见交付渠道的完整版 Skill）。本机 Claude Code 首次使用时，将真实 PAT 填入下方占位处，或改用浏览器授权（`gh auth login`）。

**版本**：v1.3（2026-07-12 · 三视角智慧扩容至 15 篇双分组）｜ **交付链**：胡东吧 → 王德生
**一句话架构**：GitHub 仓库 main 分支 → push 自动触发 Cloudflare Workers 构建（约 1 分钟）→ https://huazhi-sde.com 上线。**纯静态站，仓库根目录即站点根目录，改文件 + git push = 更新网站。没有服务器、没有 SSH、没有构建命令。**

---

## 一、关键凭证卡（⚠ 私密 — 仅供王德生私有环境）

| 项目 | 值 |
|---|---|
| 线上域名 | https://huazhi-sde.com（www 亦可） |
| GitHub 仓库 | `sdeworker/huazhi-site`（公开仓库，站点文件在**根目录**，无 public/ 子目录） |
| 仓库所有者 | sdeworker（sdeworker@gmail.com，Google 一键登录，无独立 GitHub 密码） |
| **推送令牌（PAT·细粒度）** | `<在此填入 sdeworker 的 fine-grained PAT>`（公开仓库不存明文；本机填入或用 gh auth login） |
| 旧经典令牌 | `ghp_jmLS…ACox` 已被替换，**待胡敏在 GitHub 撤销**（经典令牌管整个账号，勿再使用） |
| 部署 | Cloudflare Workers 项目 `huazhi-site`，push→main 自动构建约 **60 秒** |
| 域名注册 | GoDaddy，三年期到 2029 年 7 月，NS 指向 Cloudflare |
| Gmail 总密码 | **不写入本 Skill**（管 Google/Cloudflare/GoDaddy 三家；Claude 用不上，需要时向王德生当面索取） |

**令牌安全**：等同网站钥匙。若怀疑泄露 → 登录 sdeworker@gmail.com → GitHub → Settings → Developer settings → Personal access tokens → 撤销重生成 → 更新本 Skill 此表。
**⚠ 与 sdeuniverses 令牌互不通用**：SIOWDS 的 PAT 对本仓库 push=False，已实测。

---

## 二、新对话开工三步（沙盒每次重置，先做这个）

```bash
# ① 克隆（令牌嵌入 URL，直接可推）
git clone https://sdeworker:$PAT@github.com/sdeworker/huazhi-site.git /home/claude/hz  # $PAT=你的 fine-grained 令牌
# ② 身份
cd /home/claude/hz && git config user.email "sdeworker@gmail.com" && git config user.name "sdeworker"
# ③ 确认最新
git log --oneline -3
```

---

## 三、标准更新流程（每次改动都走全套）

1. **改文件**：全部文件在仓库根目录（无子目录结构）。
2. **HTML 修改用 assert 锚定**：Python `h.replace(old,new,1)` 前必 `assert old in h`；改后跑标签配对检查。禁止盲目正则大面积替换。
3. **提交推送**：
```bash
cd /home/claude/hz && git add -A && git commit -m "英文一句话:改了什么为什么" && git push origin main
```
4. **等 60 秒验证构建**：
```bash
sleep 60 && curl -s -H "Authorization: Bearer $PAT" \
  "https://api.github.com/repos/sdeworker/huazhi-site/commits/main/check-runs" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for c in d.get('check_runs',[]): print(c['name'],'|',c['status'],'|',c.get('conclusion'))"
```
   看到 `Workers Builds: huazhi-site | completed | success` = 上线成功。
5. **提醒用户 Ctrl+F5 强刷**（浏览器缓存不刷看不到新版）。

---

## 四、站点结构地图（2026-07-12 实况）

```
huazhi-site/（根目录即站点根）
├── index.html                 首页：五大板块(教育/健康/商业/科研/智能体) + 纠缠球
│                              ★ 样式全内联（历史原因，已稳定）——除非明确要求，不要改成引 article.css
├── articles.html              「三视角智慧」专栏索引（10 张卡片 + .list-head .cnt 篇数标注）
├── sanshijiao-01 … 10          「源头连载」2017 原始系列
├── sanshijiao-11-sanshanchuang / 12-mota / 13-jiugongge / 14-jiazhizhou / 15-xianying
│                              「理论纵深」2026 五篇（三视角→九宫格→27宫格，每篇约8千字，01↔15 全链闭合）
│                              ⚠ articles.html 现为双分组（源头连载/理论纵深 两个 list-head + cards），加新文先定组
├── wangboshi.html             「王博士与SDE」专栏门面（人物卡·十年谱系·思想骨架·专著；数字口径=母站）
├── zhuanzhu.html              「华智专著栏」（精读5部+编号40部书架；封面热链母站 covers/{id}.jpg，阅读跳母站 books/m/{id}/——母站书库结构若变，此页跟改）
├── sitemap.xml                全站地图（新页面必同步加 <url>；robots.txt 已引用）
├── article.css                ★ 专栏页+文章页共享样式（.lead-box/.pull/.fig/.ix 等组件在此）
├── 404.html / robots.txt / .nojekyll(必需空文件别删) / CLAUDE.md(仓库内项目说明，与本Skill同源)
```

**互链链条现状**：01↔02↔03↔04↔05↔06↔07↔08↔09↔10 完整无断环（2026-07-12 全站校验通过，无死链、无公众号残留）。

---

## 五、加一篇新文章的标准流程

1. `pandoc -t markdown 文章.docx -o /tmp/art.md` 提取正文。
2. **清洗公众号残留（红线，必须全删）**：「长按下图可关注」「点右上角…关注」「小编微信+手机号」（**私人手机号绝不能上公网**）「预览时标签不可点」「微信扫一扫」「使用小程序」、所有 `javascript:void(0)` 链接、二维码图、头像图。
3. 复制现有文章页当模板，改 `<title>`/`<meta description>`/`.art-title`/`.art-meta`/正文/页脚 `.art-nav`。
4. 命名：`sanshijiao-NN-拼音短名.html`——**只用小写 ASCII，slug 可含数字**（如 shuzi7），不要中文文件名、不要空格。
5. `articles.html` 加卡片（按系列顺序插入）+ 更新 `.list-head .cnt` 篇数。
6. 改上一篇的「下一篇」链接指向新文章，保持链条闭合；并在 `sitemap.xml` 为新文章加一条 `<url>`。
7. 排版组件：`.lead-box` 文首导读框；`.pull` 重点引语（一篇 3–5 个别滥用）；`.fig`+内联 SVG（**优先重画 SVG**，不用原 docx 模糊 jpg）；`<h3><span class="ix">01</span>标题</h3>` 小节；`<em>` 渲染为青色强调。
8. push → 60 秒 → 验构建 → 提醒强刷。

---

## 六、铁律（含吃过亏的）

1. **【正则含数字·实测教训】** 校验文件名/链接用 `sanshijiao-[0-9]*-[a-z0-9-]*\.html`——slug 里有数字（shuzi7），`[a-z-]*` 会漏检并产生"孤儿页"误报（2026-07-12 实案）。
2. **【新页面同 commit 挂导航】** 孤儿页 = 没交付。
3. **【SDE 术语权威口径】** S = **Show 显露**，不是 Structure 结构（旧称已废）；「发生」不能写成「产生」；E 是参与发生的土壤不是背景；27 宫格 = C(对比·变化·分布) ⊗ M(粒子·波·场) ⊗ V(真·善·美)；三视角专栏定位为 **SDE 源头形态**，不是旧文归档。
4. **【内容纪律】** 公众号文章原文尽量少改——不为"让人看懂"而软化思想锋芒。可做的只有：分节、加小标题、挑引语、修排版。
5. **【技术红线】** 不引入构建工具（Cloudflare build command 为空，加了会挂）；不引入前端框架；不用 localStorage/sessionStorage；外部依赖仅 Google Fonts；纠缠球是「在 E 中→经 D→成 S」的可视化不是装饰，零依赖 Canvas 2D，不引 three.js。
6. **【配色两处同步】** `--E:#6D5EF6 紫 / --D:#FF5C8A 品红 / --S:#2DE1C2 青` 在 article.css 的 :root 和 index.html 的 `<style>` **各存一份**，改必两处。
7. **【智能体六卡是草稿】** 对外名称未定，改动前先问王德生。
8. **【commit 英文一句话】** 说清改了什么+为什么。
9. **【数字与叙事口径以母站为准】** 华智页面上的成就数字（100 智能体 / 10 大行业 / 47 顶刊 / 55+ 专著）与「集群·母体·显露态」叙事，逐字对齐 sdeuniverses.com 首页既定口径；改动这类文案前先 `curl raw.githubusercontent.com/SIOWDS/sdeuniverses-site-/main/public/index.html` 对一遍母站。

---

## 七、待决事项（需王德生定夺，改前对照）

- [ ] 页脚联系方式（电话/邮箱/公众号二维码）——等提供
- [ ] 品牌 VI 色是否替换现三色
- [ ] 德麦（教学品牌）vs 华智（工商主体）门面摆法
- [ ] 智能体六卡对外名单与正式名称
- [ ] 国内提速：迁国内服务器 + ICP 备案（信用代码 91431300MA4RDMLN1T，材料齐备）

## 八、故障排查

| 症状 | 处置 |
|---|---|
| push 后网站没变 | 等够 60 秒？check-runs success？用户强刷了？ |
| 构建 failure | Cloudflare Dashboard→Workers→huazhi-site→日志（用 sdeworker@gmail.com Google 登录） |
| 回滚 | `git log --oneline -5` 找坏提交 → `git revert <hash>` → push（勿 reset -f） |
| 看线上仓库文件 | `curl -s "https://raw.githubusercontent.com/sdeworker/huazhi-site/main/index.html" \| head` |

**公司信息（页脚/关于页在用，勿改错）**：娄底华智科技有限公司｜统一社会信用代码 91431300MA4RDMLN1T｜法定代表人 王德生｜成立 2020-06-08｜注册资本 1000 万元｜地址 湖南省娄底市娄星区湘中大道小科社区皇城御园 A 栋 1101 号
