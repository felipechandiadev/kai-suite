import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ minHeight: "calc(100dvh - var(--app-topbar-height))" }}
    >
      <ChatClient />
    </div>
  );
}
