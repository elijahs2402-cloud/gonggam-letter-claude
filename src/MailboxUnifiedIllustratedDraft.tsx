import { useMemo, useState } from "react";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { getCurrentUserId, type Letter } from "./letters";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { Header, MOCK_ENTRIES, formatDate, openEntry, type Mode } from "./MailboxUnifiedDrafts";

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

function useFiltered() {
  const userId = getCurrentUserId();
  const entries = useMemo(() => MOCK_ENTRIES
    .map((entry) => ({ ...entry, status: visualStatusOf(entry.letter, entry.mode, userId) }))
    .sort((a, b) => b.letter.updatedAt.localeCompare(a.letter.updatedAt)), [userId]);
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

/**
 * 공감편지 일러스트 가이드 적용 아이콘:
 * - 짙은 차콜 윤곽선(거의 검정), 플랫 컬러 블록, 절제된 방향성 해칭(봉투 덮개 종이결)
 * - 핵심 포인트 컬러는 라벤더-딥플럼 하나만, 보조색은 황동(브라스) 소량
 * - 대기 상태는 장식 없이 옅은 윤곽선만 남겨 존재감을 낮춤
 */
function EditorialEnvelopeIcon({ status }: { status: VisualStatus }) {
  if (status === "neutral") {
    return <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <rect x="4" y="10" width="28" height="18" rx="1.5" fill="none" stroke="rgba(47,42,37,0.22)" strokeWidth="1.4" />
      <path d="M5 11 L18 21 L31 11" fill="none" stroke="rgba(47,42,37,0.22)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>;
  }
  const src = status === "arrived" ? "/assets/mailbox-icon-arrived.png" : "/assets/mailbox-icon-read.png";
  return <span aria-hidden="true" style={{ flex: "0 0 auto", width: 40, height: 40, overflow: "hidden", display: "block", position: "relative" }}>
    <img src={src} alt="" style={{ position: "absolute", top: "50%", left: "50%", width: 100, height: 100, maxWidth: "none", transform: "translate(-50%, -50%)", objectFit: "contain" }} />
  </span>;
}

/** 일러스트 가이드 적용형: 에디토리얼 펜선 스타일의 봉투 아이콘으로 상태를 표시 */
export function MailboxUnifiedIllustratedDraft() {
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
          <EditorialEnvelopeIcon status={status} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 16, fontWeight: 500 }}>{letter.anonymousName || "익명의 누군가"}</strong>
            <time style={{ display: "block", marginTop: 4, color: "var(--faint-ink)", fontSize: 11 }}>{formatDate(letter.updatedAt)}</time>
          </span>
        </button>
      ))}
    </section>
  </div><AppBottomNavigation active="mailbox" /></main>;
}
