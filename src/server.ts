import "dotenv/config";
import { app } from "./app";
import { config } from "./config";
import { prisma } from "./db";
import { log } from "./logger";

const server = app.listen(config.port, () => {
  log("info", "server_started", {
    port: config.port,
    env: config.env,
  });
});

function shutdown(signal: NodeJS.Signals): void {
  log("info", "shutdown_started", { signal });

  server.close((error) => {
    void prisma.$disconnect().finally(() => {
      if (error) {
        log("error", "shutdown_failed", { error: error.message });
        process.exitCode = 1;
      }
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
