/**
 * 共通の考え方:
 *   aFlow  — その要素が計算順のどこに位置するか(0..1、スクロール座標系)
 *   uWave  — スクロールから求めた走査ヘッドの位置(0..1)
 *   uMode  — 0 = 順方向 / 1 = 逆方向（上スクロール）
 * uWave が aFlow を追い越したマスが「計算済み」として活性値で点灯し、
 * ヘッド付近だけが強く光る。スクロールがそのまま演算の進行になる。
 */

/** 特徴マップのマス（InstancedMesh のボックス） */
export const CELL_VERT = /* glsl */ `
  /*
   * 頂点属性は 16 本が上限（instanceMatrix だけで 4 本使う）。
   * 個別の float で持つと足りなくなるので vec4 に詰めている。
   *   aCell.x 活性値（正規化済み）
   *   aCell.y 走査位置（uWave と比べる）
   *   aCell.z 至近フェードが始まる視距離
   *   aCell.w 勝ちクラスか
   *   aOps.x  ReLU 前の値（符号つき）
   *   aOps.y  ReLU が効きはじめる走査位置（負なら ReLU なし）
   *   aOps.z  maxpool で採られるか（1 = 残る）
   *   aOps.w  間引きが起きる走査位置（負なら間引きなし）
   *   aSpread 間引き前の位置ずれ
   */
  attribute vec4 aCell;
  attribute vec4 aOps;
  attribute vec2 aSpread;

  uniform float uTime, uWave, uMode, uSelect;
  uniform float uFogNear, uFogFar, uReluSpan, uPoolSpan;

  varying float vOn, vHead, vVal, vDist, vSelect, vNear, vNeg;
  varying vec3  vNormalW;

  void main() {
    // --- ReLU: 前活性（符号つき）から max(0, x) へ ---
    float relu = aOps.y < 0.0
      ? 1.0
      : smoothstep(aOps.y, aOps.y + uReluSpan, uWave);
    float negative = (1.0 - step(0.0, aOps.x)) * (1.0 - relu);
    // 到達点は aCell.x（正規化済みの活性）。こうすると ReLU 後の見え方が
    // 従来と一致する。ReLU の無い層は aOps.x に同じ値が入るので恒等になる
    float value = mix(abs(aOps.x), aCell.x, relu);

    // --- maxpool: 採られなかったマスは縮んで消える ---
    float pooled = aOps.w < 0.0
      ? 0.0
      : smoothstep(aOps.w, aOps.w + uPoolSpan, uWave);
    float keep = mix(1.0, aOps.z, pooled);
    /*
     * 間引きのあるマスだけ、間引き前を半分の大きさにする。
     * 採られたマスは 2 倍に育ち、落ちるマスはそのまま消える。
     * pool と無関係なマスは 1.0 で固定すること。箱は中心を基準に
     * 縮むので、ここを 0.5 にすると背の高いクラスの棒の底面が浮く。
     */
    float shrink = aOps.w < 0.0
      ? 1.0
      : mix(0.5, 0.08 + 0.92 * aOps.z, pooled);

    vec4 world = instanceMatrix * vec4(position * shrink, 1.0);
    world.xy += aSpread * (1.0 - pooled);
    vec4 mv = modelViewMatrix * world;
    gl_Position = projectionMatrix * mv;

    vNormalW = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vDist = max(-mv.z, 0.001);
    vVal = value * keep;
    vNeg = negative;
    vNear = aCell.z;
    vSelect = aCell.w * uSelect;

    float d = uWave - aCell.y;
    float done = smoothstep(-0.006, 0.022, d);
    vOn = mix(done, 1.0 - done, uMode);
    vHead = exp(-pow(d / 0.016, 2.0)) * step(0.0005, uWave) * step(uWave, 0.9995);
  }
`;

export const CELL_FRAG = /* glsl */ `
  uniform float uTime, uIntensity, uMode, uColorShift, uDim;
  uniform vec3  uColorLow, uColorHigh, uColorShifted, uColorWarm;
  uniform float uFogNear, uFogFar;

  varying float vOn, vHead, vVal, vDist, vSelect, vNear, vNeg;
  varying vec3  vNormalW;

  void main() {
    float lit = vVal * vOn;
    float energy = pow(clamp(lit + vHead * 0.85 + vSelect * 0.9, 0.0, 1.6), 0.75);

    vec3 base = mix(uColorLow, uColorHigh, clamp(lit, 0.0, 1.0));
    base = mix(base, uColorShifted, uColorShift);
    base = mix(base, uColorWarm, uMode * 0.7);
    // ReLU 前の負値は暖色へ寄せて「これから潰れる側」だと分かるようにする
    base = mix(base, uColorWarm, vNeg * 0.85);
    // 選ばれたクラスだけは白へ振り切って「確定した」感じを出す
    base = mix(base, vec3(1.0), vSelect * 0.55);

    vec3 N = normalize(vNormalW);
    float rim = pow(1.0 - abs(N.z), 2.4);
    float lam = max(dot(N, normalize(vec3(0.35, 0.75, 0.62))), 0.0);
    float shimmer = 0.9 + 0.1 * sin(uTime * 2.2 + vDist * 0.35);

    vec3 c = base * (0.05 + 1.2 * energy) * (0.4 + 0.6 * lam)
           + base * rim * (0.18 + 1.1 * energy);

    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDist);
    // 目の前を通り過ぎるマスで白飛びしないよう至近距離は抜く。
    // 大きいマス（クラスの棒など）は遠めから、小さいマスは直前まで見せる
    float near = smoothstep(vNear * 0.12, vNear, vDist);
    float a = (0.06 + 1.05 * energy) * shimmer * fog * near * uIntensity * uDim;

    if (a < 0.002) discard;
    gl_FragColor = vec4(c * uIntensity, a);
  }
`;

/**
 * 入力画像と拡散ステップの板。uDenoise が 0 ならほぼノイズ、
 * 1 で元画像。飛行中に手前へ来た板は near フェードで抜ける。
 */
export const PLANE_VERT = /* glsl */ `
  varying vec2  vUv;
  varying float vDist;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = max(-mv.z, 0.001);
    gl_Position = projectionMatrix * mv;
  }
`;

export const PLANE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDenoise, uOpacity, uTime, uMode, uColorShift, uTintAmount, uDim;
  uniform vec3  uTint, uColorShifted, uColorWarm;
  uniform float uFogNear, uFogFar;

  varying vec2  vUv;
  varying float vDist;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    float noisy = 1.0 - uDenoise;

    // 復元が進むほど参照 UV のブレが収まる
    vec2 jitter = vec2(
      hash(floor(vUv * 90.0) + floor(uTime * 5.0)),
      hash(floor(vUv * 90.0) + 37.0 + floor(uTime * 5.0))
    ) - 0.5;
    vec3 image = texture2D(uMap, vUv + jitter * noisy * 0.22).rgb;

    float grain = hash(floor(vUv * 110.0) + floor(uTime * 9.0));
    vec3 colour = mix(vec3(grain), image, smoothstep(0.0, 0.9, uDenoise));

    // シーンの配色へ寄せる
    vec3 tint = mix(uTint, uColorShifted, uColorShift);
    tint = mix(tint, uColorWarm, uMode * 0.7);
    float lum = dot(colour, vec3(0.299, 0.587, 0.114));
    colour = mix(colour, lum * tint * 1.7, uTintAmount);

    vec2 edge = smoothstep(0.0, 0.07, vUv) * smoothstep(0.0, 0.07, 1.0 - vUv);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDist);
    float near = smoothstep(1.2, 7.0, vDist);

    gl_FragColor = vec4(colour, uOpacity * edge.x * edge.y * fog * near * uDim);
  }
`;

/** トンネルに漂う塵。奥行きの手がかりとして速度感を出す */
export const DUST_VERT = /* glsl */ `
  attribute float aSeed;

  uniform float uTime, uPixelRatio, uViewScale;

  varying float vSeed;
  varying float vDist;

  void main() {
    vSeed = aSeed;
    vec3 p = position;
    p.y += sin(uTime * 0.2 + aSeed * 31.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = max(-mv.z, 0.001);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min((0.6 + aSeed * 1.4) * uPixelRatio * (uViewScale / vDist), 8.0 * uPixelRatio);
  }
`;

export const DUST_FRAG = /* glsl */ `
  uniform float uTime, uMode, uColorShift, uDim;
  uniform vec3  uColorHigh, uColorShifted, uColorWarm;
  uniform float uFogNear, uFogFar;

  varying float vSeed;
  varying float vDist;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    vec3 c = mix(uColorHigh, uColorShifted, uColorShift);
    c = mix(c, uColorWarm, uMode * 0.7);
    float twinkle = 0.4 + 0.6 * sin(uTime * 0.9 + vSeed * 40.0);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDist);
    gl_FragColor = vec4(c * 0.8, (1.0 - d) * (1.0 - d) * 0.22 * twinkle * fog * uDim);
  }
`;

/* ============================================================
   翻訳オーバーレイ
   位置と明るさは CPU 側で決めて aLit / instanceMatrix に流す。
   短時間しか出ない演出なので、CPU で持つほうが素直。
   ============================================================ */

/** 原文トークン・encoder/decoder の格・訳文トークンの箱 */
export const RIG_VERT = /* glsl */ `
  attribute float aLit;
  /** 0 = 原文 / 1 = 格 / 2 = 訳文 */
  attribute float aKind;

  uniform float uReveal;

  varying float vLit, vKind;
  varying vec3  vNormalW;

  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormalW = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vLit = aLit * uReveal;
    vKind = aKind;
  }
`;

export const RIG_FRAG = /* glsl */ `
  uniform float uColorShift, uMode;
  uniform vec3  uColorLow, uColorHigh, uColorShifted, uColorWarm;

  varying float vLit, vKind;
  varying vec3  vNormalW;

  void main() {
    // aKind 0 = 原文側 / 1 = ベクトルと格 / 2 = 訳文側。段で色を分ける
    vec3 base = mix(uColorLow, uColorHigh, 0.34 + 0.33 * clamp(vKind, 0.0, 2.0));
    base = mix(base, uColorShifted, uColorShift);
    base = mix(base, uColorWarm, uMode * 0.7);

    vec3 N = normalize(vNormalW);
    float rim = pow(1.0 - abs(N.z), 2.2);
    float lam = max(dot(N, normalize(vec3(0.3, 0.7, 0.65))), 0.0);

    vec3 c = base * (0.05 + 1.25 * vLit) * (0.45 + 0.55 * lam)
           + base * rim * (0.15 + 0.95 * vLit);

    float a = 0.02 + 1.0 * vLit;
    if (a < 0.004) discard;
    gl_FragColor = vec4(c, a);
  }
`;

/** cross-attention。明るさは頂点ごとに CPU から与える */
export const RIG_LINE_VERT = /* glsl */ `
  attribute float aLit;

  uniform float uReveal;

  varying float vLit;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vLit = aLit * uReveal;
  }
`;

export const RIG_LINE_FRAG = /* glsl */ `
  uniform float uColorShift, uMode;
  uniform vec3  uColorLow, uColorHigh, uColorShifted, uColorWarm;

  varying float vLit;

  void main() {
    vec3 base = mix(uColorLow, uColorHigh, clamp(vLit, 0.0, 1.0));
    base = mix(base, uColorShifted, uColorShift);
    base = mix(base, uColorWarm, uMode * 0.7);
    gl_FragColor = vec4(base, vLit * 0.85);
  }
`;
