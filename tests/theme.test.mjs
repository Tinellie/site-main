import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = (await readFile(new URL("../src/theme/theme.ts", import.meta.url), "utf8"))
  .replace('"@mui/material"', JSON.stringify(import.meta.resolve("@mui/material")));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { theme } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

test("cards, popovers and ordinary dialogs share glass styles and an opaque fallback", () => {
  const card = theme.components.MuiCard.styleOverrides.root({ theme });
  const popover = theme.components.MuiPopover.styleOverrides.paper({ theme });
  const dialog = theme.components.MuiDialog.styleOverrides.paper({ theme, ownerState: { fullScreen: false } });
  assert.deepEqual(popover, card);
  assert.deepEqual(dialog, card);
  assert.equal(card.backgroundColor, "rgba(30, 30, 30, 0.9)");
  assert.equal(card.backgroundImage, "none");
  assert.equal(card.border, "1px solid");
  const supported = card["@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))"];
  assert.equal(supported.backgroundColor, "rgba(30, 30, 30, 0.45)");
  assert.equal(supported.backdropFilter, "blur(12px) saturate(140%)");
  assert.equal(supported.WebkitBackdropFilter, supported.backdropFilter);
});

test("generic Paper and full-screen dialogs retain their own appearance", () => {
  assert.equal(theme.components.MuiPaper, undefined);
  assert.deepEqual(theme.components.MuiDialog.styleOverrides.paper({ theme, ownerState: { fullScreen: true } }), {});
});

test("resolved page entrances match crossfade timing and respect reduced motion", () => {
  const styles = theme.components.MuiCssBaseline.styleOverrides;
  const selector = Object.keys(styles).find(key => key.includes("::view-transition-new(.page-enter)"));
  assert.ok(selector);
  assert.equal(styles[selector].animationDuration, "220ms");
  assert.equal(styles[selector].animationTimingFunction, "ease-in-out");
  const reduced = styles["@media (prefers-reduced-motion: reduce)"];
  assert.equal(reduced["::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)"].animationDuration, "0s !important");
});

test("revealing cards use the shared glass surface immediately without background animation overrides", () => {
  const styles = theme.components.MuiCssBaseline.styleOverrides;
  assert.doesNotMatch(JSON.stringify(styles), /card-glass-reveal|\.card-reveal/);
  const card = theme.components.MuiCard.styleOverrides.root({ theme });
  const glass = card["@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))"];
  assert.equal(glass.backgroundColor, "rgba(30, 30, 30, 0.45)");
  assert.equal(glass.backdropFilter, "blur(12px) saturate(140%)");
  assert.equal(glass.WebkitBackdropFilter, glass.backdropFilter);
  assert.equal(card.animation, undefined);
  assert.equal(glass.animation, undefined);
});
