const axios = require('axios');

function isLikelyPrivateHostname(hostname) {
  const lower = (hostname || '').toLowerCase();
  if (!lower) return true;

  if (lower === 'localhost' || lower === '0.0.0.0' || lower === '127.0.0.1' || lower === '::1') return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;

  // IPv6 literal (very rough check)
  if (lower.includes(':')) return true;

  // IPv4 literal checks
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(n => Number.parseInt(n, 10));
    if (octets.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

function normalizeHostForWww(hostname) {
  return (hostname || '').toLowerCase().replace(/^www\./, '');
}

function isAllowedRedirect(originalUrl, nextUrl) {
  try {
    const original = new URL(originalUrl);
    const next = new URL(nextUrl);

    if (!['http:', 'https:'].includes(next.protocol)) return false;
    if (isLikelyPrivateHostname(next.hostname)) return false;

    // Allow same-origin redirects, or simple www <-> apex changes.
    if (next.origin === original.origin) return true;
    return normalizeHostForWww(next.hostname) === normalizeHostForWww(original.hostname);
  } catch {
    return false;
  }
}

async function fetchHtmlWithLimitedRedirects(url, options) {
  const {
    timeoutMs,
    maxBytes,
    userAgent,
    maxRedirects,
  } = options;

  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const response = await axios.get(current, {
      timeout: timeoutMs,
      responseType: 'text',
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    // Follow redirects manually (with checks)
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers?.location;
      if (!location) throw new Error(`Redirect with no Location header from ${current}`);

      const next = new URL(location, current).toString();
      if (!isAllowedRedirect(current, next)) {
        throw new Error(`Blocked redirect to ${next}`);
      }

      current = next;
      continue;
    }

    const contentType = (response.headers?.['content-type'] || '').toLowerCase();
    if (!contentType.includes('text/html')) {
      throw new Error(`Non-HTML content-type: ${contentType || 'unknown'}`);
    }

    return {
      finalUrl: current,
      html: typeof response.data === 'string' ? response.data : String(response.data),
    };
  }

  throw new Error(`Too many redirects while fetching ${url}`);
}

function extractTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return '';
  return decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(input) {
  if (!input) return '';

  // Minimal decoding to keep dependencies light.
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x60;/gi, '`')
    .replace(/&#x3D;/gi, '=');
}

function htmlToText(html) {
  if (!html) return '';

  let cleaned = html;

  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  cleaned = cleaned.replace(/<\/?(header|footer|nav|svg)[\s\S]*?>/gi, ' ');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/p>/gi, '\n');

  cleaned = cleaned.replace(/<\/?[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned.trim();
}

function inferSourceType(url) {
  const lower = (url || '').toLowerCase();
  if (lower.includes('/pricing') || lower.includes('/plans')) return 'pricing';
  if (lower.includes('/docs') || lower.includes('/help')) return 'docs';
  if (lower.endsWith('/')) return 'homepage';
  return 'other';
}

function buildCandidates(productUrl) {
  const base = new URL(productUrl);
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new Error('Only http/https URLs are allowed');
  }
  if (isLikelyPrivateHostname(base.hostname)) {
    throw new Error('URL hostname is not allowed');
  }

  const origin = base.origin;
  const candidates = [
    productUrl,
    new URL('/', origin).toString(),
    new URL('/pricing', origin).toString(),
    new URL('/plans', origin).toString(),
    new URL('/features', origin).toString(),
    new URL('/signup', origin).toString(),
    new URL('/register', origin).toString(),
    new URL('/docs', origin).toString(),
    new URL('/help', origin).toString(),
  ];

  // De-dupe while preserving order
  const seen = new Set();
  return candidates.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

async function ingestProductEvidence(productUrl, options = {}) {
  const merged = {
    timeoutMs: 8000,
    maxBytes: 512 * 1024,
    maxRedirects: 3,
    maxSources: 4,
    perSourceMaxChars: 2500,
    totalContextMaxChars: 9000,
    userAgent: 'ProductTeardownPlatformBot/0.1',
    ...options,
  };

  if (!productUrl) {
    return {
      sources: [],
      contextForPrompt: '',
      limitations: ['No product URL provided.'],
    };
  }

  let candidates;
  try {
    candidates = buildCandidates(productUrl);
  } catch (err) {
    return {
      sources: [],
      contextForPrompt: '',
      limitations: [err.message || 'Invalid product URL.'],
    };
  }

  const sources = [];
  const limitations = [];
  let remaining = merged.totalContextMaxChars;

  for (const candidate of candidates) {
    if (sources.length >= merged.maxSources) break;
    if (remaining <= 500) break;

    try {
      const { finalUrl, html } = await fetchHtmlWithLimitedRedirects(candidate, merged);
      const title = extractTitleFromHtml(html);
      const text = htmlToText(html);

      if (!text || text.length < 200) {
        limitations.push(`Low text content from ${finalUrl}`);
        continue;
      }

      const id = `src_${sources.length + 1}`;
      const type = inferSourceType(finalUrl);
      const clipped = text.slice(0, Math.min(text.length, merged.perSourceMaxChars, remaining));
      remaining -= clipped.length;

      sources.push({
        id,
        url: finalUrl,
        title: title || finalUrl,
        type,
        fetchedAt: new Date().toISOString(),
        snippet: clipped.slice(0, 320).replace(/\s+/g, ' ').trim(),
        _textForPrompt: clipped,
      });
    } catch (err) {
      limitations.push(`Failed to fetch ${candidate}: ${err.message || 'unknown error'}`);
    }
  }

  const contextLines = [];
  if (sources.length > 0) {
    contextLines.push(
      'EVIDENCE SOURCES (use as grounding context):',
      'You may use these sources to justify claims. If you use a fact from a source, add a citation like [src_1] at the end of the sentence.',
      'Do NOT invent citations. Only cite from the IDs provided below.',
      ''
    );

    for (const src of sources) {
      contextLines.push(
        `[${src.id}] ${src.type.toUpperCase()}: ${src.url}`,
        `Title: ${src.title}`,
        'Extract:',
        src._textForPrompt,
        ''
      );
    }
  }

  // Remove internal field before returning
  const publicSources = sources.map(({ _textForPrompt, ...rest }) => rest);

  return {
    sources: publicSources,
    contextForPrompt: contextLines.join('\n').trim(),
    limitations,
  };
}

module.exports = {
  ingestProductEvidence,
};


