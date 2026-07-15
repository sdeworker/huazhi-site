/* ============================================================
   SDE 智问 · Worker（只做境外基底的 CORS 转发）
   核心原则：绝不持钥、绝不存储。Key 由前端在 header 里带进来，
   转发一次即用即弃。国产基底前端直连，根本不经过这里。
   ============================================================ */

const UPSTREAM = {
  kimi:    { url: 'https://api.moonshot.cn/v1/chat/completions', auth: k => ({ 'Authorization': `Bearer ${k}` }), fmt: 'openai' },
  qwen:    { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', auth: k => ({ 'Authorization': `Bearer ${k}` }), fmt: 'openai' },
  minimax: { url: 'https://api.minimax.chat/v1/text/chatcompletion_v2', auth: k => ({ 'Authorization': `Bearer ${k}` }), fmt: 'openai' },
  gpt:     { url: 'https://api.openai.com/v1/chat/completions', auth: k => ({ 'Authorization': `Bearer ${k}` }), fmt: 'openai' },
  claude:  { url: 'https://api.anthropic.com/v1/messages', auth: k => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }), fmt: 'anthropic' },
  gemini:  { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', auth: () => ({}), fmt: 'gemini' },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-sde-base, x-sde-key',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')   return new Response('Method Not Allowed', { status: 405, headers: cors });

    const base = request.headers.get('x-sde-base');
    const key  = request.headers.get('x-sde-key');
    const up = UPSTREAM[base];
    if (!up || !key) return json({ error: 'bad base or missing key' }, 400);

    const body = await request.json();

    // 归一 OpenAI 格式 → 各家原生格式
    let url = up.url, payload = body, headers = { 'Content-Type': 'application/json', ...up.auth(key) };

    if (up.fmt === 'anthropic') {
      const sys = body.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
      payload = {
        model: body.model, max_tokens: body.max_tokens || 4000, temperature: body.temperature,
        system: sys || undefined,
        messages: body.messages.filter(m => m.role !== 'system'),
      };
    } else if (up.fmt === 'gemini') {
      url = `${up.url}?key=${key}`;
      payload = {
        contents: body.messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
        })),
        systemInstruction: { parts: [{ text: body.messages.filter(m => m.role==='system').map(m=>m.content).join('\n\n') }] },
        generationConfig: { maxOutputTokens: body.max_tokens || 4000, temperature: body.temperature },
      };
    }

    let resp;
    try {
      resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (e) {
      return json({ error: 'upstream fetch failed: ' + e.message }, 502);
    }
    const data = await resp.json();

    // 各家原生格式 → 归一回 OpenAI 格式（前端只认一种）
    let text = '';
    if (up.fmt === 'anthropic')  text = data.content?.map(c => c.text || '').join('') ?? '';
    else if (up.fmt === 'gemini') text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
    else                          text = data.choices?.[0]?.message?.content ?? '';

    if (!text && data.error) return json({ error: JSON.stringify(data.error) }, resp.status);
    return json({ choices: [{ message: { content: text } }] });
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}
