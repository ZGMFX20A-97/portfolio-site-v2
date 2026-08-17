import type { LayerSpec } from "./cnn";

/* ============================================================
   CNN 側のネットワーク定義
   ============================================================ */

export const INPUT_SIZE = 16;

/** 出力層のクラス数。名前は i18n の `classes` が持ち、並び順を一致させる */
export const CLASS_COUNT = 6;

/** 入力画像 16×16 から 6 クラスの softmax まで */
export const ARCHITECTURE: LayerSpec[] = [
  { type: "input", size: INPUT_SIZE },
  { type: "conv", maps: 4, kernel: 3 }, // 16 → 14
  { type: "pool", size: 2 }, //            14 → 7
  { type: "conv", maps: 8, kernel: 3 }, // 7  → 5
  { type: "dense", units: CLASS_COUNT },
];

export const SEED = 20260817;

/** 勝たせるクラスの索引。ランダム初期化の網なので、ここへバイアスを足す。
 *  表示名は i18n の `classes[WINNER_INDEX]` が持つ */
export const WINNER_INDEX = 3;
export const WINNER_BIAS = 2.4;

/** 各層のワールド Z。カメラは +Z から -Z へ一本道で貫通していく */
export const STAGE_Z = [0, -16, -30, -44, -64];

/**
 * 層ごとの見た目（マスの一辺・軸からの配置半径）。
 * マップは軸のまわりに円形へ並べ、その真ん中の穴をカメラが抜けていく。
 * 半径 + マップ半幅が画角に収まる範囲に収めること。
 */
export const STAGE_LAYOUT = [
  { cell: 0.62, radius: 0 }, //    input   16×16 ×1
  { cell: 0.30, radius: 3.6 }, //  conv_01 14×14 ×4
  { cell: 0.54, radius: 3.4 }, //  pool    7×7   ×4
  { cell: 0.56, radius: 3.9 }, //  conv_02 5×5   ×8
  { cell: 1.15, radius: 0 }, //    dense   6 classes
];

export const STAGE_NAMES = [
  "INPUT · 16×16",
  "CONV_01 · 14×14 ×4",
  "MAXPOOL · 7×7 ×4",
  "CONV_02 · 5×5 ×8",
  "SOFTMAX · 6 CLASSES",
];

/** クラス行のマス間隔 */
export const CLASS_SPACING = 2.2;

/**
 * 各層の活性が点灯するスクロール区間。カメラがその層へ寄る少し前に
 * 走査が始まり、通過するころに埋まりきる。
 */
export const STAGE_WINDOWS: [number, number][] = [
  [0.04, 0.19],
  [0.23, 0.35],
  [0.40, 0.49],
  [0.54, 0.63],
  [0.68, 0.80],
];

/**
 * ReLU はマスごとに、走査（aFlow）から少し遅れて効かせる。
 * 層ごとの固定時刻にすると、その瞬間カメラがその層を通り過ぎていて
 * 何も見えないことがある。走査に追従させれば必ず画角の中で起きる。
 *   lag  … 計算されてから ReLU が来るまでの間（前活性を見せる時間）
 *   span … 潰れきるまでの時間
 */
export const RELU_LAG = 0.03;
export const RELU_SPAN = 0.025;

/**
 * maxpool の間引きが起きるスクロール位置（pool の層に置く）。
 * pool 段は入力と同じ 14×14 の格子として現れ、この区間で
 * 各 2×2 の最大以外が消え、残った 1 つが 2 倍に育って 7×7 になる。
 */
export const POOL_AT = 0.418;
export const POOL_SPAN = 0.062;

/* ============================================================
   翻訳オーバーレイ（言語タグを押したときに走る encoder–decoder）
   飛行経路とは独立。カメラの子として組み立てるので、
   スクロール位置がどこでも同じ画角に現れる。
   ============================================================ */

export const TRANSLATE_RIG = {
  /** カメラからの距離。ここに図を組む */
  depth: -22,

  /* --- トークン列。散らさず読み順のグリッドへ並べる --- */
  /** ラベルを出すトークン数。cols × rows に一致させる */
  maxTokens: 24,
  cols: 6,
  colGap: 4.5,
  rowGap: 1.15,
  /**
   * 縦の割り付け。上端・下端に 1 単位ほど余白を残すこと
   * （深度 -22・画角 55° で見えるのは y = ±11.45）。
   * 原文グリッドの最上段（下へ積む）
   */
  sourceTopY: 9.4,
  /** 訳文グリッドの最上段（下へ積む） */
  targetTopY: -6.1,
  tokenWidth: 3.5,
  tokenHeight: 0.74,
  tokenDepth: 0.26,

  /* --- 埋め込みベクトル。格ごとに縦へ積んだ小さなマス --- */
  bars: 12,
  barSpan: 21,
  /** 実際は数百次元。ここは間引いて縦 8 マスで見せる */
  embedCells: 8,
  embedDims: 256,
  embedGap: 0.28,
  embedCellWidth: 1.15,
  embedCellHeight: 0.22,
  /** 原文側ベクトルの上端 / 訳文側ベクトルの上端 */
  sourceEmbedY: 5.0,
  targetEmbedY: -3.1,

  /* --- encoder / decoder の格 --- */
  encoderY: 1.75,
  decoderY: -1.75,
  cellWidth: 1.3,
  cellHeight: 0.62,
} as const;

/**
 * 演出の位相（0..1）。重なりを持たせて切れ目を感じさせない。
 *   collect  ページに出ている文字列がトークンとして並ぶ
 *   embed    トークンが埋め込みベクトルへ落ちる
 *   encode   ベクトルが encoder の格へ入る
 *   context  cross-attention が張られる
 *   decode   decoder → 出力ベクトル → 訳文トークン
 */
export const TRANSLATE_PHASES = {
  collect: [0, 0.17] as [number, number],
  embed: [0.13, 0.34] as [number, number],
  encode: [0.3, 0.48] as [number, number],
  context: [0.44, 0.6] as [number, number],
  // 0.88 までに訳文が出揃うようにして、完成した状態を少し見せる
  decode: [0.55, 0.88] as [number, number],
} as const;

export const TRANSLATE_DURATION = 3.6;
export const TRANSLATE_COMMIT_AT = 0.58;

/* ============================================================
   拡散モデル側
   ============================================================ */

/** ノイズから復元されていく板。z と復元率のペア */
export const DIFFUSION_STEPS = [
  { z: -76, denoise: 0.05, label: "t = 1000" },
  { z: -82, denoise: 0.22, label: "t = 800" },
  { z: -88, denoise: 0.4, label: "t = 600" },
  { z: -94, denoise: 0.58, label: "t = 400" },
  { z: -100, denoise: 0.76, label: "t = 200" },
  { z: -106, denoise: 0.9, label: "t = 50" },
];

/** 復元しきった最後の一枚 */
export const DIFFUSION_FINAL = { z: -118, span: 9 };

/* ============================================================
   飛行経路（15 制御点。CatmullRom は制御点を等間隔の t に割り当てる）
   ============================================================ */

export const FLIGHT_CAMERA: [number, number, number][] = [
  [0, 0.6, 17], //     0/14  頭像を正面に大きく
  [0, 0.4, 12], //     1/14  寄る
  [0, 0, 7.5], //      2/14  入力格子の直前
  [0.6, 0.5, 0.5], //  3/14  入力の中を通過
  [-1.1, -0.5, -6], // 4/14  CONV_01 を 10 手前から見る
  [0.9, 0.6, -13], //  5/14  CONV_01 の直前
  [-0.9, -0.4, -19], //6/14  CONV_01 を抜けて POOL を捉える
  [0.8, 0.5, -25], //  7/14  POOL の直前
  [-1.0, -0.4, -33], //8/14  POOL を抜けて CONV_02 を捉える
  [0.8, 0.5, -41], //  9/14  CONV_02 の直前
  [0, 0.4, -47], //   10/14  CONV_02 を抜け、クラス行が正面
  [0, 0.3, -50], //   11/14  勝ちクラスが選ばれる（ほぼ静止）
  [0, 0, -70], //     12/14  拡散トンネル入口
  [0, 0, -90], //     13/14  復元の途中
  [0, 0, -108], //    14/14  最後の一枚を正面に
];

export const FLIGHT_TARGET: [number, number, number][] = [
  [0, 0, 6],
  [0, 0, 0],
  [0, 0, -3],
  [0, 0, -12],
  [0, 0, -16],
  [0, 0, -22],
  [0, 0, -30],
  [0, 0, -33],
  [0, 0, -44],
  [0, 0, -50],
  [0, 0, -64],
  [0, 0, -64],
  [0, 0, -84],
  [0, 0, -102],
  [0, 0, -120],
];

/* ============================================================
   章（ドットナビ／HUD の単位）
   ============================================================ */

export interface Chapter {
  id: string;
  /** その章の代表位置（ドットクリックでここへ飛ぶ） */
  at: number;
}

/** 表示名は i18n の `chapters` が持つ。索引を一致させること */
export const CHAPTERS: Chapter[] = [
  { id: "input", at: 0.06 },
  { id: "conv", at: 0.3 },
  { id: "pool", at: 0.45 },
  { id: "features", at: 0.6 },
  { id: "classify", at: 0.77 },
  { id: "diffusion", at: 0.93 },
];

/* ============================================================
   飛行中に一件ずつ現れる情報
   文言は i18n.ts、ここには位置とリンク先だけを置く
   ============================================================ */

export const PROFILE = {
  handle: "CatInPajamas",
};

/**
 * 最後に出す連絡先。文字ではなく各サービスのアイコンで並べる。
 * id は BeatText 側のアイコン対応表の鍵なので、増やすときは
 * そちらにも追加すること。
 */
export const CONTACTS = [
  { id: "github", name: "GitHub", url: "https://github.com/TakumiShoda" },
  { id: "x", name: "X", url: "https://x.com/x673530651" },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/catinpajamas_1997/",
  },
  {
    id: "wantedly",
    name: "Wantedly",
    url: "https://www.wantedly.com/id/CatinPajamas",
  },
] as const;

export type ContactId = (typeof CONTACTS)[number]["id"];

export interface BeatTiming {
  from: number;
  to: number;
  /** items と索引を揃える。省略した項目はリンクにならない */
  hrefs?: string[];
  /** この拍では CONTACTS をアイコンで並べる */
  contacts?: boolean;
}

/** i18n の `beats` と索引を一致させること */
export const BEAT_TIMING: BeatTiming[] = [
  { from: 0, to: 0.115 },
  { from: 0.115, to: 0.215 },
  { from: 0.215, to: 0.315 },
  { from: 0.315, to: 0.395 },
  { from: 0.395, to: 0.475 },
  { from: 0.475, to: 0.535 },
  { from: 0.535, to: 0.61 },
  { from: 0.61, to: 0.675 },
  { from: 0.675, to: 0.755 },
  { from: 0.755, to: 0.83 },
  { from: 0.83, to: 0.885 },
  {
    from: 0.885,
    to: 0.935,
    hrefs: [
      "https://huggingface.co/spaces/CatInPajamas/food_not_food_text_classifier",
      "https://molab.marimo.io/github/ZGMFX20A-97/kaggle-rossmann-store-sales/blob/main/RossmannStoreSales.py",
      "https://github.com/ZGMFX20A-97/basic-CNN-model/blob/main/main.py",
    ],
  },
  {
    from: 0.935,
    to: 0.975,
    hrefs: [
      "https://pokemonpicturebook.web.app/",
      "https://discord-clone-7191b.web.app/",
      "https://reactnote-78734.web.app/",
    ],
  },
  { from: 0.975, to: 1.001, contacts: true },
];

/** 逆走（上スクロール）へ切り替わる色 */
export const WARM_ACCENT = "#ffa84c";
