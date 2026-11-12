import { readFile } from "node:fs/promises";
import { RelayError, type Descriptor } from "../contracts/model";
export async function readDescriptor(path: string): Promise<Descriptor> {
  const d = JSON.parse(await readFile(path, "utf8")) as Descriptor;
  const url = new URL(d.url);
  if (
    d.schema !== 1 ||
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/rpc" ||
    url.username ||
    url.password ||
    !/^[a-f0-9]{64}$/.test(d.token)
  )
    throw new RelayError(
      "INVALID_DESCRIPTOR",
      "Relay service descriptor is invalid.",
    );
  return d;
}
export async function rpc<T = unknown>(
  descriptorPath: string,
  method: string,
  params: unknown = {},
  timeoutMs = 30000,
): Promise<T> {
  let d: Descriptor;
  try {
    d = await readDescriptor(descriptorPath);
  } catch {
    throw new RelayError(
      "SERVICE_UNAVAILABLE",
      "Open Relay in the connected workspace and retry.",
    );
  }
  const response = await fetch(d.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${d.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error",
  });
  if (!response.ok)
    throw new RelayError(
      "SERVICE_UNAVAILABLE",
      `Relay service returned HTTP ${response.status}.`,
    );
  const packet = (await response.json()) as {
    result: T;
    error?: { code: string; message: string };
  };
  if (packet.error)
    throw new RelayError(packet.error.code, packet.error.message);
  return packet.result;
}
