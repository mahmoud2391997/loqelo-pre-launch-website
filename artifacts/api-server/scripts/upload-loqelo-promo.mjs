import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Storage } from "@google-cloud/storage";

const sidecarEndpoint = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${sidecarEndpoint}/token`,
    type: "external_account",
    credential_source: {
      url: `${sidecarEndpoint}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const publicSearchPath = process.env.PUBLIC_OBJECT_SEARCH_PATHS
  ?.split(",")
  .map((path) => path.trim())
  .find(Boolean);
if (!publicSearchPath) {
  throw new Error("Public App Storage search path is not configured.");
}

const normalizedPath = publicSearchPath.replace(/^\/+/, "");
const [bucketName, ...prefixParts] = normalizedPath.split("/");
if (!bucketName) {
  throw new Error("Public App Storage search path is invalid.");
}

const archive = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../.local/conversation-workspace/files/attached_assets/video_1792752218719.zip",
);
const objectName = [...prefixParts, "loqelo", "promo-v1.mp4"]
  .filter(Boolean)
  .join("/");
const file = storage.bucket(bucketName).file(objectName);
const source = spawn(
  "unzip",
  ["-p", archive, "video/Loqelo final video compressed.mp4"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const writeStream = file.createWriteStream({
  resumable: false,
  metadata: {
    contentType: "video/mp4",
    cacheControl: "public, max-age=31536000, immutable",
  },
});

const sourceClosed = new Promise((resolveClose, rejectClose) => {
  source.once("error", rejectClose);
  source.once("close", (code) => {
    if (code === 0) resolveClose();
    else rejectClose(new Error(`Could not read the supplied promo archive (exit ${code}).`));
  });
});

await Promise.all([pipeline(source.stdout, writeStream), sourceClosed]);
process.stdout.write(`Uploaded Loqelo promo video to public asset path loqelo/promo-v1.mp4\n`);
