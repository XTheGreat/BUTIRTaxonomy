interface PenandaPanahProps {
  className?: string;
}

export default function PenandaPanah({ className = "h-3 w-3" }: PenandaPanahProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
    >
      <path d="M3.2 1.1 8.1 6l-4.9 4.9H6L10.9 6 6 1.1z" />
    </svg>
  );
}
