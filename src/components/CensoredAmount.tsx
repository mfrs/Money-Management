import React, { useState } from 'react';
import { formatCurrency, formatCurrencyShort } from '../lib/types';
import { cn } from '../lib/utils';

interface CensoredAmountProps {
  amount: number;
  isSensored: boolean;
  useShort?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
  stripRp?: boolean;
}

export default function CensoredAmount({
  amount,
  isSensored,
  useShort = false,
  className = "",
  prefix = "",
  suffix = "",
  stripRp = false
}: CensoredAmountProps) {
  const [isHovered, setIsHovered] = useState(false);

  const shouldSensor = isSensored && !isHovered;
  
  let formatted = useShort
    ? formatCurrencyShort(amount, shouldSensor)
    : formatCurrency(amount, shouldSensor);

  if (stripRp) {
    if (shouldSensor) {
      formatted = '••••';
    } else {
      formatted = formatted.replace('Rp ', '');
    }
  }

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "transition-all duration-200 select-none",
        isSensored && "cursor-help hover:text-primary hover:scale-[1.02]",
        className
      )}
      title={isSensored ? 'Arahkan kursor untuk melihat nominal' : undefined}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}
