type Pipeline = {
  metadata: () => Promise<{ width?: number; height?: number }>;
  resize: () => Pipeline;
  webp: () => { toFile: (path: string) => Promise<void> };
  png: () => { toFile: (path: string) => Promise<void> };
  jpeg: () => { toFile: (path: string) => Promise<void> };
};

export default function sharp(): Pipeline {
  const writer = {
    async toFile(): Promise<void> {
      throw new Error("sharp stub should not be invoked in this test context");
    }
  };

  return {
    async metadata() {
      return {};
    },
    resize() {
      return this;
    },
    webp() {
      return writer;
    },
    png() {
      return writer;
    },
    jpeg() {
      return writer;
    }
  };
}
