import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  type Object3D,
  Object3D as Dummy,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import {
  CELL_FRAG,
  CELL_VERT,
  DUST_FRAG,
  DUST_VERT,
  PLANE_FRAG,
  PLANE_VERT,
} from "./shaders";
import type { CnnResult, CnnStage } from "./cnn";
import {
  CLASS_SPACING,
  DIFFUSION_FINAL,
  DIFFUSION_STEPS,
  POOL_AT,
  POOL_SPAN,
  RELU_LAG,
  RELU_SPAN,
  STAGE_LAYOUT,
  STAGE_WINDOWS,
  STAGE_Z,
  WARM_ACCENT,
} from "./content";

/** 全マテリアルで参照を共有し、1 か所の更新でシーン全体へ伝播させる */
export interface SharedUniforms {
  uTime: { value: number };
  uWave: { value: number };
  uMode: { value: number };
  uColorShift: { value: number };
  /** 翻訳オーバーレイ中に世界側だけ沈める倍率（1 = 通常） */
  uDim: { value: number };
  uColorWarm: { value: Color };
  uColorShifted: { value: Color };
  uPixelRatio: { value: number };
  uViewScale: { value: number };
  uFogNear: { value: number };
  uFogFar: { value: number };
}

export const PALETTE = {
  low: new Color("#0b3f8f"),
  high: new Color("#bdf3ff"),
  accent: new Color("#00f3ff"),
  shifted: new Color("#a855f7"),
  warm: new Color(WARM_ACCENT),
};

export const createSharedUniforms = (
  pixelRatio: number,
  viewScale: number,
): SharedUniforms => ({
  uTime: { value: 0 },
  uWave: { value: 0 },
  uMode: { value: 0 },
  uColorShift: { value: 0 },
  uDim: { value: 1 },
  uColorWarm: { value: PALETTE.warm.clone() },
  uColorShifted: { value: PALETTE.shifted.clone() },
  uPixelRatio: { value: pixelRatio },
  uViewScale: { value: viewScale },
  uFogNear: { value: 34 },
  uFogFar: { value: 130 },
});

/* ============================================================
   レイアウト
   ============================================================ */

/** 層 s・マップ m の中心。マップは軸のまわりに円形に配置する */
export const mapCentre = (
  stageIndex: number,
  mapIndex: number,
  mapCount: number,
): { x: number; y: number } => {
  const { radius } = STAGE_LAYOUT[stageIndex];
  if (mapCount <= 1 || radius === 0) return { x: 0, y: 0 };
  const angle = (mapIndex / mapCount) * Math.PI * 2 + Math.PI / 4;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
};

/** 層 s・マップ m・(row, col) のワールド座標 */
export const cellPosition = (
  result: CnnResult,
  stageIndex: number,
  mapIndex: number,
  row: number,
  col: number,
  out = new Vector3(),
): Vector3 => {
  const stage = result.stages[stageIndex];
  const { cell } = STAGE_LAYOUT[stageIndex];
  const z = STAGE_Z[stageIndex];

  if (stage.kind === "dense") {
    return out.set((col - (stage.maps - 1) / 2) * CLASS_SPACING, -1.6, z);
  }

  const centre = mapCentre(stageIndex, mapIndex, stage.maps);
  const half = (stage.grid - 1) / 2;
  return out.set(
    centre.x + (col - half) * cell,
    centre.y - (row - half) * cell,
    z,
  );
};

/** softmax の棒の高さ。クラス行を見るカメラ距離で収まる範囲に抑える */
const barHeight = (probability: number) => 0.8 + probability * 7.5;

/* ============================================================
   マス（1 つの InstancedMesh にまとめる）
   ============================================================ */

export interface CellMesh {
  mesh: InstancedMesh;
  material: ShaderMaterial;
  /** 勝ちクラスが選ばれる演出の強さ */
  select: { value: number };
}

export const buildCells = (
  result: CnnResult,
  shared: SharedUniforms,
): CellMesh => {
  // pool 段は「間引き前」の入力格子として描くので、入力側の数で確保する
  const cellCountOf = (stage: CnnStage) => {
    if (stage.kind === "dense") return stage.maps;
    const side = stage.kind === "pool" ? stage.grid * stage.stride : stage.grid;
    return stage.maps * side * side;
  };
  let total = 0;
  result.stages.forEach((stage) => {
    total += cellCountOf(stage);
  });

  const values = new Float32Array(total);
  const flows = new Float32Array(total);
  const selects = new Float32Array(total);
  const nears = new Float32Array(total);
  const raws = new Float32Array(total);
  const reluAt = new Float32Array(total);
  const keeps = new Float32Array(total);
  const keepAt = new Float32Array(total);
  const spreads = new Float32Array(total * 2);

  const geometry = new BoxGeometry(1, 1, 1);
  const material = new ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uWave: shared.uWave,
      uMode: shared.uMode,
      uColorShift: shared.uColorShift,
      uDim: shared.uDim,
      uColorWarm: shared.uColorWarm,
      uColorShifted: shared.uColorShifted,
      uFogNear: shared.uFogNear,
      uFogFar: shared.uFogFar,
      uSelect: { value: 0 },
      uIntensity: { value: 1 },
      uReluSpan: { value: RELU_SPAN },
      uPoolSpan: { value: POOL_SPAN },
      uColorLow: { value: PALETTE.low.clone() },
      uColorHigh: { value: PALETTE.high.clone() },
    },
    vertexShader: CELL_VERT,
    fragmentShader: CELL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const mesh = new InstancedMesh(geometry, material, total);
  const dummy = new Dummy();
  const position = new Vector3();
  let cursor = 0;

  result.stages.forEach((stage, stageIndex) => {
    const [from, to] = STAGE_WINDOWS[stageIndex];
    const { cell } = STAGE_LAYOUT[stageIndex];
    const area = stage.grid * stage.grid;

    if (stage.kind === "dense") {
      for (let unit = 0; unit < stage.maps; unit++) {
        const probability = stage.activation[0][unit];
        const height = barHeight(probability);
        cellPosition(result, stageIndex, 0, 0, unit, position);
        dummy.position.set(position.x, position.y + height / 2, position.z);
        dummy.scale.set(cell, height, cell);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(cursor, dummy.matrix);

        values[cursor] = 0.35 + probability * 1.4;
        flows[cursor] = from + (to - from) * (unit / stage.maps);
        selects[cursor] = unit === result.winner ? 1 : 0;
        // 棒は面が大きいので早めに抜く。背の低い棒にも下限を持たせる
        nears[cursor] = Math.max(height * 1.6, 4.5);
        // dense には ReLU も pool も無い。恒等になる値を入れておく
        raws[cursor] = values[cursor];
        spreads[cursor * 2] = 0;
        spreads[cursor * 2 + 1] = 0;
        reluAt[cursor] = -1;
        keeps[cursor] = 1;
        keepAt[cursor] = -1;
        cursor++;
      }
      return;
    }

    if (stage.kind === "pool" && stage.argmax) {
      /*
       * maxpool は「間引き」そのものを見せる。
       * 入力と同じ 14×14 の格子を、出力と同じ画面上の広さに敷き、
       * 各 2×2 のうち最大だけを残して 7×7 へ育てる。
       */
      const source = result.stages[stageIndex - 1];
      const p = stage.stride;
      const side = stage.grid * p;
      const fine = cell / p; // 間引き前の細かい間隔
      const inputArea = side * side;

      for (let mapIndex = 0; mapIndex < stage.maps; mapIndex++) {
        for (let i = 0; i < inputArea; i++) {
          const sr = Math.floor(i / side);
          const sc = i % side;
          const outRow = Math.floor(sr / p);
          const outCol = Math.floor(sc / p);
          const best = stage.argmax[mapIndex][outRow * stage.grid + outCol];
          const isWinner = sr % p === Math.floor(best / p) &&
            sc % p === best % p;
          const value = source.activation[mapIndex][sr * source.grid + sc];

          // 行き先は出力の 7×7 の枠。勝者はそこへ寄り、敗者はその場で消える
          cellPosition(result, stageIndex, mapIndex, outRow, outCol, position);
          dummy.position.copy(position);
          dummy.position.z += value * cell * 1.4;
          dummy.scale.set(cell * 0.82, cell * 0.82, cell * (0.24 + value * 0.9));
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(cursor, dummy.matrix);

          // 間引き前の細かい格子との差分。敗者は動かない
          const centre = mapCentre(stageIndex, mapIndex, stage.maps);
          const fineX = centre.x + (sc - (side - 1) / 2) * fine;
          const fineY = centre.y - (sr - (side - 1) / 2) * fine;
          spreads[cursor * 2] = fineX - position.x;
          spreads[cursor * 2 + 1] = fineY - position.y;

          values[cursor] = value;
          flows[cursor] = from + (to - from) * (i / inputArea);
            selects[cursor] = 0;
          nears[cursor] = Math.max(cell * 5, 3.2);
          raws[cursor] = value;
          reluAt[cursor] = -1;
          keeps[cursor] = isWinner ? 1 : 0;
          keepAt[cursor] = POOL_AT;
          cursor++;
        }
      }
      return;
    }

    for (let mapIndex = 0; mapIndex < stage.maps; mapIndex++) {
      for (let i = 0; i < area; i++) {
        const row = Math.floor(i / stage.grid);
        const col = i % stage.grid;
        const value = stage.activation[mapIndex][i];

        cellPosition(result, stageIndex, mapIndex, row, col, position);
        dummy.position.copy(position);
        // 活性が強いマスほど手前へ・厚く。特徴マップの起伏として読める
        dummy.position.z += value * cell * 1.4;
        dummy.scale.set(cell * 0.82, cell * 0.82, cell * (0.24 + value * 0.9));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(cursor, dummy.matrix);

        values[cursor] = value;
        // マップは並列に走るので、層内の走査位置だけで決める
        flows[cursor] = from + (to - from) * (i / area);
        selects[cursor] = 0;
        // 小さいマスは直前まで見せたいが、面で残らない下限は確保する
        nears[cursor] = Math.max(cell * 5, 3.2);
        // ReLU 前の値（conv のみ）。無い層は活性をそのまま入れて恒等にする。
        // 効くのは走査から RELU_LAG だけ遅れた瞬間
        raws[cursor] = stage.raw ? stage.raw[mapIndex][i] : value;
        reluAt[cursor] = stage.raw ? flows[cursor] + RELU_LAG : -1;
        keeps[cursor] = 1;
        keepAt[cursor] = -1;
        cursor++;
      }
    }
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  // 頂点属性は 16 本が上限。個別に渡すと足りないので vec4 に詰める
  const cellAttr = new Float32Array(total * 4);
  const opsAttr = new Float32Array(total * 4);
  for (let i = 0; i < total; i++) {
    cellAttr[i * 4] = values[i];
    cellAttr[i * 4 + 1] = flows[i];
    cellAttr[i * 4 + 2] = nears[i];
    cellAttr[i * 4 + 3] = selects[i];
    opsAttr[i * 4] = raws[i];
    opsAttr[i * 4 + 1] = reluAt[i];
    opsAttr[i * 4 + 2] = keeps[i];
    opsAttr[i * 4 + 3] = keepAt[i];
  }
  geometry.setAttribute("aCell", new InstancedBufferAttribute(cellAttr, 4));
  geometry.setAttribute("aOps", new InstancedBufferAttribute(opsAttr, 4));
  geometry.setAttribute("aSpread", new InstancedBufferAttribute(spreads, 2));

  return {
    mesh,
    material,
    select: material.uniforms.uSelect as { value: number },
  };
};

/* ============================================================
   画像の板（入力／拡散ステップ／復元後）
   ============================================================ */

export interface PlaneEntry {
  mesh: Mesh;
  opacity: { value: number };
  denoise: { value: number };
  z: number;
}

const planeMaterial = (
  shared: SharedUniforms,
  texture: Texture,
  denoise: number,
  opacity: number,
  /** シーンの配色へ寄せる強さ。元画像をそのまま見せたい板は弱める */
  tintAmount = 0.42,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uMode: shared.uMode,
      uColorShift: shared.uColorShift,
      uDim: shared.uDim,
      uColorWarm: shared.uColorWarm,
      uColorShifted: shared.uColorShifted,
      uFogNear: shared.uFogNear,
      uFogFar: shared.uFogFar,
      uMap: { value: texture },
      uDenoise: { value: denoise },
      uOpacity: { value: opacity },
      uTintAmount: { value: tintAmount },
      uTint: { value: PALETTE.accent.clone() },
    },
    vertexShader: PLANE_VERT,
    fragmentShader: PLANE_FRAG,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });

export const createIconTexture = (image: HTMLImageElement): Texture => {
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

/** 入力層の手前に置く、まだノイズの入っていない元画像 */
export const buildInputPlane = (
  shared: SharedUniforms,
  texture: Texture,
): PlaneEntry => {
  // 首屏は素の写真として見せたいので、配色寄せは弱めにする
  const material = planeMaterial(shared, texture, 1, 1, 0.2);
  const mesh = new Mesh(new PlaneGeometry(10.4, 10.4), material);
  mesh.position.set(0, 0, STAGE_Z[0] + 0.9);
  mesh.frustumCulled = false;
  return {
    mesh,
    opacity: material.uniforms.uOpacity as { value: number },
    denoise: material.uniforms.uDenoise as { value: number },
    z: mesh.position.z,
  };
};

/** ノイズから元画像へ戻っていく拡散ステップ */
export const buildDiffusionPlanes = (
  shared: SharedUniforms,
  texture: Texture,
): PlaneEntry[] => {
  const entries: PlaneEntry[] = DIFFUSION_STEPS.map((step) => {
    const material = planeMaterial(shared, texture, step.denoise, 0.95);
    const mesh = new Mesh(new PlaneGeometry(8, 8), material);
    mesh.position.set(0, 0, step.z);
    mesh.frustumCulled = false;
    return {
      mesh,
      opacity: material.uniforms.uOpacity as { value: number },
      denoise: material.uniforms.uDenoise as { value: number },
      z: step.z,
    };
  });

  const material = planeMaterial(shared, texture, 1, 1);
  const mesh = new Mesh(
    new PlaneGeometry(DIFFUSION_FINAL.span, DIFFUSION_FINAL.span),
    material,
  );
  mesh.position.set(0, 0, DIFFUSION_FINAL.z);
  mesh.frustumCulled = false;
  entries.push({
    mesh,
    opacity: material.uniforms.uOpacity as { value: number },
    denoise: material.uniforms.uDenoise as { value: number },
    z: DIFFUSION_FINAL.z,
  });

  return entries;
};

/* ============================================================
   カーネル窓（畳み込み・プーリングの受容野を実線で描く）
   ============================================================ */

export interface KernelWindow {
  lines: LineSegments;
  material: LineBasicMaterial;
  positions: Float32Array;
}

/** 受容野の矩形 4 辺 + 出力へ収束する 4 本 + 出力マスの枠 4 辺 */
const KERNEL_VERTS = 12 * 2;

export const buildKernelWindow = (): KernelWindow => {
  const positions = new Float32Array(KERNEL_VERTS * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const material = new LineBasicMaterial({
    color: PALETTE.accent.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  return { lines, material, positions };
};

/* ============================================================
   塵
   ============================================================ */

export const buildDust = (shared: SharedUniforms, count: number): Points => {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 2] = 24 - Math.random() * 152;
    seeds[i] = Math.random();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uMode: shared.uMode,
      uColorShift: shared.uColorShift,
      uDim: shared.uDim,
      uColorWarm: shared.uColorWarm,
      uColorShifted: shared.uColorShifted,
      uPixelRatio: shared.uPixelRatio,
      uViewScale: shared.uViewScale,
      uFogNear: shared.uFogNear,
      uFogFar: shared.uFogFar,
      uColorHigh: { value: PALETTE.high.clone() },
    },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
};

/* ============================================================
   後始末
   ============================================================ */

export const disposeHierarchy = (root: Object3D): void => {
  root.traverse((object) => {
    const mesh = object as Partial<Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    list.forEach((m) => m.dispose());
  });
};
