const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");

function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const fixture = new Module(filename, module);
  fixture.paths = module.paths;
  fixture.require = (name) => name in overrides ? overrides[name] : require(name);
  fixture._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return fixture.exports;
}

const helpers = load("src/lib/regrading.ts");
const endpoints = load("src/constants/endpoints.ts");
const { validateRegradeScores, regradeValues, regradeTotal, regradeOptions } = helpers;
assert.deepEqual(validateRegradeScores(["a", "b"], { a: "0", b: "100" }), [
  { submission_question_id: "a", score: 0 }, { submission_question_id: "b", score: 1 },
]);
for (const value of ["", "-1", "101", "0.5", "NaN", "Infinity", "1e2", " ", "1000"]) {
  assert.equal(validateRegradeScores(["a"], { a: value }), null, value);
}
assert.equal(validateRegradeScores([], {}), null);
assert.equal(validateRegradeScores(["a", "a"], { a: "10" }), null);
assert.equal(validateRegradeScores(["a", "b"], { a: "10" }), null);
assert.equal(validateRegradeScores(["a"], { a: "10", other: "20" }), null);
assert.equal(validateRegradeScores(["a"], { other: "20" }), null);
assert.equal(regradeTotal([1, 1, 1].map((score, id) => ({ submission_question_id: String(id), score }))), 10);
assert.equal(regradeTotal([1, 0, 0].map((score, id) => ({ submission_question_id: String(id), score }))), 10 / 3);
assert.deepEqual(regradeOptions("bad JSON"), []);
assert.deepEqual(regradeOptions('{"text":"not an array"}'), []);
assert.deepEqual(regradeOptions('[null,3,{"text":"A","isCorrect":true},{"text":"B","isCorrect":"true"}]'), [
  { text: "A", isCorrect: true }, { text: "B", isCorrect: false },
]);

function workspace({ revision = 1, published = null, grade = 0, draft = true } = {}) {
  return {
    submission: {
      id: "submission", grading_revision: grade, total_score: grade ? 7.5 : 5,
      exam: { id: "exam", title: "Exam" }, student: { full_name: "Candidate" },
      questions: ["ESSAY", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "SINGLE_CHOICE"].map((type, i) => ({
        id: `q${i}`, score: 0.5, answer: "answer", options: null,
        question: { id: `bank${i}`, question_type: type, question_text: "Question", options: null, correct_answer: "key" },
      })),
    },
    draft: draft ? {
      revision, base_grade_revision: grade, published_revision: published,
      scores: [0.25, 0.5, 0.75, 1].map((score, i) => ({ submission_question_id: `q${i}`, score })), reason: "Saved reason",
    } : null,
    history: [],
  };
}
assert.deepEqual(regradeValues(workspace()), { q0: "25", q1: "50", q2: "75", q3: "100" });
assert.deepEqual(regradeValues(workspace({ draft: false })), { q0: "50", q1: "50", q2: "50", q3: "50" });

function hooks() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    react: {
      ...React,
      use: (value) => value,
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
      },
      useRef: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useCallback: (callback, deps) => {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) slots[index] = { deps, callback };
        return slots[index].callback;
      },
      useEffect: (effect, deps) => {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) {
          slots[index]?.cleanup?.();
          slots[index] = { deps };
          effects.push(() => { slots[index].cleanup = effect(); });
        }
      },
    },
    render: (component, props) => {
      cursor = 0;
      effects = [];
      const tree = component(props);
      effects.forEach((effect) => effect());
      return tree;
    },
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
    snapshot: () => slots,
  };
}
const windowEvents = new Map();
global.window = { location: { href: "http://localhost/grade" }, confirm: () => false,
  addEventListener: (event, fn) => windowEvents.set(event, fn), removeEventListener: (event) => windowEvents.delete(event) };
global.document = { addEventListener: () => {}, removeEventListener: () => {} };
const translation = (key) => key;
const intl = { useTranslations: () => translation, useFormatter: () => ({ number: String, dateTime: String }) };
const ui = {};
for (const [file, names] of Object.entries({
  button: ["Button"], card: ["Card", "CardContent", "CardHeader", "CardTitle"], badge: ["Badge"], input: ["Input"], label: ["Label"], textarea: ["Textarea"],
  "alert-dialog": ["AlertDialog", "AlertDialogAction", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogFooter", "AlertDialogHeader", "AlertDialogTitle"],
})) ui[`@/components/ui/${file}`] = Object.fromEntries(names.map((name) => [name, name]));
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)];
}
const find = (tree, type, predicate = () => true) => {
  const result = nodes(tree).find((node) => node.type === type && predicate(node.props));
  assert.ok(result, `Missing ${type}`);
  return result.props;
};
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

async function main() {
  const { renderToStaticMarkup } = require("react-dom/server");
  const { RegradeQuestion } = load("src/components/regrading/RegradeQuestion.tsx", {
    "next-intl": intl, "@/lib/regrading": helpers,
    "@/components/ui/badge": { Badge: ({ children }) => React.createElement("span", null, children) },
    "@/components/MathRenderer": { MathRenderer: ({ content }) => React.createElement("div", null, content) },
  });
  for (const item of workspace().submission.questions) {
    const rendered = renderToStaticMarkup(React.createElement(RegradeQuestion, { item: {
      ...item, answer: "Candidate response", options: '[{"text":"A","isCorrect":true}]',
      question: { ...item.question, question_text: "<script>unsafe()</script>", correct_answer: "Model answer", options: '[{"text":"A","isCorrect":false},{"text":"B","isCorrect":true}]',
        files: [{ order: 0, file: { id: "file", name: "Diagram", type: "IMAGE", url: "https://example.invalid/diagram" } }] },
    } }));
    assert.ok(rendered.includes("Candidate response"));
    assert.ok(rendered.includes("Model answer"));
    assert.ok(rendered.includes("selected"));
    assert.ok(rendered.includes("Diagram"));
    assert.ok(rendered.includes("&lt;script&gt;"));
    assert.ok(!rendered.includes("<script>"));
  }
  const calls = [];
  const queue = [];
  const api = Object.fromEntries(["get", "put", "post"].map((method) => [method, (...args) => {
    calls.push({ method, args });
    const next = queue.shift();
    assert.ok(next, `Unexpected ${method}`);
    return next.promise;
  }]));
  const runner = hooks();
  const navigated = [];
  const { RegradeWorkspace } = load("src/components/regrading/RegradeWorkspace.tsx", {
    react: runner.react, "next-intl": intl, ...ui,
    "@/i18n/navigation": { useRouter: () => ({ push: (url) => navigated.push(url) }) },
    "@/lib/api-client": { __esModule: true, default: api },
    "@/constants/endpoints": endpoints, "@/lib/regrading": helpers,
    "@/i18n/useEnumLabels": { useEnumLabels: () => ({ questionType: String }) },
    "./RegradeQuestion": { RegradeQuestion: "Question" },
  });
  const render = () => runner.render(RegradeWorkspace, { examId: "exam", submissionId: "submission" });
  const initial = deferred(); queue.push(initial);
  let tree = render();
  assert.equal(calls[0].args[0], "/submission/submission/regrade");
  initial.resolve({ data: workspace() }); await flush(); tree = render();
  assert.equal(find(tree, "Input", (p) => p.id === "score-q0").value, "25");
  assert.equal(find(tree, "Textarea").value, "Saved reason");
  const publishButton = (view) => find(view, "Button", (p) => p.type === "button" && p.children === "publish");
  const saveButton = (view) => find(view, "Button", (p) => p.type === "submit");
  assert.equal(publishButton(tree).disabled, false);
  assert.equal(saveButton(tree).disabled, true);
  find(tree, "Input", (p) => p.id === "score-q0").onChange({ target: { value: "101" } }); tree = render();
  assert.equal(publishButton(tree).disabled, true);
  assert.equal(saveButton(tree).disabled, true);
  find(tree, "Input", (p) => p.id === "score-q0").onChange({ target: { value: "50" } }); tree = render();
  assert.equal(saveButton(tree).disabled, false);
  assert.ok(windowEvents.has("beforeunload"));
  const saved = workspace({ revision: 2 }); saved.draft.scores[0].score = 0.5;
  const save = deferred(); queue.push(save);
  const submit = find(tree, "form").onSubmit;
  submit({ preventDefault() {} }); submit({ preventDefault() {} });
  assert.equal(calls.filter((call) => call.method === "put").length, 1);
  assert.deepEqual(calls.at(-1).args[1], { expected_revision: 1, expected_grade_revision: 0, scores: saved.draft.scores, reason: "Saved reason" });
  save.resolve({ data: saved }); await flush(); tree = render();
  assert.equal(saveButton(tree).disabled, true);
  publishButton(tree).onClick(); tree = render();
  assert.equal(find(tree, "AlertDialog").open, true);
  assert.equal(calls.filter((call) => call.method === "post").length, 0);
  const publication = deferred(); queue.push(publication);
  const confirm = find(tree, "AlertDialogAction").onClick;
  confirm({ preventDefault() {} }); confirm({ preventDefault() {} });
  assert.equal(calls.filter((call) => call.method === "post").length, 1);
  assert.deepEqual(calls.at(-1).args[1], { revision: 2 });
  const published = workspace({ revision: 2, published: 2, grade: 1 });
  published.draft.scores[0].score = 0.5;
  publication.resolve({ data: published }); await flush(); tree = render();
  assert.equal(publishButton(tree).disabled, true);
  find(tree, "Input", (p) => p.id === "score-q0").onChange({ target: { value: "80" } }); tree = render();
  find(tree, "Textarea").onChange({ target: { value: "" } }); tree = render();
  const conflict = deferred(); queue.push(conflict);
  find(tree, "form").onSubmit({ preventDefault() {} });
  assert.equal(calls.at(-1).args[1].reason, "");
  assert.equal(calls.at(-1).args[1].expected_grade_revision, 1);
  conflict.reject({ isAxiosError: true, response: { status: 409 } }); await flush(); tree = render();
  assert.equal(find(tree, "Input", (p) => p.id === "score-q0").value, "80");
  assert.equal(find(tree, "Textarea").value, "");
  assert.equal(saveButton(tree).disabled, true);
  assert.equal(publishButton(tree).disabled, true);
  const countBeforeReload = calls.length;
  find(tree, "Button", (p) => p.children === "reload").onClick(); tree = render();
  assert.equal(calls.length, countBeforeReload);
  assert.equal(find(tree, "AlertDialog").open, true);
  const reload = deferred(); queue.push(reload);
  find(tree, "AlertDialogAction").onClick({ preventDefault() {} });
  reload.reject(new Error("offline")); await flush(); tree = render();
  assert.equal(find(tree, "Input", (p) => p.id === "score-q0").value, "80");
  assert.equal(saveButton(tree).disabled, true);
  find(tree, "Button", (p) => p.children === "reload").onClick(); tree = render();
  const afterReload = deferred(); queue.push(afterReload);
  find(tree, "AlertDialogAction").onClick({ preventDefault() {} });
  afterReload.resolve({ data: workspace({ revision: 3, grade: 1 }) }); await flush(); tree = render();
  assert.equal(find(tree, "Input", (p) => p.id === "score-q0").value, "25");
  assert.equal(publishButton(tree).disabled, false);
  queue.push({ promise: Promise.resolve({ data: workspace({ draft: false }) }) });
  find(tree, "Button", (p) => p.children === "reload").onClick(); await flush(); tree = render();
  assert.equal(saveButton(tree).disabled, false);
  assert.equal(publishButton(tree).disabled, true);
  const firstDraft = workspace(); firstDraft.draft.reason = "";
  queue.push({ promise: Promise.resolve({ data: firstDraft }) });
  find(tree, "form").onSubmit({ preventDefault() {} }); await flush(); tree = render();
  assert.equal(calls.at(-1).args[1].expected_revision, 0);
  assert.equal(calls.at(-1).args[1].expected_grade_revision, 0);
  assert.equal(calls.at(-1).args[1].reason, "");
  const staleWorkspace = workspace({ revision: 2, grade: 1 });
  staleWorkspace.draft.base_grade_revision = 0;
  queue.push({ promise: Promise.resolve({ data: staleWorkspace }) });
  find(tree, "Button", (p) => p.children === "reload").onClick(); await flush(); tree = render();
  assert.equal(publishButton(tree).disabled, true);
  assert.equal(saveButton(tree).disabled, false);
  queue.push({ promise: Promise.resolve({ data: workspace({ revision: 3, grade: 1 }) }) });
  find(tree, "form").onSubmit({ preventDefault() {} }); await flush(); tree = render();
  assert.equal(calls.at(-1).args[1].expected_revision, 2);
  assert.equal(calls.at(-1).args[1].expected_grade_revision, 1);
  assert.equal(publishButton(tree).disabled, false);
  const late = deferred(); queue.push(late);
  find(tree, "Button", (p) => p.children === "reload").onClick();
  runner.unmount();
  assert.equal(calls.at(-1).args[1].signal.aborted, true);
  late.resolve({ data: workspace({ revision: 99 }) }); await flush();
  assert.equal(navigated.length, 0);
  assert.equal(queue.length, 0);
  const studentRunner = hooks();
  const socket = new (require("node:events").EventEmitter)();
  const { default: ResultPage } = load("src/app/[locale]/(student)/result/[id]/page.tsx", {
    react: studentRunner.react, "next-intl": intl, sonner: { toast: { error() {} } }, ...ui,
    "@/lib/api-client": { __esModule: true, default: api },
    "@/constants/endpoints": endpoints,
    "@/i18n/navigation": { useRouter: () => ({ push() {} }) },
    "@/components/providers/SocketProvider": { useSocket: () => ({ socket }) },
    "@/store/hook": { useAppSelector: () => ({ id: "student", role: "STUDENT" }) },
    "@/lib/exam-utils": load("src/lib/exam-utils.ts"),
    "@/components/common/student/sidebar": { __esModule: true, default: "Sidebar" },
    "@/components/common/student/menu": { __esModule: true, default: "Menu" },
    "@/components/MathRenderer": { MathRenderer: "Math" },
  });
  const studentInitial = deferred(); queue.push(studentInitial);
  studentRunner.render(ResultPage, { params: { id: "submission" } });
  const result = { ...workspace().submission, student_id: "student" };
  studentInitial.resolve({ data: result }); await flush();
  const beforeEvents = calls.length;
  socket.emit("notification:new", { target_type: "EXAM", target_id: "submission" });
  socket.emit("notification:new", { target_type: "SUBMISSION", target_id: "other" });
  socket.emit("notification:new", null);
  assert.equal(calls.length, beforeEvents);
  const firstRefresh = deferred(); queue.push(firstRefresh);
  socket.emit("notification:new", { target_type: "SUBMISSION", target_id: "submission" });
  assert.equal(calls.at(-1).args[0], "/submission/submission");
  const firstSignal = calls.at(-1).args[1].signal;
  const newestRefresh = deferred(); queue.push(newestRefresh);
  socket.emit("notification:new", { target_type: "SUBMISSION", target_id: "submission" });
  assert.equal(firstSignal.aborted, true);
  newestRefresh.resolve({ data: { ...result, total_score: 9 } }); await flush();
  firstRefresh.resolve({ data: { ...result, total_score: 1 } }); await flush();
  assert.equal(studentRunner.snapshot().find((slot) => slot?.id === "submission").total_score, 9);
  const offline = deferred(); queue.push(offline);
  socket.emit("notification:new", { target_type: "SUBMISSION", target_id: "submission" });
  offline.reject(new Error("offline")); await flush();
  assert.equal(studentRunner.snapshot().find((slot) => slot?.id === "submission").total_score, 9);
  studentRunner.unmount();
  assert.equal(socket.listenerCount("notification:new"), 0);
  assert.equal(queue.length, 0);
  console.log("PASS: normalized/full-set validation, unrounded totals, all-type answer/key/media rendering, draft restore and creation, stale-draft rebasing, save/publish confirmation and revision payloads, empty reasons, duplicate prevention, 409/offline edit preservation, explicit reload, abort cleanup; student notification target filtering, race protection and cleanup. Real TS component callbacks with synthetic React hooks/UI/API; no backend/browser used.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
