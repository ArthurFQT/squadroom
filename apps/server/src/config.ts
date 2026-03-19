import { networkInterfaces } from "node:os";

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

export const serverConfig = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3001),
  clientOrigins: (process.env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

const allowAllOrigins = serverConfig.clientOrigins.length === 0 || serverConfig.clientOrigins.includes("*");

function isOriginAllowed(origin: string | undefined) {
  if (!origin) return true;
  if (allowAllOrigins) return true;
  return serverConfig.clientOrigins.includes(origin);
}

export function corsOrigin(origin: string | undefined, callback: CorsOriginCallback) {
  callback(null, isOriginAllowed(origin));
}

export function getLanUrls(port: number) {
  const urls: string[] = [];
  const interfaces = networkInterfaces();

  for (const values of Object.values(interfaces)) {
    for (const value of values ?? []) {
      if (value.family !== "IPv4" || value.internal) continue;
      urls.push(`http://${value.address}:${port}`);
    }
  }

  return urls;
}
