import { useEffect, useRef } from "react";
import { WINNER_INDEX } from "./content";
import { DICTIONARIES, type Lang } from "./i18n";
import type { SceneStats } from "./neuralScene";

interface HudCanvasProps {
  /** NeuralScene が毎フレーム更新する可変オブジェクト（React 再描画は挟まない） */
  stats: SceneStats | null;
  lang: Lang;
}

/**
 * WebGL とは別レイヤーの Canvas 2D。四隅のブラケット、演算の状態、
 * 走査線、飛行位置のバーを描く HUD。
 */
const HudCanvas = ({ stats, lang }: HudCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stats) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);

      const width = innerWidth;
      const height = innerHeight;
      const accent = stats.accent;

      context.clearRect(0, 0, width, height);
      context.save();
      context.font = "12px 'SF Mono', 'Courier New', monospace";
      context.textBaseline = "top";
      context.strokeStyle = accent;
      context.lineWidth = 1;

      // 四隅のブラケット
      const margin = 18;
      const arm = 26;
      context.globalAlpha = 0.28;
      (
        [
          [margin, margin, 1, 1],
          [width - margin, margin, -1, 1],
          [margin, height - margin, 1, -1],
          [width - margin, height - margin, -1, -1],
        ] as const
      ).forEach(([x, y, sx, sy]) => {
        context.beginPath();
        context.moveTo(x + sx * arm, y);
        context.lineTo(x, y);
        context.lineTo(x, y + sy * arm);
        context.stroke();
      });

      // 右上に演算ステータス（本文は左なので右へ寄せる）
      const right = width - margin - 14;
      context.textAlign = "right";

      context.globalAlpha = 0.75;
      context.fillStyle = accent;
      context.fillText("FORWARD PASS // LIVE", right, margin + 10);

      context.globalAlpha = 0.45;
      context.fillStyle = "#8ea3bd";
      const chapters = DICTIONARIES[lang].chapters;
      context.fillText(
        `${String(stats.chapter).padStart(2, "0")} ${chapters[stats.chapter] ?? ""}`,
        right,
        margin + 29,
      );
      context.fillText(`CELLS ${stats.cells.toLocaleString("en-US")}`, right, margin + 46);
      // クラス名は辞書側で変えられるので、勝ちクラスの名前をそこから引く
      context.fillText(
        `p(${DICTIONARIES[lang].classes[WINNER_INDEX]}) ${
          (stats.winnerProbability * 100).toFixed(1)
        }%`,
        right,
        margin + 63,
      );
      context.fillText(`FPS ${stats.fps.toFixed(0)}`, right, margin + 80);

      context.globalAlpha = 0.6;
      context.fillStyle = accent;
      context.fillText(
        stats.mode > 0.5 ? "◂ REWIND" : "TRAVERSING ▸",
        right,
        margin + 101,
      );

      // 飛行位置のバー
      const barW = 150;
      const barX = right - barW;
      const barY = margin + 122;
      context.globalAlpha = 0.18;
      context.strokeRect(barX, barY, barW, 3);
      context.globalAlpha = 0.8;
      context.fillRect(barX, barY, barW * stats.progress, 3);

      context.textAlign = "left";

      // 上下に流れる走査線
      context.globalAlpha = 0.06;
      const scan = ((stats.time * 0.05) % 1) * height;
      const gradient = context.createLinearGradient(0, scan - 70, 0, scan + 70);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, accent);
      gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient;
      context.fillRect(0, scan - 70, width, 140);

      context.restore();
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
    };
  }, [stats, lang]);

  return (
    <div className="ns-hud" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default HudCanvas;
