/**
 * 実際に前向き計算を回す小さな CNN。
 * 入力はプロフィール画像そのもの（グレースケール 16×16）で、
 * conv → ReLU → maxpool → conv → ReLU → dense → softmax まで走らせる。
 * 表示しているマスの明暗は飾りではなく、この計算結果そのもの。
 */

export type LayerSpec =
  | { type: "input"; size: number }
  | { type: "conv"; maps: number; kernel: number }
  | { type: "pool"; size: number }
  | { type: "dense"; units: number };

export interface CnnStage {
  kind: "input" | "conv" | "pool" | "dense";
  /** 空間サイズ（dense は 1） */
  grid: number;
  /** チャンネル数（dense は units） */
  maps: number;
  /** [map] ごとの grid*grid、0..1 に正規化済み */
  activation: Float32Array[];
  /** conv/pool のカーネル辺長（可視化用） */
  kernel: number;
  /** pool のストライド（conv は 1） */
  stride: number;
  /**
   * conv のみ: ReLU を通す前の値。-1..1 に正規化（符号は残す）。
   * ReLU の演出で「負が潰れる」ところを見せるために保持する。
   */
  raw?: Float32Array[];
  /**
   * pool のみ: 各出力が 2×2 のどれを採ったか（0..size*size-1）。
   * どのマスが生き残ったかを描くために保持する。
   */
  argmax?: Uint8Array[];
}

export interface CnnResult {
  stages: CnnStage[];
  /** softmax の確率 */
  probabilities: number[];
  /** 選ばれたクラス */
  winner: number;
}

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const normalise = (maps: Float32Array[]): Float32Array[] => {
  let max = 1e-9;
  maps.forEach((m) => m.forEach((v) => {
    if (Math.abs(v) > max) max = Math.abs(v);
  }));
  return maps.map((m) => m.map((v) => Math.abs(v) / max));
};

/**
 * 画像を size×size の輝度（0..1）へ。gamma < 1 で暗部を持ち上げる。
 * 同一オリジンのバンドル済み画像なので canvas は汚染されない。
 */
export const imageToInput = (
  image: HTMLImageElement,
  size: number,
  gamma = 0.75,
): Float32Array => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Float32Array(size * size).fill(0.5);

  context.drawImage(image, 0, 0, size, size);
  const data = context.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);

  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < out.length; i++) {
    const v = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] +
      0.114 * data[i * 4 + 2]) / 255;
    out[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const scale = hi - lo < 1e-9 ? 1 : hi - lo;
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.pow((out[i] - lo) / scale, gamma);
  }
  return out;
};

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });

/**
 * @param bias 勝たせたいクラスの索引と加算量。ランダム初期化の網では
 *   出力は任意なので、デモとして勝たせたいクラスへバイアスを足して確定させる。
 */
export const runCnn = (
  input: Float32Array,
  arch: LayerSpec[],
  seed: number,
  bias?: { index: number; amount: number },
): CnnResult => {
  const random = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const first = arch[0];
  if (first.type !== "input") throw new Error("cnn: 先頭は input である必要があります");

  const stages: CnnStage[] = [{
    kind: "input",
    grid: first.size,
    maps: 1,
    activation: [Float32Array.from(input)],
    kernel: 1,
    stride: 1,
  }];

  let probabilities: number[] = [];

  for (let s = 1; s < arch.length; s++) {
    const spec = arch[s];
    const prev = stages[s - 1];

    if (spec.type === "conv") {
      const k = spec.kernel;
      const grid = prev.grid - k + 1;
      const scale = Math.sqrt(2 / (prev.maps * k * k));
      const output: Float32Array[] = [];
      const raw: Float32Array[] = [];

      for (let m = 0; m < spec.maps; m++) {
        const weights: number[][][] = [];
        for (let c = 0; c < prev.maps; c++) {
          const plane: number[][] = [];
          for (let a = 0; a < k; a++) {
            const row: number[] = [];
            for (let b = 0; b < k; b++) row.push(gauss() * scale);
            plane.push(row);
          }
          weights.push(plane);
        }
        const bias0 = gauss() * 0.05;

        const map = new Float32Array(grid * grid);
        const pre = new Float32Array(grid * grid);
        for (let r = 0; r < grid; r++) {
          for (let c = 0; c < grid; c++) {
            let v = bias0;
            for (let ch = 0; ch < prev.maps; ch++) {
              for (let a = 0; a < k; a++) {
                for (let b = 0; b < k; b++) {
                  v += weights[ch][a][b] *
                    prev.activation[ch][(r + a) * prev.grid + (c + b)];
                }
              }
            }
            pre[r * grid + c] = v;
            map[r * grid + c] = Math.max(0, v); // ReLU
          }
        }
        output.push(map);
        raw.push(pre);
      }

      // 符号を残したまま、絶対値の最大で割って -1..1 へ
      let peak = 1e-9;
      raw.forEach((m) => m.forEach((v) => {
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }));
      stages.push({
        kind: "conv",
        grid,
        maps: spec.maps,
        activation: normalise(output),
        raw: raw.map((m) => m.map((v) => v / peak)),
        kernel: k,
        stride: 1,
      });
    } else if (spec.type === "pool") {
      const p = spec.size;
      const grid = Math.floor(prev.grid / p);
      const output: Float32Array[] = [];
      const argmax: Uint8Array[] = [];

      for (let m = 0; m < prev.maps; m++) {
        const map = new Float32Array(grid * grid);
        const picked = new Uint8Array(grid * grid);
        for (let r = 0; r < grid; r++) {
          for (let c = 0; c < grid; c++) {
            let best = -Infinity;
            let bestIndex = 0;
            for (let a = 0; a < p; a++) {
              for (let b = 0; b < p; b++) {
                const v = prev.activation[m][(r * p + a) * prev.grid + (c * p + b)];
                if (v > best) {
                  best = v;
                  bestIndex = a * p + b;
                }
              }
            }
            map[r * grid + c] = best;
            picked[r * grid + c] = bestIndex;
          }
        }
        output.push(map);
        argmax.push(picked);
      }

      stages.push({
        kind: "pool",
        grid,
        maps: prev.maps,
        activation: normalise(output),
        argmax,
        kernel: p,
        stride: p,
      });
    } else if (spec.type === "dense") {
      const n = prev.maps * prev.grid * prev.grid;
      const flat = new Float32Array(n);
      let index = 0;
      for (let m = 0; m < prev.maps; m++) {
        for (let i = 0; i < prev.grid * prev.grid; i++) {
          flat[index++] = prev.activation[m][i];
        }
      }

      const scale = Math.sqrt(1.6 / n);
      const logits: number[] = [];
      for (let u = 0; u < spec.units; u++) {
        let v = 0;
        for (let i = 0; i < n; i++) v += gauss() * scale * flat[i];
        logits.push(v);
      }
      if (bias) logits[bias.index] += bias.amount;

      const max = Math.max(...logits);
      const exp = logits.map((v) => Math.exp(v - max));
      const sum = exp.reduce((a, b) => a + b, 0);
      probabilities = exp.map((v) => v / sum);

      stages.push({
        kind: "dense",
        grid: 1,
        maps: spec.units,
        activation: [Float32Array.from(probabilities)],
        kernel: 1,
        stride: 1,
      });
    }
  }

  let winner = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[winner]) winner = i;
  });

  return { stages, probabilities, winner };
};
