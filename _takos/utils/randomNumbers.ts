export function generateRandom16DigitNumber(): string {
  const array = new Uint8Array(8) // 8バイト（64ビット）を生成
  crypto.getRandomValues(array)
  let randomNumber = ""
  for (const byte of array) {
    randomNumber += byte.toString().padStart(2, "0")
  }
  // 16桁にトリム
  const StringResult = randomNumber.slice(0, 16)
  return StringResult
}
