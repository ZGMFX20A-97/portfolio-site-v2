/**
 * 文言の集約。
 * 位置・タイミング・幾何は content.ts が持ち、ここには言語依存の文字列だけを置く。
 *
 * 訳さないもの:
 *   - 固有名詞（CatInPajamas / 資格名 / プロジェクト名 / SNS 名）
 *   - 層の識別子（CONV_01, MAXPOOL, SOFTMAX, ReLU, t = 800 …）
 *     API 名に相当する記法なので、どの言語でもそのまま読ませる
 */
import { BEAT_TIMING } from "./content";

export const LANGUAGES = [
  { code: "en", label: "ENGLISH" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANG: Lang = "en";

export interface BeatText {
  kicker: string;
  title?: string;
  lines?: string[];
  items?: { label: string; note: string }[];
}

/** 翻訳オーバーレイの見出し。言語コードは実行時に添える */
export interface TranslateLabels {
  encoder: string;
  decoder: string;
  caption: string;
}

export interface Dictionary {
  role: string;
  cue: string;
  loading: string;
  languageLabel: string;
  navLabel: string;
  /** 出力層のクラス名。6 個で順序は CLASS_ORDER と一致させる */
  classes: string[];
  /** ドットナビと HUD に出る章名。CHAPTERS と索引を揃える */
  chapters: string[];
  /** 翻訳オーバーレイの見出し */
  translate: TranslateLabels;
  /** BEAT_TIMING と索引を揃える。14 個 */
  beats: BeatText[];
}

const EN: Dictionary = {
  role: "Machine Learning ENGINEER",
  cue: "SCROLL TO CONVOLVE ↓",
  loading: "LOADING INPUT TENSOR",
  languageLabel: "Language",
  navLabel: "Chapters",
  classes: ["dog", "car", "plant", "Takumi Shoda", "robot", "coffee"],
  chapters: ["INPUT", "CONV", "POOL", "FEATURES", "CLASSIFY", "DIFFUSION"],
  translate: {
    encoder: "ENCODER // SOURCE",
    decoder: "DECODER // TARGET",
    caption: "re-encoding this page",
  },
  beats: [
    {
      kicker: "INPUT // 224×224 → 16×16",
      title: "CatInPajamas",
      lines: ["Machine Learning ENGINEER"],
    },
    {
      kicker: "INPUT // GRAYSCALE TENSOR",
      lines: [
        "This is the raw input.",
        "Everything past this point is computed from it —",
        "the convolutions below are running for real.",
      ],
    },
    {
      kicker: "CONV_01 // 3×3 KERNEL, 4 MAPS",
      title: "Think Statistically",
      lines: ["widen perspective. Never overestimate a single pixel."],
    },
    {
      kicker: "CONV_01 // ReLU",
      title: "Make Intentionally",
      lines: ["Keep what matters. Discard the redundant."],
    },
    {
      kicker: "MAXPOOL // 2×2, STRIDE 2",
      title: "Repeat Iteratively",
      lines: ["Halve the resolution, keep the signal."],
    },
    {
      kicker: "MAXPOOL // WHO AM I",
      lines: [
        "An aspiring engineer who loves building things.",
        "Driven by curiosity and a strong appetite for challenges.",
        "I keep devouring knowledge as eagerly as protein.",
      ],
    },
    {
      kicker: "CONV_02 // DEEP FEATURES",
      items: [
        { label: "E Certification", note: "2026.03" },
        { label: "AWS ML Engineer – Associate", note: "2025.12" },
        { label: "Python3 Data Analyst", note: "2024.10" },
      ],
    },
    {
      kicker: "CONV_02 // DEEP FEATURES",
      items: [
        { label: "AWS Solutions Architect – Associate", note: "2024.09" },
        { label: "Java Programmer Gold SE 11", note: "2024.03" },
        { label: "Java Programmer Silver SE 11", note: "2023.12" },
      ],
    },
    {
      kicker: "DENSE // FLATTEN → LOGITS",
      title: "Six classes.",
      lines: ["One of them is me."],
    },
    {
      kicker: "SOFTMAX // ARGMAX",
      title: "→ Takumi Shoda",
      items: [
        { label: "Python · PyTorch", note: "MACHINE LEARNING" },
        { label: "TypeScript · Node.js", note: "WEB" },
        { label: "Docker · Git · AWS", note: "INFRASTRUCTURE" },
      ],
    },
    {
      kicker: "DIFFUSION // CONDITIONED ON “Takumi Shoda”",
      title: "Now generate.",
      lines: [
        "The label becomes the condition.",
        "Noise resolves into what I have shipped.",
      ],
    },
    {
      kicker: "DENOISE // t = 800 → 400",
      items: [
        { label: "Food-not-food-text-classifier", note: "fine-tuned distilBERT" },
        { label: "Rossmann-Store-Sales", note: "sales forecasting" },
        { label: "basic-CNN-model", note: "CIFAR10" },
      ],
    },
    {
      kicker: "DENOISE // t = 200 → 50",
      items: [
        { label: "Pokemon Picture Book", note: "Pokemon Picture Book" },
        { label: "Discord-like App", note: "realtime chat" },
        { label: "Notebook App", note: "note application" },
      ],
    },
    {
      kicker: "t = 0 // RECONSTRUCTED",
      title: "That was me.",
      lines: ["Same input, all the way down."],
    },
  ],
};

const JA: Dictionary = {
  role: "機械学習エンジニア",
  cue: "スクロールして畳み込む ↓",
  loading: "入力テンソルを読み込み中",
  languageLabel: "言語",
  navLabel: "章",
  classes: ["犬", "車", "植物", "庄田拓実", "ロボット", "コーヒー"],
  chapters: ["入力", "畳み込み", "プーリング", "特徴", "分類", "拡散"],
  translate: {
    encoder: "ENCODER // 原文",
    decoder: "DECODER // 訳文",
    caption: "このページを再エンコード中",
  },
  beats: [
    {
      kicker: "INPUT // 224×224 → 16×16",
      title: "CatInPajamas",
      lines: ["機械学習エンジニア"],
    },
    {
      kicker: "INPUT // グレースケールテンソル",
      lines: [
        "これが生の入力。",
        "この先に見えるものは、すべてここから計算されている。",
        "畳み込みは本当に走っている。",
      ],
    },
    {
      kicker: "CONV_01 // 3×3 カーネル, 4 マップ",
      title: "統計的に考える",
      lines: ["広い視野から、ピンポイントのピクセルを信じない。"],
    },
    {
      kicker: "CONV_01 // ReLU",
      title: "意図をもって作る",
      lines: ["発火したものを残し、それ以外は捨てる。"],
    },
    {
      kicker: "MAXPOOL // 2×2, ストライド 2",
      title: "繰り返して磨く",
      lines: ["解像度は半分に、信号はそのまま。"],
    },
    {
      kicker: "MAXPOOL // 私について",
      lines: [
        "モノづくりが好きな、駆け出しエンジニア。",
        "こいつは旺盛な好奇心と、挑戦欲で動いている。",
        "プロテインと同じ勢いで、知識と技術を吸収する。",
      ],
    },
    {
      kicker: "CONV_02 // 深い特徴",
      items: [
        { label: "E資格", note: "2026.03" },
        { label: "AWS ML Engineer – Associate", note: "2025.12" },
        { label: "Python3 データ分析試験", note: "2024.10" },
      ],
    },
    {
      kicker: "CONV_03 // 深い特徴",
      items: [
        { label: "AWS Solutions Architect – Associate", note: "2024.09" },
        { label: "Java Programmer Gold SE 11", note: "2024.03" },
        { label: "Java Programmer Silver SE 11", note: "2023.12" },
      ],
    },
    {
      kicker: "DENSE // FLATTEN → LOGITS",
      title: "6つのクラス。",
      lines: ["そのうちのひとつが私です。"],
    },
    {
      kicker: "SOFTMAX // ARGMAX",
      title: "→ 庄田拓実",
      items: [
        { label: "Python · PyTorch", note: "機械学習" },
        { label: "TypeScript · Node.js", note: "ウェブ" },
        { label: "Docker · Git · AWS", note: "インフラ" },
      ],
    },
    {
      kicker: "DIFFUSION // 条件は「庄田拓実」",
      title: "では、生成する。",
      lines: [
        "ラベルがそのまま条件になる。",
        "ノイズが、作ってきたものへ収束していく。",
      ],
    },
    {
      kicker: "DENOISE // t = 800 → 400",
      items: [
        {
          label: "Food-not-food-text-classifier",
          note: "distilBERT のファインチューニング",
        },
        { label: "Rossmann-Store-Sales", note: "売上予測" },
        { label: "basic-CNN-model", note: "CIFAR10" },
      ],
    },
    {
      kicker: "DENOISE // t = 200 → 50",
      items: [
        { label: "Pokemon Picture Book", note: "ポケモン図鑑" },
        { label: "Discord-like App", note: "リアルタイムチャット" },
        { label: "Notebook App", note: "ノートアプリ" },
      ],
    },
    {
      kicker: "t = 0 // 復元完了",
      title: "以上が、私です。",
      lines: ["最初から最後まで、入力はひとつ。"],
    },
  ],
};

const ZH: Dictionary = {
  role: "机器学习工程师",
  cue: "滚动滑轮以卷积 ↓",
  loading: "正在载入输入张量",
  languageLabel: "语言",
  navLabel: "章节",
  classes: ["狗", "车", "植物", "庄田拓実", "机器人", "咖啡"],
  chapters: ["输入", "卷积", "池化", "特征", "分类", "扩散"],
  translate: {
    encoder: "ENCODER // 原文",
    decoder: "DECODER // 译文",
    caption: "正在重新编码本页",
  },
  beats: [
    {
      kicker: "INPUT // 224×224 → 16×16",
      title: "CatInPajamas",
      lines: ["机器学习工程师"],
    },
    {
      kicker: "INPUT // 灰度张量",
      lines: [
        "这是原始输入。",
        "此后你看到的一切，都由它计算而来 ——",
        "下面的卷积是真的在跑。",
      ],
    },
    {
      kicker: "CONV_01 // 3×3 卷积核, 4 张特征图",
      title: "统计性地思考",
      lines: ["放眼大局，绝不轻信单个像素。"],
    },
    {
      kicker: "CONV_01 // ReLU",
      title: "意识性地创造",
      lines: ["留下被激活的，丢掉冗余的。"],
    },
    {
      kicker: "MAXPOOL // 2×2, 步长 2",
      title: "迭代性地打磨",
      lines: ["分辨率减半，信号照旧。"],
    },
    {
      kicker: "MAXPOOL // 关于我",
      lines: [
        "一个喜欢动手造东西的新手工程师。",
        "由旺盛的好奇心和挑战欲驱动。",
        "像喝蛋白粉一样，不停地消化吸收知识与技术。",
      ],
    },
    {
      kicker: "CONV_02 // 深层特征",
      items: [
        { label: "E资格", note: "2026.03" },
        { label: "AWS ML Engineer – Associate", note: "2025.12" },
        { label: "Python3 数据分析认证", note: "2024.10" },
      ],
    },
    {
      kicker: "CONV_02 // 深层特征",
      items: [
        { label: "AWS Solutions Architect – Associate", note: "2024.09" },
        { label: "Java Programmer Gold SE 11", note: "2024.03" },
        { label: "Java Programmer Silver SE 11", note: "2023.12" },
      ],
    },
    {
      kicker: "DENSE // FLATTEN → LOGITS",
      title: "六个类别。",
      lines: ["其中一个就是我。"],
    },
    {
      kicker: "SOFTMAX // ARGMAX",
      title: "→ 庄田拓実",
      items: [
        { label: "Python · PyTorch", note: "机器学习" },
        { label: "TypeScript · Node.js", note: "前端" },
        { label: "Docker · Git · AWS", note: "基础设施" },
      ],
    },
    {
      kicker: "DIFFUSION // 以「庄田拓実」为条件",
      title: "现在，开始生成。",
      lines: ["标签成为条件。", "噪声逐渐收敛成我做过的东西。"],
    },
    {
      kicker: "DENOISE // t = 800 → 400",
      items: [
        { label: "Food-not-food-text-classifier", note: "微调 distilBERT" },
        { label: "Rossmann-Store-Sales", note: "销量预测" },
        { label: "basic-CNN-model", note: "CIFAR10" },
      ],
    },
    {
      kicker: "DENOISE // t = 200 → 50",
      items: [
        { label: "Pokemon Picture Book", note: "宝可梦图鉴" },
        { label: "Discord-like App", note: "实时聊天" },
        { label: "Notebook App", note: "笔记应用" },
      ],
    },
    {
      kicker: "t = 0 // 已复原",
      title: "这就是我。",
      lines: ["从头到尾，输入只有一个。"],
    },
  ],
};

export const DICTIONARIES: Record<Lang, Dictionary> = { en: EN, ja: JA, zh: ZH };

/**
 * 翻訳オーバーレイに投げ込むための、その言語で表示されている文字列すべて。
 * 見出し・本文・項目名・クラス名・章名まで拾う。
 */
export const collectText = (lang: Lang): string[] => {
  const dictionary = DICTIONARIES[lang];
  const out: string[] = [dictionary.role, dictionary.cue];
  dictionary.beats.forEach((beat) => {
    out.push(beat.kicker);
    if (beat.title) out.push(beat.title);
    beat.lines?.forEach((line) => out.push(line));
    beat.items?.forEach((item) => out.push(item.label, item.note));
  });
  out.push(...dictionary.classes, ...dictionary.chapters);
  return out;
};

export interface Token {
  text: string;
  /** 語らしいか。句読点・記号は false */
  word: boolean;
}

const charClass = (ch: string): "han" | "kana" | "word" | "punct" => {
  if (/\p{Script=Han}/u.test(ch)) return "han";
  if (/[\p{Script=Hiragana}\p{Script=Katakana}ー々〆]/u.test(ch)) return "kana";
  if (/[\p{L}\p{N}_]/u.test(ch)) return "word";
  return "punct";
};

/**
 * Intl.Segmenter が無い環境向けの代替。
 * 文字種の境界で切り、漢字の連なりだけ 2 文字ずつに割る。
 * 語としては粗いが、字種をまたいだ切れ端は出さない。
 */
const segmentByScript = (text: string): Token[] => {
  const out: Token[] = [];
  let run = "";
  let cls: ReturnType<typeof charClass> | null = null;

  const flush = () => {
    if (!run) return;
    if (cls === "han") {
      (run.match(/.{1,2}/gu) ?? []).forEach((t) => out.push({ text: t, word: true }));
    } else if (cls === "kana" && run.length > 4) {
      (run.match(/.{1,3}/gu) ?? []).forEach((t) => out.push({ text: t, word: true }));
    } else {
      out.push({ text: run, word: true });
    }
    run = "";
  };

  for (const ch of text) {
    if (/\s/u.test(ch)) {
      flush();
      cls = null;
      continue;
    }
    const next = charClass(ch);
    if (next === "punct") {
      flush();
      out.push({ text: ch, word: false });
      cls = null;
      continue;
    }
    if (next !== cls) {
      flush();
      cls = next;
    }
    run += ch;
  }
  flush();
  return out;
};

/**
 * 語の切り出し。ブラウザの Intl.Segmenter（ICU の辞書分割）に任せるので、
 * 中国語・日本語も意味の単位で割れる。ロケールは原文の言語に合わせる。
 */
export const tokenize = (texts: string[], lang: Lang): Token[] => {
  const segmenter = "Segmenter" in Intl
    ? new Intl.Segmenter(lang === "zh" ? "zh-CN" : lang, {
      granularity: "word",
    })
    : null;

  if (!segmenter) return texts.flatMap(segmentByScript);

  const out: Token[] = [];
  for (const text of texts) {
    for (const part of segmenter.segment(text)) {
      const trimmed = part.segment.trim();
      if (!trimmed) continue;
      out.push({ text: trimmed, word: part.isWordLike === true });
    }
  }
  return out;
};

export interface ResolvedBeat extends BeatText {
  from: number;
  to: number;
  items?: { label: string; note: string; href?: string }[];
  /** true ならこの拍は CONTACTS をアイコンで並べる */
  contacts?: boolean;
}

/** 文言（i18n）と位置・リンク先（content）を索引で突き合わせる */
export const getBeats = (lang: Lang): ResolvedBeat[] =>
  DICTIONARIES[lang].beats.map((text, index) => {
    const timing = BEAT_TIMING[index];
    return {
      ...text,
      from: timing.from,
      to: timing.to,
      contacts: timing.contacts,
      items: text.items?.map((item, i) => ({
        ...item,
        href: timing.hrefs?.[i],
      })),
    };
  });

const STORAGE_KEY = "ns-lang";

const isLang = (value: string | null): value is Lang =>
  LANGUAGES.some((entry) => entry.code === value);

/** 保存済みの選択 → ブラウザの言語 → 既定値 の順に決める */
export const detectLanguage = (): Lang => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLang(stored)) return stored;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === "ja") return "ja";
    if (primary === "zh") return "zh";
    if (primary === "en") return "en";
  }
  return DEFAULT_LANG;
};

export const storeLanguage = (lang: Lang): void => {
  localStorage.setItem(STORAGE_KEY, lang);
};

/** html の lang 属性。中文は簡体字を想定する */
export const htmlLang = (lang: Lang): string =>
  lang === "zh" ? "zh-CN" : lang;
