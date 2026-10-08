import { productAnalytics } from './contracts';
type ErrorHandler = (error: Error, fatal?: boolean) => void;
type ErrorUtilities = {
  getGlobalHandler(): ErrorHandler;
  setGlobalHandler(handler: ErrorHandler): void;
};
export function sanitizedFrames(stack: string = ''): string {
  return JSON.stringify(
    stack
      .split('\n')
      .flatMap(line => {
        const match = line.match(
          /(?:index\.android\.bundle|main\.jsbundle|address at [^ ]+):(\d+):(\d+)/,
        );
        return match
          ? [{ line: Number(match[1]), column: Number(match[2]) }]
          : [];
      })
      .slice(0, 32),
  );
}
export function installJavascriptDiagnostics(): () => void {
  const errors = (
    globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilities }
  ).ErrorUtils;
  if (!errors) return () => {};
  const previous = errors.getGlobalHandler();
  const handler: ErrorHandler = (error, fatal) => {
    productAnalytics.failure(
      fatal ? 'javascript_fatal' : 'javascript_error',
      fatal,
      sanitizedFrames(error.stack),
    );
    previous(error, fatal);
  };
  errors.setGlobalHandler(handler);
  return () => {
    if (errors.getGlobalHandler() === handler)
      errors.setGlobalHandler(previous);
  };
}
