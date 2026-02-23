import React from "react";
import { Loader2, ChevronDown } from "lucide-react";
import MessageItem from "./MessageItem";

function TypingDots({ name }) {
  return (
    <div className="mt-2 flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
        <span className="font-medium text-slate-500">{name || "Collaborator"} typing</span>
        <span className="flex items-center gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>
    </div>
  );
}

export default function MessageList({
  items,
  loading,
  meId,
  listRef,
  onScroll,
  atBottom,
  scrollToBottom,
  typing,
}) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-4 py-4 sm:px-6"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Start the conversation
          </div>
        ) : (
          <div>
            {items.map((item, idx) => {
              const key = item._id || item.id || item.clientTempId || String(idx);
              const prevItem = idx > 0 ? items[idx - 1] : null;

              return <MessageItem key={key} item={item} prevItem={prevItem} meId={meId} />;
            })}
          </div>
        )}

        {typing?.active ? <TypingDots name={typing.name} /> : null}
        <div className="h-1" />
      </div>

      {!atBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
