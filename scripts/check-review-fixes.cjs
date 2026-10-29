const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");

function load(file, overrides) {
  const filename = path.resolve(__dirname, "..", file);
  const fixture = new Module(filename, module);
  fixture.paths = module.paths;
  fixture.require = (name) => name in overrides ? overrides[name] : require(name);
  fixture._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return fixture.exports.default;
}

function hooks() {
  const slots = [];
  let cursor = 0;
  let pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (value, deps) => {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) slots[index] = { value, deps };
    return slots[index].value;
  };
  return {
    react: { ...React, use: (value) => value,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = value; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useCallback: memo,
      useEffect(effect, deps) {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) {
          pending.push(() => {
            slots[index]?.cleanup?.();
            slots[index] = { deps, cleanup: effect() };
          });
        }
      },
    },
    render(component, props) {
      cursor = 0;
      pending = [];
      const tree = component(props);
      pending.forEach((effect) => effect());
      return tree;
    },
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
  };
}

const translation = (key) => key;
const common = {
  "next-intl": { useTranslations: () => translation },
  "@/components/ui/button": { Button: "Button" },
  "@/constants/endpoints": { ENDPOINTS: { AUTH: { SESSION_TRANSFERS: "/transfers" },
    SUBMISSIONS: { DETAIL: (id) => `/submissions/${id}` } } },
};
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)];
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const failure = (status) => ({ isAxiosError: true, response: status ? { status } : undefined });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function transfers() {
  const request = { id: "transfer", approved_at: null, user: { id: "student", full_name: "Fixture" } };
  for (const status of [undefined, 400, 401, 403, 404, 409, 422, 500]) {
    let poll;
    global.window = { setInterval: (callback) => { poll = callback; return 1; }, clearInterval() {} };
    const runner = hooks();
    let rejectLoad = false;
    const api = { get: async () => {
      if (rejectLoad) throw failure(status);
      return { data: [request] };
    } };
    const Panel = load("src/components/common/SessionTransferPanel.tsx", {
      ...common, react: runner.react, "@/lib/api-client": api,
    });
    runner.render(Panel, {});
    await flush();
    rejectLoad = true;
    poll();
    await flush();
    const tree = runner.render(Panel, {});
    const alert = nodes(tree).find((node) => node.props.role === "alert");
    assert.equal(alert?.props.children, status === 403 ? "forbidden" : "networkError", `load ${status}`);
    assert.equal(nodes(tree).filter((node) => node.type === "Button").length, status === 403 ? 0 : 1);
    runner.unmount();
  }
  for (const status of [undefined, 400, 401, 403, 404, 409, 422, 500]) {
    const runner = hooks();
    let loads = 0;
    const Panel = load("src/components/common/SessionTransferPanel.tsx", {
      ...common, react: runner.react, "@/lib/api-client": {
        get: async () => { loads++; return { data: [request] }; },
        post: async () => { throw failure(status); },
      },
    });
    runner.render(Panel, {});
    await flush();
    let tree = runner.render(Panel, {});
    nodes(tree).find((node) => node.type === "Button").props.onClick();
    tree = runner.render(Panel, {});
    const dialog = nodes(tree).find((node) => node.props.role === "alertdialog");
    nodes(dialog).find((node) => node.type === "Button").props.onClick();
    await flush();
    tree = runner.render(Panel, {});
    const alert = nodes(tree).find((node) => node.props.role === "alert");
    assert.equal(alert?.props.children, status === 409 ? undefined : status === 403 ? "forbidden" : "networkError", `approve ${status}`);
    assert.equal(loads, status === 409 ? 2 : 1);
    runner.unmount();
  }
}

async function results() {
  const runner = hooks();
  let socket = null;
  const calls = [];
  const Page = load("src/app/[locale]/(student)/result/[id]/page.tsx", {
    ...common, react: runner.react,
    "@/lib/api-client": { get: (url, config) => {
      const request = { ...deferred(), url, signal: config.signal };
      calls.push(request);
      return request.promise;
    } },
    "@/i18n/navigation": { useRouter: () => ({}) },
    "@/store/hook": { useAppSelector: (select) => select({ user: { id: "student", role: "STUDENT" } }) },
    "@/components/providers/SocketProvider": { useSocket: () => ({ socket }) },
    "@/components/ui/card": { Card: "Card", CardContent: "CardContent", CardHeader: "CardHeader" },
    "@/components/ui/badge": { Badge: "Badge" },
    "@/components/common/student/sidebar": { default: "Sidebar" },
    "@/components/common/student/menu": { default: "Menu" },
    "@/components/MathRenderer": { MathRenderer: "MathRenderer" },
    "@/lib/exam-utils": { calculateTotalQuesions: () => 0, parseOptions: () => [] },
  });
  const makeSocket = () => {
    const listeners = new Map();
    return { on: (event, fn) => listeners.set(event, fn),
      off: (event, fn) => { if (listeners.get(event) === fn) listeners.delete(event); }, listeners };
  };
  const data = (title) => ({ student_id: "student", total_score: 5, exam: { title, practice: false } });
  const render = (id = "one") => runner.render(Page, { params: { id } });
  const hasTitle = (tree, title) => nodes(tree).some((node) => node.type === "h1" && node.props.children === title);
  render();
  assert.equal(calls.length, 1);
  socket = makeSocket();
  render();
  assert.equal(calls.length, 1, "Socket connection must not trigger initial loading again");
  assert.equal(calls[0].signal.aborted, false);
  calls[0].resolve({ data: data("Initial") });
  await flush();
  assert.ok(hasTitle(render(), "Initial"));
  const oldSocket = socket;
  socket = makeSocket();
  assert.ok(hasTitle(render(), "Initial"));
  assert.equal(oldSocket.listeners.size, 0);
  assert.equal(calls.length, 1, "Replacing a socket must preserve loaded data");
  const notify = (id = "one", type = "SUBMISSION") => socket.listeners.get("notification:new")({ target_id: id, target_type: type });
  notify("other");
  notify("one", "EXAM");
  assert.equal(calls.length, 1);
  notify();
  assert.ok(hasTitle(render(), "Initial"), "Background refresh must not blank the page");
  const refreshingSocket = socket;
  socket = makeSocket();
  render();
  assert.equal(refreshingSocket.listeners.size, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].signal.aborted, false, "Socket changes must not cancel background requests");
  notify();
  assert.equal(calls[1].signal.aborted, true);
  calls[2].resolve({ data: data("Newest") });
  await flush();
  calls[1].resolve({ data: data("Stale") });
  await flush();
  assert.ok(hasTitle(render(), "Newest"), "Generation guard must discard stale responses");
  notify();
  calls[3].reject(new Error("Fixture offline"));
  await flush();
  assert.ok(hasTitle(render(), "Newest"), "Background failures must retain loaded data");
  notify();
  render("two");
  assert.equal(calls[4].signal.aborted, true, "Changing IDs cancels old requests");
  assert.equal(calls[5].url, "/submissions/two");
  calls[5].resolve({ data: data("Second") });
  calls[4].resolve({ data: data("Old ID") });
  await flush();
  assert.ok(hasTitle(render("two"), "Second"));
  notify("one");
  assert.equal(calls.length, 6, "Old-ID notifications must be ignored");
  notify("two");
  runner.unmount();
  assert.equal(calls[6].signal.aborted, true);
  assert.equal(socket.listeners.size, 0);
  calls[6].resolve({ data: data("Unmounted") });
  await flush();
}

(async () => {
  await transfers();
  await results();
  console.log("PASS: transfer load/approval errors, 403/network/409 behavior, socket-only resubscription, notification filtering, background refresh, stale generations, ID changes and unmount cancellation. Uses synthetic hooks/API/socket; no live backend/browser.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
