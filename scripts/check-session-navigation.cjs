const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const next = require('next/server');
const jose = require('jose');
(async () => {
  const key = 'isolated-session-navigation-fixture-key-not-used-in-the-application';
  const output = ts.transpileModule(fs.readFileSync('src/proxy.ts', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { exports: mod.exports, TextEncoder, URL,
    process: { env: { NEXT_JWT_ACCESS_SECRET: key } }, require: name => {
      if (name === 'next/server') return next;
      if (name === 'jose') return jose;
      if (name === 'next-intl/middleware') return () => () => next.NextResponse.next();
      if (name === '@/i18n/config') return { isLocale: value => ['vi', 'en'].includes(value) };
      if (name === '@/i18n/routing') return { routing: {} };
      throw new Error('Unexpected import');
    } });
  const token = await new jose.SignJWT({ role: 'STUDENT', sid: 'fixture-session', token_use: 'access' })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(new TextEncoder().encode(key));
  const send = (path, cookie) => mod.exports.proxy(new next.NextRequest('http://localhost:3000' + path,
    cookie ? { headers: { cookie: 'access_token=' + cookie } } : {}));
  const missing = await send('/vi/exam/fixture?practice=true');
  const recovery = new URL(missing.headers.get('location'));
  assert.equal(recovery.pathname, '/vi/auth/session-recovery');
  assert.equal(recovery.searchParams.get('returnTo'), '/vi/exam/fixture?practice=true');
  assert.equal(missing.headers.get('set-cookie'), null);
  assert.equal((await send('/en/auth/session-transfer', token)).status, 200);
  assert.equal((await send('/vi/auth/session-recovery')).status, 200);
  assert.equal((await send('/vi/login?reauth=1', token)).status, 200);
  assert.equal(new URL((await send('/vi/login', token)).headers.get('location')).pathname, '/vi/home');
  assert.equal(new URL((await send('/vi/lecturer', token)).headers.get('location')).pathname, '/vi/home');
  assert.equal((await send('/vi/home', token)).status, 200);
  for (const claims of [
    { role: 'STUDENT', token_use: 'access' },
    { role: 'STUDENT', sid: 123, token_use: 'access' },
    { role: 'STUDENT', sid: 'fixture-session' },
    { role: 'STUDENT', sid: 'fixture-session', token_use: 'refresh' },
    ...[undefined, null, 123, [], {}, 'UNKNOWN', 'student', 'constructor', 'toString', '__proto__']
      .map(role => ({ role, sid: 'fixture-session', token_use: 'access' })),
  ]) {
    const invalid = await new jose.SignJWT(claims).setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m').sign(new TextEncoder().encode(key));
    assert.equal(new URL((await send('/vi/home', invalid)).headers.get('location')).pathname, '/vi/auth/session-recovery');
    assert.equal((await send('/vi/login', invalid)).status, 200);
  }
  for (const [role, home] of [['ADMIN', '/dashboard'], ['LECTURER', '/lecturer'], ['STUDENT', '/home']]) {
    const valid = await new jose.SignJWT({ role, sid: 'fixture-session', token_use: 'access' })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(new TextEncoder().encode(key));
    assert.equal((await send('/vi' + home, valid)).status, 200);
    assert.equal(new URL((await send('/vi/login', valid)).headers.get('location')).pathname, '/vi' + home);
    const otherHome = role === 'ADMIN' ? '/lecturer' : '/dashboard';
    assert.equal(new URL((await send('/vi' + otherHome, valid)).headers.get('location')).pathname, '/vi' + home);
  }
  for (const invalid of [
    'malformed-token',
    await new jose.SignJWT({ role: 'STUDENT', sid: 'fixture-session', token_use: 'access' })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m')
      .sign(new TextEncoder().encode('different-isolated-fixture-signing-key')),
    await new jose.SignJWT({ role: 'STUDENT', sid: 'fixture-session', token_use: 'access' })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1)
      .sign(new TextEncoder().encode(key)),
  ]) {
    assert.equal(new URL((await send('/vi/home', invalid)).headers.get('location')).pathname, '/vi/auth/session-recovery');
  }
  console.log('PASS: navigation, valid-role homes, invalid/inherited role recovery and JWT rejection; real NextRequest/jose, isolated i18n, zero network calls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
