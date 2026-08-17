import { CHAPTERS } from "./content";
import { DICTIONARIES, type Lang } from "./i18n";

interface DotNavProps {
  active: number;
  lang: Lang;
  onSelect: (index: number) => void;
}

/** 右側に固定した進度ドット。クリックでその章まで一気に飛ぶ */
const DotNav = ({ active, lang, onSelect }: DotNavProps) => {
  const labels = DICTIONARIES[lang].chapters;

  return (
    <nav className="ns-dots" aria-label={DICTIONARIES[lang].navLabel}>
      {CHAPTERS.map((chapter, index) => (
        <button
          key={chapter.id}
          type="button"
          className="ns-dot"
          aria-current={index === active}
          aria-label={labels[index]}
          onClick={() => onSelect(index)}
        >
          <span className="ns-dot-label">
            {String(index).padStart(2, "0")} {labels[index]}
          </span>
          <span className="ns-dot-mark" />
        </button>
      ))}
    </nav>
  );
};

export default DotNav;
