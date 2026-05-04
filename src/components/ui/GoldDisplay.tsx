interface GoldDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function GoldDisplay({ amount, size = 'md' }: GoldDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-bold',
  };

  return (
    <span className={`inline-flex items-center gap-1 text-amber-400 ${sizeClasses[size]}`}>
      <span className="text-amber-300">&#9670;</span>
      {amount.toLocaleString()}
    </span>
  );
}
