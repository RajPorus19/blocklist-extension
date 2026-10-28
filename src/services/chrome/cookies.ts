import { infoLog } from "@/utils/log";

export async function getAllCookies(url: string) {
  const cookies = await chrome.cookies.getAll({ url });
  infoLog("chrome.cookies.getAll", url, cookies);
  return cookies;
}

export async function hasAnyCookie(
  url: string,
  names: string[]
): Promise<boolean> {
  const cookies = await getAllCookies(url);
  return cookies.some((cookie) => names.includes(cookie.name));
}
