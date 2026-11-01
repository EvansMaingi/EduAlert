import { avatarGradient, initials } from '../utils/initials';

// A student's avatar (gradient circle with initials) beside their name, with
// the ID (or another detail line) underneath. index picks the avatar gradient.
export default function StudentName({ name, index, detail }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-linear-to-br ${avatarGradient(index)} text-[11px] font-semibold text-white`}
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{name}</span>
        {detail && <span className="block truncate text-xs font-normal text-fg-muted">{detail}</span>}
      </span>
    </span>
  );
}
