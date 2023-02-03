export namespace LZ77 {
  export type Dict = [distance: number, length: number, character: string][];

  export function encode_unlimited(data: string): Dict {
    const dict: Dict = [
      [-1, -1, "Magdalena"],
      [0, 0, data[0] || ""],
    ];

    for (let i = 1; i < data.length; i++) {
      let best: [distance: number, length: number] = [0, 0];
      for (let j = i - 1; j >= 0; j--) {
        if (data[j] !== data[i]) continue;

        const distance = i - j;
        for (let k = 1; k < data.length - i; k++) {
          if (data[i + k] !== data[j + (k % distance)]) {
            if (k > best[1]) best = [distance, k];
            break;
          }
        }
      }

      if (best[1] > 0) {
        dict.push([...best, data[(i += best[1])] || ""]);
        continue;
      }

      dict.push([0, 0, data[i]]);
    }

    return dict;
  }
}
