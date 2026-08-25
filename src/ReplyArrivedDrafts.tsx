import { navigateBack, navigateTo } from "./navigation";
import { repliedPreviewLetter } from "./MyLetterDetailDrafts";

function DraftHeader({ title = "답장 도착" }: { title?: string }) {
  return <header className="flow-header"><button type="button" onClick={() => navigateBack("/home")} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header>;
}

function openReply() { navigateTo(`/mailbox-my-draft-1-replied`); }

/** R1 — 미니멀 확장형: 기존 구조를 유지하되, 은은한 빛 번짐으로 도착의 순간을 조금 더 따뜻하게 */
export function ReplyArrivedDraftR1() {
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll">
    <section className="flow-complete reply-arrived">
      <div style={{ position: "relative", display: "grid", justifyItems: "center" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: "-18px", width: 190, height: 190, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,91,166,0.18) 0%, rgba(123,91,166,0) 70%)" }} />
        <img src="/assets/reply-sent-lavender-envelope.png" alt="도착한 편지 봉투" style={{ position: "relative" }} />
      </div>
      <h1>답장이 도착했어요</h1>
      <p>당신의 이야기를 읽은 사람이 마음을 전했어요.</p>
      <div><button className="flow-primary-button" type="button" onClick={openReply}>답장 열어보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>나중에 읽기</button></div>
    </section>
  </div></main>;
}

/** R2 — 왁스 실링 카드형: 봉인을 여는 듯한 카드 형태로, 탭해서 여는 감각을 강조 */
export function ReplyArrivedDraftR2() {
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll">
    <section style={{ minHeight: 550, display: "grid", justifyItems: "center", alignContent: "center", textAlign: "center", padding: "0 8px" }}>
      <button
        type="button"
        onClick={openReply}
        aria-label="답장 열어보기"
        style={{
          width: "min(100%, 260px)", padding: "46px 20px 34px", border: "1px solid var(--gold-rule-mid)",
          background: "rgba(255,253,248,.78)", cursor: "pointer", display: "grid", justifyItems: "center", gap: 6,
        }}
      >
        <span aria-hidden="true" style={{
          width: 54, height: 54, borderRadius: "50%", background: "var(--deep-plum)",
          boxShadow: "0 6px 16px rgba(41,37,34,.22), inset 0 2px 3px rgba(255,255,255,.18)",
          display: "grid", placeItems: "center", color: "var(--paper-bright)", fontSize: 22, fontFamily: '"Noto Serif KR", serif', marginBottom: 6,
        }}>✦</span>
        <strong style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 20, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.04em" }}>봉인된 답장</strong>
        <span style={{ color: "var(--muted-ink)", fontSize: "var(--fs-xs)" }}>눌러서 열어보세요</span>
      </button>
      <h1 style={{ marginTop: 26 }}>답장이 도착했어요</h1>
      <p>당신의 이야기를 읽은 사람이 마음을 전했어요.</p>
      <div style={{ width: "min(100%, 280px)", marginTop: 20 }}><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>나중에 읽기</button></div>
    </section>
  </div></main>;
}

/** R3 — 맥락 회상형: 내가 보낸 편지의 첫 문장을 함께 보여줘 무엇에 대한 답장인지 떠올리게 함 */
export function ReplyArrivedDraftR3() {
  const firstLine = repliedPreviewLetter.content.split("\n")[0];
  return <main className="mobile-prototype letter-flow-screen"><DraftHeader /><div className="letter-flow-scroll">
    <section className="flow-complete reply-arrived" style={{ minHeight: 610 }}>
      <p style={{
        margin: "0 0 26px", padding: "14px 18px", maxWidth: 260, borderLeft: "2px solid var(--gold-rule-strong)",
        background: "rgba(255,253,248,.6)", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: 13, lineHeight: 1.7, textAlign: "left",
      }}>내가 보낸 편지<br /><span style={{ color: "var(--ink)" }}>“{firstLine}”</span></p>
      <img src="/assets/reply-sent-lamp.png" alt="도착한 편지" style={{ marginTop: 0 }} />
      <h1>이 편지에<br />답장이 도착했어요</h1>
      <p>당신의 이야기를 읽은 사람이 마음을 전했어요.</p>
      <div><button className="flow-primary-button" type="button" onClick={openReply}>답장 열어보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>나중에 읽기</button></div>
    </section>
  </div></main>;
}
