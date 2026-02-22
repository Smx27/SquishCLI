import { cac } from "cac";

export async function runCli(argv: string[]): Promise<void> {
  const cli = cac("squish");

  cli
    .command("[...input]", "Run squish CLI")
    .action((input: string[]) => {
      const files = input ?? [];
      if (files.length > 0) {
        console.log(`squish received ${files.length} input(s)`);
      }
    });

  cli.help();
  cli.version("0.1.0");
  cli.parse(argv, { run: true });
}
