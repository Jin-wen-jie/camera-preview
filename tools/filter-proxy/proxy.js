/**
 * DeepSeek Image Filter Proxy
 * 
 * 在 ZCode 和 API 之间做一层代理，自动过滤 text-only 模型不支持的 image_url 消息。
 * 
 * 路由规则：
 *   /deepseek/* → api.deepseek.com     （所有模型纯文本，始终过滤）
 *   /opencode/* → opencode.ai/zen/go/v1（按模型名判断：deepseek 过滤，glm/kimi 放行）
 * 
 * 用法: node proxy.js [--port=8899]
 */

const http = require('http');
const https = require('https');

// ============ 配置 ============
const PORT = parseInt(process.env.PORT || '8899', 10);

const UPSTREAMS = {
  '/deepseek': {
    target: 'https://api.deepseek.com',
    // DeepSeek 直连：所有模型都是纯文本
    filterMode: 'always'
  },
  '/opencode': {
    target: 'https://opencode.ai/zen/go/v1',
    // OpenCode：有纯文本模型也有多模态模型，按模型名判断
    filterMode: 'auto'
  }
};

// 纯文本模型列表（这些模型不支持 image_url）
const TEXT_ONLY_MODELS = new Set([
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek-coder'
]);

// ============ 工具函数 ============

/**
 * 判断模型是否需要过滤图片
 */
function shouldFilter(model, upstreamConfig) {
  if (upstreamConfig.filterMode === 'always') return true;
  if (upstreamConfig.filterMode === 'auto') {
    return TEXT_ONLY_MODELS.has(model);
  }
  return false;
}

/**
 * 从消息 content 中移除所有 image_url 块。
 * content 可能是字符串（不变）或数组。
 * 如果过滤后只剩一个 text 块，简化为纯字符串。
 */
function stripImages(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return content;
  }

  const textParts = content.filter(part => part.type === 'text');
  
  // 移除所有 image_url
  const filtered = content.filter(part => part.type !== 'image_url');

  // 如果只剩一个 text 块，简化为字符串
  if (textParts.length === 1 && filtered.length === 1) {
    return textParts[0].text;
  }

  // 如果全被过滤了，返回空字符串
  if (filtered.length === 0) {
    return '';
  }

  return filtered;
}

/**
 * 过滤请求体 messages 中的 image_url
 */
function filterRequestBody(bodyJson, upstreamConfig) {
  const model = bodyJson.model || '';
  const needFilter = shouldFilter(model, upstreamConfig);

  if (!needFilter) {
    return { body: bodyJson, filtered: false, model };
  }

  const messages = bodyJson.messages;
  if (!Array.isArray(messages)) {
    return { body: bodyJson, filtered: false, model };
  }

  let imageCount = 0;
  const cleaned = messages.map((msg, i) => {
    if (!msg || typeof msg !== 'object') return msg;
    
    const content = msg.content;
    const cleanedContent = stripImages(content);
    
    if (JSON.stringify(cleanedContent) !== JSON.stringify(content)) {
      // 统计被过滤的图片数
      if (Array.isArray(content)) {
        imageCount += content.filter(p => p.type === 'image_url').length;
      }
      return { ...msg, content: cleanedContent };
    }
    return msg;
  });

  if (imageCount > 0) {
    console.log(`[filter] 模型=${model} | 过滤了 ${imageCount} 张图片`);
  }

  return { body: { ...bodyJson, messages: cleaned }, filtered: imageCount > 0, model };
}

// ============ 代理服务器 ============

const server = http.createServer((clientReq, clientRes) => {
  const startTime = Date.now();
  const reqPath = clientReq.url || '/';

  // 匹配上游
  const prefix = Object.keys(UPSTREAMS).find(p => reqPath.startsWith(p));
  if (!prefix) {
    clientRes.writeHead(404, { 'Content-Type': 'text/plain' });
    clientRes.end('Unknown upstream. Use /deepseek or /opencode prefix.\n');
    console.log(`[404] ${reqPath}`);
    return;
  }

  const upstreamConfig = UPSTREAMS[prefix];
  const upstreamPath = reqPath.slice(prefix.length) || '/';
  const upstreamUrl = upstreamConfig.target + upstreamPath;

  // 收集请求体
  const chunks = [];
  clientReq.on('data', chunk => chunks.push(chunk));
  clientReq.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    const method = clientReq.method;

    // 解析请求体
    let bodyJson;
    try {
      bodyJson = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      // 非 JSON 请求（如 OPTIONS），直接转发
      forwardRequest(clientReq, clientRes, upstreamUrl, rawBody, null, startTime);
      return;
    }

    // 过滤图片
    const { body: filteredBody, filtered } = filterRequestBody(bodyJson, upstreamConfig);
    const newBody = Buffer.from(JSON.stringify(filteredBody), 'utf-8');

    forwardRequest(clientReq, clientRes, upstreamUrl, newBody, filtered ? filteredBody : null, startTime);
  });
});

/**
 * 转发请求到上游服务器
 */
function forwardRequest(clientReq, clientRes, upstreamUrl, body, filteredBody, startTime) {
  const parsedUrl = new URL(upstreamUrl);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      'Content-Length': Buffer.byteLength(body),
      host: parsedUrl.hostname
    }
  };

  const upstreamReq = https.request(options, (upstreamRes) => {
    // 转发状态码和头
    clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
    
    // 流式转发响应
    upstreamRes.pipe(clientRes);

    upstreamRes.on('end', () => {
      const elapsed = Date.now() - startTime;
      const model = filteredBody ? filteredBody.model : '?';
      console.log(`[${upstreamRes.statusCode}] ${clientReq.method} ${clientReq.url} → ${upstreamUrl} | ${elapsed}ms`);
    });
  });

  upstreamReq.on('error', (err) => {
    console.error(`[error] 上游请求失败: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: { message: `代理转发失败: ${err.message}`, type: 'proxy_error' }
      }));
    }
  });

  // 处理客户端请求体的流式转发（对于非初始请求，body 可能不会被重新发送）
  upstreamReq.write(body);
  upstreamReq.end();
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // 端口已被占用 — 说明代理已经在运行，静默退出（适用于开机自启场景）
    console.log(`[${new Date().toLocaleTimeString()}] 代理已在运行中 (端口 ${PORT} 被占用)，无需重复启动`);
    process.exit(0);
  }
  console.error(`[${new Date().toLocaleTimeString()}] 启动失败: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const time = new Date().toLocaleTimeString();
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   DeepSeek Image Filter Proxy           ║');
  console.log(`║   启动时间: ${time}                  ║`);
  console.log(`║   监听: http://127.0.0.1:${PORT}          ║`);
  console.log('╠══════════════════════════════════════════╣');
  for (const [prefix, cfg] of Object.entries(UPSTREAMS)) {
    const filterLabel = cfg.filterMode === 'always' ? '始终过滤' : '智能过滤(deepseek过滤,glm/kimi放行)';
    console.log(`║  ${prefix} → ${cfg.target}`);
    console.log(`║    ${' '.repeat(prefix.length)}   ${filterLabel}`);
  }
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('按 Ctrl+C 停止代理');
  console.log('');
});
