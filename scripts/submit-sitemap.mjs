#!/usr/bin/env node
/**
 * Submits the sitemap to the Google Search Console API.
 *
 * Zero-dependency: signs a service-account JWT with Node's built-in crypto,
 * exchanges it for an OAuth access token, then PUTs the sitemap.
 *
 * Usage:
 *   GSC_SA_KEY='<service-account-json>' node scripts/submit-sitemap.mjs
 *
 * Env:
 *   GSC_SA_KEY  (required) full service-account JSON key (string)
 *   SITE_URL    (optional) Search Console property, default 'https://conjuexpert.app/'
 *               For a Domain property use 'sc-domain:conjuexpert.app'
 *   SITEMAP_URL (optional) full sitemap URL, default '<SITE>/sitemap.xml'
 */

import crypto from 'crypto';

const SITE_URL = process.env.SITE_URL || 'https://conjuexpert.app/';
const SITEMAP_URL = process.env.SITEMAP_URL || 'https://conjuexpert.app/sitemap.xml';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256')
    .update(signingInput)
    .sign(sa.private_key, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) fail(`Token request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) fail(`No access_token in response: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  const raw = process.env.GSC_SA_KEY;
  if (!raw) fail('GSC_SA_KEY env var is not set.');

  let sa;
  try {
    sa = JSON.parse(raw);
  } catch (e) {
    fail(`GSC_SA_KEY is not valid JSON: ${e.message}`);
  }
  if (!sa.client_email || !sa.private_key) {
    fail('GSC_SA_KEY is missing client_email / private_key.');
  }

  console.log(`→ Property : ${SITE_URL}`);
  console.log(`→ Sitemap  : ${SITEMAP_URL}`);
  console.log(`→ Account  : ${sa.client_email}`);

  const token = await getAccessToken(sa);

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  // GSC returns 204 No Content on success.
  if (res.status === 204 || res.ok) {
    console.log('✓ Sitemap submitted to Google Search Console.');
    return;
  }
  fail(`Submit failed (${res.status}): ${await res.text()}`);
}

main().catch((e) => fail(e.stack || String(e)));
