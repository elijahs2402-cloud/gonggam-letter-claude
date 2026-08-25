import { useEffect, useMemo, useState } from "react";
import { getCurrentAppSearchParams, navigateBack, navigateTo } from "./navigation";
import { assignLetterToReader, createLetter, extendLetterWaiting, getCurrentUserId, getLetterById, getLetters, markReplyOpened, redistributeLetter, saveLetter, sendReply, transitionLetterStatus, withdrawLetter, type Letter } from "./letters";
import { getCurrentAnonymousName } from "./mockAuth";
import { clearLetterDraft, clearReplyDraft, deleteLetterDraft, deleteReplyDraft, getLetterDraft, getReplyDraft, hasMeaningfulLetterDraft, hasMeaningfulReplyDraft, updateLetterDraft, updateReplyDraft } from "./letterDraft";
import { seedSampleLetters } from "./sampleLetters";
import { canRedistribute, getLetterStatusDate, getLetterStatusDescription, getLetterStatusLabel, isLetterDelayEligible } from "./letterStatus";
import { useDraftAutosave } from "./draftGuards";
import { shouldFailDraftOperation } from "./draftDevTools";
import { isUserBlocked } from "./blocks";
import { SealedReply } from "./SealedReply";
import { getSentLetterDisplayStatus } from "./mailboxStatus";
import { isContentHidden, revealContent } from "./contentVisibility";
import { getLetterReturn } from "./letterReturns";
import { getReportForTarget } from "./reports";
import { recordDeliveryIssue, resolveDeliveryIssues } from "./deliveryIssues";
import { acceptReaderGuidance, hasAcceptedReaderGuidance } from "./readerGuidance";
import { getAvailableWaitingLetters, markWaitingLetterViewed, refreshWaitingLetterOrder, waitingLetterPreview, waitingLetterTimeText } from "./waitingLetters";
import { canSubmitLetter, canSubmitReply, reviewLetterSafety, reviewReplySafety } from "./safety";
import { ListenEntryLoadingState } from "./ListenEntryVariants";

function FlowHeader({ title, fallback = "/home" }: { title: string; fallback?: string }) {
  return <header className="flow-header"><button type="button" onClick={() => navigateBack(fallback)} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header>;
}

function FocusShell({ title, children, fallback, onBack, action, className = "", scrollClassName = "" }: { title: string; children: React.ReactNode; fallback?: string; onBack?: () => void; action?: React.ReactNode; className?: string; scrollClassName?: string }) {
  return <main className={`mobile-prototype letter-flow-screen ${className}`.trim()}><header className="flow-header"><button type="button" onClick={onBack ?? (() => navigateBack(fallback ?? "/home"))} aria-label="이전으로 돌아가기">←</button><strong>{title}</strong><span aria-hidden="true" /></header><div className={`letter-flow-scroll ${scrollClassName}`.trim()}>{children}</div>{action}</main>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatLetterReadTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hour = date.getHours();
  const meridiem = hour >= 12 ? "오후" : "오전";
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${meridiem} ${hour % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function excerpt(value: string, length = 92) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > length ? `${normalized.slice(0, length)}…` : normalized;
}

function MissingLetterScreen({ fallback = "/mailbox" }: { fallback?: string }) {
  return <FocusShell title="편지" fallback={fallback}><section className="flow-message"><h1>편지를 찾을 수 없어요</h1><p>다시 편지함에서 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(fallback)}>돌아가기</button></section></FocusShell>;
}

function DraftExitDialog({ kind, onContinue, onSaveAndLeave, onDiscardAndLeave }: { kind: "letter" | "reply"; onContinue: () => void; onSaveAndLeave: () => void; onDiscardAndLeave: () => void }) {
  const isLetter = kind === "letter";
  return <div className="draft-exit-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-exit-title"><section><h2 id="draft-exit-title">아직 보내지 않은 {isLetter ? "이야기" : "답장"}가 있어요</h2><p>작성한 내용은 임시로 보관할 수 있어요.</p><button className="flow-primary-button" type="button" onClick={onContinue}>이어서 쓰기</button><button className="flow-secondary-button" type="button" onClick={onSaveAndLeave}>임시로 보관하고 나가기</button><button className="flow-text-button" type="button" onClick={onDiscardAndLeave}>{isLetter ? "작성 내용" : "답장"} 지우고 나가기</button></section></div>;
}

export function WriteLetterFlowScreen() {
  const userId = getCurrentUserId();
  const initial = useMemo(() => getLetterDraft(userId), [userId]);
  const [content, setContent] = useState(initial?.content ?? "");
  const [anonymousName, setAnonymousName] = useState(initial?.anonymousName ?? "");
  const [notice, setNotice] = useState("");
  const [showRecovery, setShowRecovery] = useState(Boolean(initial?.content.trim()));
  const [confirmNew, setConfirmNew] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [writeState, setWriteState] = useState<"empty" | "writing" | "saved" | "error">(initial?.content.trim() ? "writing" : "empty");
  const meaningfulContentLength = content.replace(/\s/g, "").length;
  const writingStateLabel = writeState === "saved" ? "임시 저장 완료" : writeState === "error" ? "저장하지 못했어요" : writeState === "writing" ? "작성 중" : "작성 전";

  function saveNow() {
    const saved = Boolean(updateLetterDraft(userId, { content, anonymousName, stage: "writing" }));
    setWriteState(saved ? "saved" : "error");
    return saved;
  }

  function next() {
    if (meaningfulContentLength < 10) { setNotice("마음을 10자 이상 적어주세요."); return; }
    const draft = updateLetterDraft(userId, { content, anonymousName, stage: "review" });
    if (!draft) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); return; }
    navigateTo("/letter-preview");
  }

  const leave = () => { if (content.trim()) setShowExit(true); else navigateTo("/home"); };
  return <FocusShell title="편지 쓰기" onBack={leave} action={!showRecovery ? <div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => { if (!saveNow()) setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); }}>임시 저장</button><button className="flow-primary-button" type="button" onClick={next} disabled={meaningfulContentLength < 10}>다음</button></div> : undefined}><section className="letter-compose-intro"><h1>나의 이야기를<br />들려주세요</h1><p>정리되지 않아도, 한 문장도 괜찮아요.</p><img src="/assets/write-letter-object-reframed.png" alt="펜과 편지지, 잉크병" /></section>{showRecovery ? <section className="draft-recovery"><h2>쓰다 만 편지가 있어요</h2><p>이어서 쓸까요?</p><button className="flow-primary-button" type="button" onClick={() => setShowRecovery(false)}>이어서 쓰기</button><button className="flow-secondary-button" type="button" onClick={() => setConfirmNew(true)}>새로 쓰기</button>{confirmNew && <div className="draft-inline-confirm"><p>기존 초안을 지울까요? 지우면 다시 복구할 수 없어요.</p><button type="button" onClick={() => { deleteLetterDraft(userId); setContent(""); setAnonymousName(""); setShowRecovery(false); setConfirmNew(false); }}>초안 지우기</button><button type="button" onClick={() => setConfirmNew(false)}>계속 보관하기</button></div>}</section> : <><div className="letter-compose-meta"><p className="flow-notice flow-notice--letter" role="status">{notice}</p><small className={`letter-write-state is-${writeState}`} role="status">{writingStateLabel}</small></div><section className="letter-compose-paper"><div className="letter-compose-writing"><label htmlFor="letter-content">편지 내용</label><textarea id="letter-content" value={content} onChange={(event) => { const nextContent = event.target.value; setContent(nextContent); setNotice(""); setWriteState(nextContent.trim() ? "writing" : "empty"); }} placeholder="마음을 10자 이상 적어주세요." rows={12} /><small className="letter-compose-character-count">글자 수 {meaningfulContentLength}자</small></div><aside className="letter-compose-guidance"><strong>마음을 보내기 전에</strong><p>이름, 연락처, 주소, 학교나 회사 이름처럼<br />나를 알아볼 수 있는 정보는 적지 말아주세요.</p></aside></section></>}{showExit && <DraftExitDialog kind="letter" onContinue={() => setShowExit(false)} onSaveAndLeave={() => { saveNow(); navigateTo("/home"); }} onDiscardAndLeave={() => { deleteLetterDraft(userId); navigateTo("/home"); }} />}</FocusShell>;
}

export function LetterPreviewScreen() {
  const userId = getCurrentUserId();
  const draft = getLetterDraft(userId);
  const [notice, setNotice] = useState("");
  if (!draft?.content.trim()) return <MissingLetterScreen fallback="/write-letter" />;
  if (draft.stage !== "review") updateLetterDraft(userId, { stage: "review" });
  function submit() {
    if (shouldFailDraftOperation("letter-submit")) { recordDeliveryIssue("letter-send"); setNotice("편지를 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    const review = reviewLetterSafety(draft.content, draft.id);
    updateLetterDraft(userId, { lastSafetyReviewId: review.id, lastSafetyStatus: review.status, lastSafetyCheckedAt: review.checkedAt });
    if (!canSubmitLetter(review)) {
      if (review.status === "high_risk") { navigateTo("/urgent-support"); return; }
      navigateTo("/letter-safety-review");
      return;
    }
    const letter = createLetter({ senderId: userId, anonymousName: draft.anonymousName, content: draft.content, sourceDraftId: draft.id });
    if (!getLetterById(letter.id)) { setNotice("내용을 확인하지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    resolveDeliveryIssues("letter-send", undefined, userId);
    clearLetterDraft();
    navigateTo(`/letter-sent?id=${encodeURIComponent(letter.id)}`);
  }
  return <FocusShell title="편지 미리보기" fallback="/write-letter"><section className="flow-review"><h1>편지 미리보기</h1><p>이 편지는 익명으로 전달돼요.<br />나를 알아볼 수 있는 정보가 들어 있지 않은지 한 번만 확인해주세요.</p><article className="flow-letter-paper"><span>{draft.anonymousName?.trim() || getCurrentAnonymousName() || "이름 없는 편지"}</span><blockquote>{draft.content}</blockquote></article><section className="flow-expectation-note" aria-label="전달 안내"><strong>보내기 전에 알려드려요.</strong><p>답장은 바로 도착하지 않을 수 있어요. 한 사람이 편지를 읽고 자신의 말로 답장을 전해요.</p><p>보낸 뒤에는 편지함에서 현재 상태를 확인할 수 있어요.</p></section><p className="flow-safety-note">이름, 연락처, 주소처럼 나를 알아볼 수 있는 정보는 적지 않는 편이 좋아요.</p><p className="flow-notice" role="status">{notice}</p>{notice && <button className="flow-text-button" type="button" onClick={() => navigateTo("/write-letter")}>편지로 돌아가기</button>}</section><div className="flow-fixed-action flow-fixed-action--split"><button type="button" className="flow-secondary-button" onClick={() => { updateLetterDraft(userId, { stage: "writing" }); navigateTo("/write-letter"); }}>수정하기</button><button type="button" className="flow-primary-button" onClick={submit}>편지 보내기</button></div></FocusShell>;
}

export function LetterSentScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter) return <MissingLetterScreen fallback="/mailbox" />;
  return <FocusShell title="발송 완료" fallback="/home"><section className="flow-complete"><img src="/assets/reply-sent-lavender-envelope.png" alt="봉인된 편지 봉투" /><h1>편지를 잘 맡아두었어요</h1><p>당신의 이야기를 천천히 읽어줄 사람에게 전달할게요.</p><small className="flow-state-helper">누가 읽고 있는지와 답장 도착 여부는 편지함에서 확인할 수 있어요.</small><div><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`)}>내 편지 보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

export function WaitingLettersScreen() {
  seedSampleLetters();
  const currentUserId = getCurrentUserId(); const prototypeState = getCurrentAppSearchParams().get("prototype"); const [state, setState] = useState<"normal" | "test-list" | "empty" | "loading" | "error" | "offline">(() => prototypeState === "letters" ? "test-list" : prototypeState === "empty" ? "empty" : "normal"); const [refresh, setRefresh] = useState(0);
  const letters = getAvailableWaitingLetters(currentUserId, refresh);
  const testLetters = state === "test-list" ? ensureWaitingListTestLetters(currentUserId) : [];
  const visibleLetters = state === "test-list" ? testLetters : letters;
  const open = (letterId: string) => { markWaitingLetterViewed(letterId); navigateTo(`/read-letter/${encodeURIComponent(letterId)}`); };
  const reshuffle = () => { if (state === "loading") return; setState("loading"); window.setTimeout(() => { refreshWaitingLetterOrder(); setRefresh((value) => value + 1); setState("normal"); }, 360); };
  const isEmptyState = state === "empty" || !visibleLetters.length;
  return <FocusShell title="기다리는 편지" fallback="/home">{!isEmptyState && <section className="waiting-heading"><h1>기다리는 마음들</h1><p>지금 천천히 읽을 여유가 있는 편지를 골라주세요. 열어보기만 해서는 맡아지지 않아요.</p></section>}{state === "loading" ? <section className="waiting-loading" aria-live="polite"><strong>기다리는 편지를 만나고 있어요.</strong><i /><i /><i /></section> : state === "error" || state === "offline" ? <section className="flow-message"><h1>{state === "offline" ? "인터넷 연결을\n확인해주세요." : "편지를 불러오지 못했어요."}</h1><p>잠시 후 다시 확인해주세요.</p><button className="flow-primary-button" type="button" onClick={() => setState("normal")}>다시 확인하기</button></section> : isEmptyState ? <section className="flow-message"><h1>지금은 기다리는 편지가 없어요.</h1><p>새로운 마음이 도착하면 이곳에서 만날 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><button className="flow-text-button" type="button" onClick={reshuffle}>다시 확인하기</button></section> : <><section className="waiting-list" aria-label={state === "test-list" ? "기다리는 편지 정상 상태 테스트" : "읽고 맡을 수 있는 기다리는 편지"}>{visibleLetters.map((letter) => <WaitingLetterCard key={letter.id} letter={letter} onOpen={() => open(letter.id)} />)}</section><button className="waiting-refresh" type="button" onClick={reshuffle}>다른 편지 더 보기</button></>}<details className="prototype-test-panel waiting-test-panel" open><summary>프로토타입 상태</summary><p>기다리는 편지가 있는 경우와 없는 경우를 바로 확인할 수 있어요.</p><div><button type="button" className={state === "test-list" ? "is-active" : ""} onClick={() => navigateTo("/waiting-letters?prototype=letters")}>편지가 있을 때</button><button type="button" className={state === "empty" ? "is-active" : ""} onClick={() => navigateTo("/waiting-letters?prototype=empty")}>편지가 없을 때</button></div></details></FocusShell>;
}

export function WaitingLetterCard({ letter, onOpen }: { letter: Letter; onOpen: () => void }) { const preview = waitingLetterPreview(letter.content); const time = waitingLetterTimeText(letter.createdAt); const displayName = letter.isPrototypeFixture ? `${letter.anonymousName || "이름 없는 마음"}님` : "기다리는 편지"; return <button type="button" onClick={onOpen} aria-label={`${time}, ${displayName}, ${preview}`}><span><strong>{displayName}</strong><time dateTime={letter.createdAt}>{time}</time></span><p>{preview}</p><small>편지 열어보기</small></button>; }

function ensureWaitingListTestLetters(userId: string) {
  const shortLetterContent = `요즘 회사에서 내가 하는 일이 아무 의미가 없는 것처럼 느껴져요.

열심히 해도 달라지는 건 없고, 새로운 일을 시작할 힘도 없는 것 같아요. 주변에서는 조금만 더 버티라고 하지만, 언제까지 버텨야 하는지도 모르겠어요.

해결 방법을 듣고 싶은 건 아닌데, 그냥 누군가가 이 마음을 알아줬으면 좋겠어요.

하루를 마치고 돌아오면 마음이 더 조용해져요. 그래서 이 편지에 조금씩 마음을 적어봅니다.

오늘만은 누군가에게 조용히 마음을 건네고 싶었어요.`;
  const scenarios = [
    { id: "waiting-inline-test-short", anonymousName: "고요한 구름", content: "오늘은 누군가에게 조용히 마음을 건네고 싶었어요.", hours: 2 },
    { id: "waiting-inline-test-long", anonymousName: "느린 별빛", content: "요즘은 누구에게도 쉽게 말하지 못한 생각이 자꾸 마음에 남아요. 누군가가 판단하지 않고 끝까지 읽어준다면 조금 괜찮아질 것 같아요. 그래서 이 편지에 천천히 마음을 남겨봅니다.", hours: 53 },
    { id: "waiting-inline-test-special", anonymousName: "따뜻한 달빛", content: "오늘은 조금 복잡해요… 그래도 괜찮아질 거예요. ☁︎", hours: 120 },
  ];
  return scenarios.map((scenario) => { const content = scenario.id === "waiting-inline-test-short" ? shortLetterContent : scenario.content; const existing = getLetterById(scenario.id); if (existing) { const refreshed = { ...existing, anonymousName: scenario.anonymousName, content }; saveLetter(refreshed); return refreshed; } const createdAt = new Date(Date.now() - scenario.hours * 3_600_000).toISOString(); const letter: Letter = { id: scenario.id, senderId: `waiting-inline-${scenario.id}`, anonymousName: scenario.anonymousName, content, createdAt, updatedAt: createdAt, status: "waiting_for_reader", retryCount: 0, isPrototypeFixture: true, prototypeScenario: "waiting-inline-test", prototypeWaitingScenario: "normal", safetyStatus: "clear", moderationStatus: "not_required", statusHistory: [{ status: "waiting_for_reader", changedAt: createdAt }], lastStatusChangedAt: createdAt }; saveLetter(letter); return letter; });
}

function forceReplyTestAssignment(letterId: string, userId: string) {
  const fixture = ensureWaitingListTestLetters(userId).find((letter) => letter.id === letterId);
  if (!fixture) return undefined;
  const now = new Date().toISOString();
  const { reply: _reply, repliedAt: _repliedAt, replyOpenedAt: _replyOpenedAt, ...unrepliedFixture } = fixture;
  const assignedFixture = { ...unrepliedFixture, status: "assigned" as const, assignedReaderId: userId, assignedAt: now, readAt: undefined, waitingForReplyAt: undefined, statusHistory: [...fixture.statusHistory, { status: "assigned" as const, changedAt: now }], lastStatusChangedAt: now, updatedAt: now };
  saveLetter(assignedFixture);
  return assignedFixture;
}

function ensureForcedReplyTestDraft(letterId: string, userId: string) {
  const existing = getReplyDraft(letterId, userId);
  if (existing?.content.trim()) return existing;
  return updateReplyDraft(letterId, userId, {
    content: "읽으며 마음이 많이 쓰였어요.\n오늘은 스스로에게도 조금 다정한 시간을 내어주세요.",
    stage: "review",
    letterStatusAtSave: "assigned",
  });
}

export function ReaderPromiseScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter) return <MissingLetterScreen fallback="/waiting-letters" />;
  if (hasAcceptedReaderGuidance()) return <ReadLetterFlowScreen letterId={letter.id} />;
  return <FocusShell title="안내" fallback={`/read-letter/${letter.id}`} action={<div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/read-letter/${encodeURIComponent(letter.id)}`)}>돌아가기</button><button className="flow-primary-button" type="button" onClick={() => { acceptReaderGuidance(); navigateTo(`/assign-letter/${encodeURIComponent(letter.id)}`); }}>동의하고 맡기</button></div>}><section className="reader-promise"><h1>마음을 안전하게<br />이어가기 위해</h1><p>이 안내는 처음 편지를 맡을 때 한 번만 보여드려요.</p><p className="reader-promise-expectation">편지를 맡은 뒤에는 한 통의 답장을 남기게 돼요. 지금 여유가 없다면 맡지 않아도 괜찮아요.</p><ul><li>상대방을 판단하거나 비난하지 않기</li><li>연락처와 개인정보를 요구하지 않기</li><li>답장을 강요하거나 관계를 이어가려 하지 않기</li><li>답장이 어렵다면 편지를 반환할 수 있기</li></ul></section></FocusShell>;
}

export function ReadLetterFlowScreen({ letterId, assignedReaderMode = false }: { letterId?: string; assignedReaderMode?: boolean }) {
  if (letterId?.startsWith("waiting-inline-test-")) ensureWaitingListTestLetters(getCurrentUserId());
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter) return <MissingLetterScreen fallback="/waiting-letters" />;
  if (assignedReaderMode && (letter.assignedReaderId !== getCurrentUserId() || !["assigned", "read", "waiting_for_reply"].includes(letter.status) || getLetterReturn(letter.id, getCurrentUserId()))) return <MissingLetterScreen fallback="/waiting-letters" />;
  if (letter.senderId === getCurrentUserId()) return <MissingLetterScreen fallback="/waiting-letters" />;
  if (letter.prototypeWaitingScenario === "returned") return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>이미 돌려보낸 편지예요.</h1><p>이 편지는 다른 사람이 이어서 읽을 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button></section></FocusShell>;
  if (letter.prototypeWaitingScenario === "blocked") return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>차단한 사용자와 연결된 편지예요.</h1><p>안전을 위해 이 내용은 확인할 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button></section></FocusShell>;
  if (letter.prototypeWaitingScenario === "deleted") return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>이 편지를 찾을 수 없어요.</h1><p>삭제되었거나 더 이상 접근할 수 없는 기록이에요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지 목록으로</button></section></FocusShell>;
  if (letter.status === "withdrawn") return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>편지의 주인이<br />편지를 거두었어요</h1><p>더 이상 이 편지를 읽거나 답장을 쓸 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지 목록으로</button></section></FocusShell>;
  if (["high_risk", "needs_revision", "under_review", "blocked"].includes(letter.safetyStatus ?? "clear") || ["pending", "reviewing", "rejected"].includes(letter.moderationStatus ?? "not_required")) return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>현재 이 편지를<br />열 수 없어요.</h1><p>안전을 위해 이 편지의 내용을 확인할 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button></section></FocusShell>;
  if (getLetterReturn(letter.id, getCurrentUserId())) return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>이미 돌려보낸 편지예요.</h1><p>이 편지는 다른 사람이 이어서 읽을 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button></section></FocusShell>;
  if (isUserBlocked(getCurrentUserId(), letter.senderId)) return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>차단한 사용자의 콘텐츠예요.</h1><p>안전을 위해 이 내용은 기본적으로 숨겨져 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>이전 화면으로 돌아가기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/safety-management")}>안전 관리에서 확인</button></section></FocusShell>;
  if (letter.assignedReaderId && letter.assignedReaderId !== getCurrentUserId()) return <FocusShell title="편지 읽기" fallback="/waiting-letters"><section className="flow-message"><h1>이 편지는 다른 사람이<br />먼저 맡았어요.</h1><p>다른 기다리는 마음을 만나볼 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  const takeLetter = () => navigateTo(hasAcceptedReaderGuidance() ? `/assign-letter/${encodeURIComponent(letter.id)}` : `/reader-promise?id=${encodeURIComponent(letter.id)}`);
  return <FocusShell title="편지 읽기" fallback={assignedReaderMode ? `/write-reply/${encodeURIComponent(letter.id)}` : "/waiting-letters"} className="letter-flow-screen--active-reader" scrollClassName="active-reading-scroll" action={<div className={`flow-fixed-action flow-fixed-action--split${assignedReaderMode ? " flow-fixed-action--single" : ""}`} >{!assignedReaderMode && <button className="flow-secondary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button>}<button className="flow-primary-button" type="button" onClick={assignedReaderMode ? () => navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`) : takeLetter}>{assignedReaderMode ? "편지 계속 쓰기" : "이 편지를 맡을게요"}</button></div>}><section className="active-reading-room" aria-label="조용한 편지 읽기 공간"><div className="active-reading-room-copy"><p className="active-reading-kicker"><time dateTime={letter.createdAt}>{formatLetterReadTime(letter.createdAt)}</time></p><h1><strong>{letter.anonymousName}</strong>님이<br />보낸 편지</h1></div><img src="/assets/read-letter-room-framed-two-trimmed.png" alt="" aria-hidden="true" /></section><div className="active-reading-mat"><article className="active-reading-paper"><span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span><blockquote>{letter.content}</blockquote><span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span><div className="active-reading-report-area"><button className="flow-text-button active-reading-report" type="button" onClick={() => navigateTo(`/report-letter/${encodeURIComponent(letter.id)}`)}>신고하기</button></div></article></div><section className="active-reading-helper"><img src="/assets/decor.svg" alt="" aria-hidden="true" /><p><strong>답장은 서두르지 않아도 괜찮아요.</strong><span>이 편지를 맡으면, 한 사람의 마음에 답장을 남길 수 있어요.</span></p></section></FocusShell>;
}

export function AssignedLetterFlowScreen({ letterId }: { letterId?: string }) {
  return <ReadLetterFlowScreen letterId={letterId} assignedReaderMode />;
}

export function AssignLetterScreen({ letterId }: { letterId?: string }) {
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState<"processing" | "failed">("processing");
  const letter = letterId ? getLetterById(letterId) : undefined;
  useEffect(() => {
    if (!letter) return;
    const timer = window.setTimeout(() => {
      const result = letter.prototypeWaitingScenario === "race_lost" ? { ok: false as const, reason: "already-assigned" as const } : assignLetterToReader(letter.id, getCurrentUserId());
      if (result.ok) { navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`); return; }
      setPhase("failed");
      setNotice(result.reason === "already-assigned" ? "이 편지는 다른 사람이 먼저 맡았어요. 다른 기다리는 편지를 만나볼 수 있어요." : "이 편지를 지금 맡을 수 없어요.");
    }, 460);
    return () => window.clearTimeout(timer);
  }, [letter?.id]);
  if (!letter) return <MissingLetterScreen fallback="/waiting-letters" />;
  return <FocusShell title="편지 맡기" fallback={`/read-letter/${letter.id}`} action={phase === "failed" ? <div className="flow-fixed-action flow-fixed-action--split"><button className="flow-secondary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>다른 편지 보기</button></div> : undefined}><section className="assign-confirm"><h1>{phase === "processing" ? "편지를 맡고 있어요." : "다른 편지를 만나볼까요?"}</h1><p>{phase === "processing" ? "잠시만 기다려주세요." : "다른 기다리는 편지를 만나볼 수 있어요."}</p><p className="flow-notice" role="status">{notice}</p></section></FocusShell>;
}

export function WriteReplyFlowScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  if (letterId === "reply-review-test") ensureReplyReviewTestLetter(currentUserId);
  const forcedTestLetter = letterId?.startsWith("waiting-inline-test-") && getCurrentAppSearchParams().get("force") === "1" ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  const letter = forcedTestLetter ?? (letterId ? getLetterById(letterId) : undefined);
  const initial = useMemo(() => letterId ? getReplyDraft(letterId, currentUserId) : undefined, [letterId, currentUserId]);
  const [content, setContent] = useState(initial?.content ?? "");
  const [notice, setNotice] = useState("");
  const [showExit, setShowExit] = useState(false);
  const [replyWriteState, setReplyWriteState] = useState<"empty" | "writing" | "saved" | "error">(initial?.content.trim() ? "writing" : "empty");
  const meaningfulReplyLength = content.replace(/\s/g, "").length;
  if (letter?.status === "withdrawn") return <FocusShell title="답장 쓰기" fallback="/waiting-letters"><section className="flow-message"><h1>편지의 주인이<br />편지를 거두었어요</h1><p>더 이상 답장을 쓸 수 없어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지 목록으로</button></section></FocusShell>;
  if (letter && getLetterReturn(letter.id, currentUserId)) return <FocusShell title="답장 쓰기" fallback="/waiting-letters"><section className="flow-message"><h1>이미 돌려보낸 편지예요.</h1><p>이 편지는 다른 사람이 이어서 읽을 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지 보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></section></FocusShell>;
  if (!letter || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status)) return <MissingLetterScreen fallback="/waiting-letters" />;
  useEffect(() => { if (letter.status === "assigned") transitionLetterStatus(letter.id, "waiting_for_reply", currentUserId, { waitingForReplyAt: new Date().toISOString() }); }, [letter.id, letter.status, currentUserId]);
  const { saveNow } = useDraftAutosave({ content }, (value) => Boolean(updateReplyDraft(letter.id, currentUserId, { ...value, stage: "writing", letterStatusAtSave: letter.status })));
  function saveReplyNow() { const saved = saveNow(); setReplyWriteState(saved ? "saved" : "error"); return saved; }
  function next() { if (meaningfulReplyLength < 10) { setNotice("마음을 10자 이상 적어주세요."); return; } const draft = updateReplyDraft(letter.id, currentUserId, { content, stage: "review", letterStatusAtSave: letter.status }); if (!draft) { setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); return; } navigateTo(`/reply-review/${encodeURIComponent(letter.id)}`); }
  const leave = () => { if (content.trim()) setShowExit(true); else navigateTo(`/assigned-letter/${encodeURIComponent(letter.id)}`); };
  const replyActions = <div className="flow-fixed-action flow-fixed-action--split reply-flow-fixed-action"><button type="button" className="flow-secondary-button" onClick={() => { if (!saveReplyNow()) setNotice("임시 저장하지 못했어요. 작성한 내용은 현재 화면에 남아 있어요."); }}>임시 저장</button><button type="button" className="flow-primary-button" onClick={next} disabled={meaningfulReplyLength < 10}>보내기 전 미리보기</button></div>;
  return <FocusShell title="답장 쓰기" onBack={leave} action={replyActions}><section className="reply-compose-intro"><h1>{letter.anonymousName}님에게<br />마음을 전해주세요</h1><p>편지를 읽으며 이해한 마음을 전해주세요.</p><img src="/assets/write-letter-object-reframed.png" alt="펜과 편지지, 잉크병" /></section><div className="reply-compose-meta"><p className="flow-notice flow-notice--reply" role="status">{notice}</p><small className={`draft-save-state is-${replyWriteState}`} role="status">{replyWriteState === "saved" ? "임시 저장 완료" : replyWriteState === "error" ? "저장하지 못했어요" : replyWriteState === "writing" ? "작성 중" : "작성 전"}</small></div><section className="reply-compose-paper"><p className="reply-compose-recipient">{letter.anonymousName}에게</p><div className="reply-compose-writing"><textarea id="reply-content" aria-label="답장 내용" value={content} onChange={(event) => { const nextContent = event.target.value; setContent(nextContent); setNotice(""); setReplyWriteState(nextContent.trim() ? "writing" : "empty"); }} placeholder="마음을 10자 이상 적어주세요." rows={12} /><small>글자 수 {meaningfulReplyLength}자</small></div><aside className="reply-compose-guidance"><strong>마음을 전하기 전에</strong><p>상대방을 판단하거나 해결책을 서두르기보다,<br />편지를 읽으며 느낀 마음을 천천히 전해주세요.</p></aside><div className="reply-compose-letter-actions"><button className="flow-text-button" type="button" onClick={() => navigateTo(`/assigned-letter/${encodeURIComponent(letter.id)}`)}>편지 다시 읽기</button><button className="flow-text-button" type="button" onClick={() => navigateTo(`/return-letter/${encodeURIComponent(letter.id)}`)}>이 편지 돌려보내기</button></div></section>{showExit && <DraftExitDialog kind="reply" onContinue={() => setShowExit(false)} onSaveAndLeave={() => { saveReplyNow(); navigateTo(`/assigned-letter/${encodeURIComponent(letter.id)}`); }} onDiscardAndLeave={() => { deleteReplyDraft(letter.id, currentUserId); navigateTo(`/assigned-letter/${encodeURIComponent(letter.id)}`); }} />}</FocusShell>;
}

function ensureReplyReviewTestLetter(userId: string) {
  const id = "reply-review-test";
  const now = new Date().toISOString();
  const existing = getLetterById(id);
  const letter: Letter = {
    id,
    senderId: "reply-review-test-sender",
    anonymousName: "고요한 구름",
    content: "오늘은 마음이 조금 무거웠어요.\n누군가에게 조용히 이 이야기를 건네고 싶었어요.",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: "waiting_for_reply",
    assignedReaderId: userId,
    assignedAt: existing?.assignedAt ?? now,
    waitingForReplyAt: now,
    retryCount: 0,
    isPrototypeFixture: true,
    prototypeScenario: "reply-review-test",
    safetyStatus: "clear",
    moderationStatus: "not_required",
    statusHistory: [{ status: "waiting_for_reader", changedAt: existing?.createdAt ?? now }, { status: "assigned", changedAt: existing?.assignedAt ?? now }, { status: "waiting_for_reply", changedAt: now }],
    lastStatusChangedAt: now,
  };
  saveLetter(letter);
  updateReplyDraft(id, userId, { content: "읽으며 마음이 많이 쓰였어요.\n오늘은 스스로에게도 조금 다정한 시간을 내어주세요.", stage: "review", letterStatusAtSave: "waiting_for_reply" });
}

export function ReplyReviewScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  if (letterId === "reply-review-test") ensureReplyReviewTestLetter(currentUserId);
  const forcedTestLetter = letterId?.startsWith("waiting-inline-test-") ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  if (forcedTestLetter) ensureForcedReplyTestDraft(forcedTestLetter.id, currentUserId);
  const letter = forcedTestLetter ?? (letterId ? getLetterById(letterId) : undefined);
  const draft = letterId ? getReplyDraft(letterId, currentUserId) : undefined;
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (letter && getLetterReturn(letter.id, currentUserId)) return <FocusShell title="보내기 전 점검" fallback="/waiting-letters"><section className="flow-message"><h1>이미 돌려보낸 편지예요.</h1><p>이 편지는 다른 사람이 이어서 읽을 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/waiting-letters")}>기다리는 편지 보기</button></section></FocusShell>;
  if (!letter || !draft?.content.trim() || letter.assignedReaderId !== currentUserId || !["assigned", "read", "waiting_for_reply"].includes(letter.status)) return <MissingLetterScreen fallback="/waiting-letters" />;
  if (draft.stage !== "review") updateReplyDraft(letter.id, currentUserId, { stage: "review", letterStatusAtSave: letter.status });
  function submit() {
    if (submitting) return;
    if (shouldFailDraftOperation("reply-submit")) { recordDeliveryIssue("reply-send", letter.id, currentUserId); setNotice("답장을 보내지 못했어요. 작성한 내용은 그대로 보관되어 있어요."); return; }
    navigateTo(`/reply-sending/${encodeURIComponent(letter.id)}`);
  }
  return <FocusShell title="편지 미리보기" fallback={`/write-reply/${letter.id}`} className="reply-review-screen"><section className="flow-review"><img className="reply-review-header-illustration" src="/assets/reply-review-open-letter-glasses.png" alt="" aria-hidden="true" /><h1>답장을 보내기 전에<br />살펴봐주세요.</h1><p className="reply-review-intro">나를 알아볼 수 있는 내용이 담기지는 않았는지,<br />한 번만 더 확인해주세요.</p><article className="flow-letter-paper reply-review-paper"><p className="reply-compose-recipient">{letter.anonymousName}에게</p><blockquote>{draft.content}</blockquote><small className="reply-review-edited-at">{formatDate(draft.updatedAt)}에 마지막으로 다듬었어요.</small></article><section className="reply-review-guidance" aria-label="보내기 전 점검"><h2>보내기 전, 잠시 살펴봐주세요.</h2><ul className="review-list"><li>상대를 판단하거나 비난하지 않았나요?</li><li>해결책을 강요하고 있지 않나요?</li><li>개인정보나 만남을 요청하고 있지 않나요?</li><li>이 편지를 실제로 읽은 마음이 담겨 있나요?</li></ul></section><p className="flow-notice" role="status">{notice}</p></section><div className="flow-fixed-action flow-fixed-action--split reply-review-fixed-action"><button type="button" className="flow-secondary-button" onClick={() => { updateReplyDraft(letter.id, currentUserId, { stage: "writing", letterStatusAtSave: letter.status }); navigateTo(`/write-reply/${encodeURIComponent(letter.id)}`); }}>다시 수정하기</button><button type="button" className="flow-primary-button" onClick={submit} disabled={submitting}>답장 보내기</button></div></FocusShell>;
}

export function ReplySentScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter?.reply) return <MissingLetterScreen fallback="/mailbox" />;
  return <FocusShell title="답장 완료" fallback="/home"><section className="flow-complete"><img src="/assets/reply-sent-lavender-envelope.png" alt="봉인된 편지 봉투" /><h1>따뜻한 마음을 전했어요</h1><p>당신의 답장이 편지의 주인에게 전달될 거예요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/replied/${encodeURIComponent(letter.id)}`)}>내가 답한 편지 보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

export function ReplySendingTransitionScreen({ letterId }: { letterId?: string }) {
  const currentUserId = getCurrentUserId();
  const forcedTestLetter = letterId?.startsWith("waiting-inline-test-") ? forceReplyTestAssignment(letterId, currentUserId) : undefined;
  if (forcedTestLetter) ensureForcedReplyTestDraft(forcedTestLetter.id, currentUserId);
  const [message, setMessage] = useState("답장을 보내고 있어요.");
  useEffect(() => {
    if (!letterId) return;
    const timer = window.setTimeout(() => {
      const letter = getLetterById(letterId);
      const draft = getReplyDraft(letterId, currentUserId);
      if (!letter || !draft?.content.trim()) { navigateTo(`/write-reply/${encodeURIComponent(letterId)}`); return; }
      const review = reviewReplySafety(draft.content, draft.id);
      if (!canSubmitReply(review)) {
        if (review.status === "high_risk") navigateTo("/urgent-support");
        else navigateTo(`/write-reply/${encodeURIComponent(letterId)}`);
        return;
      }
      const result = sendReply(letterId, currentUserId, draft.content);
      if (!result.ok) { setMessage("답장을 보내지 못했어요. 잠시 후 다시 시도해주세요."); return; }
      resolveDeliveryIssues("reply-send", letterId, currentUserId);
      clearReplyDraft(letterId, currentUserId);
      navigateTo(`/reply-sent/${encodeURIComponent(letterId)}`);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [currentUserId, letterId]);
  return <main className="mobile-prototype listen-entry-screen reply-sending-transition"><header className="flow-header listen-entry-topbar"><button type="button" onClick={() => navigateBack("/write-reply")} aria-label="이전으로 돌아가기"><span aria-hidden="true">←</span></button><strong>편지 만나기</strong><span aria-hidden="true" /></header><div className="listen-entry-scroll"><ListenEntryLoadingState message={message} /></div><div className="flow-fixed-action listen-entry-actions"><button type="button" className="flow-primary-button" disabled>{message}</button></div></main>;
}

type JourneyStep = "sent" | "waiting" | "assigned" | "reply_writing" | "reply_arrived" | "reply_opened";
const journeySteps: ReadonlyArray<{ key: JourneyStep; title: string; description: string }> = [
  { key: "sent", title: "편지를 보냈어요", description: "편지를 조심스럽게 전달했어요." },
  { key: "waiting", title: "편지가 마음을 전해줄 사람을 기다리고 있어요", description: "답장을 전해줄 사람을 천천히 기다리고 있어요." },
  { key: "assigned", title: "한 사람이 편지를 맡았어요", description: "한 사람이 이 편지에 답장을 전하기로 했어요." },
  { key: "reply_writing", title: "답장을 준비하고 있어요", description: "어떤 말을 건넬지 천천히 생각하고 있어요." },
  { key: "reply_arrived", title: "답장이 도착했어요", description: "당신의 이야기를 읽은 사람이 답장을 남겼어요." },
  { key: "reply_opened", title: "답장을 읽었어요", description: "도착한 답장을 열어보았어요." },
];

function journeyState(letter: Letter): JourneyStep {
  if (letter.replyOpenedAt) return "reply_opened";
  if (letter.reply || letter.status === "replied") return "reply_arrived";
  if (letter.status === "waiting_for_reply") return "reply_writing";
  if (letter.assignedReaderId || letter.status === "assigned") return "assigned";
  return "waiting";
}

function isJourneyStepReached(letter: Letter, step: JourneyStep) { return journeySteps.findIndex((item) => item.key === step) <= journeySteps.findIndex((item) => item.key === journeyState(letter)); }
function journeyDate(letter: Letter, step: JourneyStep) {
  if (step === "sent") return letter.createdAt;
  if (step === "assigned") return letter.assignedAt;
  if (step === "reply_writing") return letter.waitingForReplyAt ?? letter.assignedAt;
  if (step === "reply_arrived") return letter.repliedAt;
  if (step === "reply_opened") return letter.replyOpenedAt;
  return letter.lastRedistributedAt ?? letter.lastStatusChangedAt;
}

export function LetterJourneyScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen fallback="/home" />;
  const currentState = journeyState(letter);
  return <FocusShell title="편지의 여정" fallback="/home"><section className="journey-screen"><h1>편지의 여정</h1><p>{letter.status === "waiting_for_reader" && letter.lastReturnedAt ? "편지가 다시 천천히 답장을 기다리고 있어요." : getLetterStatusDescription(letter)}</p>{letter.status === "withdrawn" ? <section className="journey-withdrawn"><strong>이 편지는 조용히 거두었어요</strong>{letter.withdrawnAt && <small>{formatDate(letter.withdrawnAt)}</small>}</section> : <ol className="journey-timeline">{journeySteps.map((step) => { const reached = isJourneyStepReached(letter, step.key); const current = step.key === currentState; const changedAt = journeyDate(letter, step.key); return <li key={step.key} className={reached ? (current ? "is-current" : "is-complete") : ""}><span aria-hidden="true" /><div><strong>{step.title}</strong><p>{step.description}</p>{reached && changedAt && <time dateTime={changedAt}>{formatDate(changedAt)}</time>}</div></li>; })}</ol>}<JourneyActions letter={letter} /></section></FocusShell>;
}

function JourneyActions({ letter }: { letter: Letter }) {
  if (letter.status === "replied") return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/reply-arrived/${encodeURIComponent(letter.id)}`)}>답장 열어보기</button></div>;
  if (letter.status === "withdrawn") return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`)}>편지함에서 보기</button></div>;
  return <div className="journey-actions"><button className="flow-primary-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button>{isLetterDelayEligible(letter) && <button className="flow-secondary-button" type="button" onClick={() => navigateTo(`/letter-delay/${encodeURIComponent(letter.id)}`)}>기다림에 대해 살펴보기</button>}</div>;
}

export function ReplyArrivedScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter?.reply || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen fallback="/home" />;
  function openReply() { markReplyOpened(letter.id, letter.senderId); navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}?reply=1`); }
  return <FocusShell title="답장 도착" fallback="/home"><section className="flow-complete reply-arrived"><img src="/assets/reply-sent-lavender-envelope.png" alt="도착한 편지 봉투" /><h1>답장이 도착했어요</h1><p>당신의 이야기를 읽은 사람이 마음을 전했어요.</p><div><button className="flow-primary-button" type="button" onClick={openReply}>답장 열어보기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>나중에 읽기</button></div></section></FocusShell>;
}

export function LetterDelayScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  const [notice, setNotice] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  if (!letter || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen fallback="/home" />;
  if (letter.status === "replied") return <MissingLetterScreen fallback={`/mailbox/my/${letter.id}`} />;
  if (!isLetterDelayEligible(letter)) return <FocusShell title="답장 대기" fallback={`/letter-journey/${letter.id}`}><section className="flow-message"><h1>편지의 여정을<br />기다리고 있어요</h1><p>현재 상태는 편지의 여정에서 확인할 수 있어요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/letter-journey/${encodeURIComponent(letter.id)}`)}>편지의 여정으로</button></section></FocusShell>;
  function redistribute() { const updated = redistributeLetter(letter.id, letter.senderId); setNotice(updated ? "편지를 다시 전달했어요. 새로운 사람이 이 편지를 만날 수 있도록 다시 기다릴게요." : "편지를 맡은 사람이 있어 바로 다시 전달할 수 없어요."); }
  function extend() { const updated = extendLetterWaiting(letter.id, letter.senderId); if (updated) setNotice("조금 더 기다려볼게요. 상태가 달라지면 편지의 여정에서 확인할 수 있어요."); }
  function withdraw() { const updated = withdrawLetter(letter.id, letter.senderId); if (updated) { navigateTo(`/letter-withdrawn/${encodeURIComponent(letter.id)}`); } }
  return <FocusShell title="답장 대기" fallback={`/letter-journey/${letter.id}`}><section className="delay-screen"><h1>{confirmWithdraw ? "이 편지를 거둘까요?" : "아직 답장을 기다리고 있어요"}</h1><p>{confirmWithdraw ? "거두면 더 이상 새로운 사람이 이 편지를 읽거나 답장할 수 없어요." : "답장이 예상보다 조금 늦어지고 있어요. 원하는 방법을 선택할 수 있어요."}</p>{confirmWithdraw ? <><button className="flow-primary-button" type="button" onClick={withdraw}>편지 거두기</button><button className="flow-secondary-button" type="button" onClick={() => setConfirmWithdraw(false)}>계속 기다리기</button></> : <><button className="flow-primary-button" type="button" onClick={redistribute} disabled={!canRedistribute(letter)}>다시 전달하기</button>{!canRedistribute(letter) && <small>편지를 맡은 사람이 있어 바로 다시 전달할 수 없어요.</small>}<button className="flow-secondary-button" type="button" onClick={extend}>조금 더 기다리기</button><button className="flow-text-button" type="button" onClick={() => setConfirmWithdraw(true)}>편지 거두기</button></>}<p className="flow-notice" role="status">{notice}</p></section></FocusShell>;
}

export function LetterWithdrawnScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId() || letter.status !== "withdrawn") return <MissingLetterScreen fallback="/home" />;
  return <FocusShell title="편지 거두기" fallback="/home"><section className="flow-complete"><h1>편지를 조용히 거두었어요</h1><p>이 편지는 더 이상 새로운 사람에게 보이지 않아요.</p><div><button className="flow-primary-button" type="button" onClick={() => navigateTo(`/mailbox/my/${encodeURIComponent(letter.id)}`)}>편지함에 보관하기</button><button className="flow-text-button" type="button" onClick={() => navigateTo("/home")}>홈으로 돌아가기</button></div></section></FocusShell>;
}

/** 읽기 공간형 편지 카드: /read-letter 의 방 일러스트 + 겹쳐지는 편지지·큰 따옴표 스타일을 내 편지 상세에 그대로 적용 */
export function MyLetterDetailScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter || letter.senderId !== getCurrentUserId()) return <MissingLetterScreen />;
  const userId = getCurrentUserId();
  const display = getSentLetterDisplayStatus(letter, userId);
  const signature = letter.anonymousName || getCurrentAnonymousName();
  if (display.isDeleted) return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="flow-message"><h1>이 편지를 찾을 수 없어요.</h1><p>삭제되었거나 더 이상 접근할 수 없는 기록이에요.</p><button className="flow-primary-button" type="button" onClick={() => navigateTo("/mailbox")}>편지함으로 돌아가기</button></section></FocusShell>;
  if (letter.reply) {
    const replyBlocked = isUserBlocked(userId, letter.reply.writerId);
    const replyHidden = isContentHidden(userId, "reply", letter.reply.id);
    if (replyBlocked || replyHidden) return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="letter-detail"><p className="detail-kicker">내가 보낸 편지</p><article className="flow-letter-paper"><blockquote>{letter.content}</blockquote></article>{replyBlocked ? <div className="content-restricted"><strong>차단한 사용자의 콘텐츠예요.</strong><span>안전을 위해 이 내용은 기본적으로 숨겨져 있어요.</span><button type="button" onClick={() => navigateTo("/safety-management")}>안전 관리에서 확인</button></div> : <div className="content-restricted"><strong>숨긴 답장이에요.</strong><span>필요하면 다시 펼쳐볼 수 있어요.</span><button type="button" onClick={() => { revealContent(userId, "reply", letter.reply!.id); window.location.reload(); }}>답장 다시 보기</button></div>}</section></FocusShell>;
    if (display.hasUnreadReply) markReplyOpened(letter.id, userId);
    return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><FlowHeader title="내가 보낸 편지" fallback="/mailbox" /><div className="letter-flow-scroll active-reading-scroll">
      <section className="active-reading-room" aria-label="내가 보낸 편지 공간" style={{ minHeight: 248 }}>
        <div className="active-reading-room-copy"><h1>내 마음에<br /><strong>답장</strong>이 도착했어요</h1></div>
        <img src="/assets/reply-sent-lavender-envelope.png" alt="" aria-hidden="true" style={{ opacity: 1, bottom: 12 }} />
      </section>
      <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>내가 보낸 편지</span><time>{formatDate(letter.createdAt)}</time></p>
      <div className="active-reading-mat" style={{ marginTop: 0 }}>
        <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26 }}>
          <span className="active-reading-quote active-reading-quote--open" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>“</span>
          <blockquote style={{ minHeight: "auto" }}>{letter.content}</blockquote>
          <span className="active-reading-quote active-reading-quote--close" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>”</span>
          <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ {signature}</p>
        </article>
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
        <span aria-hidden="true" style={{ width: 1, height: 44, background: "rgba(188, 146, 62, 0.68)" }} />
      </div>
      <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>받은 답장</span><time>{formatDate(letter.reply.createdAt)}</time></p>
      <div className="active-reading-mat" style={{ marginTop: 0 }}>
        <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26, background: "rgba(232,222,239,.32)", borderColor: "rgba(104,78,126,.32)" }}>
          <span className="active-reading-quote active-reading-quote--open" aria-hidden="true">“</span>
          <blockquote style={{ minHeight: "auto" }}>{letter.reply.content}</blockquote>
          <span className="active-reading-quote active-reading-quote--close" aria-hidden="true">”</span>
          <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ 익명의 누군가</p>
        </article>
      </div>
    </div></main>;
  }
  if (display.isRestricted) return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="flow-message"><h1>현재 이 편지를<br />확인할 수 없어요.</h1><p>안전을 위해 이 편지의 내용을 확인할 수 없어요.</p></section></FocusShell>;
  if (letter.status === "withdrawn") return <FocusShell title="내가 보낸 편지" fallback="/mailbox"><section className="flow-message"><h1>이 편지는<br />조용히 거두었어요.</h1></section></FocusShell>;
  return <main className="mobile-prototype letter-flow-screen letter-flow-screen--active-reader"><FlowHeader title="내가 보낸 편지" fallback="/mailbox" /><div className="letter-flow-scroll active-reading-scroll">
    <section className="active-reading-room" aria-label="내가 보낸 편지 공간" style={{ minHeight: 248 }}>
      <div className="active-reading-room-copy"><h1><strong>답장</strong>을<br />기다리고 있어요</h1></div>
      <img src="/assets/reply-sent-lavender-envelope.png" alt="" aria-hidden="true" style={{ opacity: 1, bottom: 12 }} />
    </section>
    <p className="active-reading-kicker" style={{ margin: "0 0 14px", padding: "0 24px" }}><span>내가 보낸 편지</span><time>{formatDate(letter.createdAt)}</time></p>
    <div className="active-reading-mat" style={{ marginTop: 0 }}>
      <article className="active-reading-paper" style={{ minHeight: "auto", paddingBottom: 26 }}>
        <span className="active-reading-quote active-reading-quote--open" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>“</span>
        <blockquote style={{ minHeight: "auto" }}>{letter.content}</blockquote>
        <span className="active-reading-quote active-reading-quote--close" aria-hidden="true" style={{ color: "rgba(41,37,34,0.6)" }}>”</span>
        <p style={{ margin: "10px 0 0", textAlign: "right", color: "var(--muted-ink)", fontFamily: '"Noto Serif KR", serif', fontSize: "12px" }}>─ {signature}</p>
      </article>
    </div>
  </div></main>;
}

export function RepliedLetterDetailScreen({ letterId }: { letterId?: string }) {
  const letter = letterId ? getLetterById(letterId) : undefined;
  if (!letter?.reply || letter.reply.writerId !== getCurrentUserId()) return <MissingLetterScreen />;
  return <FocusShell title="내가 답한 편지" fallback="/mailbox"><section className="letter-detail"><p className="detail-kicker">상대가 보낸 편지</p><article className="flow-letter-paper"><blockquote>{letter.content}</blockquote></article><section className="detail-reply"><p>내가 보낸 답장</p><SealedReply letterId={letter.id} replyId={letter.reply.id} ownerId={getCurrentUserId()} content={letter.reply.content} /><small>{formatDate(letter.reply.createdAt)}</small></section><dl><div><dt>완료 상태</dt><dd>답장을 전했어요</dd></div></dl></section></FocusShell>;
}

function getLettersForReading(userId: string) {
  seedSampleLetters();
  return getLetters().filter((letter) => letter.status === "waiting_for_reader" && letter.safetyStatus !== "high_risk" && letter.safetyStatus !== "needs_revision" && letter.safetyStatus !== "under_review" && letter.safetyStatus !== "blocked" && [undefined, "clear"].includes(letter.safetyStatus) && [undefined, "not_required", "approved"].includes(letter.moderationStatus) && !letter.assignedReaderId && letter.senderId !== userId && !isUserBlocked(userId, letter.senderId) && !isUserBlocked(letter.senderId, userId) && !isContentHidden(userId, "letter", letter.id) && !getReportForTarget(userId, "letter", letter.id));
}
