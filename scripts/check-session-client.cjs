const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const axios = require('axios');
const { AxiosError } = axios;
(async () => {
  let refreshCalls = 0, ready = false, failure = null;
  const redirects = [];
  axios.defaults.adapter = async config => {
    const path = new URL(config.url, config.baseURL || 'http://localhost:3001').pathname;
    if (path === '/auth/refresh') {
      refreshCalls += 1;
      await Promise.resolve();
      if (failure === 'network') throw new AxiosError('Fixture offline', 'ERR_NETWORK', config);
      if (failure === '401') throw new AxiosError('Fixture expired', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, headers: {}, config });
      if (failure === '503') throw new AxiosError('Fixture unavailable', 'ERR_BAD_RESPONSE', config, null, { status: 503, data: {}, headers: {}, config });
      ready = true;
      return { status: 200, data: {}, headers: {}, config };
    }
    if (!ready) throw new AxiosError('Fixture access expired', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, headers: {}, config });
    return { status: 200, data: { id: 'fixture' }, headers: {}, config };
  };
  const mod = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync('src/lib/api-client.ts', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(output, { exports: mod.exports, URL, process: { env: {} },
    window: { location: { pathname: '/vi/home', replace: path => redirects.push(path) } },
    require: name => {
      if (name === 'axios') return axios;
      if (name === '@/constants/routes') return { ROUTES: { LOGIN: '/login' } };
      if (name === '@/constants/endpoints') return { ENDPOINTS: { AUTH: { REFRESH: '/auth/refresh', SESSION_TRANSFER: '/auth/session-transfer' } } };
      if (name === '@/i18n/config') return { defaultLocale: 'vi', isLocale: value => ['vi', 'en'].includes(value) };
      throw new Error('Unexpected import');
    } });
  const client = mod.exports.default;
  await Promise.all([client.get('/auth/me'), client.get('/exams')]);
  assert.equal(refreshCalls, 1);
  ready = false;
  await client.get('/auth/session-transfers');
  assert.equal(refreshCalls, 2);
  for (const kind of ['network', '503']) {
    ready = false; failure = kind;
    await assert.rejects(client.get('/auth/me'));
    assert.equal(redirects.length, 0);
  }
  ready = false; failure = '401';
  await assert.rejects(client.get('/auth/me'));
  assert.deepEqual(redirects, ['/vi/login?reauth=1']);
  failure = null;
  await client.get('/auth/me');
  assert.equal(ready, true);
  console.log('PASS: concurrent refresh shares one request; network/503 preserve session; terminal 401 redirects; later refresh can recover. Axios uses an in-memory adapter, no live service/browser.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
