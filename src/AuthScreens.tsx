import { useEffect, useMemo, useState } from "react";
import {
  acceptTerms,
  beginMockLogin,
  confirmAnonymousName,
  generateAnonymousName,
  getMockAuthSnapshot,
  getOnboardingNextPath,
  getPostLoginPath,
  resolveMockLogin,
  retryMockLogin,
  setMockLoginMode,
  type MockAuthProvider,
} from "./mockAuth";
import { getCurrentAppSearchParams, navigateBack, navigateTo, replaceRoute } from "./navigation";
import { isPrototypeQaMode } from "./prototypeQa";

function AuthShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`mobile-prototype auth-screen ${className}`}>{children}</main>;
}

function AuthHeader({ backTo = "/intro", title = "공감편지" }: { backTo?: string; title?: string }) {
  return <header className="auth-header">
    <button type="button" onClick={() => navigateBack(backTo)} aria-label="이전 화면으로 돌아가기">←</button>
    <span>{title}</span>
    <i aria-hidden="true" />
  </header>;
}

export function OnboardingScreen() {
  return <AuthShell className="onboarding-screen">
    <AuthHeader />
    <div className="auth-scroll">
      <section className="auth-intro-copy">
        <p>처음 만나는 공감편지</p>
        <h1>공감편지는<br />이런 곳이에요</h1>
        <figure className="onboarding-welcome-illustration" aria-hidden="true">
          <img src="/assets/onboarding-welcome-illustration.png" alt="" />
        </figure>
        <ul className="onboarding-guides">
          <li>이름을 드러내지 않고 마음을 편지로 남길 수 있어요.</li>
          <li>한 사람이 당신의 편지를 읽고 한 통의 답장을 전해요.</li>
          <li>답장은 바로 도착하지 않을 수 있어요.</li>
        </ul>
        <aside className="onboarding-boundary">
          <strong>공감편지는 전문 상담이나 진단을 제공하는 서비스는 아니에요.</strong>
          <p>지금 바로 도움이 필요한 상황이라면 편지보다 가까운 사람이나 전문적인 도움을 먼저 찾아주세요.</p>
        </aside>
      </section>
    </div>
    <footer className="auth-actions auth-actions--stacked">
      <button className="auth-primary" type="button" onClick={() => navigateTo("/login")}>시작하기</button>
      <button className="auth-text-action" type="button" onClick={() => navigateTo("/login")}>이미 이용하고 있어요</button>
    </footer>
  </AuthShell>;
}

const providerLabels: Record<MockAuthProvider, string> = { apple: "Apple로 계속하기", google: "Google로 계속하기", kakao: "카카오로 계속하기" };
const loginScreenProviders: MockAuthProvider[] = ["apple", "google"];

export function LoginScreen() {
  const [snapshot, setSnapshot] = useState(getMockAuthSnapshot);
  const qaMode = isPrototypeQaMode();
  const loggingIn = snapshot.state === "logging_in";
  const failed = snapshot.state === "login_failed";

  useEffect(() => {
    if (!loggingIn) return;
    const timer = window.setTimeout(() => {
      const result = resolveMockLogin();
      setSnapshot(result);
      if (result.state === "logged_in") replaceRoute(getPostLoginPath("/home"));
      if (result.state === "new_user") replaceRoute("/terms-consent");
    }, 760);
    return () => window.clearTimeout(timer);
  }, [loggingIn]);

  const start = (provider: MockAuthProvider) => {
    beginMockLogin(provider);
    setSnapshot(getMockAuthSnapshot());
  };

  const setTestMode = (mode: "new" | "existing" | "failure") => {
    setMockLoginMode(mode);
    setSnapshot(getMockAuthSnapshot());
  };

  return <AuthShell className="login-screen">
    <AuthHeader backTo="/onboarding" />
    <div className="auth-scroll">
      <section className="auth-intro-copy auth-intro-copy--login">
        <p>안전하게 이어지는 한 통의 편지</p>
        <h1>로그인하여 다시 편지를<br />이어가세요</h1>
        <p className="auth-helper">로그인 정보는 다른 사용자에게 보이지 않아요.</p>
      </section>

      {failed && <section className="auth-login-error" role="alert">
        <strong>로그인하지 못했어요.</strong>
        <p>잠시 후 다시 시도해주세요.</p>
      </section>}

      <section className="auth-provider-list" aria-label="로그인 방법">
        {loginScreenProviders.map((provider) => <button
          key={provider}
          className="auth-provider-button"
          type="button"
          disabled={loggingIn}
          onClick={() => start(provider)}
        >
          <span className={`auth-provider-mark auth-provider-mark--${provider}`} aria-hidden="true">
            {provider === "apple" ? <img src="/assets/logo_apple.png" alt="" />
              : provider === "google" ? <img src="/assets/logo_google.png" alt="" />
              : "K"}
          </span>
          {loggingIn && snapshot.pendingProvider === provider ? <span className="auth-loading-copy"><i className="auth-spinner" />로그인하고 있어요.</span> : providerLabels[provider]}
        </button>)}
      </section>

      {loggingIn && <p className="auth-login-progress" role="status">로그인 중이에요</p>}
      {failed && <div className="auth-failure-actions"><button type="button" className="auth-primary" onClick={() => { retryMockLogin(); start("apple"); }}>다시 시도</button><button type="button" className="auth-secondary" onClick={() => { retryMockLogin(); setSnapshot(getMockAuthSnapshot()); }}>다른 방법으로 로그인</button><button type="button" className="auth-text-action" onClick={() => navigateTo("/intro")}>처음으로 돌아가기</button></div>}

      {qaMode && <section className="prototype-test-panel" aria-label="프로토타입 테스트">
        <span>프로토타입 테스트</span>
        <p>선택한 상태로 다음 로그인 버튼을 눌러 확인할 수 있어요.</p>
        <div>
          <button type="button" className={snapshot.loginMode === "new" ? "is-active" : ""} onClick={() => setTestMode("new")}>신규 사용자</button>
          <button type="button" className={snapshot.loginMode === "existing" ? "is-active" : ""} onClick={() => setTestMode("existing")}>기존 사용자</button>
          <button type="button" className={snapshot.loginMode === "failure" ? "is-active" : ""} onClick={() => setTestMode("failure")}>실패 보기</button>
        </div>
      </section>}
      <p className="auth-login-consent">계속하면 공감편지의 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주돼요.</p>
    </div>
  </AuthShell>;
}

const terms = ["서비스 이용약관", "개인정보 처리방침", "안전 운영 정책", "만 14세 이상입니다."] as const;

export function TermsConsentScreen() {
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false]);
  const [openTerm, setOpenTerm] = useState<string | undefined>();
  const allChecked = checked.every(Boolean);
  const toggleAll = () => setChecked(Array(terms.length).fill(!allChecked));
  const toggle = (index: number) => setChecked((current) => current.map((value, position) => position === index ? !value : value));

  return <AuthShell className="terms-screen">
    <AuthHeader backTo="/login" />
    <div className="auth-scroll">
      <section className="auth-intro-copy auth-intro-copy--terms">
        <p>처음 시작하기 전</p>
        <h1>공감편지를 시작하기 전에<br />확인해주세요</h1>
      </section>
      <section className="terms-list" aria-label="필수 동의">
        <button type="button" className="terms-all" onClick={toggleAll} aria-pressed={allChecked}><span className="terms-check" aria-hidden="true">{allChecked ? "✓" : ""}</span>필수 항목 전체 동의</button>
        {terms.map((term, index) => <div className="terms-row" key={term}>
          <button type="button" className="terms-choice" onClick={() => toggle(index)} aria-pressed={checked[index]}><span className="terms-check" aria-hidden="true">{checked[index] ? "✓" : ""}</span><span>{term}</span><em>필수</em></button>
          {index < 3 && <button className="terms-open" type="button" onClick={() => setOpenTerm(term)} aria-label={`${term} 안내 보기`}>보기</button>}
        </div>)}
      </section>
      <p className="terms-note">최종 정책 문서는 실제 서비스 개발 단계에서 연결됩니다.</p>
    </div>
    <footer className="auth-actions"><button className="auth-primary" disabled={!allChecked} type="button" onClick={() => { acceptTerms(); navigateTo("/nickname-entry"); }}>동의하고 계속하기</button></footer>
    {openTerm && <div className="auth-dialog-backdrop" role="presentation"><section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="term-dialog-title"><p>필수 확인</p><h2 id="term-dialog-title">{openTerm}</h2><span>최종 정책 문서는 실제 서비스 개발 단계에서 연결됩니다.</span><button className="auth-primary" type="button" onClick={() => setOpenTerm(undefined)}>닫기</button></section></div>}
  </AuthShell>;
}

export function AnonymousNameScreen() {
  const isMotionPreview = getCurrentAppSearchParams().get("motion") === "preview";
  const initialName = useMemo(() => getMockAuthSnapshot().account?.anonymousName ?? generateAnonymousName(), []);
  const [name, setName] = useState(initialName);
  const [changing, setChanging] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isWelcomeLeaving, setIsWelcomeLeaving] = useState(false);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  useEffect(() => {
    if (!isCompleting) return;
    const revealTimer = window.setTimeout(() => setIsWelcomeVisible(true), 90);
    return () => window.clearTimeout(revealTimer);
  }, [isCompleting]);
  const nextName = () => {
    if (isCompleting) return;
    setChanging(true);
    window.setTimeout(() => { setName((current) => generateAnonymousName(current)); setChanging(false); }, 180);
  };
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
  const validName = Boolean(name.trim());
  return <AuthShell className={`anonymous-name-screen${isMotionPreview || isCompleting ? " motion-preview" : ""}${isCompleting ? " is-completing" : ""}`}>
    <AuthHeader backTo="/terms-consent" />
    <div className="auth-scroll">
      <section className="auth-intro-copy auth-intro-copy--name">
        <p>공감편지</p>
        <h1>나를 부를 이름을<br />정해볼까요?</h1>
        <p className="auth-helper anonymous-name-intro-helper">편지 속에서는 이 이름으로 서로를 불러요.</p>
        <section className="anonymous-name-field" aria-labelledby="anonymous-name-label">
          <label id="anonymous-name-label" htmlFor="anonymous-name-input">익명 닉네임</label>
          <div className={`anonymous-name-input-wrap${changing ? " is-changing" : ""}`}>
            <input
              id="anonymous-name-input"
              type="text"
              value={name}
              maxLength={12}
              disabled={isCompleting}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 잔잔한 나무"
              aria-describedby="anonymous-name-note anonymous-name-count"
            />
            {name && <button className="anonymous-name-clear" type="button" disabled={isCompleting} onClick={() => setName("")} aria-label="입력한 이름 지우기">×</button>}
          </div>
          <div className="anonymous-name-field__meta">
            <span id="anonymous-name-note">닉네임은 편지를 보낼 때만 사용돼요.</span>
            <span id="anonymous-name-count" aria-live="polite">{name.length} / 12</span>
          </div>
        </section>
        <div className="anonymous-name-decor" aria-hidden="true"><img src="/assets/decor.svg" alt="" /></div>
        <p className="anonymous-name-bottom-note">언제든 나의 공간에서 바꿀 수 있어요.</p>
      </section>
    </div>
    <footer className="auth-actions auth-actions--split anonymous-name-actions"><button className="auth-secondary" type="button" disabled={changing || isCompleting} onClick={nextName}>다른 이름 받기</button><button className={`auth-primary${isCompleting ? " is-completing" : ""}`} type="button" disabled={changing || !validName} aria-disabled={isCompleting} onClick={completeOnboarding}>이 이름으로 시작하기</button></footer>
    {isCompleting && <div className={`anonymous-name-welcome${isWelcomeVisible ? " is-visible" : ""}${isWelcomeLeaving ? " is-leaving" : ""}`} role="status" aria-live="polite"><p><strong>{welcomeName}</strong>님, 반가워요.</p></div>}
  </AuthShell>;
}

export function OnboardingCompleteScreen() {
  const name = getMockAuthSnapshot().account?.anonymousName ?? "조용한 별빛";
  return <AuthShell className="onboarding-complete-screen">
    <div className="auth-complete-content"><div className="auth-complete-seal" aria-hidden="true">✦</div><p>익명 닉네임이 정해졌어요</p><h1>이제 편지를 시작할<br />준비가 되었어요.</h1><strong>{name}</strong><span>이 이름으로 당신의 마음을 조심스럽게 전할게요.</span></div>
    <footer className="auth-actions"><button className="auth-primary" type="button" onClick={() => navigateTo(getPostLoginPath("/home"))}>공감편지 시작하기</button></footer>
  </AuthShell>;
}

export function DormantAccountScreen() {
  return <AuthShell className="dormant-account-screen">
    <AuthHeader backTo="/login" title="재방문 안내" />
    <div className="auth-scroll">
      <section className="auth-intro-copy dormant-account-copy">
        <p>오랜만이에요</p>
        <h1>잠시 쉬고 있던<br />계정을 다시 확인할게요.</h1>
        <p className="auth-helper">안전하게 다시 시작할 수 있도록 로그인 방식을 한 번 더 확인해주세요.</p>
        <section className="dormant-account-note">
          <strong>내 편지와 기록은 그대로 보관되어 있어요.</strong>
          <span>실제 서비스에서는 휴면 전환 기준과 본인 확인 절차를 정책에 맞춰 연결합니다.</span>
        </section>
      </section>
    </div>
    <footer className="auth-actions"><button className="auth-primary" type="button" onClick={() => navigateTo("/login")}>로그인 이어가기</button></footer>
  </AuthShell>;
}

export function AuthGateRedirect({ to }: { to: string }) {
  useEffect(() => { replaceRoute(to); }, [to]);
  return <AuthShell className="auth-redirect-screen"><span>공감편지를 준비하고 있어요.</span></AuthShell>;
}

export function getRequiredOnboardingPath() {
  return getOnboardingNextPath();
}
