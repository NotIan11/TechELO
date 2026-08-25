import Badge from './Badge'
import Icon from './Icon'

interface StreakChipProps {
  type: 'W' | 'L'
  count: number
  /** "win" | "loss" by default; poker passes "session" */
  noun?: string
  /** Appended word, e.g. "heater" / "cooler" */
  suffix?: string
}

/** Win/loss streak badge with a flame or snowflake glyph */
export default function StreakChip({ type, count, noun, suffix }: StreakChipProps) {
  const word = noun ?? (type === 'W' ? 'win' : 'loss')
  return (
    <Badge tone={type === 'W' ? 'win' : 'loss'}>
      <Icon name={type === 'W' ? 'flame' : 'snowflake'} className="h-3 w-3" strokeWidth={2} />
      {suffix ? `${count}-${word} ${suffix}` : `${count} ${word} streak`}
    </Badge>
  )
}
