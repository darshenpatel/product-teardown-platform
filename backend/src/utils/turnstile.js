const axios = require('axios');

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function hasTurnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && String(process.env.TURNSTILE_SECRET_KEY).trim());
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * @param {Object} params
 * @param {string} params.token - Turnstile response token from the client.
 * @param {string} [params.remoteip] - Optional user IP (helps Turnstile signals).
 * @returns {Promise<{success: boolean, errorCodes: string[]}>}
 */
async function verifyTurnstileToken({ token, remoteip }) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  const response = String(token || '').trim();

  if (!secret) {
    return { success: false, errorCodes: ['missing-secret'] };
  }
  if (!response) {
    return { success: false, errorCodes: ['missing-token'] };
  }

  const body = new URLSearchParams({
    secret,
    response,
    ...(remoteip ? { remoteip: String(remoteip) } : {}),
  });

  const { data } = await axios.post(TURNSTILE_VERIFY_URL, body.toString(), {
    timeout: Number.parseInt(process.env.TURNSTILE_TIMEOUT_MS, 10) || 5000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    validateStatus: (status) => status >= 200 && status < 500,
  });

  return {
    success: Boolean(data && data.success),
    errorCodes: Array.isArray(data?.['error-codes']) ? data['error-codes'] : [],
  };
}

module.exports = {
  hasTurnstileConfigured,
  verifyTurnstileToken,
};


