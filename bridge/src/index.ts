import { loadConfig } from "./config";
import { createLogger } from "./logger";
import { BridgeService } from "./service";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.BRIDGE_LOG_LEVEL);
  const service = new BridgeService(config, logger);

  const shutdown = () => {
    logger.info("Shutdown signal received");
    service.stop();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await service.start();
}

main().catch((error) => {
  console.error("[bridge] Fatal startup error", error);
  process.exitCode = 1;
});
