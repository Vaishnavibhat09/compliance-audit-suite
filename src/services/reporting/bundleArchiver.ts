import fs from "fs";
import path from "path";
import archiver from "archiver";
import { settings } from "../../config/settings";
import { ensureDir } from "../../utils/fileStorage";

export function bundlePath(auditId: string): string {
  return path.join(settings.storage.bundles, `${auditId}.zip`);
}

/**
 * Zips every HTML file under storage/reports/{auditId}/ (the dashboard plus
 * each individual page report) into a single archive so the whole audit can
 * be downloaded and shared in one click.
 */
export async function buildReportBundle(auditId: string): Promise<string> {
  const reportsDir = path.join(settings.storage.reports, auditId);
  const outPath = bundlePath(auditId);
  ensureDir(path.dirname(outPath));

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(reportsDir, false);
    archive.finalize();
  });

  return outPath;
}
