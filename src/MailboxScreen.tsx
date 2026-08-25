import { useState } from "react";
import { navigateTo } from "./navigation";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { getCurrentUserId, getLetterById, getLettersRepliedByUser, getMyLetters, type Letter } from "./letters";
import { getReplyDraftsByWriter } from "./letterDraft";
import { getSentLetterDisplayStatus } from "./mailboxStatus";

export type MailboxKey = "sent" | "replied" | "favorite";

export const MAILBOX_RECORDS: ReadonlyArray<{ id: MailboxKey; title: string; description: string; count: number }> = [
  { id: "sent", title: "내가 보낸 편지", description: "내 마음을 털어놓았던 기록", count: 8 },
  { id: "replied", title: "내가 답한 편지", description: "누군가에게 건넨 마음", count: 12 },
  { id: "favorite", title: "즐겨찾기", description: "오래 간직하고 싶은 편지", count: 4 },
];

export function formatMailboxCount(count: number) { return `${count > 999 ? "999+" : count}통`; }

export function MailboxNavigation({ onUnavailable }: { onUnavailable: (label: string) => void }) {
  return <nav className="app-bottom-navigation" aria-label="주요 메뉴"><button type="button" onClick={() => navigateTo("/home")}><img className="app-nav-mark app-nav-mark--home" src="/assets/home_icon.png" alt="" aria-hidden="true" /><span>홈</span></button><button type="button" className="is-active" aria-current="page"><img className="app-nav-mark app-nav-mark--mailbox" src="/assets/letter_icon.png" alt="" aria-hidden="true" /><span>편지함</span></button><button type="button" onClick={() => onUnavailable("나의 공간")}><img className="app-nav-mark app-nav-mark--space" src="/assets/notebook_icon.png" alt="" aria-hidden="true" /><span>나의 공간</span></button></nav>;
}

type UnifiedMode = "mine" | "replied";
type UnifiedStatusKey = "waiting" | "arrived" | "read";

const UNIFIED_STATUS_META: Record<UnifiedStatusKey, { label: string; color: string }> = {
  waiting: { label: "답장 기다리는 중", color: "#a99b84" },
  arrived: { label: "답장 도착", color: "var(--deep-plum)" },
  read: { label: "답장 완료", color: "var(--sage)" },
};

const UNIFIED_FILTERS: Array<{ key: UnifiedStatusKey | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "waiting", label: "답장 기다리는 중" },
  { key: "arrived", label: "답장 도착" },
  { key: "read", label: "답장 완료" },
];

/** 거둔 편지는 목록에서 제외하고, 내가 답한 편지는 "답장 완료"로 합류시킨다. */
function unifiedStatusOf(letter: Letter, mode: UnifiedMode, userId: string): UnifiedStatusKey | undefined {
  if (mode === "replied") return "read";
  if (letter.status === "withdrawn") return undefined;
  const display = getSentLetterDisplayStatus(letter, userId);
  if (display.hasUnreadReply) return "arrived";
  if (letter.reply) return "read";
  return "waiting";
}

function formatMailboxDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function MailboxScreen() {
  const userId = getCurrentUserId();
  const [filter, setFilter] = useState<UnifiedStatusKey | "all">("all");
  const entries = [
    ...getMyLetters(userId).map((letter) => ({ letter, mode: "mine" as UnifiedMode })),
    ...getLettersRepliedByUser(userId).map((letter) => ({ letter, mode: "replied" as UnifiedMode })),
  ]
    .map((entry) => ({ ...entry, status: unifiedStatusOf(entry.letter, entry.mode, userId) }))
    .filter((entry): entry is typeof entry & { status: UnifiedStatusKey } => Boolean(entry.status))
    .sort((a, b) => b.letter.updatedAt.localeCompare(a.letter.updatedAt));
  const counts: Record<string, number> = { all: entries.length };
  for (const entry of entries) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  const filtered = filter === "all" ? entries : entries.filter((entry) => entry.status === filter);
  const replyDrafts = getReplyDraftsByWriter(userId).map((draft) => ({ draft, letter: getLetterById(draft.letterId) })).filter((item): item is { draft: ReturnType<typeof getReplyDraftsByWriter>[number]; letter: Letter } => Boolean(item.letter && item.letter.assignedReaderId === userId && ["assigned", "read", "waiting_for_reply"].includes(item.letter.status)));
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <header className="mailbox-heading" aria-labelledby="mailbox-title"><p>공감편지</p><h1 id="mailbox-title">편지함</h1><span>주고받은 마음을 한 통의 편지로 다시 꺼내볼 수 있어요.</span></header>
    {replyDrafts.length > 0 && <section className="mailbox-reply-drafts" aria-label="작성 중인 답장"><h2>답장 작성 중</h2>{replyDrafts.map(({ draft, letter }) => <button type="button" key={draft.id} onClick={() => navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`)}><strong>{letter.anonymousName || "누군가의 편지"}</strong><span>{draft.content.trim().replace(/\s+/g, " ").slice(0, 68)}</span><small>이어서 쓰기</small></button>)}</section>}
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 24px 4px", margin: "0 -24px" }}>
      {UNIFIED_FILTERS.map((f) => {
        const isActive = filter === f.key;
        const count = f.key === "all" ? counts.all : counts[f.key];
        if (f.key !== "all" && !count) return null;
        return <button
          key={f.key}
          type="button"
          onClick={() => setFilter(f.key)}
          style={{
            flex: "0 0 auto", padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
            border: isActive ? "1px solid var(--deep-plum)" : "1px solid rgba(41,37,34,0.16)",
            background: isActive ? "var(--deep-plum)" : "transparent",
            color: isActive ? "#fff" : "var(--muted-ink)",
            fontSize: 10.5, fontWeight: 600,
          }}
        >{f.label}{f.key !== "all" ? ` ${count}` : ""}</button>;
      })}
    </div>
    {filtered.length ? <section style={{ display: "grid", gap: 10, marginTop: 16 }} aria-label="편지함 목록">
      {filtered.map(({ letter, mode, status }) => {
        const meta = UNIFIED_STATUS_META[status];
        const nickname = mode === "mine" ? "내가 보낸 편지" : (letter.anonymousName || "익명의 누군가");
        return <button
          key={`${mode}-${letter.id}`}
          type="button"
          onClick={() => navigateTo(mode === "mine" ? `/mailbox/my/${encodeURIComponent(letter.id)}` : `/mailbox/replied/${encodeURIComponent(letter.id)}`)}
          style={{ display: "block", width: "100%", padding: 16, border: "1px solid var(--rule-light)", background: "rgba(255,253,248,.6)", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <time style={{ color: "var(--faint-ink)", fontSize: 11 }}>{formatMailboxDate(letter.updatedAt)}</time>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: meta.color, fontSize: 11, fontWeight: 700 }}>{status === "arrived" && <i aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />}{meta.label}</span>
          </span>
          <strong style={{ display: "block", marginTop: 10, color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 17, fontWeight: 500 }}>{nickname}</strong>
        </button>;
      })}
    </section> : <section className="mailbox-letter-empty"><p>아직 주고받은 편지가 없어요.</p><span>마음을 남기면 한 사람이 읽고 답장을 전해요.</span><button type="button" onClick={() => navigateTo("/write-letter")}>편지 쓰기</button></section>}
  </div><AppBottomNavigation active="mailbox" /></main>;
}


export function MailboxLetterListItem({ letter, mode, userId, onClick, statusOverride, previewOverride }: { letter: Letter; mode: "mine" | "replied"; userId: string; onClick: () => void; statusOverride?: string; previewOverride?: string }) {
  const date = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(letter.updatedAt));
  const sentStatus = getSentLetterDisplayStatus(letter, userId);
  const status = statusOverride ?? (mode === "replied" ? "답장을 전했어요" : sentStatus.label);
  const preview = previewOverride ?? (mode === "replied" ? letter.reply?.content : letter.content);
  const aria = mode === "mine" ? `${date}에 보낸 편지, ${status}${sentStatus.hasUnreadReply ? ", 읽지 않은 새 답장 있음" : ""}` : `${date}에 답한 편지, ${status}`;
  return <button type="button" className={`mailbox-letter-item mailbox-letter-item--${mode}${sentStatus.hasUnreadReply && mode === "mine" ? " is-unread" : ""}${sentStatus.isRestricted ? " is-restricted" : ""}`} onClick={onClick} aria-label={aria}><span className="mailbox-letter-meta"><time dateTime={letter.updatedAt}>{date}</time><em>{sentStatus.hasUnreadReply && mode === "mine" && <i className="mailbox-unread-dot" aria-hidden="true" />}{status}</em></span><strong>{preview || "내용을 준비하고 있어요."}</strong><span>{mode === "replied" ? "내가 건넨 답장" : letter.anonymousName || "익명으로 보낸 편지"}</span>{mode === "mine" && sentStatus.requiresAttention && <small>확인 필요</small>}</button>;
}
