import path from "node:path";
import os from "node:os";

export interface PathResolveResult {
  ok: boolean;
  normalizedPath?: string;
  relativePath?: string;
  reason?: string;
}

export interface PathResolveOptions {
  isWrite?: boolean;
}

export function resolveWorkspacePath(
  workspaceRoot: string,
  targetPath: string,
  options?: PathResolveOptions
): PathResolveResult {
  // Normalize the workspace root
  const root = path.resolve(workspaceRoot);
  
  // Resolve the target path against the root
  const resolved = path.resolve(root, targetPath);
  
  // Calculate relative path
  const relative = path.relative(root, resolved);
  
  // Block traversal outside workspace
  // path.relative returns path starting with '..' or absolute path if on different drive (Windows)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      ok: false,
      reason: "Path traversal outside workspace is not allowed"
    };
  }

  const normalizedRelative = relative.split(path.sep).join("/");

  // Check write restrictions
  if (options?.isWrite) {
    if (normalizedRelative === ".env" || normalizedRelative.endsWith("/.env")) {
      return { ok: false, reason: "Cannot write to sensitive file: .env" };
    }
    if (normalizedRelative === ".git" || normalizedRelative.startsWith(".git/")) {
      return { ok: false, reason: "Writing to .git is not allowed" };
    }
    const filename = path.basename(resolved);
    if (filename === "id_rsa" || filename === "id_ed25519" || filename.endsWith(".pem") || filename.endsWith(".key")) {
      return { ok: false, reason: "Writing to private keys is not allowed" };
    }
  }

  // Block home/root/system directories globally for safety
  const homedir = os.homedir();
  if (resolved === homedir || resolved.startsWith(path.join(homedir, ".ssh"))) {
    return { ok: false, reason: "Access to system/home directories is not allowed" };
  }

  return {
    ok: true,
    normalizedPath: resolved,
    relativePath: normalizedRelative
  };
}