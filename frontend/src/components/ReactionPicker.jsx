const REACTION_OPTIONS = [
  { type: 'LIKE', emoji: '\u{1F44D}', label: 'Like' },
  { type: 'LOVE', emoji: '\u{2764}\u{FE0F}', label: 'Love' },
  { type: 'HAHA', emoji: '\u{1F602}', label: 'Haha' },
  { type: 'WOW', emoji: '\u{1F62E}', label: 'Wow' },
  { type: 'SAD', emoji: '\u{1F622}', label: 'Sad' },
  { type: 'ANGRY', emoji: '\u{1F621}', label: 'Angry' },
];

export function reactionOption(type) {
  return REACTION_OPTIONS.find((option) => option.type === type) || REACTION_OPTIONS[0];
}

export default function ReactionPicker({ selected, count = 0, counts = {}, open, onToggle, onSelect, disabled = false, label = 'Like' }) {
  const selectedOption = selected ? reactionOption(selected) : REACTION_OPTIONS[0];
  const visibleTypes = Object.entries(counts)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 3)
    .map(([type]) => reactionOption(type));

  return <div className="community-reaction-control">
    {open && <div className="community-reaction-picker" role="toolbar" aria-label="Choose a reaction">
      {REACTION_OPTIONS.map((option) => <button type="button" key={option.type} className={selected === option.type ? 'is-selected' : ''} onClick={() => onSelect(option.type === selected ? null : option.type)} disabled={disabled} aria-label={option.label} title={option.label}>{option.emoji}</button>)}
    </div>}
    <button type="button" disabled={disabled} onClick={() => onSelect(selected ? null : 'LIKE')} className={`community-reaction-action${selected ? ' is-active' : ''}`} aria-pressed={Boolean(selected)}>
      <span className="community-reaction-emojis" aria-hidden="true">{visibleTypes.length ? visibleTypes.map((option) => <span key={option.type}>{option.emoji}</span>) : <span>{selectedOption.emoji}</span>}</span>
      <span>{selected ? selectedOption.label : label}</span>
      {count > 0 && <b>{count}</b>}
    </button>
    <button type="button" disabled={disabled} onClick={onToggle} className={`community-reaction-picker-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-label="Choose a reaction">+</button>
  </div>;
}

