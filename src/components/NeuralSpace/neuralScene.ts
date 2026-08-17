import {
  CatmullRomCurve3,
  Color,
  FogExp2,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import iconImage from "../../assets/misc/icon.jpg";
import outputImage from "../../assets/misc/me.png";
import { imageToInput, loadImage, runCnn } from "./cnn";
import {
  ARCHITECTURE,
  BEAT_TIMING,
  CHAPTERS,
  FLIGHT_CAMERA,
  FLIGHT_TARGET,
  INPUT_SIZE,
  SEED,
  STAGE_LAYOUT,
  STAGE_NAMES,
  STAGE_WINDOWS,
  STAGE_Z,
  TRANSLATE_COMMIT_AT,
  TRANSLATE_DURATION,
  TRANSLATE_RIG,
  WARM_ACCENT,
  WINNER_BIAS,
  WINNER_INDEX,
} from "./content";
import {
  collectText,
  DICTIONARIES,
  type Lang,
  type Token,
  tokenize,
} from "./i18n";
import { buildTranslateRig, type TranslateRig } from "./translateRig";
import {
  buildCells,
  buildDiffusionPlanes,
  buildDust,
  buildInputPlane,
  buildKernelWindow,
  type CellMesh,
  cellPosition,
  createIconTexture,
  createSharedUniforms,
  disposeHierarchy,
  type KernelWindow,
  type PlaneEntry,
} from "./models";

gsap.registerPlugin(ScrollTrigger);

const BACKGROUND = 0x030712;
const ACCENT_ELECTRIC = new Color("#00f3ff");
const ACCENT_MIDNIGHT = new Color("#a855f7");
const ACCENT_WARM = new Color(WARM_ACCENT);
/** マウス視差のオフセット上限 */
const PARALLAX_MAX = 1;
/** 入場カットの開始位置 */
const INTRO_START = new Vector3(0, 2.5, 36);
/**
 * ここから下の区間はすべて content.ts のタイムラインに従属する。
 * クラス行は STAGE_WINDOWS[4] = [0.68, 0.80] で走査され、
 * 拡散の拍は BEAT_TIMING[10] の 0.83 から始まる。
 */
/** 暗夜パープルへ寄っていく区間（分類 → 拡散） */
const SHIFT_RANGE: [number, number] = [0.62, 0.86];
/** 勝ちクラスが確定する瞬間。走査が終わる 0.80 の直前に合わせる */
const SELECT_RANGE: [number, number] = [0.755, 0.82];
/**
 * クラス名の表示。棒が育ちはじめる前に出し、拡散フェーズに入るまで残す。
 * 実際にはカメラがクラス行（z = -64）を追い越す p ≒ 0.836 で
 * CSS2DRenderer が視錐台の外として隠すので、この out はその保険。
 */
const CLASS_LABEL_IN: [number, number] = [0.64, 0.70];
const CLASS_LABEL_OUT: [number, number] = [0.92, 0.86];

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface SceneStats {
  chapter: number;
  fps: number;
  accent: string;
  cells: number;
  time: number;
  progress: number;
  mode: number;
  /** softmax の勝ちクラスの確率 */
  winnerProbability: number;
}

export interface NeuralSceneOptions {
  webgl: HTMLElement;
  css2d: HTMLElement;
  scroller: HTMLElement;
  track: HTMLElement;
  lang: Lang;
  onChapter: (index: number) => void;
  onBeat: (index: number) => void;
  /** 3D のターゲット言語トークンがクリックされたとき */
  onLanguage: (lang: Lang) => void;
}

export class NeuralScene {
  readonly stats: SceneStats;

  private readonly options: NeuralSceneOptions;
  private readonly reduced: boolean;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;

  private readonly shared: ReturnType<typeof createSharedUniforms>;
  private readonly cells: CellMesh;
  private readonly kernel: KernelWindow;
  private readonly inputPlane: PlaneEntry;
  private readonly diffusion: PlaneEntry[];
  /** 言語切り替えのときだけ現れる翻訳オーバーレイ */
  private readonly rig: TranslateRig;
  private readonly result: ReturnType<typeof runCnn>;

  private readonly flightPath: CatmullRomCurve3;
  private readonly targetPath: CatmullRomCurve3;

  private readonly stageLabels: { object: CSS2DObject; element: HTMLElement }[] =
    [];
  private readonly classLabels: { object: CSS2DObject; element: HTMLElement }[] =
    [];


  private readonly parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private readonly basePosition = new Vector3();
  private readonly baseTarget = new Vector3();
  private readonly tintColor = new Color();
  private readonly scratch = new Vector3();
  private readonly cornerA = new Vector3();
  private readonly cornerB = new Vector3();
  private readonly cornerC = new Vector3();
  private readonly cornerD = new Vector3();
  private readonly targetCell = new Vector3();
  /** 翻訳オーバーレイの位相と濃さ */
  private readonly translate = { t: 0, reveal: 0 };

  private trigger: ScrollTrigger | null = null;
  private frame = 0;
  private previousTime = 0;
  private elapsedTime = 0;
  private progress = 0;
  private targetProgress = 0;
  private chapter = 0;
  private beat = -1;

  private readonly intro = { value: 1 };
  private mode = 0;
  private accum = 0;
  private lastScroll = 0;
  private lastShift = -1;
  private lastVeil = -1;
  private rigActive = false;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private visible = true;


  /** 画像の読み込みと CNN の実計算を終えてからシーンを組む */
  static async create(options: NeuralSceneOptions): Promise<NeuralScene> {
    // 入力（畳み込む絵）と、拡散が生成する絵は別のファイル
    const [image, output] = await Promise.all([
      loadImage(iconImage),
      loadImage(outputImage),
    ]);
    return new NeuralScene(options, image, output);
  }

  private constructor(
    options: NeuralSceneOptions,
    image: HTMLImageElement,
    /** 拡散が生成する絵 */
    output: HTMLImageElement,
  ) {
    this.options = options;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pixelRatio = Math.min(devicePixelRatio, 2);
    const mobile = innerWidth < 820;

    this.scene.background = new Color(BACKGROUND);
    this.scene.fog = new FogExp2(BACKGROUND, 0.006);

    this.camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);

    this.renderer = new WebGLRenderer({
      antialias: !mobile,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(pixelRatio);
    options.webgl.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(innerWidth, innerHeight);
    options.css2d.appendChild(this.labelRenderer.domElement);

    this.shared = createSharedUniforms(pixelRatio, innerHeight * 0.5);

    // --- ここが本体：本人のアイコンを実際に畳み込む ---
    const input = imageToInput(image, INPUT_SIZE);
    this.result = runCnn(input, ARCHITECTURE, SEED, {
      index: WINNER_INDEX,
      amount: WINNER_BIAS,
    });

    const inputTexture = createIconTexture(image);
    // 拡散側は生成後の絵。入力とは別の画像を使う
    const outputTexture = createIconTexture(output);
    this.cells = buildCells(this.result, this.shared);
    this.scene.add(this.cells.mesh);

    this.inputPlane = buildInputPlane(this.shared, inputTexture);
    this.scene.add(this.inputPlane.mesh);

    this.diffusion = buildDiffusionPlanes(this.shared, outputTexture);
    this.diffusion.forEach((entry) => {
      entry.opacity.value = 0;
      this.scene.add(entry.mesh);
    });

    this.kernel = buildKernelWindow();
    this.scene.add(this.kernel.lines);

    // オーバーレイはカメラの子。飛行位置に関係なく同じ画角へ出るようにする。
    // そのためにカメラ自身をシーンへ入れておく必要がある
    this.rig = buildTranslateRig(this.shared);
    this.rig.fit(innerWidth / innerHeight);
    this.camera.add(this.rig.group);
    this.scene.add(this.camera);

    this.scene.add(buildDust(this.shared, mobile ? 260 : 620));

    this.flightPath = new CatmullRomCurve3(
      FLIGHT_CAMERA.map(([x, y, z]) => new Vector3(x, y, z)),
      false,
      "centripetal",
    );
    this.targetPath = new CatmullRomCurve3(
      FLIGHT_TARGET.map(([x, y, z]) => new Vector3(x, y, z)),
      false,
      "centripetal",
    );

    this.buildLabels();
    this.rig.update(0, 0);

    this.stats = {
      chapter: 0,
      fps: 60,
      accent: `#${ACCENT_ELECTRIC.getHexString()}`,
      cells: this.cells.mesh.count,
      time: 0,
      progress: 0,
      mode: 0,
      winnerProbability: this.result.probabilities[this.result.winner],
    };

    this.setupScroll();

    addEventListener("resize", this.handleResize);
    addEventListener("pointermove", this.handlePointerMove);
    addEventListener("wheel", this.handleWheel, { passive: false });
    addEventListener("touchstart", this.handleTouchStart, { passive: true });
    addEventListener("touchmove", this.handleTouchMove, { passive: false });
    document.addEventListener("visibilitychange", this.handleVisibility);

    gsap.to(this.intro, {
      value: 0,
      duration: this.reduced ? 0.01 : 2.4,
      ease: "power3.inOut",
    });

    this.frame = requestAnimationFrame(this.tick);
  }

  /* ---------------------------------------------------------------
     ラベル（3D 空間に置く層名とクラス名）
     --------------------------------------------------------------- */

  private buildLabels(): void {
    STAGE_NAMES.forEach((name, index) => {
      const element = document.createElement("div");
      element.className = "ns-tag3d";
      element.textContent = name;
      const object = new CSS2DObject(element);
      const stage = this.result.stages[index];
      const spread = stage.kind === "dense"
        ? 6.4
        : (STAGE_LAYOUT[index].radius || stage.grid * STAGE_LAYOUT[index].cell * 0.5) +
          stage.grid * STAGE_LAYOUT[index].cell * 0.5 + 1.2;
      object.position.set(0, spread, STAGE_Z[index]);
      this.scene.add(object);
      this.stageLabels.push({ object, element });
    });

    const dense = this.result.stages[this.result.stages.length - 1];
    DICTIONARIES[this.options.lang].classes.forEach((name, index) => {
      const element = document.createElement("div");
      element.className = "ns-class3d";
      const probability = dense.activation[0][index];
      const nameEl = document.createElement("span");
      nameEl.className = "ns-class-name";
      nameEl.textContent = name;
      const probEl = document.createElement("span");
      probEl.className = "ns-class-prob";
      probEl.textContent = `${(probability * 100).toFixed(1)}%`;
      element.append(nameEl, probEl);
      if (index === this.result.winner) element.classList.add("is-winner");

      const object = new CSS2DObject(element);
      cellPosition(this.result, this.result.stages.length - 1, 0, 0, index, this.scratch);
      object.position.set(this.scratch.x, this.scratch.y - 1.4, this.scratch.z);
      this.scene.add(object);
      this.classLabels.push({ object, element });
    });
  }

  /* ---------------------------------------------------------------
     公開 API
     --------------------------------------------------------------- */

  /** 3D 側で言語に依るのはクラス名のラベルだけ。本文は React が持つ */
  setLanguage(lang: Lang): void {
    this.options.lang = lang;
    const names = DICTIONARIES[lang].classes;
    this.classLabels.forEach((label, index) => {
      const name = label.element.querySelector(".ns-class-name");
      if (name) name.textContent = names[index];
    });
  }

  /**
   * 言語タグを押したときの翻訳演出。
   * いま出ている文字列を全部トークンにして encoder へ吸い込み、
   * cross-attention を張って、目標言語で出し直す。
   * 途中（TRANSLATE_COMMIT_AT）で本文の差し替えを React へ投げる。
   */
  playTranslation(from: Lang, to: Lang): void {
    const sourceTokens = tokenize(collectText(from), from);
    const targetTokens = tokenize(collectText(to), to);
    /**
     * ラベルに出すのは間引いたぶんだけ（総数は見出しに添える）。
     * 句読点は数には入るが並べても読めないので外し、助詞のような 1 字語より
     * 内容語を優先する。足りなければ 1 字語で埋める。重複は 1 つに畳む。
     */
    const thin = (list: Token[]) => {
      const words = list.filter((token) => token.word);
      const pick = (source: Token[], out: string[]) => {
        if (out.length >= TRANSLATE_RIG.maxTokens || source.length === 0) return;
        const step = Math.max(
          1,
          Math.floor(source.length / TRANSLATE_RIG.maxTokens),
        );
        for (let i = 0; i < source.length; i += step) {
          if (out.length >= TRANSLATE_RIG.maxTokens) break;
          const text = source[i].text;
          if (!out.includes(text)) out.push(text);
        }
      };
      const out: string[] = [];
      pick(words.filter((token) => token.text.length > 1), out);
      pick(words, out);
      return out;
    };
    this.rig.setTexts(
      thin(sourceTokens),
      thin(targetTokens),
      [sourceTokens.length, targetTokens.length],
      DICTIONARIES[to].translate,
    );

    gsap.killTweensOf(this.translate);
    this.translate.t = 0;
    const duration = this.reduced ? 0.02 : TRANSLATE_DURATION;

    gsap.to(this.translate, {
      reveal: 1,
      duration: this.reduced ? 0.01 : 0.4,
      ease: "power2.out",
    });
    gsap.to(this.translate, {
      t: 1,
      duration,
      ease: "none",
      onComplete: () => {
        gsap.to(this.translate, {
          reveal: 0,
          duration: this.reduced ? 0.01 : 0.55,
          ease: "power2.in",
        });
      },
    });
    gsap.delayedCall(duration * TRANSLATE_COMMIT_AT, () => {
      this.options.onLanguage(to);
    });
  }

  scrollToChapter(index: number): void {
    const scroller = this.options.scroller;
    const max = scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTo({
      top: CHAPTERS[index].at * max,
      behavior: this.reduced ? "auto" : "smooth",
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    removeEventListener("resize", this.handleResize);
    removeEventListener("pointermove", this.handlePointerMove);
    removeEventListener("wheel", this.handleWheel);
    removeEventListener("touchstart", this.handleTouchStart);
    removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("visibilitychange", this.handleVisibility);

    this.trigger?.kill();
    gsap.killTweensOf(this.intro);
    gsap.killTweensOf(this.translate);

    [...this.stageLabels, ...this.classLabels].forEach(
      ({ object, element }) => {
        object.removeFromParent();
        element.remove();
      },
    );

    this.rig.dispose();
    disposeHierarchy(this.scene);
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();

    document.documentElement.style.removeProperty("--ns-accent");
    document.documentElement.style.removeProperty("--ns-accent-rgb");
    document.documentElement.style.removeProperty("--ns-veil");
    document.body.style.cursor = "";
  }

  /* ---------------------------------------------------------------
     スクロール
     --------------------------------------------------------------- */

  private setupScroll(): void {
    const scroller = this.options.scroller;
    this.lastScroll = scroller.scrollTop;

    // トラック全体で 1 本。progress がそのまま飛行距離であり演算の進行でもある
    this.trigger = ScrollTrigger.create({
      scroller,
      trigger: this.options.track,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        this.targetProgress = self.progress;
        this.readDirection(self.scroll());
      },
    });
    this.targetProgress = this.trigger.progress;
    this.progress = this.targetProgress;
  }

  /** 1px ごとに反転すると目がちらつくので、累積がしきい値を越えたときだけ */
  private readDirection(scroll: number): void {
    const delta = scroll - this.lastScroll;
    this.lastScroll = scroll;
    if (Math.abs(delta) < 0.4) return;
    this.accum =
      (delta > 0 ? Math.max(this.accum, 0) : Math.min(this.accum, 0)) + delta;
    if (Math.abs(this.accum) > 18) {
      this.mode = this.accum > 0 ? 0 : 1;
      this.accum = 0;
    }
  }

  /* ---------------------------------------------------------------
     カメラ
     --------------------------------------------------------------- */

  private updateCamera(delta: number): void {
    this.flightPath.getPoint(this.progress, this.basePosition);
    this.targetPath.getPoint(this.progress, this.baseTarget);

    if (this.intro.value > 0.001) {
      this.basePosition.lerp(INTRO_START, this.intro.value);
    }

    const damping = 1 - Math.pow(0.001, delta);
    this.parallax.x += (this.parallax.targetX - this.parallax.x) * damping;
    this.parallax.y += (this.parallax.targetY - this.parallax.y) * damping;

    this.camera.position.set(
      this.basePosition.x + this.parallax.x,
      this.basePosition.y + this.parallax.y,
      this.basePosition.z,
    );
    this.camera.lookAt(this.baseTarget);
  }

  /* ---------------------------------------------------------------
     演算の可視化
     --------------------------------------------------------------- */

  /**
   * いま走査している層の受容野を描く。
   * conv なら k×k の窓、pool なら 2×2 の窓が入力側に立ち、
   * そこから出力の 1 マスへ 4 本が収束する。
   */
  private updateKernelWindow(): void {
    const positions = this.kernel.positions;
    let cursor = 0;
    const segment = (a: Vector3, b: Vector3) => {
      positions[cursor++] = a.x;
      positions[cursor++] = a.y;
      positions[cursor++] = a.z;
      positions[cursor++] = b.x;
      positions[cursor++] = b.y;
      positions[cursor++] = b.z;
    };

    let active = -1;
    let local = 0;
    for (let s = 1; s <= 3; s++) {
      const [from, to] = STAGE_WINDOWS[s];
      if (this.progress >= from && this.progress <= to) {
        active = s;
        local = (this.progress - from) / (to - from);
        break;
      }
    }

    if (active < 0) {
      this.kernel.material.opacity = 0;
      return;
    }

    const stage = this.result.stages[active];
    const area = stage.grid * stage.grid;
    const index = Math.min(area - 1, Math.floor(local * area));
    const row = Math.floor(index / stage.grid);
    const col = index % stage.grid;
    const k = stage.kernel;
    const stride = stage.stride;
    const source = active - 1;
    const half = STAGE_LAYOUT[source].cell * 0.6;

    const r0 = row * stride;
    const c0 = col * stride;
    cellPosition(this.result, source, 0, r0, c0, this.cornerA);
    cellPosition(this.result, source, 0, r0, c0 + k - 1, this.cornerB);
    cellPosition(this.result, source, 0, r0 + k - 1, c0 + k - 1, this.cornerC);
    cellPosition(this.result, source, 0, r0 + k - 1, c0, this.cornerD);
    this.cornerA.add(this.scratch.set(-half, half, 0.35));
    this.cornerB.add(this.scratch.set(half, half, 0.35));
    this.cornerC.add(this.scratch.set(half, -half, 0.35));
    this.cornerD.add(this.scratch.set(-half, -half, 0.35));

    segment(this.cornerA, this.cornerB);
    segment(this.cornerB, this.cornerC);
    segment(this.cornerC, this.cornerD);
    segment(this.cornerD, this.cornerA);

    cellPosition(this.result, active, 0, row, col, this.targetCell);
    this.targetCell.z += 0.35;

    if (stage.kind === "pool" && stage.argmax) {
      // maxpool は 4 つのうち 1 つしか通らない。採られたマスだけを結ぶ
      const best = stage.argmax[0][index];
      cellPosition(
        this.result,
        source,
        0,
        r0 + Math.floor(best / k),
        c0 + (best % k),
        this.scratch,
      );
      this.scratch.z += 0.35;
      segment(this.scratch, this.targetCell);
      const w = STAGE_LAYOUT[source].cell * 0.42;
      this.cornerA.set(this.scratch.x - w, this.scratch.y + w, this.scratch.z);
      this.cornerB.set(this.scratch.x + w, this.scratch.y + w, this.scratch.z);
      this.cornerC.set(this.scratch.x + w, this.scratch.y - w, this.scratch.z);
      this.cornerD.set(this.scratch.x - w, this.scratch.y - w, this.scratch.z);
      segment(this.cornerA, this.cornerB);
      segment(this.cornerB, this.cornerC);
      segment(this.cornerC, this.cornerD);
      segment(this.cornerD, this.cornerA);
    } else {
      // conv は受容野の全体が 1 マスへ畳み込まれる
      segment(this.cornerA, this.targetCell);
      segment(this.cornerB, this.targetCell);
      segment(this.cornerC, this.targetCell);
      segment(this.cornerD, this.targetCell);
    }

    const t = STAGE_LAYOUT[active].cell * 0.62;
    this.cornerA.set(this.targetCell.x - t, this.targetCell.y + t, this.targetCell.z);
    this.cornerB.set(this.targetCell.x + t, this.targetCell.y + t, this.targetCell.z);
    this.cornerC.set(this.targetCell.x + t, this.targetCell.y - t, this.targetCell.z);
    this.cornerD.set(this.targetCell.x - t, this.targetCell.y - t, this.targetCell.z);
    segment(this.cornerA, this.cornerB);
    segment(this.cornerB, this.cornerC);
    segment(this.cornerC, this.cornerD);
    segment(this.cornerD, this.cornerA);

    this.kernel.lines.geometry.attributes.position.needsUpdate = true;
    // 端では消して、走査の途中だけ出す
    this.kernel.material.opacity = 0.85 *
      Math.min(smoothstep(0, 0.06, local), smoothstep(1, 0.94, local));
  }

  private updateStages(): void {
    const p = this.progress;
    this.shared.uWave.value = p;

    // 写真 → マス目のクロスフェード
    this.inputPlane.opacity.value = 1 - smoothstep(0.05, 0.2, p);

    // 拡散トンネルは分類が読み終わってから立ち上がる
    const reveal = smoothstep(0.79, 0.87, p);
    this.diffusion.forEach((entry, index) => {
      const last = index === this.diffusion.length - 1;
      entry.opacity.value = last
        ? smoothstep(0.93, 0.98, p)
        : 0.95 * reveal;
    });

    this.cells.select.value = smoothstep(SELECT_RANGE[0], SELECT_RANGE[1], p);
    this.shared.uColorShift.value = smoothstep(
      SHIFT_RANGE[0],
      SHIFT_RANGE[1],
      p,
    );

    // 層名は近づいたときだけ出す
    this.stageLabels.forEach((label, index) => {
      const [from, to] = STAGE_WINDOWS[index];
      const near = Math.min(
        smoothstep(from - 0.09, from - 0.01, p),
        smoothstep(to + 0.1, to + 0.01, p),
      );
      label.element.style.opacity = near.toFixed(3);
    });

    const classVisible = Math.min(
      smoothstep(CLASS_LABEL_IN[0], CLASS_LABEL_IN[1], p),
      smoothstep(CLASS_LABEL_OUT[0], CLASS_LABEL_OUT[1], p),
    );
    this.classLabels.forEach((label) => {
      label.element.style.opacity = classVisible.toFixed(3);
    });

    let chapter = 0;
    CHAPTERS.forEach((c, index) => {
      if (p >= c.at - 0.02) chapter = index;
    });
    if (chapter !== this.chapter) {
      this.chapter = chapter;
      this.stats.chapter = chapter;
      this.options.onChapter(chapter);
    }

    let beat = BEAT_TIMING.length - 1;
    for (let i = 0; i < BEAT_TIMING.length; i++) {
      if (p >= BEAT_TIMING[i].from && p < BEAT_TIMING[i].to) {
        beat = i;
        break;
      }
    }
    if (beat !== this.beat) {
      this.beat = beat;
      this.options.onBeat(beat);
    }
  }

  /* ---------------------------------------------------------------
     翻訳オーバーレイ
     --------------------------------------------------------------- */

  private updateTranslation(): void {
    const reveal = this.translate.reveal;
    // 演出中は世界側だけ沈めて、図が読めるようにする
    this.shared.uDim.value = 1 - 0.8 * reveal;

    // 本文やナビも同じ量だけ引っ込める（CSS 側で opacity に使う）
    if (Math.abs(reveal - this.lastVeil) > 0.004) {
      this.lastVeil = reveal;
      document.documentElement.style.setProperty("--ns-veil", reveal.toFixed(3));
    }

    // 0 になった最後の 1 フレームだけは必ず流し込む。
    // 早期 return だけだとラベルが最後の不透明度のまま残る
    if (reveal < 0.001) {
      if (this.rigActive) {
        this.rig.update(this.translate.t, 0);
        this.rigActive = false;
      }
      return;
    }
    this.rigActive = true;
    this.rig.update(this.translate.t, reveal);
  }

  /* ---------------------------------------------------------------
     テーマ色
     --------------------------------------------------------------- */

  private syncTheme(): void {
    const shift = this.shared.uColorShift.value;
    const mode = this.shared.uMode.value;
    const key = shift + mode * 4;
    if (Math.abs(key - this.lastShift) < 0.002) return;
    this.lastShift = key;

    this.tintColor.copy(ACCENT_ELECTRIC).lerp(ACCENT_MIDNIGHT, shift);
    this.tintColor.lerp(ACCENT_WARM, mode * 0.7);
    this.kernel.material.color.copy(this.tintColor);

    const hex = this.tintColor.getHexString();
    this.stats.accent = `#${hex}`;
    const rgb = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ].join(", ");

    const root = document.documentElement.style;
    root.setProperty("--ns-accent", `#${hex}`);
    root.setProperty("--ns-accent-rgb", rgb);
  }

  /* ---------------------------------------------------------------
     メインループ
     --------------------------------------------------------------- */

  private tick = (now: number): void => {
    this.frame = requestAnimationFrame(this.tick);
    if (!this.visible) return;

    const delta = this.previousTime === 0
      ? 0
      : Math.min((now - this.previousTime) / 1000, 0.05);
    this.previousTime = now;
    this.elapsedTime += delta;

    this.shared.uTime.value = this.elapsedTime;
    this.stats.time = this.elapsedTime;

    // スクロールを減衰追従させる。慣性が「進んでいる」感触になる。
    // 底を上げるほど追従が緩み、急に動かしても画面は滑って追いつく
    const ease = this.reduced ? 1 : 1 - Math.pow(0.02, delta);
    this.progress += (this.targetProgress - this.progress) * ease;
    this.shared.uMode.value +=
      (this.mode - this.shared.uMode.value) *
      (this.reduced ? 1 : 1 - Math.pow(0.02, delta));
    this.stats.progress = this.progress;
    this.stats.mode = this.shared.uMode.value;

    this.updateStages();
    this.updateCamera(delta);
    this.updateKernelWindow();
    this.updateTranslation();
    this.syncTheme();

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    this.fpsAccumulator += delta;
    this.fpsFrames += 1;
    if (this.fpsAccumulator > 0.5) {
      this.stats.fps = this.fpsFrames / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.parallax.targetX =
      MathUtils.clamp((event.clientX / innerWidth) * 2 - 1, -1, 1) *
      PARALLAX_MAX;
    this.parallax.targetY =
      MathUtils.clamp(-(event.clientY / innerHeight) * 2 + 1, -1, 1) *
      PARALLAX_MAX * 0.7;
  };

  /**
   * ドットナビや本文リンクは .ns-scroller の外にあるので、その上でホイールを
   * 回すとイベントがスクロール可能な祖先に届かず捨てられてしまう。
   * スクローラの外で起きたぶんは手で送り込む。
   */
  private handleWheel = (event: WheelEvent): void => {
    const scroller = this.options.scroller;
    if (scroller.contains(event.target as Node)) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    scroller.scrollTop += event.deltaY * unit;
  };

  private touchY = 0;

  private handleTouchStart = (event: TouchEvent): void => {
    this.touchY = event.touches[0]?.clientY ?? 0;
  };

  private handleTouchMove = (event: TouchEvent): void => {
    const scroller = this.options.scroller;
    const touch = event.touches[0];
    if (!touch || scroller.contains(event.target as Node)) return;
    event.preventDefault();
    scroller.scrollTop += this.touchY - touch.clientY;
    this.touchY = touch.clientY;
  };

  private handleVisibility = (): void => {
    this.visible = document.visibilityState !== "hidden";
    this.previousTime = 0;
  };

  private handleResize = (): void => {
    const pixelRatio = Math.min(devicePixelRatio, 2);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.labelRenderer.setSize(innerWidth, innerHeight);
    this.shared.uPixelRatio.value = pixelRatio;
    this.shared.uViewScale.value = innerHeight * 0.5;
    this.rig.fit(innerWidth / innerHeight);
    ScrollTrigger.refresh();
  };
}
