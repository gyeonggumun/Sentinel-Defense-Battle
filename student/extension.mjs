
 // 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
 // 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
 export function createStudentView() {
   let menuTabNavigationInstalled = false;
   return {
     renderIdentity({ me, devices, sessions } = {}) {
       const root = document.createElement('div');

       // The provided navigation module is not served by the starter's static-file allowlist.
       // Preserve its required keyboard sequence from the student-renderer entry point.
       if (!menuTabNavigationInstalled) {
         const nav = document.getElementById('nav');
         if (nav) {
           const getTabs = () => [...nav.querySelectorAll('[role="tab"]')];

           function keepMenuTabsInTabOrder() {
             for (const tab of getTabs()) {
               if (tab.tabIndex !== 0) tab.tabIndex = 0;
             }
           }

           nav.addEventListener('keydown', (event) => {
             if (event.key !== 'Tab' || event.defaultPrevented) return;

             const tabs = getTabs();
             const current = event.target instanceof Element
               ? event.target.closest('[role="tab"]')
               : null;
             const index = tabs.indexOf(current);
             if (index < 0) return;

             keepMenuTabsInTabOrder();
             const nextIndex = index + (event.shiftKey ? -1 : 1);
             if (nextIndex >= 0 && nextIndex < tabs.length) {
               event.preventDefault();
               tabs[nextIndex].focus();
             }
           }, true);

           const observer = new MutationObserver(keepMenuTabsInTabOrder);
           observer.observe(nav, {
             subtree: true,
             attributes: true,
             attributeFilter: ['tabindex'],
           });
           keepMenuTabsInTabOrder();

           for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
             panel.tabIndex = 0;
           }

           const note = nav.parentElement?.querySelector('.sidebar-note');
           if (note) {
             note.textContent = 'Tab으로 보호 현황 → 업무 앱 → 보안 기록을 순서대로 이동하고 Enter로 화면을 선택합니다. 마지막 메뉴 다음 Tab은 선택한 화면으로 이동합니다. Shift+Tab으로 이전 메뉴로 돌아갈 수 있습니다.';
           }

           nav.addEventListener('click', (event) => {
             const target = event.target;
             const tab = target instanceof Element ? target.closest('[role="tab"]') : null;
             if (!tab || !nav.contains(tab)) return;
             keepMenuTabsInTabOrder();
             tab.focus();
           });

           menuTabNavigationInstalled = true;
         }
       }

       root.className = 'student-identity-view';

       const modeLabels = {
         connected: '연결됨',
         demo: '예제 자료(demo) · 실제 연결 아님',
         disconnected: '연결 없음',
         unknown: '연결 상태 확인 불가',
       };
       const deviceLabels = {
         compliant: '보안 기준 충족(compliant)',
         noncompliant: '보안 기준 미충족(noncompliant)',
         unknown: '확인 불가(unknown)',
       };
       const sessionLabels = {
         active: '활성(active)',
         expired: '만료(expired)',
         revoked: '철회됨(revoked)',
         unknown: '확인 불가(unknown)',
       };
       const textValue = (value, fallback = '정보 없음') =>
         typeof value === 'string' && value.length > 0 ? value : fallback;
       const safeStatus = (labels, value) =>
         typeof value === 'string' && Object.hasOwn(labels, value)
           ? labels[value]
           : `확인 불가(${textValue(value, 'unknown')})`;

       function isRecord(value) {
         return value !== null && typeof value === 'object' && !Array.isArray(value);
       }

       function pair(list, name, value, needsAttention = false) {
         const term = document.createElement('dt');
         term.textContent = name;
         const detail = document.createElement('dd');
         if (needsAttention) {
           const emphasis = document.createElement('strong');
           emphasis.textContent = value;
           detail.append(emphasis);
         } else {
           detail.textContent = value;
         }
         list.append(term, detail);
       }

       function resourceSection(title, resource, renderData) {
         const section = document.createElement('section');
         section.className = 'student-identity-resource';
         const heading = document.createElement('h3');
         heading.textContent = title;
         section.append(heading);

         const current = isRecord(resource)
           ? resource
           : { status: 'error', mode: 'unknown', error: { message: '자료 형식을 확인할 수 없습니다.' } };
         const modeLabel = Object.hasOwn(modeLabels, current.mode)
           ? modeLabels[current.mode]
           : modeLabels.unknown;
         const mode = document.createElement('p');
         mode.className = 'muted';
         mode.textContent = `연결 상태: ${modeLabel}`;
         section.append(mode);

         if (current.status === 'loading') {
           const message = document.createElement('p');
           message.className = 'state state-loading';
           message.setAttribute('role', 'status');
           message.textContent = `${title} 정보를 불러오는 중…`;
           section.append(message);
         } else if (current.status === 'error') {
           const error = isRecord(current.error) ? current.error : {};
           const code = typeof error.code === 'string' ? ` (${error.code})` : '';
           const detail = typeof error.message === 'string' && error.message.length > 0
             ? error.message
             : '서버가 오류 내용을 제공하지 않았습니다.';
           const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(error.code);
           const message = document.createElement('p');
           message.className = 'state state-error';
           message.setAttribute('role', 'alert');
           message.textContent = unverified
             ? `확인 불가${code}: ${detail}`
             : `연결 실패${code}: ${detail}`;
           section.append(message);
         } else if (current.status === 'ok') {
           if (!renderData(current.data, section)) {
             const message = document.createElement('p');
             message.className = 'state state-error';
             message.setAttribute('role', 'alert');
             message.textContent = `${title} 응답 형식을 확인할 수 없습니다.`;
             section.append(message);
           }
         } else {
           const message = document.createElement('p');
           message.className = 'state state-error';
           message.setAttribute('role', 'alert');
           message.textContent = `${title} 상태를 확인할 수 없습니다.`;
           section.append(message);
         }
         return section;
       }

       root.append(resourceSection('현재 계정·기기·세션', me, (data, section) => {
         if (!isRecord(data) || !isRecord(data.user) || !isRecord(data.device) || !isRecord(data.session)
           || typeof data.user.id !== 'string' || typeof data.device.id !== 'string' || typeof data.session.id !== 'string') return false;
         const details = document.createElement('dl');
         details.className = 'identity';
         pair(details, '사용자', textValue(data.user.label));
         pair(details, '사용자 ID', data.user.id);
         pair(details, '기기', textValue(data.device.label));
         pair(details, '기기 ID', data.device.id);
         pair(details, '기기 보안 상태', safeStatus(deviceLabels, data.device.status), data.device.status !== 'compliant');
         pair(details, '세션 ID', data.session.id);
         pair(details, '세션 상태', safeStatus(sessionLabels, data.session.status), data.session.status !== 'active');
         section.append(details);
         return true;
       }));

       root.append(resourceSection('내 기기 목록', devices, (data, section) => {
         if (!Array.isArray(data) || !data.every(item => isRecord(item) && typeof item.id === 'string')) return false;
         if (data.length === 0) {
           const empty = document.createElement('p');
           empty.className = 'state state-empty';
           empty.textContent = '표시할 기기가 없습니다.';
           section.append(empty);
           return true;
         }
         const list = document.createElement('ul');
         list.className = 'plain-list';
         for (const item of data) {
           const row = document.createElement('li');
           const name = document.createElement('strong');
           name.textContent = textValue(item.label);
           const details = document.createElement('dl');
           pair(details, '기기 ID', item.id);
           pair(details, '보안 상태', safeStatus(deviceLabels, item.status), item.status !== 'compliant');
           row.append(name, details);
           list.append(row);
         }
         section.append(list);
         return true;
       }));

       root.append(resourceSection('내 세션 목록', sessions, (data, section) => {
         if (!Array.isArray(data) || !data.every(item => isRecord(item) && typeof item.id === 'string')) return false;
         if (data.length === 0) {
           const empty = document.createElement('p');
           empty.className = 'state state-empty';
           empty.textContent = '표시할 세션이 없습니다.';
           section.append(empty);
           return true;
         }
         const list = document.createElement('ul');
         list.className = 'plain-list';
         for (const item of data) {
           const row = document.createElement('li');
           const details = document.createElement('dl');
           pair(details, '세션 ID', item.id);
           pair(details, '세션 상태', safeStatus(sessionLabels, item.status), item.status !== 'active');
           row.append(details);
           list.append(row);
         }
         section.append(list);
         return true;
       }));

       // 호출마다 새로운 DOM을 반환한다. 제공 UI가 이전 DOM을 교체한다.
       return root;
     },
     renderDecision({ status, mode, data, error, appId } = {}) {
       const root = document.createElement('section');
       root.className = 'student-decision-view';

       const modeLabels = {
         connected: '연결됨',
         demo: '예제 데이터(demo) · 실제 연결 아님',
         disconnected: '연결 없음',
         unknown: '연결 상태 확인 불가',
       };
       const decisionLabels = {
         allow: '접근 허용(allow)',
         deny: '접근 차단(deny)',
         challenge: '추가 확인 필요(challenge)',
         unknown: '판정 불명(unknown)',
       };
       const decisionNotes = {
         allow: '서버가 선택한 앱의 접근을 허용했습니다.',
         deny: '서버가 선택한 앱의 접근을 차단했습니다.',
         challenge: '서버가 추가 확인을 요구했습니다.',
         unknown: '판정을 확인할 수 없습니다. 허용으로 간주하지 마세요.',
       };
       const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
       const heading = document.createElement('h3');
       heading.textContent = '선택한 업무 앱 접근 판정';
       root.append(heading);

       function addMessage(text, className, role) {
         const message = document.createElement('p');
         message.className = className;
         if (role) message.setAttribute('role', role);
         message.textContent = text;
         root.append(message);
         return message;
       }

       function addPair(list, label, value) {
         const term = document.createElement('dt');
         term.textContent = label;
         const detail = document.createElement('dd');
         detail.textContent = value;
         list.append(term, detail);
       }

       function addContext(details) {
         if (typeof appId === 'string' && appId.length > 0) addPair(details, '선택한 앱 ID', appId);
         if (typeof mode === 'string') {
           const label = Object.hasOwn(modeLabels, mode) ? modeLabels[mode] : '확인 불가 (' + mode + ')';
           addPair(details, '데이터 연결 상태', label);
         }
       }

       if (status === 'idle') {
         addMessage('업무 앱 하나를 선택하고 접근 요청을 실행하세요.', 'state state-empty', 'status');
         return root;
       }

       if (status === 'loading') {
         addMessage('선택한 앱의 접근 판정을 확인하는 중입니다…', 'state state-loading', 'status');
         const details = document.createElement('dl');
         details.className = 'decision-details';
         addContext(details);
         if (details.childNodes.length > 0) root.append(details);
         return root;
       }

       if (status === 'error') {
         const failure = isRecord(error) ? error : {};
         const code = typeof failure.code === 'string' && failure.code.length > 0 ? ' (' + failure.code + ')' : '';
         const message = typeof failure.message === 'string' && failure.message.length > 0
           ? failure.message
           : '서버에서 오류 내용을 제공하지 않았습니다.';
         addMessage('판정 요청 실패' + code + ' · 접근 거부 판정이 아닙니다: ' + message, 'state state-error', 'alert');
         const details = document.createElement('dl');
         details.className = 'decision-details';
         addContext(details);
         if (details.childNodes.length > 0) root.append(details);
         return root;
       }

       if (status !== 'ok') {
         addMessage('확인 불가(unknown): 접근을 허용으로 간주하지 마세요.', 'state state-error', 'alert');
         const details = document.createElement('dl');
         details.className = 'decision-details';
         addContext(details);
         if (details.childNodes.length > 0) root.append(details);
         return root;
       }

       const result = isRecord(data) ? data : {};
       const decision = typeof result.decision === 'string' ? result.decision : '';
       const matchesSelectedApp = typeof appId === 'string' && appId.length > 0 && result.appId === appId;
       const knownDecision = Object.hasOwn(decisionLabels, decision);
       const canShowDecision = matchesSelectedApp && knownDecision;
       const displayedDecision = canShowDecision ? decisionLabels[decision] : '확인 불가(unknown)';
       addMessage(displayedDecision, canShowDecision && decision === 'allow' ? 'decision decision-allow' : 'decision decision-unverified', canShowDecision && decision !== 'unknown' ? 'status' : 'alert');
       if (!matchesSelectedApp) {
         addMessage('응답이 선택한 앱과 일치하지 않아 판정을 표시하지 않습니다.', 'muted', null);
       } else if (!knownDecision) {
         addMessage('허용·차단·추가 확인 중 하나로 해석할 수 없는 판정입니다. 허용으로 간주하지 마세요.', 'muted', null);
       } else {
         addMessage(decisionNotes[decision], 'muted', null);
       }

       const details = document.createElement('dl');
       details.className = 'decision-details';
       addContext(details);
       const reason = typeof result.reason === 'string' && result.reason.length > 0 ? result.reason : '사유 정보 없음';
       const checkedAt = typeof result.checkedAt === 'string' && Number.isFinite(Date.parse(result.checkedAt))
         ? result.checkedAt
         : '판정 시각 확인 불가';
       addPair(details, '판정 이유', reason);
       addPair(details, '판정 시각', checkedAt);
       if (!canShowDecision) addPair(details, '원본 판정 코드', decision || 'unknown');
       root.append(details);
       return root;
     },
     renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
     renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
     renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
     renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
     renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
     renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
   };
 }
