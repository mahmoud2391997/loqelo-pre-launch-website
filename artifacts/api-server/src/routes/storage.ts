import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response): Promise<void> => {
    const rawPath = req.params.filePath;
    const filePath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    if (
      !filePath ||
      !/^[a-zA-Z0-9._/-]+$/.test(filePath) ||
      filePath.split("/").some((part) => part === "." || part === "..")
    ) {
      res.status(400).json({ error: "Invalid file path." });
      return;
    }

    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found." });
        return;
      }

      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size);
      if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error("Public asset has invalid size metadata.");
      }
      const rangeHeader = req.get("range");
      let start = 0;
      let end = size - 1;
      let statusCode = 200;

      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!match || !Number.isFinite(size) || size < 1) {
          res.setHeader("Content-Range", `bytes */${Number.isFinite(size) ? size : "*"}`);
          res.status(416).end();
          return;
        }
        if (match[1]) {
          start = Number(match[1]);
          end = match[2] ? Number(match[2]) : size - 1;
        } else if (match[2]) {
          const suffixLength = Number(match[2]);
          start = Math.max(0, size - suffixLength);
          end = size - 1;
        } else {
          res.setHeader("Content-Range", `bytes */${size}`);
          res.status(416).end();
          return;
        }
        end = Math.min(end, size - 1);
        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 0 ||
          start >= size ||
          end < start
        ) {
          res.setHeader("Content-Range", `bytes */${size}`);
          res.status(416).end();
          return;
        }
        statusCode = 206;
      }

      res.setHeader(
        "Content-Type",
        (metadata.contentType as string | undefined) ?? "application/octet-stream",
      );
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", String(end - start + 1));
      if (statusCode === 206) res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.status(statusCode);

      const stream = statusCode === 206
        ? file.createReadStream({ start, end })
        : file.createReadStream();
      stream.on("error", (error) => {
        req.log.error({ err: error }, "Failed to stream public asset");
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to serve asset." });
        } else {
          res.destroy(error);
        }
      });
      stream.pipe(res);
    } catch (error) {
      req.log.error({ err: error }, "Failed to find public asset");
      res.status(500).json({ error: "Failed to serve asset." });
    }
  },
);

export default router;
