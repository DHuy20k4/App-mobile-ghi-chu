import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Use the native color scheme directly; on web this defaults to the client value and keeps
 * the initial render deterministic for static rendering.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  return colorScheme ?? 'light';
}
