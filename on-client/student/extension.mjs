// 이ファイルは学生が同じプロジェクトで 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  let lastEventsData = null;
  let eventFilters = { kind: 'all', appId: 'all', access: 'all' };
  let selectedEventId = null;

  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('div');
      const deviceLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionLabels = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const textValue = (value) => typeof value === 'string' ? value : '';
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const showMode = (section, resource) => {
        const modeLabels = {
          demo: '예제 자료',
          disconnected: '연결 없음',
          unknown: '확인 불가',
        };
        const label = modeLabels[resource?.mode];
        if (label) addText(section, 'p', label, 'student-identity-mode');
      };
      const showError = (section, resource, subject) => {
        const error = resource?.error;
        const message = textValue(error?.message) || '서버가 오류 메시지를 제공하지 않았습니다.';
        const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(error?.code);
        addText(section, 'p', `${subject} ${unverified ? '확인 불가' : '연결 실패'}: ${message}`, 'student-identity-error');
      };
      const formatStatus = (status, labels) => {
        const code = textValue(status) || 'unknown';
        const label = Object.prototype.hasOwnProperty.call(labels, code) ? labels[code] : '확인 불가';
        return `${label} (${code})`;
      };
      const showDeviceStatus = (status) => formatStatus(status, deviceLabels);
      const showSessionStatus = (status) => formatStatus(status, sessionLabels);
      const addSection = (title) => {
        const section = document.createElement('section');
        addText(section, 'h3', title, 'student-identity-title');
        root.append(section);
        return section;
      };

      const identitySection = addSection('현재 계정·기기·세션');
      showMode(identitySection, me);
      if (me?.status === 'loading') {
        addText(identitySection, 'p', '불러오는 중');
      } else if (me?.status === 'error') {
        showError(identitySection, me, '계정·기기·세션 정보');
      } else if (me?.status === 'ok') {
        const data = me.data;
        const user = data?.user;
        const device = data?.device;
        const session = data?.session;
        if (!user || !device || !session) {
          addText(identitySection, 'p', '확인 불가: 계정·기기·세션 응답 형식을 확인할 수 없습니다.', 'student-identity-error');
        } else {
          addText(identitySection, 'p', `사용자: ${textValue(user.label) || '이름 확인 불가'} · ID: ${textValue(user.id) || '확인 불가'}`);
          addText(identitySection, 'p', `현재 기기: ${textValue(device.label) || '이름 확인 불가'} · ID: ${textValue(device.id) || '확인 불가'} · ${showDeviceStatus(device.status)}`);
          addText(identitySection, 'p', `현재 세션: ID ${textValue(session.id) || '확인 불가'} · ${showSessionStatus(session.status)}`);
        }
      } else {
        addText(identitySection, 'p', '확인 불가: 계정·기기·세션 상태를 확인할 수 없습니다.', 'student-identity-error');
      }

      const devicesSection = addSection('기기 목록');
      showMode(devicesSection, devices);
      if (devices?.status === 'loading') {
        addText(devicesSection, 'p', '불러오는 중');
      } else if (devices?.status === 'error') {
        showError(devicesSection, devices, '기기 정보');
      } else if (devices?.status === 'ok' && Array.isArray(devices.data)) {
        if (devices.data.length === 0) {
          addText(devicesSection, 'p', '표시할 기기가 없습니다.');
        } else {
          for (const device of devices.data) {
            const label = textValue(device?.label) || '이름 확인 불가';
            const id = textValue(device?.id) || '확인 불가';
            addText(devicesSection, 'p', `${label} · ID: ${id} · ${showDeviceStatus(device?.status)}`);
          }
        }
      } else {
        addText(devicesSection, 'p', '확인 불가: 기기 응답 형식을 확인할 수 없습니다.', 'student-identity-error');
      }

      const sessionsSection = addSection('세션 목록');
      showMode(sessionsSection, sessions);
      if (sessions?.status === 'loading') {
        addText(sessionsSection, 'p', '불러오는 중');
      } else if (sessions?.status === 'error') {
        showError(sessionsSection, sessions, '세션 정보');
      } else if (sessions?.status === 'ok' && Array.isArray(sessions.data)) {
        if (sessions.data.length === 0) {
          addText(sessionsSection, 'p', '표시할 세션이 없습니다.');
        } else {
          for (const session of sessions.data) {
            const id = textValue(session?.id) || '확인 불가';
            addText(sessionsSection, 'p', `세션 ID: ${id} · ${showSessionStatus(session?.status)}`);
          }
        }
      } else {
        addText(sessionsSection, 'p', '확인 불가: 세션 응답 형식을 확인할 수 없습니다.', 'student-identity-error');
      }

      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = document.createElement('section');
      const addText = (tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        root.append(node);
        return node;
      };
      const selectedAppId = typeof data?.appId === 'string' && data.appId
        ? data.appId
        : typeof appId === 'string' && appId ? appId : '확인 불가';

      addText('h3', '업무 앱 접근 요청 결과', 'student-decision-title');

      if (status === 'idle') {
        addText('p', '업무 앱을 선택한 뒤 접근을 요청하세요.', 'student-decision-idle');
      } else if (status === 'loading') {
        addText('p', '판정 확인 중', 'student-decision-loading');
        if (selectedAppId !== '확인 불가') addText('p', `업무 앱 ID: ${selectedAppId}`);
      } else if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message
          ? error.message
          : '오류 메시지를 확인할 수 없습니다.';
        addText('p', '접근 요청 실패 (error)', 'student-decision-error');
        addText('p', `요청 실패: ${message}`, 'student-decision-error-message');
        addText('p', '요청 실패는 접근 거부 판정이 아닙니다.', 'student-decision-error-note');
        if (selectedAppId !== '확인 불가') addText('p', `업무 앱 ID: ${selectedAppId}`);
      } else if (status === 'ok') {
        const decision = data?.decision;
        const labels = {
          allow: '접근 허용',
          deny: '접근 거부',
          challenge: '추가 확인 필요',
          unknown: '확인 불가',
        };
        const knownDecision = typeof decision === 'string' && Object.hasOwn(labels, decision);
        const code = knownDecision ? decision : 'unknown';
        const label = labels[code];

        addText('p', `업무 앱 ID: ${selectedAppId}`);
        addText('p', `접근 판정: ${label} (${code})${code === 'unknown' ? ' · 허용으로 간주하지 않습니다.' : ''}`, `student-decision-${code}`);
        if (!knownDecision && typeof decision === 'string' && decision !== 'unknown') {
          addText('p', `확인할 수 없는 원본 판정 코드: ${decision}`, 'student-decision-raw-code');
        }
        if (code === 'allow') {
          addText('p', '이는 정책상 접근 허용 판정이며, 실제 업무 앱 접속 성공을 보장하지 않습니다.');
        } else if (code === 'challenge') {
          addText('p', '이 화면은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        }
        const reason = typeof data?.reason === 'string' && data.reason ? data.reason : '이유 확인 불가';
        const checkedAt = typeof data?.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '시각 확인 불가';
        addText('p', `판정 이유: ${reason}`, 'student-decision-reason');
        addText('p', `판정 시각: ${checkedAt}`, 'student-decision-checked-at');
      } else {
        addText('p', '접근 판정 확인 불가 (unknown) · 허용으로 간주하지 않습니다.', 'student-decision-unknown');
        if (typeof status === 'string' && status) addText('p', `확인할 수 없는 요청 상태 코드: ${status}`);
      }

      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '접속 기록·XDR 경보';
      root.append(title);

      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const kindLabels = { access: '접속 기록', xdr: 'XDR 경보' };
      const accessLabels = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
      const sessionLabels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const deviceLabels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const stateText = (value, labels) => {
        const code = typeof value === 'string' && value ? value : 'unknown';
        const label = Object.prototype.hasOwnProperty.call(labels, code) ? labels[code] : '확인 불가';
        return `${label} (${code})`;
      };
      const rawText = (value, fallback) => typeof value === 'string' && value ? value : fallback;

      if (status === 'loading') {
        lastEventsData = null;
        eventFilters = { kind: 'all', appId: 'all', access: 'all' };
        selectedEventId = null;
        addText(root, 'p', '보안 기록을 불러오는 중', 'student-events-loading');
        return root;
      }
      if (status === 'error') {
        lastEventsData = null;
        eventFilters = { kind: 'all', appId: 'all', access: 'all' };
        selectedEventId = null;
        if (error?.code === 'CONTRACT_MISMATCH' || error?.code === 'ENGINE_RESULT_UNVERIFIED') {
          addText(root, 'p', `기록 확인 불가: ${rawText(error?.message, '응답 형식을 확인할 수 없습니다.')}`, 'student-events-unverified');
        } else {
          addText(root, 'p', `기록을 불러오지 못했습니다: ${rawText(error?.message, '오류 메시지를 확인할 수 없습니다.')}`, 'student-events-error');
        }
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        lastEventsData = null;
        eventFilters = { kind: 'all', appId: 'all', access: 'all' };
        selectedEventId = null;
        addText(root, 'p', '기록 확인 불가: 기록 상태 또는 응답 형식을 확인할 수 없습니다.', 'student-events-unverified');
        return root;
      }

      if (data !== lastEventsData) {
        lastEventsData = data;
        eventFilters = { kind: 'all', appId: 'all', access: 'all' };
        selectedEventId = null;
      }

      // 정렬은 전달된 서버 배열을 바꾸지 않도록 복사본에만 적용한다.
      const sortedEvents = [...data].sort((left, right) => {
        const leftTime = Date.parse(left?.at);
        const rightTime = Date.parse(right?.at);
        if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
        if (!Number.isFinite(leftTime)) return 1;
        if (!Number.isFinite(rightTime)) return -1;
        return rightTime - leftTime;
      });

      if (sortedEvents.length === 0) {
        selectedEventId = null;
        addText(root, 'p', '표시할 기록이 없습니다.', 'student-events-empty');
        return root;
      }

      const filters = document.createElement('div');
      filters.className = 'student-events-filters';
      root.append(filters);
      const list = document.createElement('div');
      list.className = 'student-events-list';
      root.append(list);
      const detail = document.createElement('section');
      detail.className = 'student-event-detail';
      detail.setAttribute('aria-live', 'polite');
      root.append(detail);

      const valuesFor = (getValue) => [...new Set(sortedEvents
        .map(getValue)
        .filter((value) => typeof value === 'string' && value.length > 0))]
        .sort((left, right) => left.localeCompare(right));
      const makeFilter = (labelText, key, values, labelForValue) => {
        const label = document.createElement('label');
        label.textContent = labelText;
        const select = document.createElement('select');
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체';
        select.append(allOption);
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = labelForValue ? labelForValue(value) : value;
          select.append(option);
        }
        select.value = eventFilters[key];
        select.addEventListener('change', () => {
          eventFilters[key] = select.value;
          updateResults();
        });
        label.append(select);
        filters.append(label);
      };
      makeFilter('기록 종류', 'kind', valuesFor((event) => event.kind), (value) => kindLabels[value] || value);
      makeFilter('업무 앱', 'appId', valuesFor((event) => event.appId), (value) => value);
      makeFilter('접속 상태', 'access', valuesFor((event) => event.state?.access), (value) => stateText(value, accessLabels));

      const filteredEvents = () => sortedEvents.filter((event) =>
        (eventFilters.kind === 'all' || event.kind === eventFilters.kind)
        && (eventFilters.appId === 'all' || event.appId === eventFilters.appId)
        && (eventFilters.access === 'all' || event.state?.access === eventFilters.access));

      const renderDetail = (event) => {
        detail.replaceChildren();
        if (!event) {
          detail.removeAttribute('data-student-event-detail');
          detail.hidden = true;
          return;
        }
        detail.hidden = false;
        detail.setAttribute('data-student-event-detail', rawText(event.id, ''));
        addText(detail, 'h4', `${rawText(event.id, '확인 불가')} 상세`);
        addText(detail, 'p', `사건 ID: ${rawText(event.id, '확인 불가')}`);
        addText(detail, 'p', `업무 앱: ${rawText(event.appId, '앱을 확인할 수 없음')}`);

        const evidenceSection = document.createElement('section');
        addText(evidenceSection, 'h5', '근거');
        if (Array.isArray(event.evidence) && event.evidence.length > 0) {
          for (const evidence of event.evidence) {
            addText(evidenceSection, 'p', `ID: ${rawText(evidence?.id, '확인 불가')} · ${rawText(evidence?.text, '내용 확인 불가')}`);
          }
        } else {
          addText(evidenceSection, 'p', '근거가 없습니다.');
        }
        detail.append(evidenceSection);

        const rulesSection = document.createElement('section');
        addText(rulesSection, 'h5', '규칙');
        if (Array.isArray(event.rules) && event.rules.length > 0) {
          for (const rule of event.rules) {
            addText(rulesSection, 'p', `ID: ${rawText(rule?.id, '확인 불가')} · ${rawText(rule?.text, '내용 확인 불가')}`);
          }
        } else {
          addText(rulesSection, 'p', '규칙이 없습니다.');
        }
        detail.append(rulesSection);

        const stateSection = document.createElement('section');
        addText(stateSection, 'h5', '상태');
        const eventState = event.state || {};
        addText(stateSection, 'p', `접속: ${stateText(eventState.access, accessLabels)}`);
        addText(stateSection, 'p', `세션: ${stateText(eventState.session, sessionLabels)}`);
        addText(stateSection, 'p', `기기: ${stateText(eventState.device, deviceLabels)}`);
        detail.append(stateSection);

        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          const actionsSection = document.createElement('section');
          addText(actionsSection, 'h5', '미지원 조치');
          addText(actionsSection, 'p', '조치 실행 연결은 준비 중입니다. 이 화면은 조치 요청을 보내지 않습니다.');
          for (const action of event.supportedActions) {
            if (typeof action !== 'string' || action.length === 0) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.disabled = true;
            button.textContent = `${action} 미지원`;
            actionsSection.append(button);
          }
          if (actionsSection.querySelector('button')) detail.append(actionsSection);
        }
      };

      const updateResults = () => {
        const visibleEvents = filteredEvents();
        if (selectedEventId && !visibleEvents.some((event) => event.id === selectedEventId)) selectedEventId = null;
        list.replaceChildren();
        addText(list, 'p', `표시 기록: ${visibleEvents.length}건`, 'student-events-count');
        if (visibleEvents.length === 0) {
          addText(list, 'p', '필터 조건에 맞는 기록이 없습니다.', 'student-events-filter-empty');
        } else {
          const rows = document.createElement('ul');
          for (const event of visibleEvents) {
            const row = document.createElement('li');
            row.setAttribute('data-student-event-id', rawText(event.id, ''));
            addText(row, 'p', `사건 ID: ${rawText(event.id, '확인 불가')}`);
            addText(row, 'p', `시각: ${rawText(event.at, '시각 정보 없음')}`);
            const kind = rawText(event.kind, '확인 불가');
            addText(row, 'p', `종류: ${kindLabels[kind] || kind}`);
            addText(row, 'p', `앱: ${rawText(event.appId, '앱을 확인할 수 없음')}`);
            addText(row, 'p', `요약: ${rawText(event.summary, '요약 확인 불가')}`);
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${rawText(event.id, '확인 불가')} 상세`;
            button.addEventListener('click', () => {
              selectedEventId = event.id;
              renderDetail(event);
            });
            row.append(button);
            rows.append(row);
          }
          list.append(rows);
        }
        const selected = visibleEvents.find((event) => event.id === selectedEventId);
        renderDetail(selected || null);
      };

      updateResults();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const safeString = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || value.length === 0 || value.length > 2000
          || /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|token|토큰)\s*[:=]\s*\S+)/i.test(value)
          || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fallback;
        return value;
      };
      const statusLabels = {
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
      };
      const formatStatus = (kind, value) => {
        const code = typeof value === 'string' && value ? safeString(value) : 'unknown';
        const label = Object.prototype.hasOwnProperty.call(statusLabels[kind], code) ? statusLabels[kind][code] : '확인 불가';
        return `${label} (${code})`;
      };
      const modeLabels = { connected: '연결됨', demo: '예제 자료 (demo)', disconnected: '연결 없음', unknown: '확인 불가' };
      addText(root, 'h3', '알림·기기·세션·도움정보', 'student-status-title');
      addText(root, 'p', `연결 모드: ${modeLabels[mode] || '확인 불가'}`, 'student-status-mode');

      const showCollection = (title, resource, kind) => {
        const section = document.createElement('section');
        addText(section, 'h4', title);
        const subject = kind === 'device' ? '기기' : '세션';
        const error = resource?.error;
        if (resource?.status === 'loading') {
          addText(section, 'p', `${subject} 정보를 불러오는 중입니다.`, 'student-status-loading');
        } else if (resource?.status === 'error') {
          const code = typeof error?.code === 'string' ? error.code : '';
          const message = safeString(error?.message, '오류 메시지를 확인할 수 없습니다.');
          const timedOut = /(?:TIMEOUT|TIMED_OUT)/i.test(code) || /시간이 초과|시간 초과/.test(message);
          const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(code);
          addText(section, 'p', `${unverified ? `${subject} 정보 확인 불가` : `${subject} 정보를 불러오지 못했습니다`}${timedOut ? ' (시간 초과)' : ''}: ${message}`, 'student-status-error');
          addText(section, 'p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동 재요청은 하지 않습니다.', 'student-status-retry');
        } else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) {
            addText(section, 'p', kind === 'device' ? '등록된 기기가 없습니다.' : '현재 연결이 없습니다.', 'student-status-empty');
          } else {
            for (const item of resource.data) {
              if (kind === 'device') {
                addText(section, 'p', `${safeString(item?.label, '기기 이름 확인 불가')} · ${formatStatus('device', item?.status)}`);
              } else {
                addText(section, 'p', `세션 ID: ${safeString(item?.id)} · ${formatStatus('session', item?.status)}`);
              }
            }
          }
          if (kind === 'session') addText(section, 'p', '세션은 현재 검증된 연결 한 개이며, 지난 세션 목록이 아닙니다.', 'student-status-scope');
        } else {
          addText(section, 'p', `${subject} 정보 확인 불가: 응답 상태 또는 형식을 확인할 수 없습니다.`, 'student-status-unverified');
          if (kind === 'session') addText(section, 'p', '세션은 현재 검증된 연결 한 개이며, 지난 세션 목록이 아닙니다.', 'student-status-scope');
        }
        root.append(section);
      };

      showCollection('기기', devices, 'device');
      showCollection('세션', sessions, 'session');

      const notificationSection = document.createElement('section');
      addText(notificationSection, 'h4', '알림');
      if (!Array.isArray(notifications)) {
        addText(notificationSection, 'p', '알림 정보를 확인할 수 없습니다.', 'student-status-unverified');
      } else if (notifications.length === 0) {
        addText(notificationSection, 'p', '주의할 알림이 없습니다.', 'student-status-empty');
      } else {
        for (const notification of notifications) {
          const item = document.createElement('article');
          addText(item, 'p', `자료(resource): ${safeString(notification?.resource)}`);
          addText(item, 'p', `코드(code): ${safeString(notification?.code)}`);
          addText(item, 'p', `메시지: ${safeString(notification?.message, '알림 메시지를 확인할 수 없습니다.')}`);
          notificationSection.append(item);
        }
      }
      root.append(notificationSection);

      const diagnosticsSection = document.createElement('section');
      addText(diagnosticsSection, 'h4', '진단 정보');
      const diagnosticsData = diagnostics?.data;
      const field = (value) => safeString(typeof value === 'string' ? value : '', '확인 불가');
      const safeDiagnostics = diagnostics?.status === 'ok' && diagnosticsData && typeof diagnosticsData === 'object'
        ? {
          requestId: field(diagnosticsData.requestId),
          component: field(diagnosticsData.component),
          version: field(diagnosticsData.version),
          checkedAt: field(diagnosticsData.checkedAt),
          engine: {
            mode: field(diagnosticsData.engine?.mode),
            code: field(diagnosticsData.engine?.code),
          },
        }
        : null;
      if (diagnostics?.status === 'loading') {
        addText(diagnosticsSection, 'p', '진단 정보를 불러오는 중입니다.', 'student-status-loading');
      } else if (diagnostics?.status === 'error') {
        const errorMessage = safeString(diagnostics.error?.message, '오류 메시지를 확인할 수 없습니다.');
        addText(diagnosticsSection, 'p', `진단 정보를 불러오지 못했습니다: ${errorMessage}`, 'student-status-error');
      } else if (diagnostics?.status === 'ok' && safeDiagnostics) {
        addText(diagnosticsSection, 'p', `requestId: ${safeDiagnostics.requestId}`);
        addText(diagnosticsSection, 'p', `component: ${safeDiagnostics.component}`);
        addText(diagnosticsSection, 'p', `version: ${safeDiagnostics.version}`);
        addText(diagnosticsSection, 'p', `checkedAt: ${safeDiagnostics.checkedAt}`);
        addText(diagnosticsSection, 'p', `engine.mode: ${safeDiagnostics.engine.mode}`);
        addText(diagnosticsSection, 'p', `engine.code: ${safeDiagnostics.engine.code}`);
      } else {
        addText(diagnosticsSection, 'p', '진단 정보가 아직 준비되지 않았습니다. 제공 화면에서 도움정보를 불러오세요.', 'student-status-idle');
      }
      addText(diagnosticsSection, 'p', '도움 요청에 사용할 비밀 없는 진단 항목만 복사합니다.', 'student-status-copy-note');
      const copyStatus = addText(diagnosticsSection, 'p', '', 'student-status-copy-result');
      copyStatus.setAttribute('aria-live', 'polite');
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '도움정보 복사';
      const copyPayload = JSON.stringify(safeDiagnostics || {
        status: typeof diagnostics?.status === 'string' ? diagnostics.status : 'unknown',
        mode: modeLabels[mode] ? mode : 'unknown',
      }, null, 2);
      copyButton.addEventListener('click', async () => {
        try {
          const clipboard = globalThis.navigator?.clipboard;
          if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
          await clipboard.writeText(copyPayload);
          copyStatus.textContent = '도움정보를 클립보드에 복사했습니다. 붙여 넣기 전에 비밀 정보가 없는지 확인하세요.';
        } catch {
          copyStatus.textContent = '클립보드 복사를 사용할 수 없습니다. 브라우저의 클립보드 권한을 확인하세요.';
        }
      });
      diagnosticsSection.append(copyButton);
      root.append(diagnosticsSection);

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|token|토큰)\s*[:=]\s*\S+)/i;
      const safeValue = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || value.length === 0 || value.length > 2000
          || secretPattern.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fallback;
        return value;
      };
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value)
        ? value : 'AI_REQUEST_UNVERIFIED';
      const modeLabels = {
        connected: '연결됨',
        demo: '예제 자료(demo) · 실제 연결 아님',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };
      const errorGuidance = (code) => {
        if (code === 'ON_AI_PROVISIONING_PENDING') return '학생 계정 연결과 앱 권한이 아직 준비되지 않았거나 확인되지 않았습니다. 담당자에게 계정 연결과 앱 권한을 확인해 달라고 요청하세요.';
        if (code === 'WB_CLCO_AUTH_REQUIRED' || code === 'ON_AI_AUTHORIZATION_CHANGED') return '인증 또는 앱 권한을 확인하지 못했습니다. 계정 연결을 다시 확인하고 담당자에게 현재 앱 권한을 확인해 달라고 요청하세요.';
        if (code === 'WB_CLCO_ACCESS_BLOCKED') return '현재 앱의 이용 권한이 제한됐습니다. 담당자에게 접근 권한을 확인해 달라고 요청하세요.';
        if (['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'].includes(code)) return '반 사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인해 달라고 요청하세요.';
        if (code === 'WB_CLCO_SESSION_CLOSED') return '현재 이용 시간이 아닙니다. 안내된 이용 시간을 확인하세요.';
        if (code === 'WB_CLCO_RATE_LIMITED') return '요청이 제한됐습니다. 잠시 기다린 뒤 사용자가 직접 다시 점검하세요.';
        if (['WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK_ERROR', 'WB_CLCO_NETWORK_ERROR'].includes(code)) return '요청 제한 시간 초과 또는 네트워크 문제일 수 있습니다. 연결을 확인한 뒤 잠시 후 사용자가 직접 다시 점검하세요.';
        if (['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'].includes(code)) return '점검이 취소됐습니다. 이전 결과는 현재 결과가 아니며, 필요하면 사용자가 직접 다시 점검하세요.';
        if (['MODEL_NOT_CONFIGURED', 'ON_AI_MODEL_LIST_EMPTY'].includes(code)) return '사용할 수 있는 모델이 없거나 설정되지 않았습니다. 담당자에게 모델 허용 설정을 확인해 달라고 요청하세요.';
        return 'AI 연결 점검에 실패했거나 결과를 확인할 수 없습니다. 담당자에게 계정 권한과 연결 상태를 확인해 달라고 요청하세요.';
      };

      addText(root, 'h3', '알레프게이트 AI 연결 점검', 'student-ai-connection-title');
      addText(root, 'p', `연결 모드: ${modeLabels[mode] || modeLabels.unknown}`, 'student-ai-connection-mode');

      if (status === 'idle') {
        addText(root, 'p', 'AI 연결 점검 전입니다. 아직 점검 결과가 없습니다.', 'student-ai-connection-idle');
        addText(root, 'p', '다시 점검하려면 제공 화면의 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 점검하지 않습니다.', 'student-ai-connection-manual');
      } else if (status === 'loading') {
        addText(root, 'p', 'AI 연결 점검 중입니다. 결과는 아직 확인되지 않았습니다.', 'student-ai-connection-loading');
        addText(root, 'p', '점검은 제공 화면에서 사용자가 시작합니다. 자동 재시도는 하지 않습니다.', 'student-ai-connection-manual');
      } else if (status === 'ok') {
        const authorization = data?.audienceAuthorization;
        const valid = data?.transportChecked === true
          && ['test', 'verified'].includes(authorization)
          && Number.isInteger(data?.modelCount) && data.modelCount >= 0 && data.modelCount <= 10000;
        if (!valid) {
          addText(root, 'p', 'AI 연결 점검 결과를 확인할 수 없습니다. 연결 성공으로 간주하지 않습니다.', 'student-ai-connection-unverified');
        } else {
          if (authorization === 'test') {
            addText(root, 'p', '시험 연결 점검(test) · 실제 앱 권한 확인이나 운영 연결이 아닙니다.', 'student-ai-connection-test');
          } else {
            addText(root, 'p', '앱 권한 확인 후 점검(verified) · 이 시각에 앱 권한과 모델 응답을 확인했습니다.', 'student-ai-connection-verified');
          }
          addText(root, 'p', `점검된 모델 수: ${data.modelCount}`, 'student-ai-connection-model-count');
          addText(root, 'p', `점검 시각: ${safeValue(checkedAt)}`, 'student-ai-connection-checked-at');
          addText(root, 'p', '이 결과는 연결과 모델 목록만 점검했습니다. 사건 설명은 아직 실행하지 않았으며, AI 사건 설명이나 게이트 처리가 완료된 것을 뜻하지 않습니다.', 'student-ai-connection-not-explanation');
        }
        addText(root, 'p', '필요하면 제공 화면의 「현재 API 연결 점검」 버튼을 직접 눌러 다시 점검하세요. 자동 재시도는 하지 않습니다.', 'student-ai-connection-manual');
      } else if (status === 'error') {
        const code = safeCode(error?.code);
        const rawMessage = error?.message;
        const message = safeValue(rawMessage, typeof rawMessage === 'string' && rawMessage ? '원문 오류 메시지는 민감 정보가 포함될 수 있어 표시하지 않았습니다.' : '오류 메시지를 확인할 수 없습니다.');
        addText(root, 'p', `AI 연결 점검 실패 (${code})`, 'student-ai-connection-error');
        addText(root, 'p', `오류 메시지: ${message}`, 'student-ai-connection-error-message');
        addText(root, 'p', errorGuidance(code), 'student-ai-connection-guidance');
        addText(root, 'p', '이 오류는 연결 또는 모델 점검 성공을 뜻하지 않습니다. 자동 재시도는 하지 않습니다. 원인을 확인한 뒤 제공 화면에서 사용자가 직접 다시 점검하세요.', 'student-ai-connection-not-success');
      } else {
        addText(root, 'p', 'AI 연결 점검 상태를 확인할 수 없습니다. 성공으로 간주하지 않습니다.', 'student-ai-connection-unverified');
        addText(root, 'p', '이전 점검 결과는 현재 결과가 아닙니다. 제공 화면에서 사용자가 직접 다시 점검할 수 있습니다.', 'student-ai-connection-manual');
      }

      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('section');
      const addText = (tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        root.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|token|토큰)\s*[:=]\s*\S+)/i;
      const safeValue = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || value.length === 0 || value.length > 2000
          || secretPattern.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fallback;
        return value;
      };
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value)
        ? value : 'AI_REQUEST_UNVERIFIED';
      const safeEventId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value)
        ? value : null;

      addText('h3', 'AI 사건 설명', 'student-explanation-title');
      if (!event) {
        addText('p', '보안 기록에서 사건을 먼저 선택하세요.', 'student-explanation-idle');
      } else if (explanation?.status === 'loading') {
        addText('p', '선택한 사건의 AI 설명을 요청 중입니다. 결과는 아직 확인되지 않았습니다.', 'student-explanation-loading');
      } else if (explanation?.status === 'error') {
        const code = safeCode(explanation.error?.code);
        const rawMessage = explanation.error?.message;
        const message = safeValue(rawMessage, typeof rawMessage === 'string' && rawMessage ? '원문 오류 메시지는 민감 정보가 포함될 수 있어 표시하지 않았습니다.' : '오류 메시지를 확인할 수 없습니다.');
        addText('p', `AI 사건 설명 실패 (${code}): ${message}`, 'student-explanation-error');
        addText('p', '설명을 표시하지 않았습니다. 보안 기록은 그대로이며, 요청 실패는 접근 판정이나 기록 삭제를 뜻하지 않습니다.', 'student-explanation-record-unchanged');
      } else if (explanation?.status === 'ok') {
        const eventId = safeEventId(event.id);
        const summary = safeValue(explanation.data?.summary, '안전한 설명 요약을 확인할 수 없습니다.');
        if (!eventId || summary === '안전한 설명 요약을 확인할 수 없습니다.') {
          addText('p', '사건 ID 또는 설명 요약을 확인할 수 없어 AI 설명을 표시하지 않습니다.', 'student-explanation-unverified');
        } else {
          root.setAttribute('data-student-explanation-event', eventId);
          addText('p', `사건 ID: ${eventId}`, 'student-explanation-event-id');
          addText('p', 'AI 설명(참고용)', 'student-explanation-heading');
          addText('p', summary, 'student-explanation-summary');
          if (typeof checkedAt === 'string' && checkedAt) addText('p', `설명 확인 시각: ${safeValue(checkedAt)}`, 'student-explanation-checked-at');
          addText('p', '이 설명은 선택한 사건을 해석하는 참고 정보이며, 조치를 실행하지 않습니다.', 'student-explanation-not-executed');
        }
      } else {
        addText('p', 'AI 사건 설명은 아직 실행되지 않았거나 상태를 확인할 수 없습니다.', 'student-explanation-idle');
      }

      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
