import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const workflow = (await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8"))
  .replaceAll("\r\n", "\n");
const script = workflow.split("          script: |\n")[1]?.replace(/^ {12}/gm, "");
assert.ok(script, "The SSH deployment script must exist");

function runDeployment(scenario) {
  const harness = `
set -eu
TEST_ROOT=$(mktemp -d /tmp/site-main-workflow-test.XXXXXXXX)
export TEST_ROOT
cleanup() {
  case "$TEST_ROOT" in /tmp/site-main-workflow-test.*) rm -rf -- "$TEST_ROOT";; esac
}
trap cleanup EXIT
export SCENARIO=${scenario}
export DEPLOY_COMMIT=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export LOG="$TEST_ROOT/commands.log"
mkdir -p "$TEST_ROOT/bin" "$TEST_ROOT/.git" "$TEST_ROOT/data/blog" "$TEST_ROOT/data/assets"
touch "$TEST_ROOT/.env.production" "$LOG"
cat > "$TEST_ROOT/bin/git" <<'GIT'
#!/bin/bash
printf 'git %s\\n' "$*" >> "$LOG"
case "$1" in
  diff) if [ "$SCENARIO" = dirty ]; then exit 13; fi;;
  rev-parse)
    if [ -f "$TEST_ROOT/merged" ]; then echo "$DEPLOY_COMMIT";
    else echo bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb; fi;;
  merge) touch "$TEST_ROOT/merged";;
esac
GIT
cat > "$TEST_ROOT/bin/docker" <<'DOCKER'
#!/bin/bash
printf 'docker %s\\n' "$*" >> "$LOG"
if [[ "$*" == 'compose --profile tools run '* && "$*" != *'--interactive=false'* ]]; then
  cat > /dev/null
fi
case "$*" in
  'compose ps -q app') echo old-app;;
  'inspect --format {{.Image}} old-app') echo sha256:old;;
  'compose --profile tools build --pull app tools')
    if [ "$SCENARIO" = build-failure ]; then exit 17; fi;;
  'exec vultr-db-1 sh -c'*)
    if [ "$SCENARIO" = backup-failure ]; then exit 19; fi
    echo '-- database fixture';;
  *'tar -czf -'*)
    if [ "$SCENARIO" = archive-failure ]; then exit 21; fi
    printf 'archive fixture' | gzip -c;;
  *'tools npm run db:migrate')
    if [ "$SCENARIO" = migration-failure ]; then exit 23; fi;;
  'compose up -d --no-deps --no-build --wait --wait-timeout 180 app')
    if [ "$SCENARIO" = startup-failure ]; then exit 25; fi;;
esac
DOCKER
cat > "$TEST_ROOT/bin/curl" <<'CURL'
#!/bin/bash
printf 'curl %s\\n' "$*" >> "$LOG"
if [ "$SCENARIO" = https-failure ]; then exit 27; fi
CURL
chmod +x "$TEST_ROOT/bin/"*
export PATH="$TEST_ROOT/bin:$PATH"
cd "$TEST_ROOT"
set +e
${script.replace("cd /opt/site-main", 'cd "$TEST_ROOT"')}
status=$?
set -e
printf '\\n__STATUS__=%s\\n__COMMANDS__\\n' "$status"
cat "$LOG"
printf '\\n__FILES__\\n'
find "$TEST_ROOT/backups" -type f -printf '%f\\n' 2>/dev/null || true
`;
  const command = process.platform === "win32" ? "wsl.exe" : "bash";
  const args = process.platform === "win32" ? ["--exec", "bash", "-s"] : ["-s"];
  const result = spawnSync(command, args, { input: harness, encoding: "utf8", timeout: 60_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const match = /__STATUS__=(\d+)/.exec(result.stdout);
  assert.ok(match, result.stdout + result.stderr);
  return { status: Number(match[1]), output: result.stdout, errors: result.stderr };
}

test("deployment backs up before migration and only restarts the site app", () => {
  const { status, output } = runDeployment("success");
  assert.equal(status, 0, output);
  const commands = output.split("__COMMANDS__\n")[1].split("__FILES__")[0];
  const phases = [
    "git fetch origin", "build --pull app tools", "compose stop app",
    "exec vultr-db-1 sh -c", "tar -czf -", "tools npm run db:migrate",
    "compose up -d --no-deps --no-build --wait", "curl --fail",
  ];
  let previous = -1;
  for (const phase of phases) {
    const index = commands.indexOf(phase);
    assert.ok(index > previous, `Expected ordered phase ${phase}`);
    previous = index;
  }
  for (const name of ["database.sql", "files.tar.gz", "previous-image.txt", "previous-commit.txt"]) {
    assert.ok(output.split("__FILES__")[1].includes(name), `Missing backup file ${name}`);
  }
  assert.doesNotMatch(commands, /compose down|compose restart|compose start|image prune|volume rm/);
});

test("dirty worktrees and failed builds leave the old application running", () => {
  for (const scenario of ["dirty", "build-failure"]) {
    const { status, output } = runDeployment(scenario);
    assert.notEqual(status, 0, scenario);
    assert.doesNotMatch(output, /docker compose stop app|tools npm run db:migrate|docker compose up/);
  }
});

test("backup failures block migrations and migration failures block startup", () => {
  for (const scenario of ["backup-failure", "archive-failure", "migration-failure"]) {
    const { status, output, errors } = runDeployment(scenario);
    assert.notEqual(status, 0, scenario);
    assert.match(output, /docker compose stop app/);
    assert.doesNotMatch(output, /docker compose up/);
    if (scenario !== "migration-failure") assert.doesNotMatch(output, /tools npm run db:migrate/);
    assert.match(errors, /no database rollback was attempted/);
    assert.match(errors, /application may be stopped or unhealthy/);
  }
});

test("failed startup or HTTPS checks fail deployment without pretending to roll back", () => {
  for (const scenario of ["startup-failure", "https-failure"]) {
    const { status, output, errors } = runDeployment(scenario);
    assert.notEqual(status, 0, scenario);
    assert.doesNotMatch(output, /Deployment completed:/);
    assert.match(errors, /no database rollback was attempted/);
  }
});
