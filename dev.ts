import { spawn } from "bun";

const server = spawn(["bun", "--watch", "server/index.ts"], {
  env: { ...process.env, PORT: "3001" },
  stdout: "inherit",
  stderr: "inherit",
  cwd: import.meta.dir,
});

const client = spawn(["bun", "x", "vite", "--port", "3000"], {
  stdout: "inherit",
  stderr: "inherit",
  cwd: import.meta.dir,
});

process.on("SIGINT", () => {
  server.kill();
  client.kill();
  process.exit(0);
});

await Promise.all([server.exited, client.exited]);
