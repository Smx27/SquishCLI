export default function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let active = 0;

  const next = () => {
    active -= 1;
    const run = queue.shift();
    if (run) run();
  };

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= Math.max(1, concurrency)) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    active += 1;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}
