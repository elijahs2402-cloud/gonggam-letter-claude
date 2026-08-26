import { useEffect, useMemo, useState } from "react";
import { confirmAnonymousName, generateAnonymousName, getMockAuthSnapshot } from "./mockAuth";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";

/** 닉네임 만들기 화면 — Figma 디자인(node-id 19:259) 적용판.
 *  이전 디자인은 /nickname-entry-legacy 에서 계속 볼 수 있어요. */
export function NicknameEntryScreen() {
  const isMotionPreview = getCurrentAppSearchParams().get("motion") === "preview";
  const initialName = useMemo(() => getMockAuthSnapshot().account?.anonymousName ?? "", []);
  const [name, setName] = useState(initialName);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isWelcomeLeaving, setIsWelcomeLeaving] = useState(false);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    if (!isCompleting) return;
    const revealTimer = window.setTimeout(() => setIsWelcomeVisible(true), 90);
    return () => window.clearTimeout(revealTimer);
  }, [isCompleting]);

  const suggest = () => {
    if (isCompleting) return;
    setName((current) => generateAnonymousName(current || undefined));
  };

  const validName = Boolean(name.trim());

  const completeOnboarding = () => {
    const finalizedName = name.trim();
    if (!finalizedName || isCompleting) return;

    confirmAnonymousName(finalizedName);
    setWelcomeName(finalizedName);
    setIsWelcomeVisible(false);
    setIsCompleting(true);
    window.setTimeout(() => {
      setIsWelcomeLeaving(true);
      window.setTimeout(() => navigateTo(isMotionPreview ? "/home?motion=preview" : "/home"), 720);
    }, 2510);
  };

  return <main className={`mobile-prototype auth-screen anonymous-name-screen nef-screen${isMotionPreview || isCompleting ? " motion-preview" : ""}${isCompleting ? " is-completing" : ""}`}>
    <header className="auth-header">
      <button type="button" onClick={() => navigateBack("/terms-consent")} aria-label="이전 화면으로 돌아가기">←</button>
      <span>닉네임 정하기</span>
      <i aria-hidden="true" />
    </header>
    <div className="auth-scroll nef-scroll">
      <section className="auth-intro-copy nef-intro">
        <h1>나를 부를 이름을<br />정해볼까요?</h1>
        <p className="auth-helper">편지 속에서 나를 대신해 불러줄 이름이에요.</p>
      </section>
      <section className="nef-field" aria-labelledby="nef-nickname-label">
        <label id="nef-nickname-label" className="nef-label" htmlFor="nef-nickname-input">닉네임</label>
        <div className="anonymous-name-input-wrap">
          <input
            id="nef-nickname-input"
            type="text"
            value={name}
            maxLength={12}
            disabled={isCompleting}
            onChange={(event) => setName(event.target.value)}
            placeholder="닉네임을 입력해주세요"
            aria-describedby="nef-nickname-note nef-nickname-count"
          />
          {name && <button className="anonymous-name-clear" type="button" disabled={isCompleting} onClick={() => setName("")} aria-label="입력한 이름 지우기">×</button>}
        </div>
        <div className="anonymous-name-field__meta">
          <span id="nef-nickname-note">12자 이내로 입력해주세요.</span>
          <span id="nef-nickname-count" aria-live="polite">{name.length} / 12</span>
        </div>
      </section>
      <div className="nef-suggest-wrap">
        <button className="nef-suggest-button" type="button" disabled={isCompleting} onClick={suggest}>이름 추천 받기</button>
      </div>
    </div>
    <footer className="auth-actions anonymous-name-actions">
      <button className={`auth-primary${isCompleting ? " is-completing" : ""}`} type="button" disabled={!validName} aria-disabled={isCompleting} onClick={completeOnboarding}>이 이름으로 시작하기</button>
    </footer>
    {isCompleting && <div className={`anonymous-name-welcome${isWelcomeVisible ? " is-visible" : ""}${isWelcomeLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite"><p><strong>{welcomeName}</strong>님, 반가워요.</p></div>}
  </main>;
}
