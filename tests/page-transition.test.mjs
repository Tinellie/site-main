import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const ViewTransition = Symbol("ViewTransition");
async function load(file) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  const imports = {
    react: { ViewTransition },
    "@mui/material": {
      Box: "Box", Container: "Container", Typography: "Typography", CircularProgress: "CircularProgress",
    },
    "@mui/utils": { visuallyHidden: {} },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
    },
  };
  runInNewContext(code, { exports, require(name) {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
const { PageTemplate } = await load("components/layout/page-template.tsx");
const { default: Loading } = await load("app/loading.tsx");

test("each resolved page has its own entrance boundary attached to the real main", () => {
  for (const title of ["Home", "Connect", "Works", "Blog", "Gallery", "登录"]) {
    const result = PageTemplate({ title, children: title });
    assert.equal(result.type, ViewTransition);
    assert.equal(result.props.enter, "page-enter");
    assert.equal(result.props.default, "none");
    assert.equal(result.props.name, undefined);
    assert.equal(result.props.update, undefined);
    const main = result.props.children;
    assert.equal(main.type, "Container");
    assert.equal(main.props.component, "main");
    assert.equal(main.props.id, "main-content");
    assert.equal(main.props.children[1].props.children, title);
  }
});

test("the loading fallback does not consume the real page entrance or change its three-second indicator delay", () => {
  const fallback = Loading();
  assert.notEqual(fallback.type, ViewTransition);
  assert.equal(fallback.props.role, "status");
  assert.equal(fallback.props.sx.visibility, "hidden");
  assert.equal(fallback.props.sx.animation, "route-loading-show 0s 3s forwards");
});
