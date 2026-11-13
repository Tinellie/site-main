import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/cards/card-reveal.tsx", import.meta.url), "utf8");
const parsed = ts.createSourceFile("card-reveal.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = parsed.statements.filter(statement =>
  (ts.isFunctionDeclaration(statement) && statement.name?.text === "createRevealSequence") ||
  (ts.isInterfaceDeclaration(statement) && statement.name.text === "RevealEntry")
).map(statement => statement.getText(parsed)).join("\n");
const compiled = ts.transpileModule(declarations, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(reducedMotion = false) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const sequence = runInNewContext(`${compiled}\ncreateRevealSequence()`, {
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  });
  const revealed = [];
  const register = order => sequence.register({
    order,
    compareDocumentPosition(other) { return order < other.order ? 4 : 2; },
  }, () => revealed.push({ order, at: now }));
  function advance(ms) {
    const end = now + ms;
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (timer.at > end) break;
      now = timer.at;
      timers.delete(id);
      timer.callback();
    }
    now = end;
  }
  return { register, revealed, advance, timers };
}

test("out-of-order image readiness still reveals cards in DOM order at 100ms intervals", () => {
  const { register, revealed, advance } = setup();
  const second = register(2);
  const first = register(1);
  const third = register(3);
  second.ready();
  third.ready();
  advance(200);
  assert.deepEqual(revealed, []);
  first.ready();
  advance(0);
  assert.deepEqual(revealed, [{ order: 1, at: 200 }]);
  advance(200);
  assert.deepEqual(revealed, [
    { order: 1, at: 200 }, { order: 2, at: 300 }, { order: 3, at: 400 },
  ]);
});

test("removing a pending card releases the queue and unmount clears scheduled work", () => {
  const { register, revealed, advance, timers } = setup();
  const first = register(1);
  const second = register(2);
  second.ready();
  advance(0);
  first.remove();
  advance(0);
  assert.deepEqual(revealed, [{ order: 2, at: 0 }]);
  second.remove();
  assert.equal(timers.size, 0);
});

test("reduced motion removes stagger and duplicate readiness cannot reveal a card twice", () => {
  const { register, revealed, advance } = setup(true);
  const first = register(1);
  const second = register(2);
  first.ready();
  first.ready();
  second.ready();
  advance(0);
  assert.deepEqual(revealed, [{ order: 1, at: 0 }, { order: 2, at: 0 }]);
});

test("independent section queues do not wait for each other's pending images", () => {
  const projects = setup();
  const articles = setup();
  const project = projects.register(1);
  const firstArticle = articles.register(2);
  const secondArticle = articles.register(3);
  firstArticle.ready();
  secondArticle.ready();
  projects.advance(100);
  articles.advance(100);
  assert.deepEqual(projects.revealed, []);
  assert.deepEqual(articles.revealed, [{ order: 2, at: 0 }, { order: 3, at: 100 }]);
  project.ready();
  projects.advance(0);
  assert.deepEqual(projects.revealed, [{ order: 1, at: 100 }]);
});

test("card fades do not create an ancestor backdrop root during entrance", () => {
  const component = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  for (const visible of [false, true]) {
    const exports = {};
    let stateIndex = 0;
    const imports = {
      react: {
        createContext: () => ({}), useContext: () => null, useRef: () => ({ current: null }),
        useEffect: () => {}, useMemo: callback => callback(),
        useState: initial => [stateIndex++ === 0 ? visible : initial, () => {}],
      },
      "@mui/material": { Box: "Box", Alert: "Alert" },
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
      },
    };
    runInNewContext(component, { exports, require: name => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    } });
    const { props } = exports.CardReveal({ children: "card" });
    const styles = props.sx;
    assert.equal(styles.opacity, undefined);
    assert.equal(styles.visibility, visible ? "visible" : "hidden");
    assert.equal(styles.transform, visible ? "none" : "translateY(12px)");
    assert.equal(styles.transition, "transform 320ms ease-out");
    assert.equal(styles["& .MuiCard-root"].opacity, visible ? 1 : 0);
    assert.equal(styles["& .MuiCard-root"].transition, "opacity 320ms ease-out");
    assert.equal(styles["& .MuiCard-root"]["@media (prefers-reduced-motion: reduce)"].transition, "none");
    assert.equal(styles["@media (prefers-reduced-motion: reduce)"].transition, "none");
    assert.equal(props.inert, !visible);
    assert.equal(props["aria-hidden"], !visible);
  }
});
