/**
 * ZenoDeck — Application Version & Release Configurations
 */

export const APP_VERSION = "3.5.0";
export const GITHUB_REPO_OWNER = "lagtastic-legends";
export const GITHUB_REPO_NAME = "zenodeck";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
export const GITHUB_ALL_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

/**
 * Parses a semver string like "v3.4.6" or "3.4.6" into numeric tuple [major, minor, patch]
 */
export function parseSemver(versionStr: string): [number, number, number] {
  const clean = (versionStr || "").replace(/^v/i, "").trim();
  const parts = clean.split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Returns true if remoteVersion is strictly newer than currentVersion
 */
export function isNewerVersion(remoteVersion: string, currentVersion = APP_VERSION): boolean {
  const [remMajor, remMinor, remPatch] = parseSemver(remoteVersion);
  const [curMajor, curMinor, curPatch] = parseSemver(currentVersion);

  if (remMajor > curMajor) return true;
  if (remMajor < curMajor) return false;

  if (remMinor > curMinor) return true;
  if (remMinor < curMinor) return false;

  return remPatch > curPatch;
}
