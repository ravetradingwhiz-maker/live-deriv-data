const Spinner = ({ className = '' }: { className?: string }) => (
    <span
        className={`inline-block h-10 w-10 animate-spin rounded-full border-4 border-ink-600 border-t-cyan-500 ${className}`}
        role='status'
        aria-label='Loading'
    />
);

export default Spinner;
