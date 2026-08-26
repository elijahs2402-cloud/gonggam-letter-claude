import { AppBottomNavigation } from "./AppBottomNavigation";
import { navigateTo } from "./navigation";
import { getMySpaceSummary } from "./MySpaceDetails";

/**
 * 1차 출시 축소안: 간직하기/편지함 항목 제거, 앱 정보 제거,
 * 안전 운영 안내는 이용 안내에 내용 통합, 그룹 타이틀 없이 일렬 나열.
 */
const flatItems = [
  { label: "익명 닉네임", description: "편지에서 보여지는 이름을 관리해요.", path: "/anonymous-name-settings" },
  { label: "계정 관리", description: "이메일, 최초 로그인 날짜를 확인하고 로그아웃하거나 계정을 삭제해요.", path: "/account-settings" },
  { label: "알림 설정", description: "받고 싶은 소식을 설정해요.", path: "/notification-settings" },
  { label: "신고·차단 관리", description: "접수한 신고와 차단한 사용자를 확인해요.", path: "/safety-management" },
  { label: "이용 안내", description: "공감편지를 안전하게 이용하는 방법이에요.", path: "/service-guide" },
  { label: "개인정보 처리방침", description: "실제 서비스 문서 연결을 준비하고 있어요.", path: "/privacy-policy" },
  { label: "서비스 이용약관", description: "실제 서비스 문서 연결을 준비하고 있어요.", path: "/terms-of-service" },
];

function DraftShell({ variant, hideDescription = false, children }: { variant: string; hideDescription?: boolean; children: React.ReactNode }) {
  return (
    <main className={`mobile-prototype my-space-screen my-space-draft my-space-draft--${variant}`}>
      <div className="my-space-scroll-region">
        <header className="my-space-heading">
          <p>공감편지</p>
          <h1>나의 공간</h1>
          {!hideDescription && <span>내가 남기고 받은 마음을 조용히 살펴볼 수 있어요.</span>}
        </header>
        {children}
      </div>
      <AppBottomNavigation active="my-space" />
    </main>
  );
}

function IdentityCard() {
  const summary = getMySpaceSummary();
  return (
    <section className="my-space-identity">
      <div>
        <p>편지에서는 이 이름으로 보여요.</p>
        <strong>{summary.name}</strong>
      </div>
      <button type="button" onClick={() => navigateTo("/anonymous-name-settings")}>익명 이름 관리</button>
    </section>
  );
}

const draft1Items = flatItems.filter((item) => item.label !== "익명 닉네임");

/** Draft 1 — 기본형: 기존 리스트 스타일을 유지한 채 그룹 구분만 제거 */
export function MySpaceDraft1() {
  const summary = getMySpaceSummary();
  return (
    <DraftShell variant="1" hideDescription>
      <section className="my-space-identity" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <strong>{summary.name}</strong>
        </div>
        <button type="button" onClick={() => navigateTo("/anonymous-name-settings")}>이름 바꾸기</button>
      </section>
      <div className="my-space-menu" style={{ marginTop: 28 }}>
        {draft1Items.map((item) => (
          <button key={item.label} type="button" onClick={() => navigateTo(item.path)}>
            <span><strong>{item.label}</strong></span>
            <i aria-hidden="true">›</i>
          </button>
        ))}
      </div>
    </DraftShell>
  );
}

/** Draft 2 — 여백형: 카드 배경 없이, 넉넉한 세로 리듬과 얇은 헤어라인으로 편집숍 느낌 */
export function MySpaceDraft2() {
  return (
    <DraftShell variant="2">
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 0 26px", borderBottom: "1px solid rgba(188,146,62,0.4)" }}>
        <div>
          <p style={{ margin: "0 0 6px", color: "#5a5249", fontSize: 12 }}>편지에서는 이 이름으로 보여요.</p>
          <strong style={{ font: "400 22px 'Noto Serif KR', serif" }}>{getMySpaceSummary().name}</strong>
        </div>
        <button type="button" onClick={() => navigateTo("/anonymous-name-settings")} style={{ border: 0, background: "transparent", color: "var(--deep-plum)", fontSize: 11, fontWeight: 600 }}>익명 이름 관리</button>
      </section>
      <div style={{ marginTop: 6 }}>
        {flatItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigateTo(item.path)}
            style={{
              display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 16,
              padding: "24px 0", border: 0, borderBottom: "1px solid rgba(41,37,34,0.08)", background: "transparent",
              textAlign: "left", cursor: "pointer",
            }}
          >
            <span style={{ display: "block" }}>
              <strong style={{ display: "block", fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 500, color: "#292522" }}>{item.label}</strong>
              <small style={{ display: "block", marginTop: 6, color: "#8a8074", fontSize: 12, lineHeight: 1.6 }}>{item.description}</small>
            </span>
            <i aria-hidden="true" style={{ color: "rgba(41,37,34,0.32)", fontSize: 15, fontStyle: "normal" }}>›</i>
          </button>
        ))}
      </div>
    </DraftShell>
  );
}

/** Draft 3 — 라인형: 각 항목 앞에 짧은 세로 룰을 두어 편지지 인장 톤의 결을 더함 */
export function MySpaceDraft3() {
  return (
    <DraftShell variant="3">
      <IdentityCard />
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 2 }}>
        {flatItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigateTo(item.path)}
            style={{
              display: "flex", width: "100%", alignItems: "flex-start", gap: 14,
              padding: "18px 4px", border: 0, background: "transparent", textAlign: "left", cursor: "pointer",
            }}
          >
            <span aria-hidden="true" style={{ flex: "0 0 auto", width: 1, height: 34, marginTop: 3, background: "rgba(188,146,62,0.68)" }} />
            <span style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 34 }}>
              <span>
                <strong style={{ display: "block", fontFamily: "'Noto Serif KR', serif", fontSize: 15.5, fontWeight: 500, color: "#292522" }}>{item.label}</strong>
                <small style={{ display: "block", marginTop: 5, color: "#8a8074", fontSize: 11.5, lineHeight: 1.6 }}>{item.description}</small>
              </span>
              <i aria-hidden="true" style={{ color: "var(--deep-plum)", fontSize: 15, fontStyle: "normal", flex: "0 0 auto" }}>›</i>
            </span>
          </button>
        ))}
      </div>
    </DraftShell>
  );
}
