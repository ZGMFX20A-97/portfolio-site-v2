import { DICTIONARIES, type Lang, LANGUAGES } from "./i18n";

interface LanguageSwitchProps {
  lang: Lang;
  onSelect: (lang: Lang) => void;
}

const LanguageSwitch = ({ lang, onSelect }: LanguageSwitchProps) => (
  <div
    className="ns-lang"
    role="group"
    aria-label={DICTIONARIES[lang].languageLabel}
  >
    {LANGUAGES.map((entry) => (
      <button
        key={entry.code}
        type="button"
        className="ns-lang-option"
        aria-pressed={entry.code === lang}
        lang={entry.code}
        onClick={() => onSelect(entry.code)}
      >
        {entry.label}
      </button>
    ))}
  </div>
);

export default LanguageSwitch;
