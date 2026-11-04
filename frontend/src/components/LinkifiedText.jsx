import { Fragment } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/gi;
const TRAILING_PUNCTUATION = /[),.!?;:'\"]+$/;

export default function LinkifiedText({ text, className = '' }) {
  const value = String(text || '');

  return <span className={className}>
    {value.split(URL_PATTERN).map((part, index) => {
      if (!/^https?:\/\//i.test(part)) return <Fragment key={`${index}-${part}`}>{part}</Fragment>;

      const trailing = part.match(TRAILING_PUNCTUATION)?.[0] || '';
      const url = trailing ? part.slice(0, -trailing.length) : part;

      return <Fragment key={`${index}-${part}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="break-all font-semibold text-[#168dcc] underline decoration-[#168dcc]/40 underline-offset-2 hover:text-[#0b6fa7] dark:text-[#8de4ca] dark:hover:text-white"
        >
          {url}
        </a>
        {trailing}
      </Fragment>;
    })}
  </span>;
}
