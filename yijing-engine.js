/* ============================================================
   易经 · SDE 经典解读引擎（网页版）
   两种模式：解经型（求理解，S/E起手）｜处境对照型（求干预，D起手）
   象数/义理两轨分读 → 三路解构(三大方程/六路径/123原理) → 二阶碰撞
   → 变爻微读 → 对照组 → 160分双评分
   一比一还原自桌面 yijing_sde_agent.py。访客自带 Key，全程浏览器内。
   ============================================================ */

const YJ_BASES = {
  deepseek:{name:'DeepSeek',direct:true,endpoint:'https://api.deepseek.com/chat/completions',keyName:'sde_ds_key',
    models:[{id:'deepseek-v4-pro',label:'V4 Pro（推理最强）',thinking:true},{id:'deepseek-v4-flash',label:'V4 Flash（快）',thinking:true},{id:'deepseek-chat',label:'Chat（旧·7/24停用）'}]},
  glm:{name:'智谱 GLM',direct:true,endpoint:'https://open.bigmodel.cn/api/paas/v4/chat/completions',keyName:'sde_glm_key',
    models:[{id:'glm-4-plus',label:'GLM-4-Plus'},{id:'glm-4-air',label:'GLM-4-Air（快）'}]},
};
let YJ_MODEL={}, YJ_EVENT=null;
function yjEmit(type,msg,extra){ if(YJ_EVENT) YJ_EVENT({type,msg,...extra}); }

async function yjCall(baseKey, system, userMsg, {maxTokens=3000,temperature=0.7,label='调用'}={}){
  const b=YJ_BASES[baseKey], key=localStorage.getItem(b.keyName);
  if(!key) throw new Error(`缺少 ${b.name} 的 API Key`);
  const modelId=YJ_MODEL[baseKey]||b.models[0].id;
  const isThinking=(b.models.find(m=>m.id===modelId)||{}).thinking;
  const budget=isThinking?Math.max(maxTokens*4,16000):maxTokens;
  yjEmit('call-start',label,{model:modelId});
  const messages=[]; if(system) messages.push({role:'system',content:system}); messages.push({role:'user',content:userMsg});
  const r=await fetch(b.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({model:modelId,messages,max_tokens:budget,temperature})});
  if(!r.ok) throw new Error(`${b.name} 返回 ${r.status}: ${(await r.text()).slice(0,150)}`);
  const d=await r.json(); const m=d.choices?.[0]?.message||{}; let out=m.content??'';
  if(!out.trim()&&m.reasoning_content) throw new Error(`${label}：思考过长导致正文为空，请重试`);
  yjEmit('call-done',`${label} · ${out.length}字`,{chars:out.length});
  return out.trim();
}

// ---------- 解读总纲（两种模式）----------
const YJ_HEADER_JIE = `你面对的是一段《易经》经文，任务类型：解经型（求理解）。
解读总纲：易经是发生体系，不是预测表。要把『象（结构配置）』与『辞（差异倾向/义理）』两轨分开读，再显露二者如何纠缠——不要像传统注疏那样把象数与义理和成一锅。吉凶悔吝不读成命运结局，而读成差异序列相对于健康发生所处的位置（吉=趋良好自组织；凶=趋退化塌缩；悔=被抑制的差异要回来的自校正温度；吝=过度优化、高效而贫血、趋僵化）。`;
const YJ_HEADER_DUI = `你面对的是一个真实的人生处境，任务类型：处境对照型（求干预）。
纪律：不算命、不预测命运。用卦象结构作『结构与势的镜子』，照出当事人没看清的配置与发生方向，给顺纹理、可操作的觉察与行动。输出不是命运X，而是『你处境的结构与势 + 它正往哪里发生 + 此刻能走的一步』。先借卦读势（张力在哪、势往哪走），再把势沉淀进当事人的现实与自我里，让势真正生根。`;

// ---------- 三路视角（用易经语言）----------
const YJ_LENS = {
  '三大方程':`【本路操作：三大方程 · 求残差】
把这个处境/经文写成三个互相牵制的方程，逼出那个『唯有三者同时成立才锁得住、无法被任何单一维度解释』的不可还原残差。
第一步·三维定位（用易经语言落地）：结构＝此处显露的卦象配置/格局（地、位、当不当位）；差异＝哪条力量在推进、哪条被抑制（爻的动向、阴阳消长）；纠缠土壤＝承载它的势与厚度（位/时/势读出的势能，及关系、身体、记忆的沉淀）。
第二步·联立：三者互为因果，无单一第一因。
第三步·求残差：找出那个『动任何单独一维都解释不了、唯三式同时成立才被锁死』的核心结构。
纪律：最高结论必须是一个锁死的结构——说清『为什么此困局靠单点努力解不开』，而非一句『向内沉淀』式劝勉。结尾一句话凝缩这个残差。`,
  '六路径':`【本路操作：六路径 · 真六路涌现】
分别从六条发生路径各起手一次，对同一处境各给一句判断，再把六句碰撞成一个『单条路径都到不了』的新判断。
六条路径（每条用易经语言给一句判断）：S→D→E（从卦象格局起）· S→E→D（先看可能性再看可行性）· D→S→E（从哪条差异在动起）· D→E→S（从当下困境起：先给能立刻走的一步）· E→S→D（从势/环境起）· E→D→S（从环境起）。
然后内部碰撞：六个起点各看见了什么别人没看见的？撞成一个唯有多路交汇才显现的判断。
纪律：必须真给出六条各自不同的一句判断，再碰撞。结尾一句话凝缩那个多路交汇的判断。`,
  '123原理':`【本路操作：123原理 · 迭代验同核】
用以矛盾为燃料的三冲程发动机，逼出一个『换任何起点都收敛到同一处』的自洽内核。
第一步·找引擎：此处差异与土壤在累积什么矛盾→这矛盾正逼出怎样的卦变→这改变又如何回写、打开下一轮。这是它的『卦变引擎』。
第二步·换种子验同核：分别以结构、差异、土壤为起点各跑一遍，看是否都收敛到同一个核。
第三步·给可证伪边界：这个核在什么情况下会失效。
纪律：结论必须是一个能自我支撑、自我闭合的核——说清这个处境的内在循环卡在哪里、会往哪里自转。结尾一句话凝缩这个自洽核。`,
};

const YJ_TAIL = `\n请给出本路的完整解读（1200-2000字），结构清晰、直击要害，落到具体而非空泛。结尾用不超过50字凝缩本路最关键的一条判断。改姓爪纪律：正文不得出现 SDE / 结构显露态 / 差异序列 / 纠缠网络 等内部术语，用易经与日常语言把同样的精度说出来。`;

function yjTaskPrompt(mode, scripture, situation, lensName){
  const header = mode==='解经型'?YJ_HEADER_JIE:YJ_HEADER_DUI;
  let body;
  if(mode==='解经型'){ body=`【经文 / 卦】\n${scripture.trim()}\n`; if(situation.trim()) body+=`\n【补充背景】\n${situation.trim()}\n`; }
  else { body=`【当事人的真实处境】\n${situation.trim()}\n`; if(scripture.trim()) body+=`\n【参考经文/卦（如有）】\n${scripture.trim()}\n`; }
  return `${header}\n\n${body}\n${YJ_LENS[lensName]}\n${YJ_TAIL}`;
}

// ---------- 二阶碰撞 ----------
function yjIntegrationPrompt(mode, scripture, situation, pathOutputs){
  let joined=''; for(const [name,txt] of Object.entries(pathOutputs)) joined+=`\n===【${name}路判断】===\n${txt}\n`;
  const obj = mode==='解经型'?scripture:situation;
  let p = `下面是对同一对象、从三个不同视角给出的三个一阶判断（三大方程、六路径、123原理）。
你的任务不是裁决谁对谁错、不是从三个里挑一个、更不是把三个并列拼盘——那些都是伪涌现。
你要做【二阶碰撞】：让三个判断在同一个场里碰撞，涌现出一个任何单条路径都到不了、唯有三者交汇才显现的新判断。严格按四步走：

第一步·混沌碰撞：把三个判断各自的核心主张一句话拎出来，明确指出它们在哪里张力最大、互相冲突。先让冲突充分暴露。
第二步·两两校正：三个判断两两相撞，每对追问『这两个撞在一起，逼出了什么单看任一个都没有的东西』。
第三步·涌现暗流：找出那条三个判断共同指向、却谁都没单独说出的更深结构，凝缩成一个命名的、公式级的新律——给它起名字，写成一句能独立立住、能迁移的判断，再用不超过200字展开。硬要求：不许停在哲学隐喻——隐喻封顶，命名硬律才破顶。
⚠️【去母体纪律】发生发生在关系之中，不等于『向内』。警惕最廉价的伪深刻：把问题挪进主体内部、收敛成『转向自身完整/自足/克制/向内』。先判本卦性质：若它本以进/决/动/行/壮/革为正（刚健行动卦），那条律必须落在【前行/决断动作本身的结构】或【主体与他人的关系纠缠】里，严禁默认把『向内』当终点；唯有经文确以退/藏/守/谦为正（如谦、明夷）时，向内才是真解。
第四步·诚实自检（公开写出）：删除测试（删任一路这判断还成立吗？成立=伪涌现，重找）· 预料测试（能从某一路单独推出吗？能=延伸，重找）· 内移检验（是不是只是把问题挪进主体内部？若是且本卦非退藏守谦为正，多半是套模板的伪升维，重找）· 自评不可还原程度。\n`;
  if(mode==='解经型') p+=`第五步·当代处境落地（务必写出）：这一卦对应一种处境类型，易经给了类型名却没给今天的样子。把涌现的那条律落到当代真实的人与处境上：这一卦的处境在今天对应哪些人、哪些真实场景？至少2-3种当代样貌（具体到能让身处其中的人认出自己）。对这些人，这一卦给出什么可落地的觉察或下一步？这一步是核心价值：易经缺的正是这层当代血肉。\n`;
  p += `\n【解读对象】\n${obj.trim()}\n${joined}\n纪律：宁可承认『这次没碰出真正的新结构』，也不许造贴标签式或同义反复式的假涌现。正文不得出现 SDE 内部术语，用易经与日常语言落地。最后给一条可落地的觉察或行动。`;
  p += mode==='解经型'?'篇幅 1800-2600 字（含第五步）。':'篇幅 1200-1800 字。';
  return p;
}

const YJ_CONTROL_SYSTEM = `你是一位熟悉《易经》的解读者。请用通常的方式解读用户给的经文或人生处境，给出常见的易经智慧引导。自然、流畅即可，不需要任何特殊框架。`;
function yjControlPrompt(mode, scripture, situation){
  if(mode==='解经型'){ let s=`请解读这段《易经》经文/卦，并谈谈它的智慧：\n\n${scripture.trim()}`; if(situation.trim())s+=`\n\n背景：${situation.trim()}`; return s; }
  let s=`这是我面临的真实处境，请用易经的智慧给我解读和引导：\n\n${situation.trim()}`; if(scripture.trim())s+=`\n\n（可参考的卦：${scripture.trim()}）`; return s;
}

// ---------- 变爻微读 ----------
function yjYaoPrompt(scripture, integration, mode, situation){
  const gua=scripture.trim();
  let head, seg4;
  if(mode==='处境对照型'){
    head=`一位读者正面对这样的真实人生处境：\n「${situation.trim()}」\n\n针对这个处境，已完成一条整合发生律，对应到【${gua}】这一卦。整合律全文：\n\n———整合律全文———\n${integration.trim()}\n———整合律结束———\n\n现在写一份『逐爻微读』，让这位完全不懂易经的读者，顺着这一卦一步步看懂自己的处境正走到哪一步。\n`;
    seg4=`④ 【对你此刻的处境】把这一爻直接落到读者上面那段真实处境上：如果他正走到这一爻，意味着处境到了哪一步、该留意或该做什么。扣住他说的具体情形。\n`;
  } else {
    head=`下面是对【${gua}】已完成的一条整合发生律：\n\n———整合律全文———\n${integration.trim()}\n———整合律结束———\n\n现在写一份『逐爻微读』，让一个完全不懂易经的普通人，也能顺着这一卦一步步看懂、学进去。\n`;
    seg4=`④ 【如果你正在这一爻】落到读者身上：一个人若此刻正处在这一爻的位置，意味着什么、该留意或该做什么。具体、可感、能用。\n`;
  }
  return head+`把这一卦的六爻，按【初→上】顺序逐爻读。
★用爻规则（务必严格）：只有【乾卦】在上九后多读『用九：见群龙无首，吉』；只有【坤卦】在上六后多读『用六：利永贞』；其余六十二卦只有六爻，读完上爻即止，绝不为其他卦杜撰『用九/用六』。
关键理解：六爻不是六个互不相干的话题，而是上面那条整合律【展开时的六个先后阶段】——初爻是起点，上爻是极相或反转。每一爻都要挂在这条律之下。

每一爻严格按四小段写，朴实清楚：
① 【爻辞】准确写出这一爻的爻辞原文。
② 【这句在说什么】一两句大白话，把这句古文字面讲的事说清楚。
③ 【在这条律里走到哪了】点明这一爻是整合律差异序列里的哪一阶（起步/积累/转折/危机/成熟/到顶/反转），与前后爻怎么递进。
`+seg4+`
要求：全程大白话，不出现术语。六爻读完后用三五句话做『一卦走一遍』小结，把六爻串成一条完整的路。不要重复整合律的论证，你的任务是把那条律铺到六爻每一步上。`;
}

// ---------- 160 分评分 ----------
const YJ_SCORE_SYSTEM = `你是 SDE 体系的严格评分官，使用『创新智商』标尺（满分 160，160=天才级）。
评分锚点（务必严守，防分数膨胀）：
· 100-115：大众/专业人士水位（大模型裸问基线、传统注疏式解读多落此）；
· 116-129：强提示 + 中等深度；
· 130-145：资深学者级（完整三视角互消 + 单视角不可达凝缩 + 有效升维）；
· 146-160：动态生命体级，仅当真正新概念创造、公式级凝缩、根部升维、改写问题本身时才给；160 极罕见。
评判维度：能否生成新问题空间/跨场景维持/长出方法论/改写旧边界/持续锻造/完成学科改姓；外加单视角不可达凝缩、反直觉判断、行动是否可操作。
纪律：不被『读起来漂亮』迷惑；传统命理式或泛泛抒情式解读封顶 120。
只输出严格 JSON：{"iq": <整数0-160>, "level": "<一句水位定性>", "reasons": ["<理由1>","<理由2>","<理由3>"]}
reasons 里引用原文用中文引号『』，绝不用英文双引号。`;
function yjParseScore(text){
  if(!text) return null;
  let t=text.trim().replace(/^```[a-zA-Z]*/,'').replace(/```/g,'').trim();
  try{ const o=JSON.parse(t); return {iq:parseInt(o.iq)||0, level:o.level||'', reasons:o.reasons||[]}; }
  catch(e){
    const m=t.match(/["']?iq["']?\s*:\s*(\d+)/); if(m) return {iq:parseInt(m[1]), level:'(评分解析降级)', reasons:[]};
    return null;
  }
}
async function yjScore(baseKey, label, text){
  try{
    const raw=await yjCall(baseKey, YJ_SCORE_SYSTEM, `请给下面这份【${label}】打『创新智商』分（0-160）。\n\n<<<\n${text.slice(0,8000)}\n>>>`, {maxTokens:1200, temperature:0.3, label:`评分·${label}`});
    return yjParseScore(raw);
  }catch(e){ return null; }
}

// 改姓兜底
const YJ_BANNED=["结构显露态","差异序列","特征纠缠","纠缠网络","发生学","发生律","成熟态","二阶碰撞","一阶碰撞","六路径","三方程","三大方程","123原理","回写","残差","任务DNA","SDE"];
function yjScrub(text){
  let out=text; for(const t of YJ_BANNED) out=out.split(t).join('');
  out=out.replace(/[（(]\s*[SDE]\s*[,，、]\s*[SDE][^)）]*[)）]/g,'').replace(/[，、]{2,}/g,'，');
  return out;
}

/* ============================================================
   总编排
   ============================================================ */
async function yjInterpret(baseKey, sdeft, mode, scripture, situation, rag, hooks={}){
  const { onEvent } = hooks;
  YJ_EVENT = onEvent||null;
  const prime = sdeft?(sdeft+"\n\n---\n\n"):"";

  // ① 三路并行
  yjEmit('phase','三路并行解构（三大方程/六路径/123原理，各自提智）…');
  const lenses=['三大方程','六路径','123原理'], pathOut={};
  await Promise.all(lenses.map(async lens=>{
    const sys=prime+"你是一位深谙《易经》的 SDE 解读者，只用当前指定的这一路方法解读。";
    try{ pathOut[lens]=await yjCall(baseKey, sys, yjTaskPrompt(mode,scripture,situation,lens), {temperature:0.7,label:lens}); }
    catch(e){ pathOut[lens]=`（${lens} 失败：${e.message}）`; }
  }));

  // ② 二阶碰撞（整合）
  yjEmit('phase','二阶碰撞 · 三路涌现单视角不可达的新律…');
  const rawIntegration=await yjCall(baseKey, prime+"你是一位深谙《易经》与发生学的解读者。", yjIntegrationPrompt(mode,scripture,situation,pathOut), {temperature:0.75,maxTokens:4000,label:'二阶碰撞整合'});
  const integration=yjScrub(rawIntegration);

  // ③ 变爻微读（仅解经型且识别到卦时做；处境型也可做对应卦）
  let yao='';
  if(scripture.trim().length>=1){
    yjEmit('phase','变爻微读 · 六爻逐阶铺开…');
    try{ const rawYao=await yjCall(baseKey, prime+"你是一位深谙《易经》的解读者，把整合律铺到六爻每一步上。", yjYaoPrompt(scripture,integration,mode,situation), {temperature:0.6,maxTokens:4000,label:'变爻微读'}); yao=yjScrub(rawYao); }
    catch(e){ yao=''; }
  }

  // ④ 对照组
  yjEmit('phase','对照组 · 常规易经解读（不提智）…');
  const control=await yjCall(baseKey, YJ_CONTROL_SYSTEM, yjControlPrompt(mode,scripture,situation), {temperature:0.6,maxTokens:2500,label:'对照组'});

  // ⑤ 双评分（提智 vs 对照）
  yjEmit('phase','创新智商评分（提智 vs 对照）…');
  const [scoreSDE, scoreCtrl]=await Promise.all([ yjScore(baseKey,'SDE提智解读',integration), yjScore(baseKey,'常规解读',control) ]);

  yjEmit('phase','完成');
  const paths=lenses.map(l=>`## ${l}路\n${pathOut[l]}`).join('\n\n');
  return { mode, scripture, situation, paths, integration, yao, control, scoreSDE, scoreCtrl,
           leap: (scoreSDE&&scoreCtrl)?(scoreSDE.iq-scoreCtrl.iq):null };
}
