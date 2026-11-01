import React from 'react';

export function linkifyParts(text: string) {
  const parts: Array<string | { href: string }> = [];
  const re = /(https?:\/\/[^\s<>"']+)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    let href = match[0];
    while (href.length > 0 && '.,;:!?'.includes(href[href.length - 1])) {
      href = href.slice(0, -1);
    }
    parts.push({ href });
    const trailing = match[0].slice(href.length);
    if (trailing) parts.push(trailing);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {linkifyParts(text).map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-inline-link"
          >
            {part.href.replace(/^https?:\/\//, '')}
          </a>
        ),
      )}
    </>
  );
}

export function DescriptionBody({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="detail-lead-stack">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const bulletCount = lines.filter((l) =>
          /^([•\-\*]|\d+[.]|Step\s*\d)/i.test(l),
        ).length;
        if (lines.length > 1 && bulletCount >= Math.ceil(lines.length * 0.45)) {
          return (
            <ul key={bi} className="detail-desc-list">
              {lines.map((line, li) => {
                const clean = line.replace(/^([•\-\*]|\d+[.])\s*/, '');
                return (
                  <li key={li}>
                    <LinkedText text={clean} />
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <p key={bi} className="detail-lead">
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <LinkedText text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
