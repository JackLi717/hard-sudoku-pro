import type { AppPalette } from '../theme';
import type { BoardTheme } from './board-theme';

export type AppTheme = {
  id: string;
  name: string;
  appearances: Record<
    'light' | 'dark',
    { palette: AppPalette; boardTheme: BoardTheme }
  >;
};
