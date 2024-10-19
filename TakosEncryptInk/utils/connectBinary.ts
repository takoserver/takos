export function concatenateUint8Arrays(arrays: Uint8Array[]) {
  // 引数がnullまたは空の配列の場合に対応
  if (!arrays || arrays.length === 0) {
    return new Uint8Array()
  }

  // 結合する配列全体のサイズを計算
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)

  // 新しいUint8Arrayを作成
  const result = new Uint8Array(totalLength)

  // 各配列を結果の配列にコピー
  let offset = 0
  arrays.forEach((array) => {
    result.set(array, offset)
    offset += array.length
  })

  return result
}
