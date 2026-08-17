import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  MathUtils,
  Object3D,
  ShaderMaterial,
} from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RIG_FRAG, RIG_LINE_FRAG, RIG_LINE_VERT, RIG_VERT } from "./shaders";
import { TRANSLATE_PHASES, TRANSLATE_RIG } from "./content";
import { PALETTE, type SharedUniforms } from "./models";

/**
 * 言語タグを押したときに走る翻訳オーバーレイ。
 *
 * カメラの子として組むので、スクロール位置がどこでも同じ画角に出る。
 * 段は上から下へ:
 *   原文トークン（読み順のグリッド）
 *     → 埋め込みベクトル（格ごとの縦積み）
 *       → encoder → cross-attention → decoder
 *         → 出力ベクトル → 訳文トークン（読み順のグリッド）
 *
 * 位置と明るさは CPU 側で決めて instanceMatrix / aLit に流す。
 * 短時間しか出ない演出なので、CPU で持つほうが素直。
 */
export interface TranslateRig {
  group: Group;
  setTexts: (
    source: string[],
    target: string[],
    counts: [number, number],
    labels: { encoder: string; decoder: string; caption: string },
  ) => void;
  /** t は 0..1 の位相、reveal は全体の濃さ */
  update: (t: number, reveal: number) => void;
  /** 画角に収まるよう横幅を詰める */
  fit: (aspect: number) => void;
  dispose: () => void;
}

const between = (from: number, to: number, x: number) =>
  MathUtils.clamp((x - from) / (to - from), 0, 1);

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** 文字列から決定的な擬似埋め込み。トークンごとにベクトルの模様が変わる */
const embeddingOf = (token: string, dims: number): Float32Array => {
  const out = new Float32Array(dims);
  for (let k = 0; k < dims; k++) {
    let hash = 2166136261 ^ (k * 16777619);
    for (let i = 0; i < token.length; i++) {
      hash = Math.imul(hash ^ token.charCodeAt(i), 16777619);
    }
    out[k] = ((hash >>> 0) % 1000) / 1000;
  }
  return out;
};

export const buildTranslateRig = (shared: SharedUniforms): TranslateRig => {
  const R = TRANSLATE_RIG;
  const group = new Group();
  group.position.set(0, 0, R.depth);

  const tokens = R.maxTokens;
  const bars = R.bars;
  const dims = R.embedCells;
  const rows = Math.ceil(tokens / R.cols);

  // 索引の割り当て（1 つの InstancedMesh に全部入れる）
  const SRC_TOKEN = 0;
  const SRC_EMBED = SRC_TOKEN + tokens;
  const ENC_BAR = SRC_EMBED + bars * dims;
  const DEC_BAR = ENC_BAR + bars;
  const TGT_EMBED = DEC_BAR + bars;
  const TGT_TOKEN = TGT_EMBED + bars * dims;
  const total = TGT_TOKEN + tokens;

  /* --- 箱 --- */
  const geometry = new BoxGeometry(1, 1, 1);
  const lit = new Float32Array(total);
  const kinds = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    kinds[i] = i < SRC_EMBED ? 0 : i < TGT_EMBED ? 1 : i < TGT_TOKEN ? 1 : 2;
  }
  // 出力ベクトルは訳文側なので明るく寄せる
  for (let i = TGT_EMBED; i < TGT_TOKEN; i++) kinds[i] = 1.6;

  const litAttribute = new InstancedBufferAttribute(lit, 1);
  litAttribute.setUsage(35048); // DynamicDrawUsage
  geometry.setAttribute("aLit", litAttribute);
  geometry.setAttribute("aKind", new InstancedBufferAttribute(kinds, 1));

  const boxMaterial = new ShaderMaterial({
    uniforms: {
      uColorShift: shared.uColorShift,
      uMode: shared.uMode,
      uColorWarm: shared.uColorWarm,
      uColorShifted: shared.uColorShifted,
      uReveal: { value: 0 },
      uColorLow: { value: PALETTE.low.clone() },
      uColorHigh: { value: PALETTE.high.clone() },
    },
    vertexShader: RIG_VERT,
    fragmentShader: RIG_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });

  const boxes = new InstancedMesh(geometry, boxMaterial, total);
  boxes.frustumCulled = false;
  boxes.renderOrder = 10;
  group.add(boxes);

  /* --- cross-attention（格 × 格） --- */
  const cellX = (index: number) =>
    (index - (bars - 1) / 2) * (R.barSpan / bars);

  const pairs = bars * bars;
  const linePositions = new Float32Array(pairs * 2 * 3);
  const lineLit = new Float32Array(pairs * 2);
  const lineTargets = new Int16Array(pairs);
  const lineSources = new Int16Array(pairs);

  let vertex = 0;
  for (let t = 0; t < bars; t++) {
    for (let s = 0; s < bars; s++) {
      const pair = t * bars + s;
      lineTargets[pair] = t;
      lineSources[pair] = s;
      linePositions[vertex * 3] = cellX(s);
      linePositions[vertex * 3 + 1] = R.encoderY - R.cellHeight * 0.5;
      vertex++;
      linePositions[vertex * 3] = cellX(t);
      linePositions[vertex * 3 + 1] = R.decoderY + R.cellHeight * 0.5;
      vertex++;
    }
  }

  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new BufferAttribute(linePositions, 3));
  const lineLitAttribute = new BufferAttribute(lineLit, 1);
  lineLitAttribute.setUsage(35048);
  lineGeometry.setAttribute("aLit", lineLitAttribute);

  const lineMaterial = new ShaderMaterial({
    uniforms: {
      uColorShift: shared.uColorShift,
      uMode: shared.uMode,
      uColorWarm: shared.uColorWarm,
      uColorShifted: shared.uColorShifted,
      uReveal: { value: 0 },
      uColorLow: { value: PALETTE.low.clone() },
      uColorHigh: { value: PALETTE.high.clone() },
    },
    vertexShader: RIG_LINE_VERT,
    fragmentShader: RIG_LINE_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });

  const attention = new LineSegments(lineGeometry, lineMaterial);
  attention.frustumCulled = false;
  attention.renderOrder = 9;
  group.add(attention);

  /* --- ラベル --- */
  const labels: { object: CSS2DObject; element: HTMLElement }[] = [];
  const addLabel = (className: string) => {
    const element = document.createElement("div");
    element.className = className;
    const object = new CSS2DObject(element);
    group.add(object);
    labels.push({ object, element });
    return { object, element };
  };

  const sourceLabels = Array.from({ length: tokens }, () =>
    addLabel("ns-rig-token")
  );
  const targetLabels = Array.from({ length: tokens }, () =>
    addLabel("ns-rig-token is-target")
  );
  const sourceEmbedLabel = addLabel("ns-rig-side is-aside");
  const encoderLabel = addLabel("ns-rig-side");
  const decoderLabel = addLabel("ns-rig-side");
  const targetEmbedLabel = addLabel("ns-rig-side is-aside");
  const captionLabel = addLabel("ns-rig-caption");

  const embedBlockY = (top: number) => top - ((dims - 1) * R.embedGap) / 2;
  // ベクトルの見出しは左、格の見出しは右。段のあいだが詰まるのを避ける
  const asideLeft = -(R.barSpan / 2) - 3.4;
  const asideRight = R.barSpan / 2 + 3.4;

  sourceEmbedLabel.object.position.set(
    asideLeft,
    embedBlockY(R.sourceEmbedY),
    0,
  );
  targetEmbedLabel.object.position.set(
    asideLeft,
    embedBlockY(R.targetEmbedY),
    0,
  );
  encoderLabel.object.position.set(asideRight, R.encoderY, 0);
  decoderLabel.object.position.set(asideRight, R.decoderY, 0);
  captionLabel.object.position.set(
    0,
    R.targetTopY - (rows - 1) * R.rowGap - 0.85,
    0,
  );

  sourceEmbedLabel.element.textContent = `EMBEDDING · d=${R.embedDims}`;
  targetEmbedLabel.element.textContent = `LOGITS · argmax`;

  /* --- 座標の下ごしらえ（グリッド） --- */
  const gridSlot = (index: number, topY: number) => {
    const column = index % R.cols;
    const row = Math.floor(index / R.cols);
    return {
      x: (column - (R.cols - 1) / 2) * R.colGap,
      y: topY - row * R.rowGap,
    };
  };

  const dummy = new Object3D();
  let sourceCount = 0;
  let targetCount = 0;
  let sourceVectors: Float32Array[] = [];
  let targetVectors: Float32Array[] = [];

  const setTexts: TranslateRig["setTexts"] = (
    source,
    target,
    counts,
    labelText,
  ) => {
    sourceCount = Math.min(source.length, tokens);
    targetCount = Math.min(target.length, tokens);
    sourceLabels.forEach(({ element }, i) => {
      element.textContent = source[i] ?? "";
    });
    targetLabels.forEach(({ element }, i) => {
      element.textContent = target[i] ?? "";
    });
    // 格ごとのベクトルは、その列に最初に入るトークンから作る
    sourceVectors = Array.from({ length: bars }, (_, b) =>
      embeddingOf(source[b] ?? "", dims)
    );
    targetVectors = Array.from({ length: bars }, (_, b) =>
      embeddingOf(target[b] ?? "", dims)
    );
    encoderLabel.element.textContent =
      `${labelText.encoder} · ${counts[0]} tokens`;
    decoderLabel.element.textContent =
      `${labelText.decoder} · ${counts[1]} tokens`;
    captionLabel.element.textContent = labelText.caption;
  };

  const update: TranslateRig["update"] = (t, reveal) => {
    boxMaterial.uniforms.uReveal.value = reveal;
    lineMaterial.uniforms.uReveal.value = reveal;

    const [c0, c1] = TRANSLATE_PHASES.collect;
    const [m0, m1] = TRANSLATE_PHASES.embed;
    const [e0, e1] = TRANSLATE_PHASES.encode;
    const [x0, x1] = TRANSLATE_PHASES.context;
    const [d0, d1] = TRANSLATE_PHASES.decode;

    /* 原文トークン：読み順に並び、埋め込みの列へ落ちて消える */
    for (let i = 0; i < tokens; i++) {
      const active = i < sourceCount;
      const stagger = tokens <= 1 ? 0 : i / (tokens - 1);
      const appear = between(
        c0 + stagger * (c1 - c0),
        c0 + stagger * (c1 - c0) + 0.06,
        t,
      );
      const fall = easeOut(
        between(
          m0 + stagger * (m1 - m0) * 0.8,
          m0 + stagger * (m1 - m0) * 0.8 + 0.14,
          t,
        ),
      );

      const home = gridSlot(i, R.sourceTopY);
      const column = i % bars;
      const x = MathUtils.lerp(home.x, cellX(column), fall);
      const y = MathUtils.lerp(home.y, R.sourceEmbedY + 0.5, fall);

      dummy.position.set(x, y, 0);
      dummy.scale.set(
        R.tokenWidth * (1 - fall * 0.72),
        R.tokenHeight * (1 - fall * 0.45),
        R.tokenDepth,
      );
      dummy.updateMatrix();
      boxes.setMatrixAt(SRC_TOKEN + i, dummy.matrix);

      const value = active ? appear * (1 - fall) : 0;
      lit[SRC_TOKEN + i] = value * 0.9;
      sourceLabels[i].object.position.set(x, y, 0);
      sourceLabels[i].element.style.opacity = (value * reveal).toFixed(3);
    }

    /* 埋め込みベクトル：列ごとに上から値が入る */
    const embedProgress = between(m0, m1, t);
    for (let b = 0; b < bars; b++) {
      const arrived = between(b / bars - 0.1, b / bars + 0.1, embedProgress);
      for (let k = 0; k < dims; k++) {
        const slot = SRC_EMBED + b * dims + k;
        dummy.position.set(cellX(b), R.sourceEmbedY - k * R.embedGap, 0);
        dummy.scale.set(R.embedCellWidth, R.embedCellHeight, R.tokenDepth);
        dummy.updateMatrix();
        boxes.setMatrixAt(slot, dummy.matrix);
        // 値の大小がそのままマスの明るさになる
        const cell = between(k / dims - 0.12, k / dims + 0.12, arrived);
        lit[slot] = cell * (0.12 + 0.88 * (sourceVectors[b]?.[k] ?? 0.5));
      }
    }

    /* encoder / decoder の格 */
    const encoded = between(e0, e1, t);
    const emitted = between(d0, d1, t);
    for (let b = 0; b < bars; b++) {
      dummy.scale.set(R.cellWidth, R.cellHeight, R.tokenDepth);

      dummy.position.set(cellX(b), R.encoderY, 0);
      dummy.updateMatrix();
      boxes.setMatrixAt(ENC_BAR + b, dummy.matrix);
      lit[ENC_BAR + b] = between(b / bars - 0.08, b / bars + 0.08, encoded) *
        0.92;

      dummy.position.set(cellX(b), R.decoderY, 0);
      dummy.updateMatrix();
      boxes.setMatrixAt(DEC_BAR + b, dummy.matrix);
      lit[DEC_BAR + b] = Math.max(
        between(x0, x1, t) * 0.3,
        between(b / bars - 0.08, b / bars + 0.08, emitted) * 0.95,
      );
    }

    /* 出力ベクトル（logits）：decoder の格の下に立ち上がる */
    for (let b = 0; b < bars; b++) {
      const out = between(b / bars - 0.1, b / bars + 0.1, emitted);
      for (let k = 0; k < dims; k++) {
        const slot = TGT_EMBED + b * dims + k;
        dummy.position.set(cellX(b), R.targetEmbedY - k * R.embedGap, 0);
        dummy.scale.set(R.embedCellWidth, R.embedCellHeight, R.tokenDepth);
        dummy.updateMatrix();
        boxes.setMatrixAt(slot, dummy.matrix);
        const cell = between(k / dims - 0.12, k / dims + 0.12, out);
        lit[slot] = cell * (0.12 + 0.88 * (targetVectors[b]?.[k] ?? 0.5));
      }
    }

    /* 訳文トークン：出力ベクトルから読み順に現れる */
    for (let i = 0; i < tokens; i++) {
      const slot = TGT_TOKEN + i;
      const active = i < targetCount;
      const stagger = tokens <= 1 ? 0 : i / (tokens - 1);
      // 最後のトークンも decode の終わりまでに着地させる
      const start = d0 + 0.04 + stagger * (d1 - d0) * 0.62;
      const emit = easeOut(between(start, start + 0.085, t));

      const home = gridSlot(i, R.targetTopY);
      const column = i % bars;
      const from = R.targetEmbedY - (dims - 1) * R.embedGap - 0.5;
      const x = MathUtils.lerp(cellX(column), home.x, emit);
      const y = MathUtils.lerp(from, home.y, emit);

      dummy.position.set(x, y, 0);
      dummy.scale.set(
        R.tokenWidth * (0.28 + 0.72 * emit),
        R.tokenHeight * (0.5 + 0.5 * emit),
        R.tokenDepth,
      );
      dummy.updateMatrix();
      boxes.setMatrixAt(slot, dummy.matrix);

      const value = active ? emit : 0;
      lit[slot] = value * 0.9;
      targetLabels[i].object.position.set(x, y, 0);
      targetLabels[i].element.style.opacity = (value * reveal).toFixed(3);
    }

    boxes.instanceMatrix.needsUpdate = true;
    litAttribute.needsUpdate = true;

    /* cross-attention */
    const context = between(x0, x1, t);
    for (let pair = 0; pair < pairs; pair++) {
      const target = lineTargets[pair];
      const source = lineSources[pair];
      // 対角に寄せた、それらしいアラインメント
      const align = Math.exp(-((source - target) ** 2) / 5.5);
      const on = between(target / bars - 0.08, target / bars + 0.08, emitted);
      const value = align * (context * 0.28 + on * 0.9);
      lineLit[pair * 2] = value;
      lineLit[pair * 2 + 1] = value;
    }
    lineLitAttribute.needsUpdate = true;

    const side = reveal.toFixed(3);
    encoderLabel.element.style.opacity = side;
    decoderLabel.element.style.opacity = side;
    sourceEmbedLabel.element.style.opacity = (reveal * between(m0, m0 + 0.06, t))
      .toFixed(3);
    targetEmbedLabel.element.style.opacity = (reveal * between(d0, d0 + 0.06, t))
      .toFixed(3);
    captionLabel.element.style.opacity = (reveal * (1 - between(d1, 1, t)))
      .toFixed(3);
  };

  /** 縦の画角は固定なので、横だけ見て縮める */
  const fit: TranslateRig["fit"] = (aspect) => {
    const halfWidth = Math.tan((55 * Math.PI) / 360) * Math.abs(R.depth) *
      aspect;
    const needed = ((R.cols - 1) / 2) * R.colGap + R.tokenWidth * 0.5 + 0.6;
    const scale = Math.min(1, halfWidth / needed);
    group.scale.setScalar(scale);
  };

  return {
    group,
    setTexts,
    update,
    fit,
    dispose: () => {
      geometry.dispose();
      boxMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      labels.forEach(({ object, element }) => {
        object.removeFromParent();
        element.remove();
      });
    },
  };
};
