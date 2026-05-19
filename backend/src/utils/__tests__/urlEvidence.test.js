jest.mock('axios');

const axios = require('axios');
const { ingestProductEvidence } = require('../urlEvidence');

function page(title, body) {
  return `<!doctype html>
    <html>
      <head><title>${title}</title></head>
      <body>${body}</body>
    </html>`;
}

function repeatedCopy(sentence, count = 12) {
  return Array.from({ length: count }, (_, index) => `<p>${sentence} Detail ${index + 1}.</p>`).join('');
}

function htmlResponse(data, headers = {}) {
  return {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...headers,
    },
    data,
  };
}

describe('urlEvidence', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('discovers same-origin links and ranks evidence pages ahead of the homepage', async () => {
    const homepage = page(
      'Example Product',
      `
        <header><a href="/pricing">Pricing</a><a href="/features">Features</a></header>
        <main>
          <h1>Example Product</h1>
          <a href="/features">Feature tour</a>
          <a href="/pricing">Pricing</a>
          <a href="https://external.example/pricing">External pricing</a>
          <a href="http://127.0.0.1/private">Private host</a>
          ${repeatedCopy('Example Product helps teams inspect user feedback, prioritize roadmap bets, and align launches with customer evidence.')}
        </main>
      `
    );

    const pricing = page(
      'Pricing',
      `<main>${repeatedCopy('Pricing includes a starter plan, a growth plan, and an enterprise plan with evidence review workflows.')}</main>`
    );

    const features = page(
      'Features',
      `<main>${repeatedCopy('Features include teardown capture, source-backed analysis, collaboration notes, and launch recommendation summaries.')}</main>`
    );

    axios.get.mockImplementation(async (url) => {
      if (url === 'https://example.com/') return htmlResponse(homepage);
      if (url === 'https://example.com/pricing') return htmlResponse(pricing);
      if (url === 'https://example.com/features') return htmlResponse(features);
      throw new Error(`not found: ${url}`);
    });

    const result = await ingestProductEvidence('https://example.com/', {
      maxSources: 2,
      perSourceMaxChars: 1000,
    });

    expect(result.sources.map((source) => source.url)).toEqual([
      'https://example.com/pricing',
      'https://example.com/features',
    ]);
    expect(result.sources.map((source) => source.type)).toEqual(['pricing', 'features']);
    expect(result.sources[0]).not.toHaveProperty('_textForPrompt');
    expect(result.contextForPrompt).toContain('[src_1] PRICING: https://example.com/pricing');
    expect(axios.get).not.toHaveBeenCalledWith(
      'http://127.0.0.1/private',
      expect.anything()
    );
  });

  it('filters common boilerplate out of extracted evidence text', async () => {
    const pricing = page(
      'Pricing &amp; Plans',
      `
        <nav>Home Pricing Features Login</nav>
        <div class="cookie-banner">We use cookies. Accept all Cookie settings</div>
        <main>
          <h1>Pricing built for product research</h1>
          ${repeatedCopy('The growth plan includes unlimited teardowns, evidence-backed recommendations, team review queues, and exportable summaries.')}
        </main>
        <footer>Copyright 2026 Example Inc. All rights reserved. Privacy Policy</footer>
      `
    );

    axios.get.mockImplementation(async (url) => {
      if (url === 'https://example.com/pricing') return htmlResponse(pricing);
      if (url === 'https://example.com/') return htmlResponse(page('Home', '<main></main>'));
      throw new Error(`not found: ${url}`);
    });

    const result = await ingestProductEvidence('https://example.com/pricing', {
      maxSources: 1,
      perSourceMaxChars: 1200,
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      url: 'https://example.com/pricing',
      title: 'Pricing & Plans',
      type: 'pricing',
    });
    expect(result.contextForPrompt).toContain('Pricing built for product research');
    expect(result.contextForPrompt).not.toContain('Home Pricing Features Login');
    expect(result.contextForPrompt).not.toContain('We use cookies');
    expect(result.contextForPrompt).not.toContain('All rights reserved');
  });

  it('blocks redirects to private hosts', async () => {
    axios.get.mockImplementation(async (url) => {
      if (url === 'https://example.com/') {
        return {
          status: 302,
          headers: {
            location: 'http://127.0.0.1/private',
          },
          data: '',
        };
      }
      throw new Error(`not found: ${url}`);
    });

    const result = await ingestProductEvidence('https://example.com/', {
      maxSources: 1,
    });

    expect(result.sources).toEqual([]);
    expect(result.contextForPrompt).toBe('');
    expect(result.limitations.some((item) => item.includes('Blocked redirect to http://127.0.0.1/private'))).toBe(true);
    expect(axios.get).not.toHaveBeenCalledWith(
      'http://127.0.0.1/private',
      expect.anything()
    );
  });

  it('rejects private input URLs before fetching', async () => {
    const result = await ingestProductEvidence('http://localhost:3000', {
      maxSources: 1,
    });

    expect(result).toEqual({
      sources: [],
      contextForPrompt: '',
      limitations: ['URL hostname is not allowed'],
    });
    expect(axios.get).not.toHaveBeenCalled();
  });
});
