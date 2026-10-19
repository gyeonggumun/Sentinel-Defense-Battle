
 // 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
 // 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
 export function createStudentView() {
   return {
     renderIdentity({ me, devices, sessions } = {}) {
       const root = document.createElement('div');
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
     renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
     renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
     renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
     renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
     renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
     renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
     renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
   };
 }
