
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
         allow: '허용(allow)',
         deny: '거부(deny)',
         challenge: '추가 확인 필요(challenge)',
         unknown: '확인 불가(unknown)',
       };
       const decisionNotes = {
         allow: '서버가 선택한 앱의 접근을 허용했습니다.',
         deny: '서버가 선택한 앱의 접근을 거부했습니다.',
         challenge: '서버가 추가 확인을 요구했습니다. 이 화면은 확인 절차를 대신 수행하지 않습니다.',
         unknown: '서버가 판정을 확인하지 못했습니다. 허용으로 간주하지 마세요.',
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
         root.dataset.decision = 'none';
         addMessage('업무 앱 하나를 선택하고 접근 요청을 실행하세요.', 'state state-empty', 'status');
         return root;
       }

       if (status === 'loading') {
         root.dataset.decision = 'pending';
         addMessage('선택한 앱의 판정을 확인하는 중입니다…', 'state state-loading', 'status');
         const details = document.createElement('dl');
         details.className = 'decision-details';
         addContext(details);
         if (details.childNodes.length > 0) root.append(details);
         return root;
       }

       if (status === 'error') {
         root.dataset.decision = 'request-failed';
         const failure = isRecord(error) ? error : {};
         const code = typeof failure.code === 'string' && failure.code.length > 0 ? ' (' + failure.code + ')' : '';
         const message = typeof failure.message === 'string' && failure.message.length > 0
           ? failure.message
           : '서버에서 오류 내용을 제공하지 않았습니다.';
         addMessage('요청 실패' + code + ': ' + message + ' · 이것은 거부 판정이 아닙니다.', 'decision decision-failed', 'alert');
         const details = document.createElement('dl');
         details.className = 'decision-details';
         addContext(details);
         if (details.childNodes.length > 0) root.append(details);
         return root;
       }

       if (status !== 'ok') {
         root.dataset.decision = 'unknown';
         addMessage('확인 불가(unknown): 접근을 허용으로 간주하지 마세요.', 'decision decision-unknown', 'alert');
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
       const displayedDecision = canShowDecision ? decision : 'unknown';
       root.dataset.decision = displayedDecision;
       addMessage(
         canShowDecision ? decisionLabels[decision] : '확인 불가(unknown)',
         'decision decision-' + displayedDecision,
         displayedDecision === 'unknown' ? 'alert' : 'status',
       );
       if (!matchesSelectedApp) {
         addMessage('응답이 선택한 앱과 일치하지 않아 판정을 표시하지 않습니다.', 'muted', null);
       } else if (!knownDecision) {
         addMessage('허용·거부·추가 확인 중 하나로 해석할 수 없는 판정입니다. 허용으로 간주하지 마세요.', 'muted', null);
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
     renderEvents({ status, mode, data, error } = {}) {
       const root = document.createElement('section');
       root.className = 'student-events-view';

       const modeLabels = {
         connected: '연결됨',
         demo: '예제 자료(demo) · 실제 연결 아님',
         disconnected: '연결 없음',
         unknown: '연결 상태 확인 불가',
       };
       const kindLabels = {
         access: '접속 기록(access)',
         xdr: 'XDR 경보(xdr)',
       };
       const stateLabels = {
         access: { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' },
         session: { active: '활성', expired: '만료', revoked: '회수됨', unknown: '확인 불가' },
         device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
       };
       const heading = document.createElement('h3');
       heading.textContent = '최근 보안 기록';
       root.append(heading);

       const modeLabel = typeof mode === 'string' && Object.hasOwn(modeLabels, mode)
         ? modeLabels[mode]
         : mode === undefined || mode === null ? null : '확인 불가 (' + String(mode) + ')';
       if (modeLabel) {
         const modeNote = document.createElement('p');
         modeNote.className = 'muted';
         modeNote.textContent = '데이터 연결 상태: ' + modeLabel;
         root.append(modeNote);
       }

       const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
       const textValue = (value, fallback = '정보 없음') =>
         typeof value === 'string' && value.length > 0 ? value : fallback;
       const stateValue = (kind, value) => {
         const raw = typeof value === 'string' && value.length > 0 ? value : 'unknown';
         const label = Object.hasOwn(stateLabels[kind], raw) ? stateLabels[kind][raw] : '확인 불가';
         return raw === 'unknown' ? '확인 불가(unknown)' : label + '(' + raw + ')';
       };
       const timeValue = (value) => {
         if (typeof value !== 'string' || value.length === 0) return '시각 정보 없음';
         const date = new Date(value);
         return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
       };

       if (status === 'idle' || status === 'loading') {
         const message = document.createElement('p');
         message.className = 'state state-loading';
         message.setAttribute('role', 'status');
         message.textContent = status === 'idle' ? '보안 기록을 불러오지 않았습니다.' : '보안 기록을 불러오는 중입니다…';
         root.append(message);
         return root;
       }

       if (status === 'error') {
         const failure = isRecord(error) ? error : {};
         const detail = typeof failure.message === 'string' && failure.message.length > 0
           ? failure.message
           : '오류 내용을 확인할 수 없습니다.';
         const message = document.createElement('p');
         message.className = 'state state-error';
         message.setAttribute('role', 'alert');
         if (failure.code === 'CONTRACT_MISMATCH' || failure.code === 'ENGINE_RESULT_UNVERIFIED') {
           message.textContent = '확인 불가: 기록 응답을 검증하지 못했습니다. ' + detail + ' 이전 기록은 표시하지 않습니다.';
         } else {
           message.textContent = '기록을 불러오지 못했습니다: ' + detail;
         }
         root.append(message);
         return root;
       }

       if (status !== 'ok') {
         const message = document.createElement('p');
         message.className = 'state state-error';
         message.setAttribute('role', 'alert');
         message.textContent = '확인 불가: 보안 기록 상태를 확인할 수 없습니다.';
         root.append(message);
         return root;
       }

       if (!Array.isArray(data)) {
         const message = document.createElement('p');
         message.className = 'state state-error';
         message.setAttribute('role', 'alert');
         message.textContent = '확인 불가: 기록 응답 형식을 확인할 수 없습니다.';
         root.append(message);
         return root;
       }

       const records = [...data];
       const timeNumber = (value) => {
         const time = typeof value === 'string' ? Date.parse(value) : NaN;
         return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
       };
       records.sort((left, right) => timeNumber(right?.at) - timeNumber(left?.at));
       const filters = { kind: 'all', appId: 'all', access: 'all' };
       let selectedEventId = null;

       function addPair(list, label, value) {
         const term = document.createElement('dt');
         term.textContent = label;
         const detail = document.createElement('dd');
         detail.textContent = value;
         list.append(term, detail);
       }

       function uniqueValues(getValue) {
         return [...new Set(records.map(getValue).filter(value => typeof value === 'string' && value.length > 0))];
       }

       const filterGroup = document.createElement('div');
       filterGroup.className = 'row';
       const listContainer = document.createElement('div');
       listContainer.className = 'student-event-list';
       const detailContainer = document.createElement('div');
       detailContainer.className = 'student-event-detail';
       root.append(filterGroup, listContainer, detailContainer);

       function makeFilter(labelText, id, key, values, optionLabel) {
         const label = document.createElement('label');
         label.textContent = labelText;
         const select = document.createElement('select');
         select.id = id;
         select.setAttribute('aria-label', labelText);
         const allOption = document.createElement('option');
         allOption.value = 'all';
         allOption.textContent = '전체';
         select.append(allOption);
         for (const value of values) {
           const option = document.createElement('option');
           option.value = value;
           option.textContent = optionLabel(value);
           select.append(option);
         }
         label.append(select);
         filterGroup.append(label);
         select.addEventListener('change', () => {
           filters[key] = select.value;
           selectedEventId = null;
           renderList();
         });
       }

       makeFilter('기록 종류', 'student-event-kind-filter', 'kind', uniqueValues(event => event?.kind),
         value => Object.hasOwn(kindLabels, value) ? kindLabels[value] : '확인 불가 (' + value + ')');
       makeFilter('업무 앱', 'student-event-app-filter', 'appId', uniqueValues(event => event?.appId), value => value);
       makeFilter('접속 상태', 'student-event-access-filter', 'access', uniqueValues(event => event?.state?.access),
         value => stateValue('access', value));

       function filterRecords() {
         return records.filter(event => isRecord(event)
           && (filters.kind === 'all' || event.kind === filters.kind)
           && (filters.appId === 'all' || event.appId === filters.appId)
           && (filters.access === 'all' || event.state?.access === filters.access));
       }

       function renderEntries(title, entries) {
         const section = document.createElement('section');
         section.className = 'event-block';
         const subheading = document.createElement('h4');
         subheading.textContent = title;
         section.append(subheading);
         const list = document.createElement('ul');
         if (!Array.isArray(entries) || entries.length === 0) {
           const empty = document.createElement('li');
           empty.textContent = '없음';
           list.append(empty);
         } else {
           for (const entry of entries) {
             const item = document.createElement('li');
             const identifier = document.createElement('strong');
             identifier.textContent = 'ID: ' + textValue(entry?.id);
             const text = document.createElement('span');
             text.textContent = ' · ' + textValue(entry?.text);
             item.append(identifier, text);
             list.append(item);
           }
         }
         section.append(list);
         return section;
       }

       function renderDetail(event) {
         const eventId = textValue(event.id, 'unknown');
         const detail = document.createElement('section');
         detail.className = 'event event-detail';
         detail.setAttribute('data-student-event-detail', eventId);
         const title = document.createElement('h3');
         title.textContent = eventId + ' 상세';
         detail.append(title);

         const identity = document.createElement('dl');
         identity.className = 'kv';
         addPair(identity, '사건 ID', eventId);
         addPair(identity, '업무 앱', textValue(event.appId, '앱을 확인할 수 없음(appId 없음)'));
         detail.append(identity);

         const evidence = renderEntries('근거(evidence)', event.evidence);
         const rules = renderEntries('규칙(rules)', event.rules);
         detail.append(evidence, rules);

         const states = document.createElement('section');
         states.className = 'event-block';
         const statesTitle = document.createElement('h4');
         statesTitle.textContent = '기록 당시 상태';
         states.append(statesTitle);
         const stateList = document.createElement('dl');
         stateList.className = 'kv';
         const values = isRecord(event.state) ? event.state : {};
         addPair(stateList, '접속 상태(access)', stateValue('access', values.access));
         addPair(stateList, '세션 상태(session)', stateValue('session', values.session));
         addPair(stateList, '기기 상태(device)', stateValue('device', values.device));
         states.append(stateList);
         detail.append(states);

         const unsupportedActions = Array.isArray(event.supportedActions)
           ? event.supportedActions.filter(action => typeof action === 'string' && action.trim().length > 0)
           : [];
         if (unsupportedActions.length > 0) {
           const actionSection = document.createElement('section');
           actionSection.className = 'event-block';
           const actionHeading = document.createElement('h4');
           actionHeading.textContent = '미지원 조치';
           const actionNote = document.createElement('p');
           actionNote.className = 'muted';
           actionNote.textContent = '조치 실행 연결은 준비 중입니다. 이 화면은 조치 요청을 보내지 않습니다.';
           const actionList = document.createElement('ul');
           for (const action of unsupportedActions) {
             const item = document.createElement('li');
             const button = document.createElement('button');
             button.type = 'button';
             button.className = 'btn';
             button.disabled = true;
             button.textContent = action.trim() + ' 미지원';
             button.setAttribute('aria-label', button.textContent);
             item.append(button);
             actionList.append(item);
           }
           actionSection.append(actionHeading, actionNote, actionList);
           detail.append(actionSection);
         }
         return detail;
       }

       function renderList() {
         const visible = filterRecords();
         listContainer.replaceChildren();
         detailContainer.replaceChildren();
         const count = document.createElement('p');
         count.className = 'muted';
         count.textContent = '받은 기록 ' + records.length + '건 중 ' + visible.length + '건 표시';
         listContainer.append(count);

         if (visible.length === 0) {
           const empty = document.createElement('p');
           empty.className = 'state state-empty';
           empty.setAttribute('role', 'status');
           empty.textContent = records.length === 0 ? '표시할 기록이 없습니다.' : '선택한 필터에 해당하는 기록이 없습니다.';
           listContainer.append(empty);
           return;
         }

         const list = document.createElement('ul');
         list.className = 'records';
         for (const event of visible) {
           const eventId = textValue(event.id, 'unknown');
           const row = document.createElement('li');
           row.className = 'event';
           row.setAttribute('data-student-event-id', eventId);

           const title = document.createElement('h3');
           title.textContent = textValue(event.summary, '요약을 확인할 수 없음');
           row.append(title);
           const details = document.createElement('dl');
           details.className = 'kv';
           const kind = typeof event.kind === 'string' && Object.hasOwn(kindLabels, event.kind)
             ? kindLabels[event.kind]
             : '확인 불가 (' + textValue(event.kind, 'unknown') + ')';
           addPair(details, '사건 ID', eventId);
           addPair(details, '시각', timeValue(event.at));
           addPair(details, '종류', kind);
           addPair(details, '앱', textValue(event.appId, '앱을 확인할 수 없음(appId 없음)'));
           addPair(details, '요약', textValue(event.summary, '요약을 확인할 수 없음'));
           row.append(details);

           const actions = document.createElement('div');
           actions.className = 'event-actions';
           const button = document.createElement('button');
           button.type = 'button';
           button.className = 'btn';
           button.textContent = eventId + ' 상세';
           button.setAttribute('aria-label', eventId + ' 상세');
           button.setAttribute('aria-expanded', selectedEventId === eventId ? 'true' : 'false');
           button.addEventListener('click', () => {
             selectedEventId = selectedEventId === eventId ? null : eventId;
             renderList();
             const buttons = [...listContainer.querySelectorAll('button')];
             const activeButton = buttons.find(item => item.getAttribute('aria-label') === eventId + ' 상세');
             if (activeButton) activeButton.focus();
           });
           actions.append(button);
           row.append(actions);
           list.append(row);
         }
         listContainer.append(list);

         if (selectedEventId !== null) {
           const selected = visible.find(event => event.id === selectedEventId);
           if (selected) detailContainer.append(renderDetail(selected));
           else selectedEventId = null;
         }
       }

       renderList();
       return root;
     },
     renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
       const root = document.createElement('section');
       root.className = 'student-status-view';

       const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
       const valueText = (value, fallback = '확인 불가') => {
         if (typeof value === 'string' && value.length > 0) return value;
         if (typeof value === 'number' && Number.isFinite(value)) return String(value);
         if (typeof value === 'boolean') return String(value);
         return fallback;
       };
       const modeLabels = {
         connected: '연결됨(connected)',
         demo: '예제 자료(demo) · 실제 연결 아님',
         disconnected: '연결 없음(disconnected)',
         unknown: '확인 불가(unknown)',
       };
       const modeText = (value) => Object.hasOwn(modeLabels, value)
         ? modeLabels[value]
         : '확인 불가(' + valueText(value, 'unknown') + ')';

       const heading = document.createElement('h3');
       heading.textContent = '기기·세션·알림 상태';
       root.append(heading);

       const connection = document.createElement('p');
       connection.className = 'muted';
       connection.textContent = '데이터 연결 상태: ' + modeText(mode);
       root.append(connection);

       function addMessage(parent, text, className = 'state state-empty', role = 'status') {
         const message = document.createElement('p');
         message.className = className;
         if (role) message.setAttribute('role', role);
         message.textContent = text;
         parent.append(message);
         return message;
       }

       function addPair(list, label, value) {
         const term = document.createElement('dt');
         term.textContent = label;
         const detail = document.createElement('dd');
         detail.textContent = value;
         list.append(term, detail);
       }

       function errorMessage(resource, error, retryInstruction = '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.') {
         const failure = isRecord(error) ? error : {};
         const code = typeof failure.code === 'string' ? failure.code : '';
         const message = valueText(failure.message, typeof error === 'string' ? error : '오류 내용을 확인할 수 없습니다.');
         const timeout = /TIME.?OUT|ETIMEDOUT|ABORT_ERR/i.test(code)
           || /시간 초과|시간이 초과|timed out|timeout/i.test(message);
         const prefix = timeout ? resource + ' 조회 시간 초과' : resource + ' 조회 실패';
         return prefix + (code ? ' (' + code + ')' : '') + ': ' + message + ' ' + retryInstruction;
       }

       function renderCollection(title, resource, kind) {
         const section = document.createElement('section');
         section.className = 'student-status-resource';
         const subheading = document.createElement('h4');
         subheading.textContent = title;
         section.append(subheading);

         const state = isRecord(resource) ? resource : {
           status: 'error',
           error: { message: '응답 형식을 확인할 수 없습니다.' },
         };
         const resourceMode = state.mode === undefined ? mode : state.mode;
         const modeNote = document.createElement('p');
         modeNote.className = 'muted';
         modeNote.textContent = '연결 상태: ' + modeText(resourceMode);
         section.append(modeNote);

         if (kind === 'sessions') {
           const scope = document.createElement('p');
           scope.className = 'muted';
           scope.textContent = '현재 검증된 연결 한 개를 표시합니다. 지난 세션 목록이 아닙니다.';
           section.append(scope);
         }

         if (state.status === 'loading') {
           addMessage(section, title + ' 정보를 불러오는 중입니다…', 'state state-loading');
           return section;
         }
         if (state.status === 'error') {
           addMessage(section, errorMessage(title, state.error), 'state state-error', 'alert');
           return section;
         }
         if (state.status !== 'ok') {
           addMessage(section, title + ' 상태를 확인할 수 없습니다.', 'state state-error', 'alert');
           return section;
         }
         if (!Array.isArray(state.data) || !state.data.every(isRecord)) {
           addMessage(section, title + ' 응답 형식을 확인할 수 없습니다.', 'state state-error', 'alert');
           return section;
         }
         if (state.data.length === 0) {
           addMessage(
             section,
             kind === 'devices' ? '등록된 기기가 없습니다.' : '현재 연결이 없습니다.',
             'state state-empty',
           );
           return section;
         }

         const list = document.createElement('ul');
         list.className = 'plain-list';
         for (const item of state.data) {
           const row = document.createElement('li');
           const details = document.createElement('dl');
           details.className = 'identity';
           if (kind === 'devices') {
             addPair(details, '기기 이름(label)', valueText(item.label, '정보 없음'));
             addPair(details, '기기 상태(status)', valueText(item.status));
           } else {
             addPair(details, '현재 연결 ID(id)', valueText(item.id));
             addPair(details, '현재 연결 상태(status)', valueText(item.status));
           }
           row.append(details);
           list.append(row);
         }
         section.append(list);
         return section;
       }

       function safeDiagnosticValue(value) {
         const text = valueText(value);
         const secretLike = /\bBearer\s+\S+|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|\b(?:sk_[A-Za-z0-9_-]{12,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,})|-----BEGIN [^-]*PRIVATE KEY-----/i;
         if (text.length > 200 || secretLike.test(text)) return '표시하지 않음';
         return text;
       }

       function renderDiagnostics(resource) {
         const section = document.createElement('section');
         section.className = 'student-status-resource';
         const subheading = document.createElement('h4');
         subheading.textContent = '연결 점검 정보';
         section.append(subheading);

         const state = isRecord(resource) ? resource : {
           status: 'error',
           error: { message: '응답 형식을 확인할 수 없습니다.' },
         };
         const resourceMode = state.mode === undefined ? mode : state.mode;
         const modeNote = document.createElement('p');
         modeNote.className = 'muted';
         modeNote.textContent = '연결 상태: ' + modeText(resourceMode);
         section.append(modeNote);

         let safeFields = null;
         if (state.status === 'loading') {
           addMessage(section, '진단 정보를 불러오는 중입니다…', 'state state-loading');
         } else if (state.status === 'error') {
           addMessage(
             section,
             errorMessage('진단 정보', state.error, '다시 시도는 제공 화면의 도움정보 불러오기 버튼을 직접 누르세요.'),
             'state state-error',
             'alert',
           );
         } else if (state.status === 'idle') {
           addMessage(
             section,
             '진단 정보는 아직 조회하지 않았습니다. 제공 화면의 도움정보 불러오기 버튼을 직접 누르세요.',
             'state state-empty',
           );
         } else if (state.status === 'ok') {
           const data = isRecord(state.data) ? state.data : {};
           const engine = isRecord(data.engine) ? data.engine : {};
           safeFields = [
             ['requestId', safeDiagnosticValue(data.requestId)],
             ['component', safeDiagnosticValue(data.component)],
             ['version', safeDiagnosticValue(data.version)],
             ['checkedAt', safeDiagnosticValue(data.checkedAt)],
             ['engine.mode', safeDiagnosticValue(engine.mode)],
             ['engine.code', safeDiagnosticValue(engine.code)],
           ];
           const details = document.createElement('dl');
           details.className = 'identity';
           for (const [label, value] of safeFields) addPair(details, label, value);
           section.append(details);
         } else {
           addMessage(section, '진단 정보 상태를 확인할 수 없습니다.', 'state state-error', 'alert');
         }

         const copyNote = document.createElement('p');
         copyNote.className = 'muted';
         copyNote.textContent = safeFields
           ? '도움 요청에 필요한 비밀 없는 진단 정보만 복사합니다.'
           : '진단 정보가 준비되면 도움 요청에 필요한 안전한 정보만 복사할 수 있습니다.';
         section.append(copyNote);

         const copyButton = document.createElement('button');
         copyButton.type = 'button';
         copyButton.className = 'btn';
         copyButton.textContent = '도움정보 복사';
         copyButton.setAttribute('aria-label', '도움정보 복사');
         copyButton.disabled = safeFields === null;
         const copyStatus = document.createElement('p');
         copyStatus.className = 'muted';
         copyStatus.setAttribute('role', 'status');
         copyButton.addEventListener('click', async () => {
           if (safeFields === null) return;
           try {
             const clipboard = globalThis.navigator?.clipboard;
             if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('clipboard_unavailable');
             const text = safeFields.map(([label, value]) => label + ': ' + value).join('\\n');
             await clipboard.writeText(text);
             copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.';
           } catch {
             copyStatus.textContent = '도움정보를 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.';
           }
         });
         section.append(copyButton, copyStatus);
         return section;
       }

       root.append(
         renderCollection('등록 기기', devices, 'devices'),
         renderCollection('현재 연결', sessions, 'sessions'),
         renderDiagnostics(diagnostics),
       );

       const notificationSection = document.createElement('section');
       notificationSection.className = 'student-status-resource';
       const notificationHeading = document.createElement('h4');
       notificationHeading.textContent = '주의 알림';
       notificationSection.append(notificationHeading);
       if (!Array.isArray(notifications)) {
         addMessage(notificationSection, '알림 상태를 확인할 수 없습니다.', 'state state-error', 'alert');
       } else if (notifications.length === 0) {
         addMessage(notificationSection, '주의할 알림이 없습니다.', 'state state-empty');
       } else {
         const list = document.createElement('ul');
         list.className = 'plain-list';
         for (const notification of notifications) {
           const item = isRecord(notification) ? notification : {};
           const row = document.createElement('li');
           const details = document.createElement('dl');
           details.className = 'identity';
           const code = typeof item.code === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(item.code)
             ? item.code
             : '확인 불가';
           addPair(details, '자료(resource)', valueText(item.resource, '확인 불가'));
           addPair(details, '알림 코드(code)', code);
           addPair(details, '메시지(message)', valueText(item.message, '메시지 없음'));
           row.append(details);
           list.append(row);
         }
         notificationSection.append(list);
       }
       root.append(notificationSection);
       return root;
     },
     renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
     renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
       const root = document.createElement('section');
       root.className = 'student-ai-connection-view';
       const knownStatuses = ['idle', 'loading', 'ok', 'error'];
       const currentStatus = knownStatuses.includes(status) ? status : 'unknown';
       root.dataset.status = currentStatus;

       const heading = document.createElement('h3');
       heading.textContent = '앱 내부 AI 연결 점검';
       root.append(heading);

       function addMessage(text, className, role) {
         const message = document.createElement('p');
         message.className = className;
         if (role) message.setAttribute('role', role);
         message.textContent = text;
         root.append(message);
       }

       function addPair(list, label, value) {
         const term = document.createElement('dt');
         term.textContent = label;
         const detail = document.createElement('dd');
         detail.textContent = value;
         list.append(term, detail);
       }

       const safeMessages = {
         ON_AI_PROVISIONING_PENDING: '학생 앱 이용 권한의 발급·연결을 준비 중입니다. 담당자에게 확인하세요.',
         WB_CLCO_AUTH_REQUIRED: '앱 전용 열쇠의 인증을 확인하세요. Workbench 열쇠를 복사하지 마세요.',
         WB_CLCO_ACCESS_BLOCKED: '학생 앱의 이용 권한을 확인하세요.',
         WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
         WB_CLCO_RATE_LIMITED: 'AI 요청이 잠시 제한됐습니다. 잠시 후 직접 다시 요청하세요.',
         WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
         WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
         WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
         REQUEST_TIMEOUT: '서버의 AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
         ENGINE_TIMEOUT: '서버의 확인 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
         TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
         WB_CLCO_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
         CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
         REQUEST_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
         MODEL_NOT_CONFIGURED: '서버에 사용할 AI 모델을 설정하세요.',
         ON_AI_AUTHORIZATION_CHANGED: 'AI 이용 권한 내용이 점검 도중 바뀌었습니다. 다시 점검하기 전에 담당자에게 현재 권한을 확인하세요.',
         ON_AI_MODEL_LIST_EMPTY: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
         SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사건·프로젝트의 연결을 확인할 수 없습니다.',
         ON_AI_INVALID_INPUT: '설명에 필요한 사건 근거·규칙을 확인할 수 없습니다.',
         ON_AI_INVALID_OUTPUT: 'AI 설명의 근거·조치·응답 형식을 확인할 수 없습니다.',
         AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다. 기존 기록을 확인하세요.',
       };
       const fallbackCode = 'AI_REQUEST_UNVERIFIED';
       const failure = error !== null && typeof error === 'object' && !Array.isArray(error) ? error : {};
       const code = typeof failure.code === 'string' && Object.hasOwn(safeMessages, failure.code)
         ? failure.code
         : fallbackCode;
       const message = safeMessages[code];

       if (currentStatus === 'idle') {
         addMessage('AI 연결 점검 전입니다. 이전 점검 결과는 현재 상태로 표시하지 않습니다.', 'state state-empty', 'status');
         addMessage('학생 계정 연결과 앱 권한은 담당자 준비가 필요할 수 있습니다. 학생 코드만으로 권한을 만들 수 없습니다.', 'muted', null);
       } else if (currentStatus === 'loading') {
         addMessage('AI 연결 점검 중입니다. 이 점검은 보안 이벤트 설명을 실행하지 않습니다.', 'state state-loading', 'status');
       } else if (currentStatus === 'error') {
         addMessage('연결 점검 실패 (' + code + '): ' + message, 'state state-error', 'alert');
         const guidance = {
           ON_AI_PROVISIONING_PENDING: '담당자에게 학생 계정 연결과 앱 권한 발급 상태를 확인해 달라고 요청하세요.',
           WB_CLCO_AUTH_REQUIRED: '계정 연결을 다시 확인하고, 해결되지 않으면 담당자에게 확인을 요청하세요.',
           SUBJECT_SCOPE_UNVERIFIED: '현재 로그인 계정 연결을 확인하고 담당자에게 확인을 요청하세요.',
           WB_CLCO_ACCESS_BLOCKED: '계정 연결을 다시 확인하고 담당자에게 앱 접근 권한을 확인해 달라고 요청하세요.',
           ON_AI_AUTHORIZATION_CHANGED: '담당자에게 현재 앱 권한을 확인해 달라고 요청하세요.',
           WB_CLCO_COHORT_BUDGET_EXHAUSTED: '담당자에게 반의 AI 사용량을 확인해 달라고 요청하세요.',
           WB_CLCO_LIMIT_REACHED: '담당자에게 AI 이용 한도를 확인해 달라고 요청하세요.',
           WB_CLCO_SESSION_CLOSED: '허용된 AI 이용 시간을 확인하세요.',
           WB_CLCO_RATE_LIMITED: '자동 재시도는 하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
           WB_CLCO_TIMEOUT: '자동 재시도는 하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
           REQUEST_TIMEOUT: '자동 재시도는 하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
           ENGINE_TIMEOUT: '자동 재시도는 하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
           TIMEOUT: '자동 재시도는 하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
           CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
           REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
           WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
           MODEL_NOT_CONFIGURED: '담당자에게 사용할 AI 모델 설정을 확인해 달라고 요청하세요.',
           ON_AI_MODEL_LIST_EMPTY: '담당자에게 앱의 모델 허용 설정을 확인해 달라고 요청하세요.',
           AI_REQUEST_UNVERIFIED: '네트워크 또는 연결·응답 확인 불가일 수 있습니다. 자동 재시도는 하지 않습니다. 네트워크 상태를 확인한 뒤 잠시 후 직접 다시 점검하세요.',
         };
         addMessage(guidance[code] || guidance.AI_REQUEST_UNVERIFIED, 'muted', null);
       } else if (currentStatus === 'ok') {
         const validData = data !== null && typeof data === 'object' && !Array.isArray(data)
           && data.transportChecked === true
           && ['test', 'verified'].includes(data.audienceAuthorization)
           && Number.isInteger(data.modelCount) && data.modelCount >= 0;
         if (!validData) {
           addMessage('AI 연결 점검 응답을 확인할 수 없습니다. 성공으로 간주하지 마세요.', 'state state-error', 'alert');
         } else {
           addMessage(
             data.audienceAuthorization === 'test'
               ? '시험 연결 점검(test) · 시험 transport 응답이며 실제 앱 권한 확인은 아닙니다.'
               : '앱 권한 확인 후 점검(verified) · 표시된 시각 기준 앱 권한과 모델 응답을 확인했습니다.',
             'state state-ok',
             'status',
           );
           if (mode === 'demo') addMessage('예제 응답(demo) · 실제 게이트 수용이 아닙니다.', 'tag tag-demo', null);
           const details = document.createElement('dl');
           details.className = 'student-ai-connection-details';
           addPair(details, '응답 모델 수', String(data.modelCount));
           addPair(details, '점검 시각', typeof checkedAt === 'string' && checkedAt.length > 0 ? checkedAt : '시각 정보 없음');
           root.append(details);
           if (explanationAccepted === false) {
             addMessage('연결과 모델 응답만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.', 'muted', null);
           } else {
             addMessage('이 연결 점검에는 보안 이벤트 설명 실행 결과가 포함되지 않습니다.', 'muted', null);
           }
           addMessage('Workbench 수업용 AI, 이 앱의 사건 설명 AI, ALEPH의 공식 과제 판정 AI는 서로 다른 역할입니다.', 'muted', null);
         }
       } else {
         addMessage('AI 연결 점검 상태를 확인할 수 없습니다. 성공으로 간주하지 마세요.', 'state state-error', 'alert');
       }

       addMessage('자동으로 다시 점검하지 않습니다. 재점검은 사용자가 직접 실행합니다.', 'muted', null);
       return root;
     },
     renderExplanation({ event, explanation, checkedAt } = {}) {
       const root = document.createElement('section');
       root.className = 'student-explanation-view';
       const resource = explanation !== null && typeof explanation === 'object' && !Array.isArray(explanation)
         ? explanation
         : {};
       const currentStatus = ['idle', 'loading', 'ok', 'error'].includes(resource.status) ? resource.status : 'unknown';
       root.dataset.status = currentStatus;

       const heading = document.createElement('h3');
       heading.textContent = '보안 이벤트 설명';
       root.append(heading);

       function addMessage(text, className, role) {
         const message = document.createElement('p');
         message.className = className;
         if (role) message.setAttribute('role', role);
         message.textContent = text;
         root.append(message);
       }

       function addPair(list, label, value) {
         const term = document.createElement('dt');
         term.textContent = label;
         const detail = document.createElement('dd');
         detail.textContent = value;
         list.append(term, detail);
       }

       function rejectExplanation(reason) {
         root.dataset.status = 'error';
         addMessage('AI 설명 실패 (ON_AI_INVALID_OUTPUT): ' + reason, 'state state-error', 'alert');
         addMessage('보안 이벤트 기록은 그대로입니다.', 'muted', null);
         return root;
       }

       function addList(title, values) {
         const titleNode = document.createElement('h4');
         titleNode.textContent = title;
         const list = document.createElement('ul');
         for (const value of values) {
           const item = document.createElement('li');
           item.textContent = value;
           list.append(item);
         }
         root.append(titleNode, list);
       }

       if (currentStatus === 'error') {
         const safeMessages = {
           ON_AI_PROVISIONING_PENDING: '학생 앱 이용 권한의 발급·연결을 준비 중입니다. 담당자에게 확인하세요.',
           WB_CLCO_AUTH_REQUIRED: '앱 전용 열쇠의 인증을 확인하세요. Workbench 열쇠를 복사하지 마세요.',
           WB_CLCO_ACCESS_BLOCKED: '학생 앱의 이용 권한을 확인하세요.',
           WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
           WB_CLCO_RATE_LIMITED: 'AI 요청이 잠시 제한됐습니다. 잠시 후 직접 다시 요청하세요.',
           WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
           WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
           WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
           REQUEST_TIMEOUT: '서버의 AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
           ENGINE_TIMEOUT: '서버의 확인 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
           TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
           WB_CLCO_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
           CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
           REQUEST_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
           MODEL_NOT_CONFIGURED: '서버에 사용할 AI 모델을 설정하세요.',
           ON_AI_AUTHORIZATION_CHANGED: 'AI 이용 권한 내용이 점검 도중 바뀌었습니다. 다시 점검하기 전에 담당자에게 현재 권한을 확인하세요.',
           ON_AI_MODEL_LIST_EMPTY: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
           SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사건·프로젝트의 연결을 확인할 수 없습니다.',
           ON_AI_INVALID_INPUT: '설명에 필요한 사건 근거·규칙이 부족하거나 현재 상태 등 입력을 확인할 수 없습니다.',
           ON_AI_INVALID_OUTPUT: 'AI 설명의 근거·조치·응답 형식이 맞지 않아 사용할 수 없습니다. 근거가 일치하지 않거나 이미 조치를 실행했다고 답한 설명은 사용할 수 없습니다.',
           AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다. 기존 기록을 확인하세요.',
         };
         const failure = resource.error !== null && typeof resource.error === 'object' && !Array.isArray(resource.error)
           ? resource.error
           : {};
         const code = typeof failure.code === 'string' && Object.hasOwn(safeMessages, failure.code)
           ? failure.code
           : 'AI_REQUEST_UNVERIFIED';
         const message = safeMessages[code];
         addMessage('AI 설명 실패 (' + code + '): ' + message, 'state state-error', 'alert');
         addMessage('보안 이벤트 기록은 그대로입니다. AI 설명 실패는 과제 실패를 의미하지 않습니다.', 'muted', null);
         return root;
       }

       if (event == null) {
         addMessage('보안 기록에서 기록을 먼저 고르세요.', 'state state-empty', 'status');
         return root;
       }
       if (currentStatus === 'idle') {
         addMessage('이벤트 설명은 아직 실행되지 않았습니다.', 'state state-empty', 'status');
         return root;
       }
       if (currentStatus === 'loading') {
         addMessage('선택한 이벤트의 AI 설명을 요청 중입니다…', 'state state-loading', 'status');
         return root;
       }

       if (currentStatus !== 'ok') {
         addMessage('이벤트 설명 결과를 확인할 수 없습니다. 보안 기록은 변경되지 않았습니다.', 'state state-error', 'alert');
         return root;
       }

       const eventId = event !== null && typeof event === 'object' && !Array.isArray(event)
         && typeof event.id === 'string' && event.id.length > 0
         ? event.id
         : null;
       const summary = resource.data !== null && typeof resource.data === 'object' && !Array.isArray(resource.data)
         && typeof resource.data.summary === 'string' && resource.data.summary.trim().length > 0
         ? resource.data.summary
         : null;
       if (eventId === null || summary === null) {
         return rejectExplanation('사건 ID 또는 AI 요약을 확인할 수 없어 설명을 사용할 수 없습니다.');
       }
       const data = resource.data;
       if (data.executed !== false || data.requiresHumanConfirmation !== true) {
         return rejectExplanation('이미 조치를 실행했다고 답했거나 사람 확인·미실행 상태를 확인할 수 없는 설명은 사용할 수 없습니다.');
       }
       const isTextRow = row => row !== null && typeof row === 'object'
         && typeof row.id === 'string' && row.id.length > 0
         && typeof row.text === 'string' && row.text.trim().length > 0;
       if (!Array.isArray(event.evidence) || event.evidence.length === 0 || !event.evidence.every(isTextRow)) {
         return rejectExplanation('현재 이벤트의 근거가 부족하거나 근거 글을 확인할 수 없어 설명을 사용할 수 없습니다.');
       }
       const evidenceById = new Map(event.evidence.map(row => [row.id, row.text]));
       const matchesEvidence = refs => Array.isArray(refs) && refs.length > 0
         && new Set(refs).size === refs.length && refs.every(id => evidenceById.has(id));
       if (evidenceById.size !== event.evidence.length || !matchesEvidence(data.evidenceIds)
         || data.evidenceIds.length !== evidenceById.size) {
         return rejectExplanation('설명의 근거 ID가 현재 이벤트의 근거와 일치하지 않거나 누락·중복되어 설명을 사용할 수 없습니다.');
       }
       if (!Array.isArray(event.rules) || !event.rules.every(isTextRow)) {
         return rejectExplanation('현재 이벤트의 규칙 ID·규칙 글을 확인할 수 없어 설명을 사용할 수 없습니다.');
       }
       if (event.state === null || typeof event.state !== 'object' || Array.isArray(event.state)
         || !['access', 'session', 'device'].every(key => typeof event.state[key] === 'string')) {
         return rejectExplanation('현재 이벤트의 접속·세션·기기 상태를 확인할 수 없어 설명을 사용할 수 없습니다.');
       }
       if (!Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)
         || !data.proposals.every(proposal => proposal !== null && typeof proposal === 'object'
           && typeof proposal.action === 'string' && event.supportedActions.includes(proposal.action)
           && typeof proposal.reason === 'string' && proposal.reason.trim().length > 0
           && matchesEvidence(proposal.evidenceIds))) {
         return rejectExplanation('제안의 지원 조치·이유·근거가 현재 이벤트와 맞지 않아 설명을 사용할 수 없습니다.');
       }

       root.setAttribute('data-student-explanation-event', eventId);
       addMessage('선택한 이벤트의 AI 설명을 수신했습니다.', 'state state-ok', 'status');
       const details = document.createElement('dl');
       details.className = 'student-explanation-details';
       addPair(details, '사건 ID', eventId);
       if (typeof checkedAt === 'string' && checkedAt.length > 0) addPair(details, '설명 확인 시각', checkedAt);
       root.append(details);
       const summaryHeading = document.createElement('h4');
       summaryHeading.textContent = 'AI 설명(참고용)';
       root.append(summaryHeading);
       const summaryNode = document.createElement('p');
       summaryNode.textContent = summary;
       root.append(summaryNode);
       addList('인용한 근거', data.evidenceIds.map(id => id + ' — ' + evidenceById.get(id)));
       addList('적용 규칙', event.rules.length > 0 ? event.rules.map(row => row.id + ' — ' + row.text) : ['없음']);
       const stateNames = { access: '접속', session: '세션', device: '기기' };
       const unknownStates = Object.keys(stateNames).filter(key => event.state[key] === 'unknown');
       addList('확인 불가 상태', unknownStates.length > 0
         ? unknownStates.map(key => stateNames[key] + ': 확인 불가(unknown)')
         : ['없음']);
       addList('조치 제안', data.proposals.length > 0
         ? data.proposals.map(proposal => proposal.action + ' — ' + proposal.reason
           + ' (근거: ' + proposal.evidenceIds.join(', ') + '). 사람 확인이 필요하며 실행되지 않았습니다.')
         : [event.supportedActions.length === 0
           ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
           : 'AI가 제안한 조치가 없습니다.']);
       addMessage('AI 설명은 참고 정보입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 상태로 합니다. 설명·제안만으로 보안 조치가 실행되지는 않습니다.', 'muted', null);
       return root;
     },
     renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
   };
 }
