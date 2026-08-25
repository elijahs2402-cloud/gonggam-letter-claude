import { useMemo, useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { getCurrentUserId, type Letter } from "./letters";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { navigateTo } from "./navigation";

export type Mode = "mine" | "replied";
type StatusKey = "waiting" | "arrived" | "read" | "repliedByMe" | "withdrawn";

const STATUS_META: Record<StatusKey, { label: string; color: string; muted?: boolean }> = {
  waiting: { label: "답장 대기중", color: "var(--faint-ink)", muted: true },
  arrived: { label: "답장 도착", color: "var(--deep-plum)" },
  read: { label: "답장 완료", color: "var(--sage)" },
  repliedByMe: { label: "내가 답장함", color: "var(--plum)" },
  withdrawn: { label: "거둔 편지", color: "var(--faint-ink-2)", muted: true },
};

const FILTERS: Array<{ key: StatusKey | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "waiting", label: "답장 대기중" },
  { key: "arrived", label: "답장 도착" },
  { key: "read", label: "답장 완료" },
  { key: "repliedByMe", label: "내가 답장함" },
  { key: "withdrawn", label: "거둔 편지" },
];

function statusOf(letter: Letter, mode: Mode, userId: string): StatusKey {
  if (mode === "replied") return "repliedByMe";
  if (letter.status === "withdrawn") return "withdrawn";
  const display = getSentLetterDisplayStatus(letter, userId);
  if (display.hasUnreadReply) return "arrived";
  if (letter.reply) return "read";
  return "waiting";
}

function daysAgo(n: number) { return new Date(Date.now() - 1000 * 60 * 60 * 24 * n).toISOString(); }

export const MOCK_ENTRIES: Array<{ letter: Letter; mode: Mode }> = [
  { mode: "mine", letter: { id: "u1", senderId: "me", anonymousName: "따뜻한 구름", content: "요즘 자꾸 잠들기 전에 예전 생각이 나요.", createdAt: daysAgo(0), updatedAt: daysAgo(0), status: "assigned" } as Letter },
  { mode: "mine", letter: { id: "u2", senderId: "me", anonymousName: "따뜻한 구름", content: "괜찮다고 말은 하는데 사실 잘 모르겠어요.", createdAt: daysAgo(1), updatedAt: daysAgo(1), status: "read", reply: { id: "r2", writerId: "x", content: "고마워요", createdAt: daysAgo(0) }, repliedAt: daysAgo(0) } as Letter },
  { mode: "mine", letter: { id: "u3", senderId: "me", anonymousName: "따뜻한 구름", content: "혼자 견디는 게 익숙해졌어요.", createdAt: daysAgo(3), updatedAt: daysAgo(2), status: "read", reply: { id: "r3", writerId: "x", content: "고마워요", createdAt: daysAgo(2) }, repliedAt: daysAgo(2), replyOpenedAt: daysAgo(2) } as Letter },
  { mode: "mine", letter: { id: "u4", senderId: "me", anonymousName: "고요한 파도", content: "오랜만에 마음을 좀 꺼내봐요.", createdAt: daysAgo(6), updatedAt: daysAgo(6), status: "withdrawn", withdrawnAt: daysAgo(5) } as Letter },
  { mode: "replied", letter: { id: "u5", senderId: "y", anonymousName: "작은 새벽", content: "요즘 계속 무기력해요.", createdAt: daysAgo(4), updatedAt: daysAgo(3), status: "replied", reply: { id: "r5", writerId: "me", content: "그 마음 알 것 같아요.", createdAt: daysAgo(3) }, repliedAt: daysAgo(3) } as Letter },
  { mode: "replied", letter: { id: "u6", senderId: "z", anonymousName: "잔잔한 나무", content: "누군가 들어줬으면 했어요.", createdAt: daysAgo(9), updatedAt: daysAgo(8), status: "replied", reply: { id: "r6", writerId: "me", content: "잘 견뎌왔어요.", createdAt: daysAgo(8) }, repliedAt: daysAgo(8) } as Letter },
];

function useUnifiedEntries() {
  const userId = getCurrentUserId();
  return useMemo(() => {
    return MOCK_ENTRIES
      .map((entry) => ({ ...entry, status: statusOf(entry.letter, entry.mode, userId) }))
      .sort((a, b) => b.letter.updatedAt.localeCompare(a.letter.updatedAt));
  }, [userId]);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value));
}

export function Header() {
  return <header className="mailbox-heading" aria-labelledby="mailbox-title"><p>공감편지</p><h1 id="mailbox-title">편지함</h1><span>주고받은 마음을 한 통의 편지로 다시 꺼내볼 수 있어요.</span></header>;
}

function FilterChips({ active, onChange, counts }: { active: StatusKey | "all"; onChange: (key: StatusKey | "all") => void; counts: Record<string, number> }) {
  return <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 24px 4px", margin: "0 -24px" }}>
    {FILTERS.map((f) => {
      const isActive = active === f.key;
      const count = f.key === "all" ? counts.all : counts[f.key];
      if (f.key !== "all" && !count) return null;
      return <button
        key={f.key}
        type="button"
        onClick={() => onChange(f.key)}
        style={{
          flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
          border: isActive ? "1px solid var(--deep-plum)" : "1px solid rgba(41,37,34,0.16)",
          background: isActive ? "var(--deep-plum)" : "transparent",
          color: isActive ? "#fff" : "var(--muted-ink)",
          fontSize: 12, fontWeight: 600,
        }}
      >{f.label}{f.key !== "all" ? ` ${count}` : ""}</button>;
    })}
  </div>;
}

function useFilteredEntries() {
  const entries = useUnifiedEntries();
  const [active, setActive] = useState<StatusKey | "all">("all");
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    for (const e of entries) result[e.status] = (result[e.status] ?? 0) + 1;
    return result;
  }, [entries]);
  const filtered = active === "all" ? entries : entries.filter((e) => e.status === active);
  return { filtered, active, setActive, counts };
}

export function openEntry(letter: Letter, mode: Mode) {
  navigateTo(mode === "mine" ? `/mailbox/my/${encodeURIComponent(letter.id)}` : `/mailbox/replied/${encodeURIComponent(letter.id)}`);
}

/** Draft A — 가로 3분할형: 날짜 · 닉네임 · 상태 배지를 한 줄에 나란히 */
export function MailboxUnifiedDraftA() {
  const { filtered, active, setActive, counts } = useFilteredEntries();
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <FilterChips active={active} onChange={setActive} counts={counts} />
    <section style={{ marginTop: 8 }}>
      {filtered.map(({ letter, mode, status }) => {
        const meta = STATUS_META[status];
        return <button key={`${mode}-${letter.id}`} type="button" onClick={() => openEntry(letter, mode)} style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 24px",
          border: 0, borderBottom: "1px solid rgba(41,37,34,0.1)", background: "transparent", cursor: "pointer", textAlign: "left",
        }}>
          <time style={{ flex: "0 0 64px", color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
          <strong style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 15, fontWeight: 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
          <span style={{ flex: "0 0 auto", color: meta.color, fontSize: 11, fontWeight: 700 }}>{meta.label}</span>
        </button>;
      })}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}

/** Draft B — 상태 배지 강조형: 닉네임 옆에 알약 모양 배지, 날짜는 아래 작은 캡션 */
export function MailboxUnifiedDraftB() {
  const { filtered, active, setActive, counts } = useFilteredEntries();
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <FilterChips active={active} onChange={setActive} counts={counts} />
    <section style={{ marginTop: 8 }}>
      {filtered.map(({ letter, mode, status }) => {
        const meta = STATUS_META[status];
        return <button key={`${mode}-${letter.id}`} type="button" onClick={() => openEntry(letter, mode)} style={{
          display: "block", width: "100%", padding: "16px 24px",
          border: 0, borderBottom: "1px solid rgba(41,37,34,0.1)", background: "transparent", cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 16, fontWeight: 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
            <span style={{ padding: "3px 9px", borderRadius: 999, background: meta.muted ? "transparent" : meta.color, border: meta.muted ? `1px solid ${meta.color}` : "none", color: meta.muted ? meta.color : "#fff", fontSize: 10, fontWeight: 700 }}>{meta.label}</span>
          </span>
          <time style={{ display: "block", marginTop: 6, color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
        </button>;
      })}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}

/* Draft C 전용 — 상태를 "답장 기다리는 중 · 답장 도착 · 답장 완료" 3가지로, 날짜는 연도까지 표기 */
type StatusKeyC = "waiting" | "arrived" | "read";

const STATUS_META_C: Record<StatusKeyC, { label: string; color: string }> = {
  waiting: { label: "답장 기다리는 중", color: "#a99b84" },
  arrived: { label: "답장 도착", color: "var(--deep-plum)" },
  read: { label: "답장 완료", color: "var(--sage)" },
};

const FILTERS_C: Array<{ key: StatusKeyC | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "waiting", label: "답장 기다리는 중" },
  { key: "arrived", label: "답장 도착" },
  { key: "read", label: "답장 완료" },
];

/** 내가 답장함(repliedByMe)은 "답장 완료"로, 거둔 편지(withdrawn)는 배지 없이 조용히 표시 */
function statusOfC(letter: Letter, mode: Mode, userId: string): StatusKeyC | undefined {
  if (mode === "replied") return "read";
  if (letter.status === "withdrawn") return undefined;
  const display = getSentLetterDisplayStatus(letter, userId);
  if (display.hasUnreadReply) return "arrived";
  if (letter.reply) return "read";
  return "waiting";
}

function formatDateWithYear(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function useFilteredEntriesC() {
  const userId = getCurrentUserId();
  const entries = useMemo(() => MOCK_ENTRIES
    .map((entry) => ({ ...entry, status: statusOfC(entry.letter, entry.mode, userId) }))
    .filter((entry): entry is typeof entry & { status: StatusKeyC } => Boolean(entry.status))
    .sort((a, b) => b.letter.updatedAt.localeCompare(a.letter.updatedAt)), [userId]);
  const [active, setActive] = useState<StatusKeyC | "all">("all");
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    for (const e of entries) if (e.status) result[e.status] = (result[e.status] ?? 0) + 1;
    return result;
  }, [entries]);
  const filtered = active === "all" ? entries : entries.filter((e) => e.status === active);
  return { filtered, active, setActive, counts };
}

function FilterChipsC({ active, onChange, counts }: { active: StatusKeyC | "all"; onChange: (key: StatusKeyC | "all") => void; counts: Record<string, number> }) {
  return <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 24px 4px", margin: "0 -24px" }}>
    {FILTERS_C.map((f) => {
      const isActive = active === f.key;
      const count = f.key === "all" ? counts.all : counts[f.key];
      if (f.key !== "all" && !count) return null;
      return <button
        key={f.key}
        type="button"
        onClick={() => onChange(f.key)}
        style={{
          flex: "0 0 auto", padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
          border: isActive ? "1px solid var(--deep-plum)" : "1px solid rgba(41,37,34,0.16)",
          background: isActive ? "var(--deep-plum)" : "transparent",
          color: isActive ? "#fff" : "var(--muted-ink)",
          fontSize: 10.5, fontWeight: 600,
        }}
      >{f.label}{f.key !== "all" ? ` ${count}` : ""}</button>;
    })}
  </div>;
}

const VIEWED_STORAGE_KEY = "mailbox-draft-c-viewed-ids";

function readViewedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VIEWED_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Draft C — 박스 카드형: 각 항목을 독립된 카드로 분리, 상단 메타(날짜·상태) + 하단 닉네임.
 *  상태 앞 동그라미는 "아직 확인하지 않았다"는 표시로, 카드를 한 번 열어보면 사라진다. */
export function MailboxUnifiedDraftC() {
  const { filtered, active, setActive, counts } = useFilteredEntriesC();
  const [viewedIds, setViewedIds] = useState<Set<string>>(readViewedIds);
  const markViewed = (letter: Letter, mode: Mode) => {
    setViewedIds((current) => {
      if (current.has(letter.id)) return current;
      const next = new Set(current);
      next.add(letter.id);
      try { window.localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    openEntry(letter, mode);
  };
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <FilterChipsC active={active} onChange={setActive} counts={counts} />
    <section style={{ display: "grid", gap: 10, marginTop: 16 }}>
      {filtered.map(({ letter, mode, status }) => {
        const meta = STATUS_META_C[status];
        const nickname = status === "waiting" ? "내가 보낸 편지" : (letter.anonymousName || "익명의 누군가");
        const isNew = !viewedIds.has(letter.id);
        return <button key={`${mode}-${letter.id}`} type="button" onClick={() => markViewed(letter, mode)} style={{
          display: "block", width: "100%", padding: 16,
          border: "1px solid var(--rule-light)", background: "rgba(255,253,248,.6)", cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <time style={{ color: "var(--faint-ink)", fontSize: 11 }}>{formatDateWithYear(letter.updatedAt)}</time>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: meta.color, fontSize: 11, fontWeight: 700 }}>{isNew && <i aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />}{meta.label}</span>
          </span>
          <strong style={{ display: "block", marginTop: 10, color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 17, fontWeight: 500 }}>{nickname}</strong>
        </button>;
      })}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}
