type LogLevel = "info" | "warn" | "error" | "debug";

function stamp(): string {
  return new Date().toISOString();
}

function emit(level: LogLevel, scope: string, message: string, extra?: unknown): void {
  const prefix = `[${stamp()}] [${level.toUpperCase()}] [${scope}]`;
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console.log(prefix, message, extra);
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, message);
  }
}

export function createLogger(scope: string) {
  return {
    info: (message: string, extra?: unknown) => emit("info", scope, message, extra),
    warn: (message: string, extra?: unknown) => emit("warn", scope, message, extra),
    error: (message: string, extra?: unknown) => emit("error", scope, message, extra),
    debug: (message: string, extra?: unknown) => emit("debug", scope, message, extra),
  };
}
