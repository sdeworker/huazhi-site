/* ============================================================
   道德经问题求解引擎（网页版）
   问题 → 三生法重解(C1/C2/C3三臂+二阶碰撞) → 抽涌现脊柱
        → 道德经RAG检索 → 以原文为据生成方案(改姓) → 对照组
   一比一还原自桌面 Python 版 sde_solver。访客自带 Key，全程浏览器内。
   ============================================================ */

// ---------- 基底（复用智问的配置）----------
const DJ_BASES = {
  deepseek: { name:'DeepSeek', direct:true, endpoint:'https://api.deepseek.com/chat/completions', keyName:'sde_ds_key',
    models:[{id:'deepseek-v4-pro',label:'V4 Pro（推理最强）',thinking:true},{id:'deepseek-v4-flash',label:'V4 Flash（快）',thinking:true},{id:'deepseek-chat',label:'Chat（旧·7/24停用）'}] },
  glm: { name:'智谱 GLM', direct:true, endpoint:'https://open.bigmodel.cn/api/paas/v4/chat/completions', keyName:'sde_glm_key',
    models:[{id:'glm-4-plus',label:'GLM-4-Plus'},{id:'glm-4-air',label:'GLM-4-Air（快）'}] },
};
let DJ_MODEL = {};
let DJ_EVENT = null;
function djEmit(type,msg,extra){ if(DJ_EVENT) DJ_EVENT({type,msg,...extra}); }

// ---------- 底层调用 ----------
async function djCall(baseKey, system, userMsg, { maxTokens=3000, temperature=0.7, label='调用' }={}) {
  const b = DJ_BASES[baseKey];
  const key = localStorage.getItem(b.keyName);
  if(!key) throw new Error(`缺少 ${b.name} 的 API Key`);
  const modelId = DJ_MODEL[baseKey] || b.models[0].id;
  const isThinking = (b.models.find(m=>m.id===modelId)||{}).thinking;
  const budget = isThinking ? Math.max(maxTokens*4, 16000) : maxTokens;
  djEmit('call-start', label, {model:modelId});
  const messages = [];
  if(system) messages.push({role:'system',content:system});
  messages.push({role:'user',content:userMsg});
  const r = await fetch(b.endpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({model:modelId,messages,max_tokens:budget,temperature})
  });
  if(!r.ok) throw new Error(`${b.name} 返回 ${r.status}: ${(await r.text()).slice(0,150)}`);
  const d = await r.json();
  const m = d.choices?.[0]?.message || {};
  let out = m.content ?? '';
  if(!out.trim() && m.reasoning_content) throw new Error(`${label}：思考过长导致正文为空，请重试或换非思考模型`);
  djEmit('call-done', `${label} · ${out.length}字`, {chars:out.length});
  return out.trim();
}

/* ============================================================
   RAG 检索（IDF 加权 · 2-gram 切词，还原 rag_store.py）
   ============================================================ */
const DJ_STOP = new Set("的 了 和 与 在 是 有 也 都 就 而 你 我 他 她 它 们 这 那 之 其 于 以 及 或 把 被 让 使 给 对 从 向 到 为 不 没 无 能 会 要 想 只 又 再 还 便 即 则 却 个 些 种 时 中 上 下 里 外 内 后 前 一 二 三 很 太 更 最 呢 吗 啊 吧 呀".split(' '));
function djTokens(text){
  const toks = new Set();
  if(!text) return toks;
  // 英文/数字（S D E 123）
  (text.match(/[A-Za-z]+\d*|\d+/g)||[]).forEach(m=>toks.add(m.toLowerCase()));
  // 中文 2-gram
  const segs = text.split(/[，。、；：？！""''（）《》\s,.;:?!"'()\-—…]+/);
  for(const seg of segs){
    for(let i=0;i<seg.length-1;i++){
      const bg = seg.slice(i,i+2);
      if(/[\u4e00-\u9fff]/.test(bg) && !DJ_STOP.has(bg)) toks.add(bg);
    }
  }
  return toks;
}
class DaodejingRAG {
  constructor(rows){
    this.rows = rows;
    this.index = rows.map(r=>({
      row:r,
      jie:djTokens(r.jiegou||''), shi:djTokens(r.shiyi||''),
      zhi:djTokens(r.zhizhi||''), jing:djTokens(r.jingwen||''),
    }));
    // IDF
    const n = this.index.length||1, df={};
    for(const e of this.index){
      const all = new Set([...e.jie,...e.shi,...e.zhi,...e.jing]);
      for(const t of all) df[t]=(df[t]||0)+1;
    }
    this.idf = {}; for(const t in df) this.idf[t]=Math.log(1+n/df[t]);
  }
  _w(toks){ let s=0; for(const t of toks) s+=this.idf[t]||0; return s; }
  _inter(a,b){ const o=new Set(); for(const t of a) if(b.has(t)) o.add(t); return o; }
  retrieve(query, k=8){
    const qt = djTokens(query);
    const scored=[];
    for(const e of this.index){
      const s = 3.0*this._w(this._inter(qt,e.jie)) + 2.0*this._w(this._inter(qt,e.shi))
              + 2.0*this._w(this._inter(qt,e.zhi)) + 1.0*this._w(this._inter(qt,e.jing));
      if(s>0) scored.push({s:Math.round(s*10)/10, row:e.row});
    }
    scored.sort((a,b)=>b.s-a.s);
    return scored.slice(0,k).map(x=>({...x.row, score:x.s}));
  }
}

/* ============================================================
   三臂方法 + 二阶碰撞（还原 arms.py 的完整 prompt）
   ============================================================ */
const DJ_ARM_METHOD = {
  C1:`你手里只有一把刀：**六路径涌现**。
S=结构显露态，D=差异序列，E=特征纠缠网络。六条发生路径分别对同一问题起手：
S→D→E · S→E→D · D→S→E · D→E→S · E→S→D · E→D→S。
每条路径各给一句判断，再做**一阶碰撞**——把六个判断放一起，逼出一个"单条路径到不了、唯多路径交汇才显现"的新判断。`,
  C2:`你手里只有一把刀：**三方程求残差**。
把问题写成三式联立：S=F(D,E)、D=G(S,E)、E=H(S,D)（三元互函、无第一因）。
求那个"唯三式同时成立才锁得住"的**不可还原残差**——无法被任何单一维度解释、去掉哪一维都塌的那个结构交点。`,
  C3:`你手里只有一把刀：**123原理新生**。
123原理：①D与E相互矛盾（张力累积）→②矛盾逼S改变→③S的改变回写D、E（那一笔"回写"最关键、最常被漏）。
以任一维为种子，按此循环迭代到收敛；并验证：**换哪一维当种子，都收敛到同一个核**。那个核=无第一因、内部自洽闭合的新内核。`,
};
const DJ_ARM_FORBID = {C1:'不要做三方程、不要做123原理',C2:'不要做六路径、不要做123原理',C3:'不要做六路径、不要做三方程'};
const DJ_ARM_NAME = {C1:'六路径涌现',C2:'三方程求残差',C3:'123原理新生'};
function djArmTask(arm){
  return `现在只做 ${arm}·${DJ_ARM_NAME[arm]} 这一件事。${DJ_ARM_FORBID[arm]}、不要给方案、不要引道德经。可用 SDE 术语。
把这把刀在本题上用透，写出推演过程；最后**另起一行**给出：
核心判断：<把这条臂得出的那个关键结构判断，用一句话写死，20-40字>`;
}
const DJ_COLLISION_TASK = `下面【三份产出】是三条臂各自独立跑出来的——它们互相没看过对方。
现在只做 **★二阶碰撞**，用你的发生学功底看穿三股张力往哪个 S 的跃迁上逼。

【铁律·三种假碰撞一律禁止】
- 叠加：把三条各说一句、挑共同点复述 —— 禁止。
- 裁决：判哪条臂赢、更接近真相 —— 禁止。
- 互补补盲：用C2补C1盲区、两两拼接、"三者都对所以一起做" —— 禁止。

【正确做法·逼一次相变】
(a) 升温：把三份产出当三股带刺的差异源，让它们互相攻击、互相不服——明写 C1 会怎么反驳 C2、C2 怎么撕 C3、C3 怎么顶回 C1，把张力烧到"似乱"。
(b) 临界收束：在张力最高处只问一句——"若这三股都成立、又互相顶死，被它们共同逼出来、却不属于其中任何一条的，是什么？"必须蹦出一个三份产出单看都没有的新结构。
(c) 相变自检：那句若能被线性还原成"A+B""A补B"——就是组装冒充涌现，打回重烧。
(d) ★奶奶测试（反伪深刻）：把涌现出的那句用**大白话**讲给一个没文化的老人听——他要能听懂、且觉得"有道理、我能照着做"。**严禁把日常问题翻译成一套行话/黑话冒充深刻**。造了新词却过不了奶奶测试的，一律判伪涌现，打回重烧。
若三股实在趋同、烧不出相变，老实说"三臂趋同、未涌现"，绝不硬凑组装。

【输出】
先写二阶碰撞的过程（升温 → 临界 → 相变涌现出的那一句）。然后：
最终重解（一句朴素大白话，过奶奶测试）：<这里写那句>
最后**另起一行**：
检索线索：<把最终重解，用带 S/D/E、中心、回写、极则反、守本、自组织等结构词的一句话写出，12-30字>`;

const DJ_STAGE2_TASK = `现在做【解决方案】。下方是系统从《道德经》检索到的原文、逐句释义与发生学解构，据此生成方案。
严守改姓铁律——给用户看的文字里绝对不许出现任何 SDE 术语（S/D/E、结构显露态、差异序列、特征纠缠、发生学、发生律、回写、成熟态、二阶碰撞、六路径、三方程 等一律禁止）。但【务必】把释义与解构里的"深度洞察"用大白话讲给读者听——不是丢术语，是把那层意思翻译成人话。别让经文变成一句没解释的口号。

按三段输出：
一、问题症结（用大白话把重解凝成2-3句，不带术语）
二、经文与解读（选1-3条。每条：①照录原文；②"这句在讲什么"——用大白话把释义+解构里的深意讲透；③"它为何接得住你这道题"——把经文的道理对上读者的具体处境）
三、解决方案（在解读基础上给可操作的方向与动作，每条动作回扣到对应经文）
只用检索到的这几章，不要凭记忆另引其他章句。`;

const DJ_CONTROL_SYSTEM = `你是一位《道德经》智慧顾问。请用通常的、传统的方式解读《道德经》，为用户的难题给出解决方案。
就按你平常理解的老子思想（无为、柔弱、不争、顺其自然、知足等）来谈，引用一两句相关经文并落到用户的处境上。
按【问题症结 / 相关经文 / 解决方案】三段给出，说人话、可操作。`;

// 改姓兜底清洗
const DJ_BANNED = ["结构显露态","差异序列","特征纠缠","纠缠网络","发生学","发生律","成熟态","二阶碰撞","一阶碰撞","六路径","三方程","三大方程","123原理","回写","残差","任务DNA","SDE"];
function djScrub(text){
  const hits = DJ_BANNED.filter(t=>text.includes(t));
  let out = text;
  for(const t of DJ_BANNED) out = out.split(t).join('');
  out = out.replace(/[（(]\s*[SDE]\s*[,，、]\s*[SDE][^)）]*[)）]/g,'');
  out = out.replace(/[，、]{2,}/g,'，');
  return {text:out, hits};
}

// 抽涌现脊柱
function djExtractSpine(collision){
  let m = collision.match(/最终重解[^:：\n]*[:：]\s*([^\n]+)/);
  if(m && m[1].trim().length>=10) return m[1].trim().replace(/[*# ]/g,'');
  m = collision.match(/最终重解[^\n]*[:：]?\s*\n+\s*([^\n#]+)/);
  if(m && m[1].trim().length>=10) return m[1].trim().replace(/[*# ]/g,'');
  return '';
}
function djExtractQuery(collision){
  const m = collision.match(/检索线索[:：]\s*(.+)/);
  if(!m) return '';
  const q = m[1].trim().replace(/[*#`_ 　]/g,'');
  if(q.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g,'').length<4) return '';
  return q;
}
// 涌现自检（还原 _emergence_ok）
function djEmergenceOk(t){
  if(!t) return false;
  const clean = t.replace(/(不|非|别|莫|绝不|不是|不做|不许|不搞|禁止|严禁)[^，。；\n]{0,8}?(裁决|互补|组装|叠加|拼接|各有道理)/g,'');
  const heat = /互相攻击|互相不服|反驳|撕|顶回|顶死|似乱|介生态|相变|涌现|不属于|单臂|不可达|烧出|现造/.test(t);
  const assembly = /各有道理|裁决|(哪条|谁|C\d)(更接近真相|更对|更准|胜出|赢)|互补|一边.{0,12}一边|两者咬合|补(上|了).{0,6}盲区/.test(clean);
  return heat && !assembly;
}

/* ============================================================
   总编排
   ============================================================ */
async function djSolve(baseKey, sdeft, problem, rag, hooks={}){
  const { onEvent } = hooks;
  DJ_EVENT = onEvent || null;
  const prime = sdeft ? (sdeft + "\n\n---\n\n") : "";

  // ① 三臂并行
  djEmit('phase','三生法重解 · 三臂并行（各自提智、互不相见）…');
  const armText = {};
  await Promise.all(['C1','C2','C3'].map(async arm=>{
    const sys = prime + DJ_ARM_METHOD[arm] + "\n\n" + djArmTask(arm);
    try { armText[arm] = await djCall(baseKey, sys, "问题："+problem, {temperature:0.7, label:`${arm}·${DJ_ARM_NAME[arm]}`}); }
    catch(e){ armText[arm] = `（${arm} 调用失败：${e.message}）`; }
  }));

  // ② 二阶碰撞
  djEmit('phase','二阶碰撞 · 把三份产出投进场烧相变…');
  const products = ['C1','C2','C3'].map(a=>`【${a}·${DJ_ARM_NAME[a]} 的产出】\n${armText[a]||'（无）'}`).join('\n\n');
  const collision = await djCall(baseKey, prime + DJ_COLLISION_TASK, "问题："+problem+"\n\n三份产出：\n"+products, {temperature:0.75, label:'二阶碰撞'});

  const reinterpretation = ['C1','C2','C3'].map(a=>`## ${a}·${DJ_ARM_NAME[a]}\n${armText[a]}`).join('\n\n') + "\n\n## ★ 二阶碰撞\n"+collision;

  // 自检
  const arms = {
    C1: !armText.C1.startsWith('（C1 调用失败'),
    C2: !armText.C2.startsWith('（C2 调用失败'),
    C3: !armText.C3.startsWith('（C3 调用失败'),
    '二阶碰撞': !!collision,
    '涌现(非组装)': djEmergenceOk(collision),
  };

  // ③ 抽脊柱 + 检索线索
  const spine = djExtractSpine(collision);
  let query = djExtractQuery(collision);
  let truncated = false;
  if(!query || query.replace(/[ *#—-]/g,'').length<4){ truncated=true; query = spine || collision; }

  // ④ RAG 检索
  djEmit('phase','道德经检索 · 81章IDF加权…');
  let pool = rag.retrieve(query, 8).filter(p=>p.score>=8.0);
  let passages = [], noScripture = false;
  if(pool.length){
    passages = pool.slice(0,3);
    djEmit('call-done', `检索命中 ${passages.map(p=>'第'+p.ch+'章').join('、')}`, {});
  } else {
    noScripture = true;
    djEmit('call-done', '检索无对位经文（诚实标注，不硬凑）', {});
  }

  // ⑤ 方案生成（改姓）
  djEmit('phase','以原文为据生成方案（改姓·零术语）…');
  let citeBlock;
  if(noScripture){
    citeBlock = "（检索校验：道德经八十一章中未找到与本题真正对位的经文。不要硬凑经文附会。请诚实说明，改为给一份『无经文支撑的直解』——只依据核心重解展开可操作方向。）";
  } else {
    citeBlock = passages.map(p=>`《道德经》第${p.ch}章 · ${p.title}\n【原文】${p.jingwen}\n【逐句释义】${p.shiyi}\n【发生学解构】${p.jiegou}`).join('\n\n');
  }
  let spineBlock = '';
  if(spine){
    spineBlock = `\n\n【方案脊柱·最高优先级】\n本方案必须以这句核心重解为脊梁展开：『${spine}』\n- 问题症结、每条经文解读、每个动作，都要服务于这句、回扣这句。\n- 严禁退化成'多留点时间给自己''劳逸结合'这类谁都会说的通用建议。\n- 若发现方案换成任何普通顾问也能写，就是把脊柱磨平了，重写。`;
  }
  const stage2System = prime + DJ_STAGE2_TASK + spineBlock + "\n\n【检索结果】\n" + citeBlock;
  const rawSolution = await djCall(baseKey, stage2System,
    "问题："+problem+"\n\n（内部重解，仅供参考，勿在回答中出现术语）：\n"+reinterpretation,
    {temperature:0.6, maxTokens:3500, label:'方案生成'});
  const {text:solution, hits:scrubbed} = djScrub(rawSolution);

  // ⑥ 对照组
  djEmit('phase','对照组 · 常规道德经解读（不提智）…');
  const control = await djCall(baseKey, DJ_CONTROL_SYSTEM, "问题："+problem, {temperature:0.6, maxTokens:3000, label:'对照组'});

  djEmit('phase','完成');
  return { problem, reinterpretation, spine, query, truncated, passages, noScripture,
           solution, scrubbed, arms, control, collision };
}
