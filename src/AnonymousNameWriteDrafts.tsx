import { useState } from "react";
import { generateAnonymousName, getCurrentAnonymousName, updateAnonymousName } from "./mockAuth";
import { navigateBack } from "./navigation";

function DraftHeader({ title = "익명 닉네임" }: { title?: string }) {
  return <header className="flow-header"><button type="button" onClick={() => navigateBack("/anonymous-name-settings")} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span /></header>;
}

/** Draft A — 입력창이 곧바로 보이는, 온보딩과 동일한 패턴의 입력 우선형 */
export function AnonymousNameWriteDraftA() {
  const original = getCurrentAnonymousName();
  const [name, setName] = useState(original);
  const [toast, setToast] = useState("");
  const changed = name.trim() !== original && Boolean(name.trim());

  const save = () => {
    if (!changed) return;
    updateAnonymousName(name.trim());
    setToast("익명 이름을 바꿨어요.");
    window.setTimeout(() => setToast(""), 2200);
  };

  return <main className="mobile-prototype anonymous-name-screen"><DraftHeader /><div className="my-detail-scroll">
    <section className="subpage-heading">
      <h1>나를 부를 이름을{"\n"}바꿔볼까요?</h1>
      <p>앞으로 보내는 편지와 답장에 이 이름이 보여요.</p>
      <small>이전에 보낸 편지와 답장에는 당시의 이름이 그대로 남아요.</small>
    </section>
    <section className="anonymous-name-field" aria-labelledby="draft-a-label">
      <label id="draft-a-label" htmlFor="draft-a-input">익명 닉네임</label>
      <div className="anonymous-name-input-wrap">
        <input id="draft-a-input" type="text" value={name} maxLength={12} onChange={(event) => setName(event.target.value)} placeholder="예: 잔잔한 나무" aria-describedby="draft-a-note draft-a-count" />
        {name && <button className="anonymous-name-clear" type="button" onClick={() => setName("")} aria-label="입력한 이름 지우기">×</button>}
      </div>
      <div className="anonymous-name-field__meta">
        <span id="draft-a-note">직접 쓰거나, 원하지 않으면 무작위로 받을 수 있어요.</span>
        <span id="draft-a-count" aria-live="polite">{name.length} / 12</span>
      </div>
    </section>
    <button className="flow-text-button" type="button" onClick={() => setName(generateAnonymousName(name))}>↻ 무작위로 받기</button>
    {toast && <p className="notification-toast" role="status">{toast}</p>}
  </div>
  <footer className="auth-actions"><button className="auth-primary" type="button" disabled={!changed} onClick={save}>이 이름으로 바꾸기</button></footer>
  </main>;
}

/** Draft B — 현재 설정 화면 구조를 유지하되, "직접 쓰기"를 1순위 버튼으로 승격 */
export function AnonymousNameWriteDraftB() {
  const [current, setCurrent] = useState(getCurrentAnonymousName());
  const [mode, setMode] = useState<"idle" | "writing">("idle");
  const [draft, setDraft] = useState(current);
  const [toast, setToast] = useState("");
  const validDraft = Boolean(draft.trim()) && draft.trim() !== current;

  const startWriting = () => { setDraft(current); setMode("writing"); };
  const save = () => {
    if (!validDraft) return;
    const account = updateAnonymousName(draft.trim());
    setCurrent(account?.anonymousName ?? draft.trim());
    setMode("idle");
    setToast("익명 이름을 바꿨어요.");
    window.setTimeout(() => setToast(""), 2200);
  };
  const useRandom = () => {
    const next = generateAnonymousName(current);
    const account = updateAnonymousName(next);
    setCurrent(account?.anonymousName ?? next);
    setToast("익명 이름을 바꿨어요.");
    window.setTimeout(() => setToast(""), 2200);
  };

  return <main className="mobile-prototype anonymous-name-screen"><DraftHeader /><div className="my-detail-scroll">
    <section className="subpage-heading">
      <h1>{current}</h1>
      <p>앞으로 보내는 편지와 답장에 이 이름이 보여요.</p>
      <small>이전에 보낸 편지와 답장에는 당시의 이름이 그대로 남아요.</small>
    </section>
    {mode === "writing" ? <section className="anonymous-name-field" aria-labelledby="draft-b-label">
      <label id="draft-b-label" htmlFor="draft-b-input">새 닉네임 쓰기</label>
      <div className="anonymous-name-input-wrap">
        <input id="draft-b-input" type="text" value={draft} maxLength={12} autoFocus onChange={(event) => setDraft(event.target.value)} placeholder="예: 잔잔한 나무" aria-describedby="draft-b-count" />
        {draft && <button className="anonymous-name-clear" type="button" onClick={() => setDraft("")} aria-label="입력한 이름 지우기">×</button>}
      </div>
      <div className="anonymous-name-field__meta"><span id="draft-b-count" aria-live="polite">{draft.length} / 12</span></div>
      <button className="flow-primary-button" type="button" disabled={!validDraft} onClick={save} style={{ width: "100%", marginTop: 18 }}>이 이름으로 바꾸기</button>
      <button className="flow-text-button" type="button" onClick={() => setMode("idle")} style={{ display: "block", margin: "6px auto 0" }}>취소</button>
    </section> : <section className="name-candidate">
      <button className="flow-primary-button" type="button" onClick={startWriting}>내가 직접 쓰기</button>
      <button className="flow-secondary-button" type="button" onClick={useRandom}>무작위로 받기</button>
    </section>}
    {toast && <p className="notification-toast" role="status">{toast}</p>}
  </div></main>;
}

/** Draft C — 입력창 옆에 무작위 아이콘 버튼을 붙인 컴팩트 통합형 */
export function AnonymousNameWriteDraftC() {
  const original = getCurrentAnonymousName();
  const [name, setName] = useState(original);
  const [spinning, setSpinning] = useState(false);
  const [toast, setToast] = useState("");
  const changed = name.trim() !== original && Boolean(name.trim());

  const shuffle = () => {
    setSpinning(true);
    window.setTimeout(() => { setName((current) => generateAnonymousName(current)); setSpinning(false); }, 160);
  };
  const save = () => {
    if (!changed) return;
    updateAnonymousName(name.trim());
    setToast("익명 이름을 바꿨어요.");
    window.setTimeout(() => setToast(""), 2200);
  };

  return <main className="mobile-prototype anonymous-name-screen"><DraftHeader /><div className="my-detail-scroll">
    <section className="subpage-heading">
      <h1>나를 부를 이름을{"\n"}정해요</h1>
      <p>앞으로 보내는 편지와 답장에 이 이름이 보여요.</p>
    </section>
    <section className="anonymous-name-field" aria-labelledby="draft-c-label">
      <label id="draft-c-label" htmlFor="draft-c-input">익명 닉네임</label>
      <div className={`anonymous-name-input-wrap${spinning ? " is-changing" : ""}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input id="draft-c-input" type="text" value={name} maxLength={12} onChange={(event) => setName(event.target.value)} placeholder="예: 잔잔한 나무" style={{ flex: 1 }} aria-describedby="draft-c-count" />
        <button type="button" onClick={shuffle} aria-label="무작위 이름 받기" style={{ flex: "0 0 auto", width: 44, height: 44, border: "1px solid rgba(78,52,94,.3)", background: "transparent", color: "var(--deep-plum)", fontSize: 17, cursor: "pointer" }}>↻</button>
      </div>
      <div className="anonymous-name-field__meta">
        <span>직접 쓰는 게 가장 먼저예요. 오른쪽 버튼으로 무작위 추천도 받아볼 수 있어요.</span>
        <span id="draft-c-count" aria-live="polite">{name.length} / 12</span>
      </div>
    </section>
    {toast && <p className="notification-toast" role="status">{toast}</p>}
  </div>
  <footer className="auth-actions"><button className="auth-primary" type="button" disabled={!changed} onClick={save}>이 이름으로 바꾸기</button></footer>
  </main>;
}
