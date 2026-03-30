type LogLevel = "debug" | "info" | "warn" | "error";

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(level: LogLevel) {
  function shouldLog(candidate: LogLevel) {
    return priorities[candidate] >= priorities[level];
  }

  function write(candidate: LogLevel, message: string, meta?: unknown) {
    if (!shouldLog(candidate)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [bridge] [${candidate.toUpperCase()}]`;

    if (meta === undefined) {
      console.log(`${prefix} ${message}`);
      return;
    }

    console.log(`${prefix} ${message}`, meta);
  }

  return {
    debug: (message: string, meta?: unknown) => write("debug", message, meta),
    info: (message: string, meta?: unknown) => write("info", message, meta),
    warn: (message: string, meta?: unknown) => write("warn", message, meta),
    error: (message: string, meta?: unknown) => write("error", message, meta),
  };
}

export type BridgeLogger = ReturnType<typeof createLogger>;
