export function Footer() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-center gap-1 border-t border-border bg-card text-xs text-muted-foreground">
      <span>Powered by</span>
      <a
        href="https://www.botivate.in"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Botivate
      </a>
    </footer>
  );
}
