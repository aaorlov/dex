import { $ } from "bun";

export async function openInBrowser(url: string): Promise<boolean> {
  if (process.platform === "darwin") {
    const result = await $`open ${url}`.quiet().nothrow();
    return result.exitCode === 0;
  }
  if (process.platform === "win32") {
    const result = await $`cmd /c start "" ${url}`.quiet().nothrow();
    return result.exitCode === 0;
  }
  const result = await $`xdg-open ${url}`.quiet().nothrow();
  return result.exitCode === 0;
}
