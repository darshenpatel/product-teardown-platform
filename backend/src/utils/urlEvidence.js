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

function removeTaggedBlocks(html, tags) {
  return tags.reduce((output, tag) => {
    const pattern = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi');
    return output.replace(pattern, ' ');
  }, html);
}

function removeLikelyBoilerplateContainers(html) {
  return html.replace(
    /<(div|section|aside)[^>]*(?:id|class)\s*=\s*["'][^"']*(?:cookie|consent|gdpr|banner|modal|newsletter|site-header|site-footer|navbar|navigation|topbar)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
    ' '
  );
}

function isBoilerplateLine(line) {
  const normalized = line.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return true;

  const exactMatches = new Set([
    'accept',
    'accept all',
    'all rights reserved',
    'cookie settings',
    'privacy policy',
    'terms of service',
    'terms and conditions',
    'skip to content',
  ]);
  if (exactMatches.has(normalized)) return true;

  return [
    /^copyright(?:\s|$)/,
    /^©/,
    /all rights reserved/,
    /we use cookies/,
    /cookie policy/,
    /manage cookies/,
    /your privacy choices/,
  ].some((pattern) => pattern.test(normalized));
}

function htmlToText(html) {
  if (!html) return '';

  let cleaned = html;

  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');
  cleaned = removeTaggedBlocks(cleaned, ['head', 'script', 'style', 'noscript', 'svg', 'header', 'footer', 'nav']);
  cleaned = removeLikelyBoilerplateContainers(cleaned);

  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(p|div|section|article|main|h[1-6]|li)>/gi, '\n');
  cleaned = cleaned.replace(/<li\b[^>]*>/gi, '\n- ');

  cleaned = cleaned.replace(/<\/?[^>]+>/g, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  const seenLines = new Set();
  const filteredLines = cleaned
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (isBoilerplateLine(line)) return false;
      const key = line.toLowerCase();
      if (seenLines.has(key)) return false;
      seenLines.add(key);
      return true;
    });

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function inferSourceType(url) {
  const lower = (url || '').toLowerCase();
  if (lower.includes('/pricing') || lower.includes('/plans')) return 'pricing';
  if (lower.includes('/features') || lower.includes('/solutions') || lower.includes('/use-cases')) return 'features';
  if (lower.includes('/docs') || lower.includes('/help') || lower.includes('/support')) return 'docs';
  if (
    lower.includes('/signup') ||
    lower.includes('/register') ||
    lower.includes('/trial') ||
    lower.includes('/demo') ||
    lower.includes('/contact-sales')
  ) return 'signup';
  if (lower.endsWith('/')) return 'homepage';
  return 'other';
}

function validateProductUrl(productUrl) {
  const base = new URL(productUrl);
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new Error('Only http/https URLs are allowed');
  }
  if (isLikelyPrivateHostname(base.hostname)) {
    throw new Error('URL hostname is not allowed');
  }

  return base;
}

function canonicalizeCandidateUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function isSameSiteCandidate(candidateUrl, allowedOrigins) {
  try {
    const candidate = new URL(candidateUrl);
    if (!['http:', 'https:'].includes(candidate.protocol)) return false;
    if (isLikelyPrivateHostname(candidate.hostname)) return false;

    return allowedOrigins.some((origin) => {
      const originUrl = new URL(origin);
      if (candidate.origin === originUrl.origin) return true;

      // Keep the existing www <-> apex tolerance without allowing protocol/port jumps.
      return (
        candidate.protocol === originUrl.protocol &&
        candidate.port === originUrl.port &&
        normalizeHostForWww(candidate.hostname) === normalizeHostForWww(originUrl.hostname)
      );
    });
  } catch {
    return false;
  }
}

function buildPriorityUrls(origin) {
  return [
    '/pricing',
    '/plans',
    '/features',
    '/solutions',
    '/use-cases',
    '/docs',
    '/help',
    '/support',
    '/signup',
    '/register',
    '/trial',
    '/demo',
    '/contact-sales',
    '/',
  ].map((path) => new URL(path, origin).toString());
}

function extractAnchorCandidates(html, pageUrl, allowedOrigins) {
  if (!html) return [];

  const links = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!hrefMatch) continue;

    const rawHref = decodeHtmlEntities(hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '').trim();
    if (!rawHref || rawHref.startsWith('#')) continue;
    if (/^(mailto|tel|javascript|data):/i.test(rawHref)) continue;

    let resolved;
    try {
      resolved = canonicalizeCandidateUrl(new URL(rawHref, pageUrl).toString());
    } catch {
      continue;
    }

    if (!isSameSiteCandidate(resolved, allowedOrigins)) continue;

    const linkText = htmlToText(match[2] || '').slice(0, 120);
    links.push({ url: resolved, linkText });
  }

  return links;
}

function scoreCandidate(url, linkText = '') {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 0;
  }

  const path = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const text = linkText.toLowerCase();
  const haystack = `${path} ${text}`;

  const scoredPatterns = [
    { pattern: /\/(pricing|prices|plans|billing|compare)(\/|$|\?)/, score: 120 },
    { pattern: /\/(features|product|solutions|use-cases|platform)(\/|$|\?)/, score: 105 },
    { pattern: /\/(docs|documentation|help|support|knowledge-base|resources)(\/|$|\?)/, score: 95 },
    { pattern: /\/(signup|sign-up|register|start|trial|demo|book-a-demo|contact-sales)(\/|$|\?)/, score: 90 },
    { pattern: /\/(customers|case-studies|security|integrations|enterprise)(\/|$|\?)/, score: 70 },
    { pattern: /\/(about|company)(\/|$|\?)/, score: 35 },
  ];

  let score = path === '/' || path === '' ? 15 : 45;
  for (const { pattern, score: patternScore } of scoredPatterns) {
    if (pattern.test(haystack)) {
      score = Math.max(score, patternScore);
    }
  }

  if (/\/(blog|careers|jobs|press|privacy|terms|legal|login|signin|sign-in|status)(\/|$|\?)/.test(path)) {
    score -= 45;
  }

  return score;
}

function addCandidate(candidateMap, url, metadata = {}) {
  const canonical = canonicalizeCandidateUrl(url);
  if (!canonical || candidateMap.has(canonical)) return;

  candidateMap.set(canonical, {
    url: canonical,
    linkText: metadata.linkText || '',
    order: candidateMap.size,
    score: scoreCandidate(canonical, metadata.linkText || ''),
  });
}

function buildSourceDraft(finalUrl, html, remaining, options) {
  const title = extractTitleFromHtml(html);
  const text = htmlToText(html);

  if (!text || text.length < 200) {
    return {
      source: null,
      limitation: `Low text content from ${finalUrl}`,
    };
  }

  const clipped = text.slice(0, Math.min(text.length, options.perSourceMaxChars, remaining));

  return {
    source: {
      url: finalUrl,
      title: title || finalUrl,
      type: inferSourceType(finalUrl),
      _textForPrompt: clipped,
    },
    limitation: null,
  };
}

function buildSeedUrls(base) {
  const seeds = [
    base.toString(),
    new URL('/', base.origin).toString(),
  ];

  const seen = new Set();
  return seeds.filter((u) => {
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
  let baseUrl;
  try {
    baseUrl = validateProductUrl(productUrl);
  } catch (err) {
    return {
      sources: [],
      contextForPrompt: '',
      limitations: [err.message || 'Invalid product URL.'],
    };
  }

  const allowedOrigins = new Set([baseUrl.origin]);
  const candidateMap = new Map();
  const fetchedDrafts = new Map();
  const sources = [];
  const limitations = [];
  let remaining = merged.totalContextMaxChars;

  for (const priorityUrl of buildPriorityUrls(baseUrl.origin)) {
    addCandidate(candidateMap, priorityUrl);
  }

  candidates = buildSeedUrls(baseUrl);
  for (const seedUrl of candidates) {
    addCandidate(candidateMap, seedUrl);

    try {
      const { finalUrl, html } = await fetchHtmlWithLimitedRedirects(seedUrl, merged);
      const final = new URL(finalUrl);
      allowedOrigins.add(final.origin);

      for (const priorityUrl of buildPriorityUrls(final.origin)) {
        if (isSameSiteCandidate(priorityUrl, Array.from(allowedOrigins))) {
          addCandidate(candidateMap, priorityUrl);
        }
      }

      const canonicalFinal = canonicalizeCandidateUrl(finalUrl);
      const canonicalSeed = canonicalizeCandidateUrl(seedUrl);
      const draft = buildSourceDraft(finalUrl, html, remaining, merged);
      if (draft.limitation) limitations.push(draft.limitation);
      fetchedDrafts.set(canonicalFinal, draft.source);
      fetchedDrafts.set(canonicalSeed, draft.source);

      for (const link of extractAnchorCandidates(html, finalUrl, Array.from(allowedOrigins))) {
        addCandidate(candidateMap, link.url, { linkText: link.linkText });
      }
    } catch (err) {
      limitations.push(`Failed to fetch ${seedUrl}: ${err.message || 'unknown error'}`);
    }
  }

  const rankedCandidates = Array.from(candidateMap.values())
    .filter((candidate) => isSameSiteCandidate(candidate.url, Array.from(allowedOrigins)))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });

  for (const candidate of rankedCandidates) {
    if (sources.length >= merged.maxSources) break;
    if (remaining <= 500) break;

    try {
      const canonical = canonicalizeCandidateUrl(candidate.url);
      let sourceDraft = fetchedDrafts.get(canonical);

      if (sourceDraft === undefined) {
        const { finalUrl, html } = await fetchHtmlWithLimitedRedirects(candidate.url, merged);
        const draft = buildSourceDraft(finalUrl, html, remaining, merged);
        if (draft.limitation) {
          limitations.push(draft.limitation);
          fetchedDrafts.set(canonical, null);
          continue;
        }
        sourceDraft = draft.source;
        fetchedDrafts.set(canonical, sourceDraft);
        fetchedDrafts.set(canonicalizeCandidateUrl(sourceDraft.url), sourceDraft);
      }

      if (!sourceDraft) continue;

      const id = `src_${sources.length + 1}`;
      remaining -= sourceDraft._textForPrompt.length;

      sources.push({
        id,
        url: sourceDraft.url,
        title: sourceDraft.title,
        type: sourceDraft.type,
        fetchedAt: new Date().toISOString(),
        snippet: sourceDraft._textForPrompt.slice(0, 320).replace(/\s+/g, ' ').trim(),
        _textForPrompt: sourceDraft._textForPrompt,
      });
    } catch (err) {
      limitations.push(`Failed to fetch ${candidate.url}: ${err.message || 'unknown error'}`);
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
