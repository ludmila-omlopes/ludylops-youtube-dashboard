import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GOOGLE_RISC_DEFAULT_EVENT_TYPES,
  GOOGLE_RISC_DELIVERY_METHOD_PUSH,
  GOOGLE_RISC_MANAGEMENT_AUDIENCE,
  GOOGLE_RISC_STREAM_STATUS_UPDATE_URL,
  GOOGLE_RISC_STREAM_UPDATE_URL,
  GOOGLE_RISC_STREAM_URL,
  GOOGLE_RISC_STREAM_VERIFY_URL,
  getGoogleRiscReceiverUrl,
  signServiceAccountJwt,
} from "../src/lib/google/risc";

type Command = "status" | "configure" | "verify" | "enable" | "disable";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  private_key_id: string;
};

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENV_FILES = [resolve(ROOT, ".env.local"), resolve(ROOT, ".env")];

function loadEnvFile(filepath: string) {
  if (!existsSync(filepath)) {
    return;
  }

  const raw = readFileSync(filepath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnv() {
  for (const filepath of ENV_FILES) {
    loadEnvFile(filepath);
  }
}

function getArgs() {
  const [, , command = "status", ...rest] = process.argv;
  const flags = new Map<string, string>();
  const positionals: string[] = [];

  for (const arg of rest) {
    if (arg.startsWith("--")) {
      const [key, ...valueParts] = arg.slice(2).split("=");
      flags.set(key, valueParts.join("=") || "true");
      continue;
    }

    positionals.push(arg);
  }

  return {
    command: command as Command,
    flags,
    positionals,
  };
}

function getServiceAccount(): ServiceAccount {
  const rawJson = process.env.GOOGLE_RISC_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    return JSON.parse(rawJson) as ServiceAccount;
  }

  const rawFile = process.env.GOOGLE_RISC_SERVICE_ACCOUNT_FILE?.trim();
  if (rawFile) {
    const filepath = resolve(ROOT, rawFile);
    if (!existsSync(filepath)) {
      throw new Error(`GOOGLE_RISC_SERVICE_ACCOUNT_FILE points to a missing file: ${filepath}`);
    }

    return JSON.parse(readFileSync(filepath, "utf8")) as ServiceAccount;
  }

  throw new Error(
    "Missing GOOGLE_RISC_SERVICE_ACCOUNT_JSON or GOOGLE_RISC_SERVICE_ACCOUNT_FILE. " +
      "Add one of them to .env.local/.env or export it before running the script.",
  );
}

function getAuthToken(serviceAccount: ServiceAccount) {
  return signServiceAccountJwt({
    audience: GOOGLE_RISC_MANAGEMENT_AUDIENCE,
    clientEmail: serviceAccount.client_email,
    keyId: serviceAccount.private_key_id,
    privateKey: serviceAccount.private_key,
  });
}

async function requestGoogle(url: string, input: RequestInit = {}) {
  const serviceAccount = getServiceAccount();
  const authToken = getAuthToken(serviceAccount);
  const response = await fetch(url, {
    ...input,
    headers: {
      authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
      ...(input.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return data;
}

function getConfiguredEvents(flags: Map<string, string>) {
  const raw = flags.get("events");
  if (!raw) {
    return GOOGLE_RISC_DEFAULT_EVENT_TYPES;
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getReceiverUrl(positionals: string[], flags: Map<string, string>) {
  const receiverUrl = flags.get("receiver-url") ?? positionals[0] ?? getGoogleRiscReceiverUrl();
  if (!receiverUrl) {
    throw new Error(
      "Could not resolve the receiver URL. Pass --receiver-url=https://... or set GOOGLE_RISC_RECEIVER_URL / APP_URL.",
    );
  }

  return receiverUrl;
}

async function run() {
  loadLocalEnv();

  const { command, flags, positionals } = getArgs();

  switch (command) {
    case "status": {
      const data = await requestGoogle(GOOGLE_RISC_STREAM_URL, {
        method: "GET",
      });
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    case "configure": {
      const receiverUrl = getReceiverUrl(positionals, flags);
      const eventsRequested = getConfiguredEvents(flags);
      const data = await requestGoogle(GOOGLE_RISC_STREAM_UPDATE_URL, {
        method: "POST",
        body: JSON.stringify({
          delivery: {
            delivery_method: GOOGLE_RISC_DELIVERY_METHOD_PUSH,
            url: receiverUrl,
          },
          events_requested: eventsRequested,
        }),
      });
      console.log(
        JSON.stringify(
          {
            receiverUrl,
            eventsRequested,
            data,
          },
          null,
          2,
        ),
      );
      return;
    }
    case "verify": {
      const state = positionals[0] ?? `codex-risc-check-${new Date().toISOString()}`;
      const data = await requestGoogle(GOOGLE_RISC_STREAM_VERIFY_URL, {
        method: "POST",
        body: JSON.stringify({
          state,
        }),
      });
      console.log(
        JSON.stringify(
          {
            state,
            data,
          },
          null,
          2,
        ),
      );
      return;
    }
    case "enable":
    case "disable": {
      const data = await requestGoogle(GOOGLE_RISC_STREAM_STATUS_UPDATE_URL, {
        method: "POST",
        body: JSON.stringify({
          status: command === "enable" ? "enabled" : "disabled",
        }),
      });
      console.log(
        JSON.stringify(
          {
            status: command,
            data,
          },
          null,
          2,
        ),
      );
      return;
    }
    default:
      throw new Error(
        `Unknown command "${command}". Use one of: status, configure, verify, enable, disable.`,
      );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
