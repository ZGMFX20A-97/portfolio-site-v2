import { useCallback, useEffect, useRef, useState } from "react";
import BeatText from "../components/NeuralSpace/BeatText";
import DotNav from "../components/NeuralSpace/DotNav";
import HudCanvas from "../components/NeuralSpace/HudCanvas";
import LanguageSwitch from "../components/NeuralSpace/LanguageSwitch";
import { NeuralScene } from "../components/NeuralSpace/neuralScene";
import { PROFILE } from "../components/NeuralSpace/content";
import {
  detectLanguage,
  DICTIONARIES,
  htmlLang,
  type Lang,
  storeLanguage,
} from "../components/NeuralSpace/i18n";
import "../components/NeuralSpace/neuralSpace.css";

/**
 * 一本道のトンネルを飛びながら、自分のアイコンが畳み込まれ、プールされ、
 * 分類され、最後に拡散モデルで描き直されるまでを見せるポートフォリオ。
 * 情報はカードではなく、飛行中に一件ずつ現れる本文として出す。
 */
const NeuralSpacePage = () => {
  const webglRef = useRef<HTMLDivElement>(null);
  const css2dRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [scene, setScene] = useState<NeuralScene | null>(null);
  const [lang, setLang] = useState<Lang>(detectLanguage);
  const [chapter, setChapter] = useState(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const webgl = webglRef.current;
    const css2d = css2dRef.current;
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!webgl || !css2d || !scroller || !track) return;

    // 画像の読み込みと CNN の前向き計算が終わってからシーンが立ち上がる
    let cancelled = false;
    let instance: NeuralScene | null = null;

    NeuralScene.create({
      webgl,
      css2d,
      scroller,
      track,
      lang: detectLanguage(),
      onChapter: setChapter,
      onBeat: setBeat,
      // 3D のターゲット言語トークンからも切り替わる。setLang / storeLanguage は
      // どちらも安定なので、そのまま閉じ込めて渡してよい
      onLanguage: (next) => {
        setLang(next);
        storeLanguage(next);
      },
    }).then((created) => {
      if (cancelled) {
        created.dispose();
        return;
      }
      instance = created;
      setScene(created);
    });

    return () => {
      cancelled = true;
      instance?.dispose();
      setScene(null);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
  }, [lang]);

  // 3D 空間のクラス名ラベルだけはシーン側が持っている。
  // シーンの生成は非同期なので、揃うたびに送り直す
  useEffect(() => {
    scene?.setLanguage(lang);
  }, [scene, lang]);

  /**
   * 言語切り替えは 3D の翻訳演出に委ねる。
   * シーンが途中で onLanguage を呼び返してくるので、本文の差し替えは
   * 訳文が出はじめるタイミングに揃う。
   */
  const selectLanguage = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      storeLanguage(next);
      if (scene) scene.playTranslation(lang, next);
      else setLang(next);
    },
    [lang, scene],
  );

  const selectChapter = useCallback(
    (index: number) => scene?.scrollToChapter(index),
    [scene],
  );

  const dictionary = DICTIONARIES[lang];

  return (
    <div className="ns-root">
      <div className="ns-webgl" ref={webglRef} aria-hidden="true" />
      <HudCanvas stats={scene?.stats ?? null} lang={lang} />
      <div className="ns-css2d" ref={css2dRef} aria-hidden="true" />
      <div className="ns-scrim" aria-hidden="true" />

      {/* スクロール量を作るためだけのトラック。中身は 3D 側が受け持つ */}
      <div className="ns-scroller" ref={scrollerRef}>
        <div className="ns-track" ref={trackRef} />
      </div>

      <header className="ns-signature">
        <span className="ns-signature-name">{PROFILE.handle}</span>
        <span className="ns-signature-role">{dictionary.role}</span>
        <LanguageSwitch lang={lang} onSelect={selectLanguage} />
      </header>

      <BeatText index={beat} lang={lang} />
      <DotNav active={chapter} lang={lang} onSelect={selectChapter} />

      <div className={`ns-cue${chapter === 0 ? "" : " is-hidden"}`}>
        {dictionary.cue}
      </div>

      {!scene && (
        <div className="ns-boot">
          <span>{dictionary.loading}</span>
          <i />
        </div>
      )}
    </div>
  );
};

export default NeuralSpacePage;
