const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(len = 21): string {
  let result = "";
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  for (let i = 0; i < len; i++) {
    result += CHARS[array[i] % CHARS.length];
  }
  return result;
}

export function nanoidUpper(len = 8): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  for (let i = 0; i < len; i++) {
    result += upper[array[i] % upper.length];
  }
  return result;
}
