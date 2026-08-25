import { useState } from "react";
import { getCurrentUserId } from "./letters";
import { getCurrentAnonymousName } from "./mockAuth";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { navigateBack } from "./navigation";
import type { Letter } from "./letters";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

const previewLetter: Letter = {
  id: "preview-draft",
  senderId: "preview-user",
  content: "요즘 자꾸 잠들기 전에 예전 생각이 나요.\n괜찮다고 되뇌어도 마음 한켠이 계속 무거워서, 누군가에게 이 마음을 조용히 털어놓고 싶었어요.\n읽어주셔서 고마워요.",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  status: "assigned",
  assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
} as Letter;

function usePreviewLetter() {
  return previewLetter;
}

function DraftHeader({ title = "내가 보낸 편지" }: { title?: string }) {
  return <header className="flow-header"><button type="button" onClick={() => navigateBack("/mailbox")} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header>;
}

/** Draft 1 — 상태 카드 우선형: 지금 상태를 가장 먼저, 그 안에 보낸 날짜를 함께 노출 */
export function MyLetterDetailDraft1() {
  const letter = usePreviewLetter();
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <section className="detail-status-card">
      <strong>{display.label}</strong>
      <p>{formatDate(letter.createdAt)}에 보냈어요.</p>
    </section>
    <article className="flow-letter-paper"><span>보낸 편지</span><blockquote>{letter.content}</blockquote></article>
  </section></div></main>;
}

export const repliedPreviewLetter: Letter = {
  ...previewLetter,
  status: "read",
  reply: {
    id: "preview-reply",
    writerId: "preview-reader",
    content: "이야기를 들려주셔서 고마워요.\n무거운 마음을 안고도 이렇게 편지를 써주셔서, 그 마음이 저에게도 잘 전해졌어요.\n잠들기 전 생각이 자꾸 난다는 건, 그만큼 소중히 여기고 있다는 뜻일지도 몰라요.\n오늘 밤은 조금 더 편안하시길 바라요.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  repliedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
} as Letter;

/** Draft 1 — 답장이 도착했을 때: 상태 카드가 "답장이 도착했어요"로 바뀌고, 원문 아래 답장 카드가 같은 편지지 스타일로 이어짐 */
export function MyLetterDetailDraft1Replied() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <section className="detail-status-card">
      <strong>{display.label}</strong>
      <p>{formatDate(letter.createdAt)}에 보냈어요.</p>
    </section>
    <article className="flow-letter-paper"><span>보낸 편지</span><blockquote>{letter.content}</blockquote></article>
    <section className="detail-reply">
      <p>받은 답장</p>
      <blockquote>{letter.reply!.content}</blockquote>
      <small>익명의 누군가 · {formatDate(letter.reply!.createdAt)}</small>
    </section>
  </section></div></main>;
}

/** X1 — 대화형 타임라인: 보낸 편지 → 받은 답장을 하나의 흐름으로 잇는 타임라인 */
export function MyLetterDetailRepliedX1() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <p style={{ margin: "0 0 22px", color: "var(--deep-plum)", fontSize: "var(--fs-xs)", fontWeight: 700 }}>{display.label}</p>
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 1, background: "var(--gold-rule-mid)" }} />
      <div style={{ position: "relative", marginBottom: 30 }}>
        <span aria-hidden="true" style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--deep-plum)" }} />
        <p style={{ margin: "0 0 4px", color: "var(--muted-ink)", fontSize: "var(--fs-nano)" }}>{formatDate(letter.createdAt)} · 내가 보낸 편지</p>
        <article className="flow-letter-paper" style={{ marginTop: 8 }}><blockquote>{letter.content}</blockquote></article>
      </div>
      <div style={{ position: "relative" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--plum)" }} />
        <p style={{ margin: "0 0 4px", color: "var(--muted-ink)", fontSize: "var(--fs-nano)" }}>{formatDate(letter.reply!.createdAt)} · 받은 답장</p>
        <article className="flow-letter-paper" style={{ marginTop: 8, background: "rgba(232,222,239,.28)", borderColor: "rgba(104,78,126,.28)" }}><blockquote>{letter.reply!.content}</blockquote></article>
      </div>
    </div>
  </section></div></main>;
}

/** X2 — 답장 강조형: 답장을 최상단 큰 카드로, 원문은 접어서 필요할 때만 펼침 */
export function MyLetterDetailRepliedX2() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  const [showOriginal, setShowOriginal] = useState(false);
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <p className="detail-kicker">{display.label}</p>
    <section className="detail-reply" style={{ marginTop: 8 }}>
      <p>받은 답장</p>
      <blockquote>{letter.reply!.content}</blockquote>
      <small>익명의 누군가 · {formatDate(letter.reply!.createdAt)}</small>
    </section>
    <button
      type="button"
      onClick={() => setShowOriginal((value) => !value)}
      aria-expanded={showOriginal}
      style={{ display: "flex", width: "100%", marginTop: 22, padding: "13px 0", border: 0, borderTop: "1px solid rgba(41,37,34,.13)", borderBottom: showOriginal ? "0" : "1px solid rgba(41,37,34,.13)", background: "transparent", color: "var(--deep-plum)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer", justifyContent: "space-between", alignItems: "center" }}
    >
      내가 보낸 편지 · {formatDate(letter.createdAt)}
      <span aria-hidden="true" style={{ fontSize: 12 }}>{showOriginal ? "숨기기" : "원문 보기"}</span>
    </button>
    {showOriginal && <article className="flow-letter-paper" style={{ marginTop: 0, borderTop: 0 }}><blockquote>{letter.content}</blockquote></article>}
  </section></div></main>;
}

/** X3 — 한 장 이어쓰기형: 원문과 답장을 하나의 편지지 위에서 이어지는 한 장의 기록처럼 */
export function MyLetterDetailRepliedX3() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <p className="detail-kicker">{display.label}</p>
    <article className="flow-letter-paper" style={{ padding: "23px 18px 26px" }}>
      <span>보낸 편지 · {formatDate(letter.createdAt)}</span>
      <blockquote>{letter.content}</blockquote>
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0" }}>
        <span style={{ flex: 1, height: 1, background: "var(--gold-rule-mid)" }} />
        <span style={{ color: "var(--deep-plum)", fontSize: 13 }}>✦</span>
        <span style={{ flex: 1, height: 1, background: "var(--gold-rule-mid)" }} />
      </div>
      <span>받은 답장 · {formatDate(letter.reply!.createdAt)}</span>
      <blockquote>{letter.reply!.content}</blockquote>
    </article>
  </section></div></main>;
}

/** Y1 — 읽기 공간형: /read-letter 의 방 일러스트 + 겹쳐지는 편지지·큰 따옴표 스타일을 그대로 가져와 원문과 답장 두 장을 잇는다 */
export function MyLetterDetailRepliedY1() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><DraftHeader /><div className="letter-flow-scroll active-reading-scroll">
    <section className="active-reading-room" aria-label="내가 보낸 편지 공간" style={{ minHeight: 248 }}>
      <div className="active-reading-room-copy">
        <h1>내 마음에<br /><strong>답장</strong>이 도착했어요</h1>
      </div>
      <img src="/assets/reply-sent-lavender-envelope.png" alt="" aria-hidden="true" style={{ opacity: 1, bottom: 12 }} />
    </section>
    <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>내가 보낸 편지</span><time>{formatDate(letter.createdAt)}</time></p>
    <div className="active-reading-mat" style={{ marginTop: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26 }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>”</span>
        <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ {getCurrentAnonymousName()}</p>
      </article>
    </div>
    <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
      <span aria-hidden="true" style={{ width: 1, height: 44, background: "rgba(188, 146, 62, 0.68)" }} />
    </div>
    <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>받은 답장</span><time>{formatDate(letter.reply!.createdAt)}</time></p>
    <div className="active-reading-mat" style={{ marginTop: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26, background: "rgba(232,222,239,.32)", borderColor: "rgba(104,78,126,.32)" }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.reply!.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
        <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ 익명의 누군가</p>
      </article>
    </div>
  </div></main>;
}

/** Y1 — 답장이 아직 없을 때: Y1과 동일한 디자인, 제목만 대기 상태 문구로, 하단 세로선·받은 답장은 제거 */
export function MyLetterDetailY1Waiting() {
  const letter = usePreviewLetter();
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><DraftHeader /><div className="letter-flow-scroll active-reading-scroll">
    <section className="active-reading-room" aria-label="내가 보낸 편지 공간" style={{ minHeight: 248 }}>
      <div className="active-reading-room-copy">
        <h1><strong>답장</strong>을<br />기다리고 있어요</h1>
      </div>
      <img src="/assets/reply-sent-lavender-envelope.png" alt="" aria-hidden="true" style={{ opacity: 1, bottom: 12 }} />
    </section>
    <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>내가 보낸 편지</span><time>{formatDate(letter.createdAt)}</time></p>
    <div className="active-reading-mat" style={{ marginTop: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26 }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>”</span>
        <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ {getCurrentAnonymousName()}</p>
      </article>
    </div>
  </div></main>;
}

/** Y2 — 답장의 방 강조형: 내 원문은 짧은 인용으로만, 도착한 답장에 방 일러스트와 큰 따옴표를 몰아준다 */
export function MyLetterDetailRepliedY2() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><DraftHeader /><div className="letter-flow-scroll active-reading-scroll">
    <section className="letter-detail" style={{ padding: "24px 24px 0" }}>
      <div style={{ padding: "17px 18px", border: "1px solid var(--gold-rule-mid)", background: "rgba(255,253,248,.62)" }}>
        <p className="detail-kicker" style={{ margin: "0 0 9px" }}>내가 보낸 편지 · {formatDate(letter.createdAt)}</p>
        <p style={{ margin: 0, color: "var(--ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 15, lineHeight: 1.75, letterSpacing: "-0.03em" }}>“{letter.content.split("\n")[0]}{letter.content.includes("\n") ? "…" : ""}”</p>
      </div>
    </section>
    <section className="active-reading-room" aria-label="도착한 답장 공간" style={{ marginTop: 14 }}>
      <div className="active-reading-room-copy">
        <p className="active-reading-kicker"><span>{display.label}</span><time>{formatDate(letter.reply!.createdAt)}</time></p>
        <h1><strong>익명의 누군가</strong>님이<br />보낸 답장</h1>
      </div>
      <img src="/assets/reply-sent-lavender-envelope.png" alt="" aria-hidden="true" style={{ opacity: 0.7 }} />
    </section>
    <div className="active-reading-mat">
      <article className="active-reading-paper">
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
        <blockquote>{letter.reply!.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
      </article>
    </div>
  </div></main>;
}

/** Y2 — 답장이 아직 없을 때: 몰아줄 답장이 없으니, 방 일러스트와 큰 따옴표를 대신 내 편지 원문이 물려받는다 */
export function MyLetterDetailY2Waiting() {
  const letter = usePreviewLetter();
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><DraftHeader /><div className="letter-flow-scroll active-reading-scroll">
    <section className="active-reading-room" aria-label="내가 보낸 편지 공간">
      <div className="active-reading-room-copy">
        <p className="active-reading-kicker"><span>{display.label}</span><time>{formatDate(letter.createdAt)}</time></p>
        <h1>내가 보낸<br />편지예요</h1>
      </div>
      <img src="/assets/read-letter-room-framed.png" alt="" aria-hidden="true" />
    </section>
    <div className="active-reading-mat">
      <article className="active-reading-paper">
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
        <blockquote>{letter.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
      </article>
    </div>
    <p style={{ margin: "22px 24px 0", textAlign: "center", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "11px", lineHeight: 1.7 }}>{display.description}</p>
  </div></main>;
}

/** Y3 — 나란히 두 장형: 방 일러스트 없이, 두 편지지를 같은 따옴표 스타일로 나란히 이어 붙인다 */
export function MyLetterDetailRepliedY3() {
  const letter = repliedPreviewLetter;
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><DraftHeader /><div className="letter-flow-scroll active-reading-scroll" style={{ padding: "28px 24px 40px" }}>
    <p className="detail-kicker">{display.label}</p>
    <div className="active-reading-mat" style={{ margin: "18px 0 0", padding: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 22 }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
        <small style={{ display: "block", marginTop: 4, color: "var(--muted-ink)", fontSize: "var(--fs-nano)" }}>보낸 편지 · {formatDate(letter.createdAt)}</small>
      </article>
    </div>
    <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", margin: "18px 0" }}><span style={{ color: "var(--deep-plum)", fontSize: 16 }}>↓</span></div>
    <div className="active-reading-mat" style={{ margin: 0, padding: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 22, background: "rgba(232,222,239,.32)", borderColor: "rgba(104,78,126,.32)" }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.reply!.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
        <small style={{ display: "block", marginTop: 4, color: "var(--muted-ink)", fontSize: "var(--fs-nano)" }}>익명의 누군가 · {formatDate(letter.reply!.createdAt)}</small>
      </article>
    </div>
  </div></main>;
}

/** Draft 2 — 편지지 중심형: 편지 원문을 가장 크게, 상태·날짜는 아래에 조용한 캡션으로 */
export function MyLetterDetailDraft2() {
  const letter = usePreviewLetter();
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <p className="detail-kicker">내가 보낸 편지</p>
    <article className="flow-letter-paper" style={{ marginTop: 21 }}><blockquote>{letter.content}</blockquote></article>
    <p style={{ margin: "16px 2px 0", display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted-ink)", fontSize: "var(--fs-nano)" }}>
      <span>{formatDate(letter.createdAt)}</span>
      <strong style={{ color: "var(--deep-plum)", fontWeight: 700 }}>{display.label}</strong>
    </p>
  </section></div></main>;
}

/** Draft 3 — 리스트형: 상태·날짜를 표처럼 먼저 정리하고, 원문은 그 아래 편지지로 */
export function MyLetterDetailDraft3() {
  const letter = usePreviewLetter();
  const display = getSentLetterDisplayStatus(letter, getCurrentUserId());
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll"><section className="letter-detail">
    <p className="detail-kicker">내가 보낸 편지</p>
    <dl><div><dt>현재 상태</dt><dd>{display.label}</dd></div><div><dt>보낸 날짜</dt><dd>{formatDate(letter.createdAt)}</dd></div></dl>
    <article className="flow-letter-paper"><span>원문</span><blockquote>{letter.content}</blockquote></article>
  </section></div></main>;
}
