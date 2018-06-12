"use strict";

const path = require("path");
const pathKey = require("path-key");

const cliRunner = require("@lerna-test/cli-runner");
const initFixture = require("@lerna-test/init-fixture")(__dirname);

describe("lerna exec", () => {
  const EXEC_TEST_COMMAND = process.platform === "win32" ? "exec-test.cmd" : "exec-test";

  const pathName = pathKey(); // PATH (POSIX) or PATH/path/Path (Windows)
  const existingPath = process.env[pathName];
  const fixturePath = path.resolve(__dirname, "__fixtures__");

  // The Node docs (https://nodejs.org/api/process.html#process_process_env)
  // explicitly say: "On Windows operating systems, environment variables
  // are case-insensitive" However, this isn't entirely true, at least within
  // AppVeyor. Following code sets three different variables:
  //
  // process.env.path = "foo";
  // process.env.Path = "bar";
  // process.env.PATH = "baz";
  //
  // Following lines consolidate the variables into one.
  delete process.env.path;
  delete process.env.Path;
  process.env.PATH = existingPath;

  // adds "__fixtures__" to PATH for child processes
  const env = {
    PATH: [fixturePath, existingPath].join(path.delimiter),
  };

  test("--ignore <pkg> exec-test -- -1", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = [
      "exec",
      "--ignore=package-1",
      EXEC_TEST_COMMAND,
      "--concurrency=1",
      "--",
      // args to exec-test
      "-1",
    ];

    const { stdout } = await cliRunner(cwd, env)(...args);
    expect(stdout).toMatchSnapshot();
  });

  test("exec-test --scope <pkg>", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = [
      "exec",
      "--concurrency=1",
      EXEC_TEST_COMMAND,
      "--scope=package-1",
      // no args to exec-test
    ];

    const { stdout } = await cliRunner(cwd, env)(...args);
    expect(stdout).toMatchSnapshot();
  });

  test("echo $LERNA_PACKAGE_NAME", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = [
      "exec",
      "--concurrency=1",
      "echo",
      process.platform === "win32" ? "%LERNA_PACKAGE_NAME%" : "$LERNA_PACKAGE_NAME",
    ];

    const { stdout } = await cliRunner(cwd)(...args);
    expect(stdout).toMatchSnapshot();
  });

  test("--parallel", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = [
      "exec",
      EXEC_TEST_COMMAND,
      "--parallel",
      // -- is required to pass args to command
      "--",
      "-C",
    ];

    const { stdout, stderr } = await cliRunner(cwd, env)(...args);
    expect(stderr).toMatch(EXEC_TEST_COMMAND);

    // order is non-deterministic, so assert individually
    expect(stdout).toMatch("package-1: file-1.js");
    expect(stdout).toMatch("package-1: package.json");
    expect(stdout).toMatch("package-2: file-2.js");
    expect(stdout).toMatch("package-2: package.json");
  });

  test("--parallel --no-prefix", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = ["exec", "--parallel", "--no-prefix", EXEC_TEST_COMMAND];

    const { stdout, stderr } = await cliRunner(cwd, env)(...args);
    expect(stderr).toMatch(EXEC_TEST_COMMAND);

    // order is non-deterministic, so assert individually
    expect(stdout).toMatch("file-1.js");
    expect(stdout).toMatch("file-2.js");
  });

  test("--stream", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = [
      "exec",
      EXEC_TEST_COMMAND,
      "--stream",
      // -- is required to pass args to command
      "--",
      "-C",
    ];

    const { stdout } = await cliRunner(cwd, env)(...args);

    // order is non-deterministic, so assert individually
    expect(stdout).toMatch("package-1: file-1.js");
    expect(stdout).toMatch("package-1: package.json");
    expect(stdout).toMatch("package-2: file-2.js");
    expect(stdout).toMatch("package-2: package.json");
  });

  test("--stream --no-prefix", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = ["exec", "--stream", "--no-prefix", EXEC_TEST_COMMAND];

    const { stdout } = await cliRunner(cwd, env)(...args);

    // order is non-deterministic, so assert individually
    expect(stdout).toMatch("file-1.js");
    expect(stdout).toMatch("file-2.js");
  });

  test("--no-bail", async () => {
    const cwd = await initFixture("lerna-exec");
    const args = ["exec", "--no-bail", "--concurrency=1", "--", "npm", "run", "fail-or-succeed"];

    const { stdout, stderr } = await cliRunner(cwd)(...args);
    expect(stderr).toMatch("Failed at the package-1@1.0.0 fail-or-succeed script");
    expect(stdout).toMatch("failure!");
    expect(stdout).toMatch("success!");
  });
});
