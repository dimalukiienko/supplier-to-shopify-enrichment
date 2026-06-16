#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const aiWorkHistoryDir = path.join(projectRoot, "docs", "ai-work-history");

function readPayload() {
  if (process.stdin.isTTY) {
    return null;
  }

  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) {
    return null;
  }

  return JSON.parse(input);
}

function ensureSessionDirs() {
  fs.mkdirSync(aiWorkHistoryDir, { recursive: true });
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date) {
  const datePart = [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
  const timePart = [pad2(date.getHours()), pad2(date.getMinutes())].join("-");

  return { datePart, timePart };
}

function detectSource(payload) {
  const candidates = [
    payload.source,
    payload.runtime,
    payload.tool,
    payload.agent_type,
  ].filter(hasText);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (normalized.includes("codex")) {
      return "codex";
    }
    if (
      normalized.includes("claude") ||
      normalized.includes("anthropic")
    ) {
      return "claude";
    }
    if (
      normalized.includes("chatgpt") ||
      normalized.includes("openai") ||
      normalized.includes("gpt")
    ) {
      return "chatgpt";
    }
  }

  if (Object.keys(process.env).some((key) => key.startsWith("CODEX_"))) {
    return "codex";
  }
  if (Object.keys(process.env).some((key) => key.startsWith("CLAUDE_"))) {
    return "claude";
  }

  return "claude";
}

function markdownFence(text) {
  const matches = String(text).match(/`+/g) || [];
  const longest = matches.reduce((max, value) => Math.max(max, value.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}

function appendPromptNote(payload) {
  if (!Object.prototype.hasOwnProperty.call(payload, "prompt")) {
    return;
  }

  ensureSessionDirs();

  const now = new Date();
  const isoNow = now.toISOString();
  const { datePart, timePart } = formatLocalDateTime(now);
  const source = detectSource(payload);
  const sessionId = hasText(payload.session_id) ? payload.session_id : null;
  const prompt = String(payload.prompt);
  const fence = markdownFence(prompt);
  const historyPath = findOrCreateSessionPath(
    datePart,
    timePart,
    source,
    sessionId,
  );
  const sessionLine = sessionId ? `\n- Session ID: \`${sessionId}\`` : "";
  const note = [
    `## ${isoNow}`,
    "",
    `- Source: ${source}${sessionLine}`,
    "",
    `${fence}text`,
    prompt,
    fence,
    "",
  ].join("\n");

  fs.appendFileSync(historyPath, note, "utf8");
}

function findOrCreateSessionPath(datePart, timePart, source, sessionId) {
  const sourceSessionMarker = `-${source}-session-`;
  const sessionFiles = fs
    .readdirSync(aiWorkHistoryDir)
    .filter((fileName) =>
      fileName.startsWith(`${datePart}-`) &&
      fileName.includes(sourceSessionMarker) &&
      fileName.endsWith(".md")
    )
    .sort();

  if (sessionId) {
    for (const fileName of sessionFiles) {
      const filePath = path.join(aiWorkHistoryDir, fileName);
      const contents = fs.readFileSync(filePath, "utf8");
      if (contents.includes(`- Session ID: \`${sessionId}\``)) {
        return filePath;
      }
    }

    for (const fileName of sessionFiles) {
      const filePath = path.join(aiWorkHistoryDir, fileName);
      const contents = fs.readFileSync(filePath, "utf8");
      if (!contents.includes("- Session ID: `")) {
        return filePath;
      }
    }
  }

  const nextNumber = sessionFiles.length + 1;
  const sessionNumber = pad2(nextNumber);
  const fileName = `${datePart}-${timePart}-${source}-session-${sessionNumber}.md`;
  const filePath = path.join(aiWorkHistoryDir, fileName);
  const title = [
    `# ${datePart} ${timePart.replace("-", ":")} ${source} session ${sessionNumber}`,
    "",
  ].join("\n");
  fs.writeFileSync(filePath, title, "utf8");
  return filePath;
}

function main() {
  const payload = readPayload();
  if (!payload || typeof payload !== "object") {
    return;
  }

  switch (payload.hook_event_name) {
    case "UserPromptSubmit":
      appendPromptNote(payload);
      break;
    default:
      break;
  }
}

try {
  main();
} catch {
  // Hooks should never interrupt the agent workflow.
}
