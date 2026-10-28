import { z } from "zod";
import * as chromeStorage from "@/services/chrome/storage";
import { PlatformId } from "./types";

export const backendSchema = z.enum(["auto", "api", "dom"]);
export type BackendPreference = z.infer<typeof backendSchema>;

export const platformOptionsSchema = z.object({
  backend: backendSchema,
  delayBetweenRequests: z.number().int().positive(),
  batchSize: z.number().int().positive(),
});
export type PlatformOptions = z.infer<typeof platformOptionsSchema>;

export const optionsSchema = z.object({
  darkMode: z.boolean(),
  autoUpdate: z.boolean(),
  platforms: z.object({
    instagram: platformOptionsSchema,
    x: platformOptionsSchema,
    facebook: platformOptionsSchema,
    youtube: platformOptionsSchema,
    tiktok: platformOptionsSchema,
  }),
});
export type Options = z.infer<typeof optionsSchema>;

export const defaultPlatformOptions: PlatformOptions = {
  backend: "auto",
  delayBetweenRequests: 5000,
  batchSize: 25,
};

export const defaultOptions: Options = {
  darkMode: false,
  autoUpdate: true,
  platforms: {
    instagram: { ...defaultPlatformOptions },
    x: { ...defaultPlatformOptions, delayBetweenRequests: 10000, batchSize: 10 },
    facebook: { ...defaultPlatformOptions },
    youtube: { ...defaultPlatformOptions, delayBetweenRequests: 8000 },
    tiktok: { ...defaultPlatformOptions, delayBetweenRequests: 8000, batchSize: 10 },
  },
};

export async function getOptions(): Promise<Options> {
  return (await chromeStorage.getItem<Options>("options")) || defaultOptions;
}

export async function setOptions(options: Options) {
  await chromeStorage.setItem("options", options);
}

export async function initializeOptions() {
  const stored = await chromeStorage.getItem<Options>("options");
  if (!stored) {
    await setOptions(defaultOptions);
  }
}

export async function getPlatformOptions(
  platform: PlatformId
): Promise<PlatformOptions> {
  const options = await getOptions();
  return options.platforms[platform] || defaultPlatformOptions;
}
