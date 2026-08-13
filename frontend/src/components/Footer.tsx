import { DISCLAIMER_TEXT } from "@/content/documents";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-zinc-500">{DISCLAIMER_TEXT}</div>
    </footer>
  );
}
