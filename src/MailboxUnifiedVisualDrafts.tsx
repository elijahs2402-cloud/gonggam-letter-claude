import { useMemo, useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { getCurrentUserId, type Letter } from "./letters";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { Header, MOCK_ENTRIES, formatDate, openEntry, type Mode } from "./MailboxUnifiedDrafts";

/** 답장 대기중·내가 답장함·거둔 편지는 상태 체계에서 제외 — 도착/완료 두 가지만 의미 있는 "상태"로 남기고,
 *  그 외(아직 답장 없음, 거둔 편지)는 특별한 상태 없이 조용히 표시한다. */
type VisualStatus = "arrived" | "read" | "neutral";

function visualStatusOf(letter: Letter, mode: Mode, userId: string): VisualStatus {
  if (mode === "replied") return "read";
  const display = getSentLetterDisplayStatus(letter, userId);
  if (display.hasUnreadReply) return "arrived";
  if (letter.reply) return "read";
  return "neutral";
}

const FILTERS: Array<{ key: VisualStatus | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "arrived", label: "답장 도착" },
  { key: "read", label: "답장 완료" },
];

function useVisualEntries() {
  const userId = getCurrentUserId();
  return useMemo(() => MOCK_ENTRIES
    .map((entry) => ({ ...entry, status: visualStatusOf(entry.letter, entry.mode, userId) }))
    .sort((a, b) => b.letter.updatedAt.localeCompare(a.letter.updatedAt)), [userId]);
}

function useFiltered() {
  const entries = useVisualEntries();
  const [active, setActive] = useState<VisualStatus | "all">("all");
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    for (const e of entries) result[e.status] = (result[e.status] ?? 0) + 1;
    return result;
  }, [entries]);
  const filtered = active === "all" ? entries : entries.filter((e) => e.status === active);
  return { filtered, active, setActive, counts };
}

function Chips({ active, onChange, counts }: { active: VisualStatus | "all"; onChange: (k: VisualStatus | "all") => void; counts: Record<string, number> }) {
  return <div style={{ display: "flex", gap: 8, padding: "18px 24px 4px", margin: "0 -24px" }}>
    {FILTERS.map((f) => {
      const isActive = active === f.key;
      const count = f.key === "all" ? counts.all : counts[f.key];
      if (f.key !== "all" && !count) return null;
      return <button key={f.key} type="button" onClick={() => onChange(f.key)} style={{
        flex: "0 0 auto", padding: "8px 14px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
        border: isActive ? "1px solid var(--deep-plum)" : "1px solid rgba(41,37,34,0.16)",
        background: isActive ? "var(--deep-plum)" : "transparent",
        color: isActive ? "#fff" : "var(--muted-ink)", fontSize: 12, fontWeight: 600,
      }}>{f.label}{f.key !== "all" ? ` ${count}` : ""}</button>;
    })}
  </div>;
}

/** V1 — 좌측 컬러 스트라이프형: 카드 왼쪽 굵은 막대 색으로 상태를 표시 (도착=진한 보라, 완료=세이지, 대기=선 없음) */
export function MailboxUnifiedVisualV1() {
  const { filtered, active, setActive, counts } = useFiltered();
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <Chips active={active} onChange={setActive} counts={counts} />
    <section style={{ marginTop: 8 }}>
      {filtered.map(({ letter, mode, status }) => {
        const stripe = status === "arrived" ? "var(--deep-plum)" : status === "read" ? "var(--sage)" : "transparent";
        return <button key={`${mode}-${letter.id}`} type="button" onClick={() => openEntry(letter, mode)} style={{
          display: "flex", alignItems: "center", gap: 16, width: "100%", padding: "16px 24px 16px 18px",
          borderTop: "none", borderLeft: `4px solid ${stripe}`, borderRight: 0, borderBottom: "1px solid rgba(41,37,34,0.1)",
          background: "transparent", cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 16, fontWeight: 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
            <time style={{ display: "block", marginTop: 4, color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
          </span>
          {status === "arrived" && <span style={{ flex: "0 0 auto", color: "var(--deep-plum)", fontSize: 11, fontWeight: 700 }}>도착</span>}
          {status === "read" && <span style={{ flex: "0 0 auto", color: "var(--sage)", fontSize: 11, fontWeight: 700 }}>완료</span>}
        </button>;
      })}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}

/** V2 — 봉투 아이콘형: 닫힌 봉투(도착) / 열린 봉투(완료) / 봉투 없음(대기) 아이콘으로 한눈에 구분 */
function EnvelopeIcon({ status }: { status: VisualStatus }) {
  if (status === "neutral") return <span aria-hidden="true" style={{ width: 34, height: 34, flex: "0 0 auto" }} />;
  const color = status === "arrived" ? "var(--deep-plum)" : "var(--sage)";
  return <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" style={{ flex: "0 0 auto" }}>
    <rect x="3" y="8" width="28" height="20" rx="2" fill={status === "arrived" ? color : "none"} stroke={color} strokeWidth="1.6" />
    {status === "arrived"
      ? <path d="M4 9 L17 19 L30 9" fill="none" stroke="var(--paper-bright)" strokeWidth="1.6" strokeLinejoin="round" />
      : <path d="M4 9 L17 19 L30 9" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />}
    {status === "arrived" && <circle cx="27" cy="7" r="4" fill="var(--terracotta)" />}
  </svg>;
}

export function MailboxUnifiedVisualV2() {
  const { filtered, active, setActive, counts } = useFiltered();
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <Chips active={active} onChange={setActive} counts={counts} />
    <section style={{ marginTop: 8 }}>
      {filtered.map(({ letter, mode, status }) => (
        <button key={`${mode}-${letter.id}`} type="button" onClick={() => openEntry(letter, mode)} style={{
          display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 24px",
          border: 0, borderBottom: "1px solid rgba(41,37,34,0.1)", background: "transparent", cursor: "pointer", textAlign: "left",
        }}>
          <EnvelopeIcon status={status} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 16, fontWeight: 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
            <time style={{ display: "block", marginTop: 4, color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
          </span>
        </button>
      ))}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}

/** V3 — 배경 틴트 + 도트형: 도착한 편지만 은은한 보라 배경으로 눈에 띄게, 나머지는 점으로만 구분 */
export function MailboxUnifiedVisualV3() {
  const { filtered, active, setActive, counts } = useFiltered();
  return <main className="mobile-prototype mailbox-screen"><div className="mailbox-scroll-region">
    <Header />
    <Chips active={active} onChange={setActive} counts={counts} />
    <section style={{ display: "grid", gap: 8, marginTop: 16 }}>
      {filtered.map(({ letter, mode, status }) => {
        const bg = status === "arrived" ? "rgba(78,52,94,0.08)" : "transparent";
        const border = status === "arrived" ? "1px solid rgba(78,52,94,0.28)" : "1px solid var(--rule-light)";
        return <button key={`${mode}-${letter.id}`} type="button" onClick={() => openEntry(letter, mode)} style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px",
          border, background: bg, cursor: "pointer", textAlign: "left",
        }}>
          <span aria-hidden="true" style={{
            width: 9, height: 9, borderRadius: "50%", flex: "0 0 auto",
            background: status === "arrived" ? "var(--deep-plum)" : status === "read" ? "var(--sage)" : "transparent",
            border: status === "neutral" ? "1px solid var(--faint-ink-2)" : "none",
          }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", color: status === "arrived" ? "var(--deep-plum)" : "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 16, fontWeight: status === "arrived" ? 700 : 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
            <time style={{ display: "block", marginTop: 4, color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
          </span>
        </button>;
      })}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}
