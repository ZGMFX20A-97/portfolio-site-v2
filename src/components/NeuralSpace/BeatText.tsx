import type { IconType } from "react-icons";
import { SiGithub, SiInstagram, SiWantedly, SiX } from "react-icons/si";
import { CONTACTS, type ContactId } from "./content";
import { getBeats, type Lang } from "./i18n";

/** CONTACTS の id とアイコンの対応表。連絡先を増やすときはここも足す */
const CONTACT_ICONS: Record<ContactId, IconType> = {
  github: SiGithub,
  x: SiX,
  instagram: SiInstagram,
  wantedly: SiWantedly,
};

interface BeatTextProps {
  index: number;
  lang: Lang;
}

/**
 * 飛行中に一件ずつ現れる本文。カード枠は持たず、地の文として空間に置く。
 * key に index と言語を渡してマウントし直し、切り替わるたびに入りの動きを再生する。
 */
const BeatText = ({ index, lang }: BeatTextProps) => {
  const beats = getBeats(lang);
  const beat = beats[index] ?? beats[0];

  return (
    <div className="ns-beat" key={`${lang}-${index}`} lang={lang}>
      <span className="ns-beat-kicker">{beat.kicker}</span>

      {beat.title && <h2 className="ns-beat-title">{beat.title}</h2>}

      {beat.lines?.map((line) => (
        <p className="ns-beat-line" key={line}>
          {line}
        </p>
      ))}

      {beat.items && (
        <ul className="ns-beat-items">
          {beat.items.map((item) => (
            <li key={item.label}>
              {item.href
                ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.label}
                  </a>
                )
                : <span>{item.label}</span>}
              <em>{item.note}</em>
            </li>
          ))}
        </ul>
      )}

      {beat.contacts && (
        <div className="ns-contacts">
          {CONTACTS.map((contact) => {
            const Icon = CONTACT_ICONS[contact.id];
            return (
              <a
                key={contact.id}
                className="ns-contact"
                href={contact.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={contact.name}
                title={contact.name}
              >
                <Icon aria-hidden="true" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BeatText;
