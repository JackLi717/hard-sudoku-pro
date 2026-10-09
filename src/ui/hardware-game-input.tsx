import { useEffect, useRef } from 'react';
import type { Digit } from '../domain/sudoku/contracts';
import NativeProductExperience, {
  HardwareKeyEvent,
} from '../native/NativeProductExperience';

export type GameKeyboardCommand =
  | { type: 'move'; row: number; column: number }
  | { type: 'digit'; digit: Digit }
  | { type: 'erase' | 'undo' | 'pencil' | 'hint' | 'pause' };

export function gameKeyboardCommand(
  event: HardwareKeyEvent,
): GameKeyboardCommand | null {
  const key = event.key.toLowerCase();
  if (event.alt) return null;
  if (event.control || event.meta) {
    return key === 'z' && !event.shift ? { type: 'undo' } : null;
  }
  if (event.shift) return null;
  if (/^[1-9]$/.test(key)) {
    return { type: 'digit', digit: Number(key) as Digit };
  }
  switch (key) {
    case 'arrowup':
      return { type: 'move', row: -1, column: 0 };
    case 'arrowdown':
      return { type: 'move', row: 1, column: 0 };
    case 'arrowleft':
      return { type: 'move', row: 0, column: -1 };
    case 'arrowright':
      return { type: 'move', row: 0, column: 1 };
    case 'backspace':
    case 'delete':
    case '0':
      return { type: 'erase' };
    case 'n':
      return { type: 'pencil' };
    case 'h':
      return { type: 'hint' };
    case 'p':
      return { type: 'pause' };
    default:
      return null;
  }
}

export function moveKeyboardCell(
  selectedCell: number | null,
  row: number,
  column: number,
): number {
  if (selectedCell === null) return 0;
  const nextRow = Math.max(0, Math.min(8, Math.floor(selectedCell / 9) + row));
  const nextColumn = Math.max(0, Math.min(8, (selectedCell % 9) + column));
  return nextRow * 9 + nextColumn;
}

type Props = {
  enabled: boolean;
  onCommand(command: GameKeyboardCommand): void;
};

/** Mounted only in the game; native focus navigation remains available elsewhere. */
export function HardwareGameInput({ enabled, onCommand }: Props) {
  const handler = useRef(onCommand);
  handler.current = onCommand;
  useEffect(() => {
    const native = NativeProductExperience;
    if (!enabled || !native?.onHardwareKey) return;
    const subscription = native.onHardwareKey(event => {
      const command = gameKeyboardCommand(event);
      if (command) handler.current(command);
    });
    native.setHardwareInputEnabled(true);
    return () => {
      native.setHardwareInputEnabled(false);
      subscription.remove();
    };
  }, [enabled]);
  return null;
}
