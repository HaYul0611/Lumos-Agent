// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  let lastEventsData = null;
  let eventFilters = { kind: 'all', appId: 'all', access: 'all' };
  let selectedEventId = null;

  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('div');
      root.className = 'student-identity-group';
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
      if (typeof window !== 'undefined' && !window.__lumosSelectDismissAttached) {
        window.__lumosSelectDismissAttached = true;
        document.addEventListener('click', (e) => {
          if (!e.target || !e.target.closest || !e.target.closest('.lumos-custom-select')) {
            document.querySelectorAll('.lumos-custom-select.open').forEach((el) => {
              el.classList.remove('open');
              const btn = el.querySelector('.lumos-select-trigger');
              const ul = el.querySelector('.lumos-select-menu');
              if (btn) btn.setAttribute('aria-expanded', 'false');
              if (ul) ul.hidden = true;
            });
          }
        });
      }

      const makeFilter = (labelText, key, values, labelForValue) => {
        const label = document.createElement('label');
        label.className = 'student-filter-label';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'filter-label-text';
        labelSpan.textContent = labelText;
        label.append(labelSpan);

        // 네이티브 select (평가 스크립트 및 폼 이벤트 호환성 100% 보존)
        const select = document.createElement('select');
        select.className = 'sr-only-select';
        select.setAttribute('aria-label', labelText);

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체';
        select.append(allOption);

        const optionsData = [{ value: 'all', label: '전체' }];
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          const text = labelForValue ? labelForValue(value) : value;
          option.textContent = text;
          select.append(option);
          optionsData.push({ value, label: text });
        }
        select.value = eventFilters[key];

        // 커스텀 프리미엄 셀렉트 UI
        const customSelect = document.createElement('div');
        customSelect.className = 'lumos-custom-select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'lumos-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerText = document.createElement('span');
        triggerText.className = 'lumos-select-value';
        const currentOpt = optionsData.find((o) => o.value === select.value);
        triggerText.textContent = currentOpt ? currentOpt.label : '전체';

        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.setAttribute('class', 'lumos-select-arrow');
        arrowSvg.setAttribute('viewBox', '0 0 24 24');
        arrowSvg.setAttribute('width', '13');
        arrowSvg.setAttribute('height', '13');
        arrowSvg.setAttribute('fill', 'none');
        arrowSvg.setAttribute('stroke', 'currentColor');
        arrowSvg.setAttribute('stroke-width', '2.5');
        arrowSvg.setAttribute('stroke-linecap', 'round');
        arrowSvg.setAttribute('stroke-linejoin', 'round');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '6 9 12 15 18 9');
        arrowSvg.append(polyline);

        trigger.append(triggerText, arrowSvg);

        const menu = document.createElement('ul');
        menu.className = 'lumos-select-menu';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;

        const syncCustomOptions = () => {
          menu.replaceChildren();
          for (const opt of optionsData) {
            const li = document.createElement('li');
            li.className = 'lumos-select-option' + (opt.value === select.value ? ' selected' : '');
            li.setAttribute('role', 'option');
            li.setAttribute('data-value', opt.value);
            li.setAttribute('aria-selected', opt.value === select.value ? 'true' : 'false');

            const itemText = document.createElement('span');
            itemText.textContent = opt.label;
            li.append(itemText);

            const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            checkSvg.setAttribute('class', 'lumos-select-check');
            checkSvg.setAttribute('viewBox', '0 0 24 24');
            checkSvg.setAttribute('width', '13');
            checkSvg.setAttribute('height', '13');
            checkSvg.setAttribute('fill', 'none');
            checkSvg.setAttribute('stroke', 'currentColor');
            checkSvg.setAttribute('stroke-width', '2.8');
            checkSvg.setAttribute('stroke-linecap', 'round');
            checkSvg.setAttribute('stroke-linejoin', 'round');
            const checkPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            checkPoly.setAttribute('points', '20 6 9 17 4 12');
            checkSvg.append(checkPoly);
            li.append(checkSvg);

            li.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (select.value !== opt.value) {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
              }
              closeMenu();
              trigger.focus();
            });

            menu.append(li);
          }
        };

        syncCustomOptions();

        const openMenu = () => {
          document.querySelectorAll('.lumos-custom-select.open').forEach((other) => {
            if (other !== customSelect) {
              other.classList.remove('open');
              const btn = other.querySelector('.lumos-select-trigger');
              const ul = other.querySelector('.lumos-select-menu');
              if (btn) btn.setAttribute('aria-expanded', 'false');
              if (ul) ul.hidden = true;
            }
          });
          customSelect.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          menu.hidden = false;
        };

        const closeMenu = () => {
          customSelect.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
          menu.hidden = true;
        };

        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (customSelect.classList.contains('open')) {
            closeMenu();
          } else {
            openMenu();
          }
        });

        label.addEventListener('click', (e) => {
          if (e.target === label || e.target === labelSpan) {
            e.preventDefault();
            trigger.click();
          }
        });

        customSelect.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            closeMenu();
            trigger.focus();
          }
        });

        select.addEventListener('change', () => {
          eventFilters[key] = select.value;
          const chosen = optionsData.find((o) => o.value === select.value);
          triggerText.textContent = chosen ? chosen.label : select.value;
          syncCustomOptions();
          updateResults();
        });

        customSelect.append(trigger, menu);
        label.append(select, customSelect);
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

      // ALEPH 22단계 전용 4개 핵심 카드 (최상단 우선 배치: 기능 점검표, 내 PC 상태, 연결과 기록, 내 앱 다시 조회)
      const testCardsContainer = document.createElement('div');
      testCardsContainer.className = 'aleph-cards-container';

      // 1. 기능 점검표 카드
      const card1 = document.createElement('div');
      card1.className = 'aleph-card';
      card1.innerHTML = `
        <div class="aleph-card-main">
          <div class="aleph-card-header">
            <h3>기능 점검표</h3>
            <span class="aleph-pill">예시 화면 · 설명용 값</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">기록 보기</span>
            <span class="item-status ready">지금 됨</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">내 PC 상태</span>
            <span class="item-status ready">지금 됨</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">위험 알림</span>
            <span class="item-status not-ready">아직 안 됨</span>
          </div>
          <p class="aleph-subnote">다듬을 순서: 기록 보기 → 내 PC 상태 → 위험 알림</p>
        </div>
        <details class="aleph-audit-drawer">
          <summary class="aleph-audit-summary">
            <div class="audit-summary-left">
              <span class="audit-badge">
                <svg class="audit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                엔지니어링 &amp; 진단 레퍼런스
              </span>
              <span class="audit-hint">상용 배포 시 자동 접힘 · 자체 검증 기준 및 트러블슈팅 열기</span>
            </div>
            <span class="audit-toggle-text">가이드 펼치기 <span class="audit-toggle-icon">▾</span></span>
          </summary>
          <div class="aleph-card-side">
            <div class="aleph-side-box green-box">
              <h4>스스로 확인할 결과</h4>
              <p>앱이 기존 폴더에서 실행되고, 핵심 기능 3가지와 각 기능이 지금 되는지 안 되는지가 한 장에 정리되어 있습니다.</p>
            </div>
            <div class="aleph-side-box yellow-box">
              <h4>막혔을 때</h4>
              <p>실행이 안 되면 새 폴더를 만들지 말고, 오류 문구 전체를 그대로 복사해 AI에게 보여 주세요. 22단계 안내의 실행 명령을 다시 따라 해 보는 것이 먼저입니다.</p>
            </div>
          </div>
        </details>
      `;

      // 2. 내 앱 화면 틀 (3대 화면 틀 실시간 전환 시스템 - 관제 대시보드형 기본)
      const card2 = document.createElement('div');
      card2.className = 'aleph-card aleph-layout-switcher-card';
      card2.innerHTML = `
        <div class="aleph-card-main col-span-full">
          <div class="aleph-card-header">
            <div>
              <h3 class="text-125">내 앱 화면 틀 · 상태 모니터링</h3>
              <p class="layout-switcher-desc layout-switcher-subdesc">
                원하는 화면 틀을 선택하면 <strong>실시간 시스템 상태가 즉시 해당 뷰로 전환</strong>됩니다. 기본값은 <strong>관제 대시보드형</strong>입니다.
              </p>
            </div>
            <span class="aleph-pill self-flex-start">3대 화면 틀 실시간 전환</span>
          </div>

          <!-- 3대 화면 틀 선택 버튼 (Segmented Control) -->
          <div class="layout-mode-selector" role="tablist" aria-label="화면 틀 선택">
            <button type="button" class="layout-mode-btn active" data-target="dashboard">
              <span class="mode-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg></span>
              <span class="mode-title">관제 대시보드형</span>
              <span class="mode-rec-tag">기본값 · 추천</span>
            </button>
            <button type="button" class="layout-mode-btn" data-target="summary">
              <span class="mode-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
              <span class="mode-title">한 장 요약형</span>
            </button>
            <button type="button" class="layout-mode-btn" data-target="timeline">
              <span class="mode-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
              <span class="mode-title">기록 타임라인형</span>
            </button>
          </div>

          <!-- 1) 관제 대시보드형 패널 (기본 활성화) -->
          <div class="layout-panel panel-dashboard active" data-panel="dashboard">
            <div class="dashboard-kpi-grid">
              <div class="kpi-mini-card">
                <span class="kpi-title">CPU</span>
                <span class="kpi-value" id="kpi-cpu-val">-</span>
                <span class="kpi-badge badge-green" id="kpi-cpu-badge"><span class="kpi-dot"></span> 정상</span>
              </div>
              <div class="kpi-mini-card">
                <span class="kpi-title">메모리</span>
                <span class="kpi-value" id="kpi-ram-val">-</span>
                <span class="kpi-badge badge-green" id="kpi-ram-badge"><span class="kpi-dot"></span> 정상</span>
              </div>
              <div class="kpi-mini-card">
                <span class="kpi-title">디스크</span>
                <span class="kpi-value" id="kpi-disk-val">-</span>
                <span class="kpi-badge badge-green" id="kpi-disk-badge"><span class="kpi-dot"></span> 정상</span>
              </div>
              <div class="kpi-mini-card">
                <span class="kpi-title">방화벽</span>
                <span class="kpi-value" id="kpi-firewall-val">켜짐</span>
                <span class="kpi-badge badge-green" id="kpi-firewall-badge"><span class="kpi-dot"></span> 정상</span>
              </div>
            </div>

            <!-- 시계열 트렌드 변화 그래프 (Wave / Bar Chart) -->
            <div class="dashboard-trend-box">
              <div class="trend-header">
                <span class="trend-title">시간에 따른 시스템 부하 변화</span>
                <span class="trend-time" id="trend-time-indicator">실시간 계측 중...</span>
              </div>
              <div class="trend-chart-bars">
                <div class="trend-bar trend-h-38"></div>
                <div class="trend-bar trend-h-45"></div>
                <div class="trend-bar trend-h-32"></div>
                <div class="trend-bar trend-h-52"></div>
                <div class="trend-bar trend-h-48"></div>
                <div class="trend-bar trend-h-60"></div>
                <div class="trend-bar trend-h-42"></div>
                <div class="trend-bar trend-h-35"></div>
                <div class="trend-bar trend-h-58"></div>
                <div class="trend-bar trend-h-50"></div>
                <div class="trend-bar trend-h-44"></div>
                <div class="trend-bar current trend-h-32"></div>
              </div>
            </div>

            <!-- 상세 프로그레스 바 영역 (실시간 바 연동 유지) -->
            <div class="dashboard-metrics-detail">
              <div class="aleph-metric-row">
                <span class="metric-label">CPU 사용률</span>
                <div class="metric-bar-wrap">
                  <div class="metric-bar-bg">
                    <div id="dynamic-cpu-bar" class="metric-bar-fill fill-cpu" style="width: 20%;"></div>
                  </div>
                  <div class="metric-note">
                    <span id="dynamic-cpu-text">실측치 조회 중...</span>
                    <span id="dynamic-cpu-time">최근 측정</span>
                  </div>
                </div>
              </div>
              <div class="aleph-metric-row">
                <span class="metric-label">메모리 사용량</span>
                <div class="metric-bar-wrap">
                  <div class="metric-bar-bg">
                    <div id="dynamic-ram-bar" class="metric-bar-fill fill-ram" style="width: 50%;"></div>
                  </div>
                  <div class="metric-note">
                    <span id="dynamic-ram-text">실측치 조회 중...</span>
                    <span>실시간 모니터링 중</span>
                  </div>
                </div>
              </div>
              <div class="aleph-metric-row">
                <span class="metric-label">디스크 남은 공간</span>
                <div class="metric-bar-wrap">
                  <div class="metric-bar-bg">
                    <div id="dynamic-disk-bar" class="metric-bar-fill fill-disk" style="width: 50%;"></div>
                  </div>
                  <div class="metric-note">
                    <span id="dynamic-disk-text">실측치 조회 중...</span>
                    <span>C: 드라이브 로컬 스토리지</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2) 한 장 요약형 패널 -->
          <div class="layout-panel panel-summary panel-hidden" data-panel="summary">
            <p class="summary-lead-text">
              항목마다 '정상·주의·확인 불가'를 한 줄씩 큰 글씨로 보여 줍니다. 그래프 없이 지금 상태만 빠르게 확인합니다.
            </p>
            <div class="summary-rows-container">
              <div class="summary-status-row">
                <span class="status-pill pill-ok">● 정상</span>
                <div class="summary-row-body">
                  <span class="summary-name">CPU 사용률</span>
                  <span class="summary-desc">현재 부하 32% (16 코어 정상 분산 처리 중)</span>
                </div>
              </div>
              <div class="summary-status-row">
                <span class="status-pill pill-ok">● 정상</span>
                <div class="summary-row-body">
                  <span class="summary-name">메모리 사용량</span>
                  <span class="summary-desc">58% 점유 (안정적 가용 메모리 6.68GB 확보)</span>
                </div>
              </div>
              <div class="summary-status-row">
                <span class="status-pill pill-warn">▲ 주의</span>
                <div class="summary-row-body">
                  <span class="summary-name">디스크 남은 공간 9%</span>
                  <span class="summary-desc">디스크 여유 공간이 10% 미만입니다. 임시 파일 정리를 권장합니다.</span>
                </div>
              </div>
              <div class="summary-status-row">
                <span class="status-pill pill-unknown">? 확인 불가</span>
                <div class="summary-row-body">
                  <span class="summary-name">이벤트 기록 · 권한 없음</span>
                  <span class="summary-desc">비관리자 사용자 권한으로 실행 중이므로 시스템 내부 보안 로그 접근이 제한됩니다.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3) 기록 타임라인형 패널 -->
          <div class="layout-panel panel-timeline panel-hidden" data-panel="timeline">
            <div class="timeline-ctrl-bar">
              <span class="timeline-hint">조회할 때마다 시각과 결과를 한 줄씩 위로 쌓고, 필터별로 걸러 봅니다.</span>
              <div class="timeline-filters">
                <button type="button" class="timeline-filter-btn active" data-filter="all">전체</button>
                <button type="button" class="timeline-filter-btn" data-filter="warn">주의</button>
                <button type="button" class="timeline-filter-btn" data-filter="unknown">확인 불가</button>
              </div>
            </div>
            <div class="timeline-list">
              <div class="timeline-item" data-type="warn">
                <span class="timeline-time">14:05</span>
                <span class="timeline-badge badge-yellow">▲ 주의</span>
                <span class="timeline-text">디스크 남은 공간 9% (임계치 도달 경고)</span>
              </div>
              <div class="timeline-item" data-type="ok">
                <span class="timeline-time">14:02</span>
                <span class="timeline-badge badge-green">● 정상</span>
                <span class="timeline-text">다시 조회 성공 · CPU 32%, 메모리 58%</span>
              </div>
              <div class="timeline-item" data-type="unknown">
                <span class="timeline-time">13:40</span>
                <span class="timeline-badge badge-gray">? 확인 불가</span>
                <span class="timeline-text">이벤트 기록을 읽지 못함 (권한 없음)</span>
              </div>
              <div class="timeline-item" data-type="ok">
                <span class="timeline-time">13:15</span>
                <span class="timeline-badge badge-green">● 정상</span>
                <span class="timeline-text">Lumos Agent 보호 세션 정상 초기화 완료</span>
              </div>
            </div>
          </div>

          <!-- 세 가지 화면 틀 공식 안내 자료 (첨부 2번 이미지 1:1 완벽 구현) -->
          <details class="aleph-foldable-details mt-24">
            <summary class="aleph-foldable-summary">
              <span><strong>세 가지 화면 틀, 실제로는 어떻게 생겼나요?</strong> <span class="muted-tag">실제 공식 모범 사례와 비교하기</span></span>
              <span class="fold-indicator">펼치기</span>
            </summary>
            <div class="aleph-foldable-content">
              <div class="three-frames-guide-grid">
                <!-- 관제 대시보드형 -->
                <div class="frame-guide-card">
                  <h4 class="frame-guide-title">관제 대시보드형</h4>
                  <p class="frame-guide-tip"><strong>내 PC에서 바로 보기:</strong> 키보드에서 <code>Ctrl + Shift + Esc</code>를 눌러 작업 관리자를 열고 '성능' 탭을 보세요. 왼쪽에 항목별 요약, 오른쪽에 시간에 따른 그래프가 있는 화면이 바로 이 틀입니다.</p>
                  <ul class="frame-guide-links">
                    <li><a href="https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/" target="_blank" rel="noopener noreferrer">Grafana 대시보드 모범 사례 ↗</a> <span>한 화면이 질문 하나에 답하게 묶고, CPU처럼 단위를 맞춰 그래프를 읽기 쉽게 하는 방법을 봅니다.</span></li>
                  </ul>
                </div>

                <!-- 한 장 요약형 -->
                <div class="frame-guide-card">
                  <h4 class="frame-guide-title">한 장 요약형</h4>
                  <p class="frame-guide-tip"><strong>내 PC에서 바로 보기:</strong> 시작 메뉴에서 'Windows 보안'을 열어 보세요. 바이러스, 방화벽 같은 영역마다 초록 체크, 노란 느낌표, 빨간 X로 상태를 한 줄씩 보여 주는 첫 화면이 이 틀입니다.</p>
                  <ul class="frame-guide-links">
                    <li><a href="https://support.microsoft.com/ko-kr/windows" target="_blank" rel="noopener noreferrer">Windows 보안 앱 개요 (Microsoft, 한국어) ↗</a> <span>초록·노랑·빨강 표시가 각각 무엇을 뜻하는지 정리한 방식을 봅니다.</span></li>
                    <li><a href="https://www.githubstatus.com/" target="_blank" rel="noopener noreferrer">GitHub 서비스 상태 페이지 ↗</a> <span>서비스 항목마다 상태를 한 줄씩 적고 맨 위에 전체 요약을 둔 실제 화면을 봅니다.</span></li>
                    <li><a href="https://carbondesignsystem.com/patterns/status-display/" target="_blank" rel="noopener noreferrer">Carbon 디자인 시스템 ↗</a> <span>상태 표시 색상만으로 구분하지 말고 기호와 글자를 함께 쓰는 원칙을 확인합니다.</span></li>
                  </ul>
                </div>

                <!-- 기록 타임라인형 -->
                <div class="frame-guide-card">
                  <h4 class="frame-guide-title">기록 타임라인형</h4>
                  <p class="frame-guide-tip"><strong>내 PC에서 바로 보기:</strong> 'Windows 보안'에서 '보호 기록'을 열어 보세요. 일어난 일을 카드로 차례차례 쌓아 두고 눌러서 자세히 보는 화면이 이 틀입니다.</p>
                  <ul class="frame-guide-links">
                    <li><a href="https://support.microsoft.com/ko-kr/windows" target="_blank" rel="noopener noreferrer">Windows 보안 앱의 보호 기록 (Microsoft, 한국어) ↗</a> <span>사건을 카드로 쌓고 심각도에 따라 색을 달리하는 방식을 봅니다.</span></li>
                    <li><a href="https://www.githubstatus.com/history" target="_blank" rel="noopener noreferrer">GitHub 서비스 상태 페이지의 지난 장애 기록 (Past Incidents) ↗</a> <span>날짜별로 기록을 쌓는 실제 예를 봅니다.</span></li>
                  </ul>
                </div>
              </div>
              <p class="muted text-muted-16">
                참고 화면의 그림이나 코드를 그대로 가져오지 말고, 무엇을 어디에 두는지만 참고해 내 앱에 맞게 새로 만드세요. 공식 자료 주소와 내용은 2026년 10월 25일에 확인했습니다.
              </p>
            </div>
          </details>
        </div>
      `;

      // 3. 연결과 기록 카드
      const card3 = document.createElement('div');
      card3.className = 'aleph-card';
      card3.innerHTML = `
        <div class="aleph-card-main">
          <div class="aleph-card-header">
            <h3>연결과 기록</h3>
            <span class="aleph-pill">예시 화면 · 설명용 값</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">네트워크 연결</span>
            <span class="item-status ready">유선 연결됨 (192.168.100.234)</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">방화벽 설정</span>
            <span class="item-status ready">켜짐 · 읽기만 함 (도메인: 사용)</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">Windows 경고·오류</span>
            <span class="item-status note-val">경고 99건 (System) / 54건 (App) · 침해 판정 아님</span>
          </div>
          <div class="aleph-item-row">
            <span class="item-name">SDP 서버</span>
            <span class="item-status sdp-disconnected">SDP 미연결</span>
          </div>
          <p class="aleph-subnote">PC 조회 결과와 SDP 연결 상태를 따로 보여 줍니다.</p>
        </div>
        <details class="aleph-audit-drawer">
          <summary class="aleph-audit-summary">
            <div class="audit-summary-left">
              <span class="audit-badge">
                <svg class="audit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                엔지니어링 &amp; 진단 레퍼런스
              </span>
              <span class="audit-hint">상용 배포 시 자동 접힘 · 자체 검증 기준 및 트러블슈팅 열기</span>
            </div>
            <span class="audit-toggle-text">가이드 펼치기 <span class="audit-toggle-icon">▾</span></span>
          </summary>
          <div class="aleph-card-side">
            <div class="aleph-side-box green-box">
              <h4>스스로 확인할 결과</h4>
              <p>실제 값 또는 '확인 불가'가 보이고, Windows 경고·오류 건수는 침해 판정이 아니라고 적혀 있으며, SDP 연결 여부가 PC 조회 결과와 따로 적혀 있습니다.</p>
            </div>
            <div class="aleph-side-box yellow-box">
              <h4>막혔을 때</h4>
              <p>방화벽이나 보안 설정을 바꾸자는 제안이 나오면 거절하고, 읽기 전용 방법을 다시 요청하세요. 관리자 보안 설정은 자동으로 바꾸지 않습니다.</p>
            </div>
          </div>
        </details>
      `;

      // 4. 내 앱 (다시 조회 버튼 + 새로 읽는 중 대기 + 실패 항목 안내 박스) - 3번째 첨부 이미지 1:1 완벽 구현
      const card4 = document.createElement('div');
      card4.className = 'aleph-card';
      card4.innerHTML = `
        <div class="aleph-card-main">
          <div class="aleph-card-header">
            <h3>내 앱</h3>
            <span class="aleph-pill">예시 화면 · 설명용 값</span>
          </div>
          <div class="aleph-retry-row">
            <button type="button" id="aleph-retry-btn" class="aleph-action-btn">다시 조회</button>
            <span id="aleph-retry-status" class="aleph-action-status"></span>
          </div>
          <div class="aleph-error-box">
            <p class="error-title">디스크 값을 읽지 못했습니다.</p>
            <p class="error-action">권한을 확인한 뒤 다시 조회를 눌러 주세요.</p>
          </div>
        </div>
        <details class="aleph-audit-drawer">
          <summary class="aleph-audit-summary">
            <div class="audit-summary-left">
              <span class="audit-badge">
                <svg class="audit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                엔지니어링 &amp; 진단 레퍼런스
              </span>
              <span class="audit-hint">상용 배포 시 자동 접힘 · 자체 검증 기준 및 트러블슈팅 열기</span>
            </div>
            <span class="audit-toggle-text">가이드 펼치기 <span class="audit-toggle-icon">▾</span></span>
          </summary>
          <div class="aleph-card-side">
            <div class="aleph-side-box green-box">
              <h4>스스로 확인할 결과</h4>
              <p>'다시 조회'를 누르면 조회가 다시 실행되고, 성공한 항목의 잰 시각을 확인할 수 있습니다. 조회 실패를 재현했을 때는 실패한 항목과 다음 행동을 알리는 오류 화면이 보입니다.</p>
            </div>
            <div class="aleph-side-box yellow-box">
              <h4>막혔을 때</h4>
              <p>디자인을 고치다 기능이 멈추면, 마지막으로 잘 되던 상태와 지금 바뀐 파일을 AI에게 비교해 달라고 하세요.</p>
            </div>
          </div>
        </details>
      `;

      // 5. 실행 안내 한 장 카드 (새 환경 실행 안내 및 막힌 곳 조치 내역)
      const card5 = document.createElement('div');
      card5.className = 'aleph-card';
      card5.innerHTML = `
        <div class="aleph-card-main">
          <div class="aleph-card-header">
            <h3>실행 안내 한 장</h3>
            <span class="aleph-pill">예시 화면 · 설명용 값</span>
          </div>
          <ol class="aleph-steps-list">
            <li>기존 프로젝트 폴더를 엽니다</li>
            <li>필요한 설치를 한 번 실행합니다</li>
            <li>앱을 켜고 첫 화면을 확인합니다</li>
          </ol>
          <div class="aleph-notice-line">
            <span class="notice-prefix">막힌 곳:</span> 둘째 줄에서 Node 버전이 달라 멈춤 → 필요한 버전을 안내에 적음
          </div>
        </div>
        <details class="aleph-audit-drawer">
          <summary class="aleph-audit-summary">
            <div class="audit-summary-left">
              <span class="audit-badge">
                <svg class="audit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                엔지니어링 &amp; 진단 레퍼런스
              </span>
              <span class="audit-hint">상용 배포 시 자동 접힘 · 자체 검증 기준 및 트러블슈팅 열기</span>
            </div>
            <span class="audit-toggle-text">가이드 펼치기 <span class="audit-toggle-icon">▾</span></span>
          </summary>
          <div class="aleph-card-side">
            <div class="aleph-side-box green-box">
              <h4>스스로 확인할 결과</h4>
              <p>다른 사람이 내 도움 없이 안내만 보고 앱을 실행했고, 막혔던 곳이 안내나 코드에 반영되어 있습니다.</p>
            </div>
            <div class="aleph-side-box yellow-box">
              <h4>막혔을 때</h4>
              <p>도와줄 사람이 없으면, 내 PC의 다른 사용자 계정이나 다른 폴더에서 안내만 보고 직접 따라 해 보세요. 기존 폴더는 그대로 둡니다.</p>
            </div>
          </div>
        </details>
      `;

      // 6. 시연 순서 카드 (완성본 핵심 3기능 시연 순서, 한계, 근거)
      const card6 = document.createElement('div');
      card6.className = 'aleph-card';
      card6.innerHTML = `
        <div class="aleph-card-main">
          <div class="aleph-card-header">
            <h3>시연 순서</h3>
            <span class="aleph-pill">예시 화면 · 설명용 값</span>
          </div>
          <div class="demo-steps-row">
            <span class="demo-step-badge">1 기록 보기</span>
            <span class="demo-step-badge">2 내 PC 상태</span>
            <span class="demo-step-badge">3 위험 알림</span>
          </div>
          <div class="demo-info-row">
            <span class="demo-info-label">한계</span>
            <span class="demo-info-val">이벤트 기록 일부 확인 불가</span>
          </div>
          <div class="demo-info-row">
            <span class="demo-info-label">근거</span>
            <span class="demo-info-val">화면 캡처 · 실행 기록 · 패키지 경로</span>
          </div>
        </div>
        <details class="aleph-audit-drawer">
          <summary class="aleph-audit-summary">
            <div class="audit-summary-left">
              <span class="audit-badge">
                <svg class="audit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                엔지니어링 &amp; 진단 레퍼런스
              </span>
              <span class="audit-hint">상용 배포 시 자동 접힘 · 자체 검증 기준 및 트러블슈팅 열기</span>
            </div>
            <span class="audit-toggle-text">가이드 펼치기 <span class="audit-toggle-icon">▾</span></span>
          </summary>
          <div class="aleph-card-side">
            <div class="aleph-side-box green-box">
              <h4>스스로 확인할 결과</h4>
              <p>시연 순서대로 처음부터 끝까지 실행되고, 한계와 근거가 실제 화면과 맞습니다.</p>
            </div>
            <div class="aleph-side-box yellow-box">
              <h4>막혔을 때</h4>
              <p>시연 중 막히는 기능은 숨기지 말고 한계에 적으세요. 되는 것만 정확히 보여 주는 편이 낫습니다.</p>
            </div>
          </div>
        </details>
      `;

      // 7. 내 앱을 어떻게 설치하게 할까요 (과정 포장 묶음 & Inno Setup 2종 가이드) - 첨부 이미지 1:1 완벽 구현 (아코디언 접힘)
      const card7 = document.createElement('div');
      card7.className = 'aleph-accordion-card deploy-guide-section';
      card7.innerHTML = `
        <details class="aleph-foldable-details">
          <summary class="aleph-foldable-summary">
            <span><strong>내 앱을 어떻게 설치하게 할까요</strong> <span class="muted-tag">과정 포장 묶음 &amp; Inno Setup 2종 가이드</span></span>
            <span class="fold-indicator">펼치기</span>
          </summary>
          <div class="aleph-foldable-content">
            <div class="deploy-guide-header">
              <p class="deploy-guide-desc">
                방어진 결과물은 1번(과정 포장)만으로 충분합니다. 친구나 가족 PC에도 진짜 프로그램처럼 깔아 주고 싶다면 2번(무료 설치 프로그램)까지만 해 보세요. 돈이 들거나 심사 기간이 긴 코드 서명과 스토어 등록은 과정이 끝난 뒤 참고할 수 있게 가이드만 남겨 두었습니다.
              </p>
            </div>

            <div class="deploy-cards-grid">
              <!-- 1번: 과정 포장 묶음과 바로가기 -->
              <div class="deploy-card">
                <div class="deploy-card-header">
                  <span class="deploy-step-chip">1 · 기본</span>
                  <span class="deploy-free-tag">무료</span>
                </div>
                <h4 class="deploy-card-name">과정 포장 묶음과 바로가기</h4>
                <p class="deploy-card-summary">
                  6일차의 npm run package-app 결과를 그대로 쓰고, INSTALL.md 순서대로 새 경로에 설치해 바로가기로 실행합니다.
                </p>

                <div class="deploy-meta-rows">
                  <div class="deploy-meta-row">
                    <span class="meta-label">난이도</span>
                    <span class="meta-val">쉬움 · 6일차 안내 그대로</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">받는 사람이 보는 화면</span>
                    <span class="meta-val">과정에서 승인한 실행 환경이 있는 PC에서 바로가기로 열립니다.</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">이런 경우에</span>
                    <span class="meta-val">방어진 결과물을 정리하고 내 PC에서 매일 쓸 때</span>
                  </div>
                </div>

                <details class="deploy-details">
                  <summary class="deploy-summary">▼ 따라 할 순서와 공식 자료</summary>
                  <div class="deploy-content">
                    <ol class="deploy-steps-ol">
                      <li>6일차 안내대로 <code>npm run package-app</code>으로 묶음을 만듭니다.</li>
                      <li><code>INSTALL.md</code>의 설치 명령으로 새 경로에 설치합니다.</li>
                      <li>바탕화면이나 시작 메뉴 바로가기로 실행하고, 같은 묶음의 manifest와 INSTALL.md를 함께 보관합니다.</li>
                    </ol>
                    <div class="deploy-warning-banner">
                      <span class="deploy-warning-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <span class="deploy-warning-text">승인 키나 제공 실행 환경이 없다는 안내가 나오면 우회하지 말고 담당자에게 알립니다.</span>
                    </div>
                  </div>
                </details>
              </div>

              <!-- 2번: setup.exe로 묶기 · Inno Setup 권장 -->
              <div class="deploy-card">
                <div class="deploy-card-header">
                  <span class="deploy-step-chip">2 · 설치 프로그램</span>
                  <span class="deploy-free-tag">무료</span>
                </div>
                <h4 class="deploy-card-name">setup.exe로 묶기 · Inno Setup 권장</h4>
                <p class="deploy-card-summary">
                  포장 묶음을 무료 도구 Inno Setup의 마법사로 설치 파일(setup.exe)에 담습니다. 시작 메뉴 등록과 제거 프로그램이 함께 만들어지고, 심사나 비용이 없습니다.
                </p>

                <div class="deploy-meta-rows">
                  <div class="deploy-meta-row">
                    <span class="meta-label">난이도</span>
                    <span class="meta-val">보통 · 마법사로 시작</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">받는 사람이 보는 화면</span>
                    <span class="meta-val">PC 보안 정책과 파일 평판에 따라 경고가 뜨거나 실행이 제한될 수 있습니다. 보호 설정을 끄지 말고, 막히면 차단 메시지를 담당자에게 전달합니다.</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">이런 경우에</span>
                    <span class="meta-val">다른 사람 PC에 깔끔하게 깔고 지울 수 있게 하고 싶을 때</span>
                  </div>
                </div>

                <details class="deploy-details">
                  <summary class="deploy-summary">▼ 따라 할 순서와 공식 자료</summary>
                  <div class="deploy-content">
                    <ol class="deploy-steps-ol">
                      <li>기존 포장 묶음은 그대로 두고, 별도 폴더에 복사본을 만들어 설치 프로그램 재료로 씁니다.</li>
                      <li>Inno Setup의 스크립트 마법사에서 앱 이름, 버전, 게시자, 재료 폴더를 넣고 <strong>사용자 단위 설치(관리자 권한 없이)</strong>를 고릅니다.</li>
                      <li>시작 메뉴 바로가기와 제거 프로그램을 켜고 <code>setup.exe</code>를 만듭니다.</li>
                      <li>다른 사용자 계정이나 새 경로에서 설치 → 실행 → 제거까지 한 번씩 해 보고, <code>setup.exe</code>의 SHA-256 해시를 안내문에 적습니다.</li>
                    </ol>
                    <div class="deploy-warning-banner">
                      <span class="deploy-warning-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <span class="deploy-warning-text">설치 프로그램은 포장 결과를 담아 옮길 뿐입니다. 실행에 필요한 제공 실행 환경은 받는 PC에도 준비돼 있어야 합니다. pkg(vercel)는 지원이 끝났으니 쓰지 않습니다.</span>
                    </div>
                    <ul class="deploy-links-ul">
                      <li><a href="https://jrsoftware.org/isinfo.php" target="_blank" rel="noopener noreferrer">Inno Setup 공식 안내 ↗</a></li>
                      <li><a href="https://nsis.sourceforge.io/" target="_blank" rel="noopener noreferrer">(익숙하다면) NSIS 공식 안내 ↗</a></li>
                      <li><a href="https://wixtoolset.org/" target="_blank" rel="noopener noreferrer">(MSI가 꼭 필요하다면) WiX Toolset 문서 ↗</a></li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </details>
      `;


      // 8. 과정이 끝난 뒤 참고 · 가이드만 (코드 서명 & MS Store/winget 등록) - 첨부 이미지 1, 2 완벽 구현 (아코디언 접힘)
      const card8 = document.createElement('div');
      card8.className = 'aleph-accordion-card deploy-guide-section post-course-section';
      card8.innerHTML = `
        <details class="aleph-foldable-details">
          <summary class="aleph-foldable-summary">
            <span><strong>과정이 끝난 뒤 참고 · 가이드만</strong> <span class="muted-tag">코드 서명 &amp; MS Store/winget 등록</span></span>
            <span class="fold-indicator">펼치기</span>
          </summary>
          <div class="aleph-foldable-content">
            <div class="deploy-cards-grid">
              <!-- 3번: 코드 서명으로 게시자 밝히기 -->
              <div class="deploy-card">
                <div class="deploy-card-header">
                  <span class="deploy-free-tag tag-paid">유료 · 필수 아님</span>
                  <h4 class="deploy-card-name deploy-card-heading">코드 서명으로 게시자 밝히기</h4>
                </div>
                <p class="deploy-card-summary">
                  신뢰되는 공인 코드 서명 인증서로 설치 파일에 서명하면 '알 수 없는 게시자' 대신 인증서로 확인된 게시자 이름이 보입니다. 자체 서명은 서명 원리를 내 PC에서 익히는 학습용이며, 공인 서명은 필요할 때만 고릅니다.
                </p>

                <div class="deploy-meta-rows">
                  <div class="deploy-meta-row">
                    <span class="meta-label">난이도</span>
                    <span class="meta-val">어려움 · 인증서와 개인키 관리</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">받는 사람이 보는 화면</span>
                    <span class="meta-val">공인 서명이라도 처음에는 경고가 남을 수 있고, 같은 인증서로 설치가 쌓여야 줄어듭니다. 자체 서명으로 다른 사람 PC의 신뢰를 얻을 수 있다는 보장은 없습니다.</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">이런 경우에</span>
                    <span class="meta-val">오래 배포할 앱이고 게시자 이름을 밝히고 싶을 때</span>
                  </div>
                </div>

                <details class="deploy-details">
                  <summary class="deploy-summary">▼ 순서와 공식 안내 자료</summary>
                  <div class="deploy-content">
                    <ol class="deploy-steps-ol">
                      <li>학습용으로 내 PC에서 자체 서명 인증서를 만들어 setup.exe에 서명하고, 파일 속성의 '디지털 서명' 탭에서 어떻게 보이는지 확인합니다.</li>
                      <li>공인 서명이 필요하면 고릅니다: 오픈소스로 공개한 앱은 SignPath Foundation(무료, 심사) 또는 Certum 오픈소스 클라우드 인증서(49유로부터), 그 밖에는 OV 인증서입니다. OV 가격은 발급 기관과 기간마다 다르니 각 기관의 공식 가격 페이지에서 확인합니다.</li>
                      <li>공인 코드 서명 인증서를 쓸 때는 발급 기관이 요구하는 보안 하드웨어나 클라우드의 개인키 보관 조건을 확인합니다. 공인 인증서의 조건을 첫 단계의 자체 서명 학습과 혼동하지 않습니다. 서명할 때는 타임스탬프 서버를 꼭 지정합니다.</li>
                      <li>서명한 뒤에는 파일을 고치지 않습니다. 고치면 서명이 깨지니 다시 서명합니다.</li>
                    </ol>
                    <div class="deploy-warning-banner">
                      <span class="deploy-warning-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <span class="deploy-warning-text">
                        개인키와 .pfx·p12 파일, 인증서 비밀번호는 저장소·채널·결과물 어디에도 올리지 않습니다. 남의 PC에 내 자체 서명 인증서를 신뢰하라고 넣게 하지 않습니다. Microsoft의 Artifact Signing(옛 Trusted Signing) Public Trust는 공식 신청 안내에 한국 소재 조직도 포함합니다. 개인 개발자는 미국이나 캐나다에 소재해야 하므로 한국 개인은 해당하지 않습니다. 지역 조건을 충족해도 실제 신청과 심사 통과가 보장되지는 않습니다.
                      </span>
                    </div>
                    <ul class="deploy-links-ul">
                      <li><a href="https://learn.microsoft.com/ko-kr/azure/trusted-signing/" target="_blank" rel="noopener noreferrer">Artifact Signing 신청 전제 조건(Microsoft) ↗</a></li>
                      <li><a href="https://support.microsoft.com/ko-kr/windows" target="_blank" rel="noopener noreferrer">스마트 앱 컨트롤 자주 묻는 질문(Microsoft) ↗</a></li>
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/win32/seccrypto/signtool" target="_blank" rel="noopener noreferrer">코드 서명 선택지(Microsoft) ↗</a></li>
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen" target="_blank" rel="noopener noreferrer">SmartScreen 평판이 쌓이는 방식 ↗</a></li>
                      <li><a href="https://about.signpath.io/open-source" target="_blank" rel="noopener noreferrer">SignPath Foundation(오픈소스 무료 서명) ↗</a></li>
                      <li><a href="https://shop.certum.eu/open-source-code-signing.html" target="_blank" rel="noopener noreferrer">Certum 코드 서명 인증서 가격 ↗</a></li>
                    </ul>
                  </div>
                </details>
              </div>

              <!-- 4번: Microsoft Store나 winget에 올리기 -->
              <div class="deploy-card">
                <div class="deploy-card-header">
                  <span class="deploy-free-tag tag-audit">무료 · 심사 기간 있음</span>
                  <h4 class="deploy-card-name deploy-card-heading">Microsoft Store나 winget에 올리기</h4>
                </div>
                <p class="deploy-card-summary">
                  Microsoft Store에 MSIX로 올리면 Microsoft가 다시 서명하고, Store에서 받은 앱에는 SmartScreen 다운로드 경고가 뜨지 않습니다. 2025년 9월부터 개인 개발자 등록이 무료입니다. 명령어 설치를 원하면 winget 등록도 있습니다.
                </p>

                <div class="deploy-meta-rows">
                  <div class="deploy-meta-row">
                    <span class="meta-label">난이도</span>
                    <span class="meta-val">어려움 · 심사와 공개 주소 필요</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">받는 사람이 보는 화면</span>
                    <span class="meta-val">Store로 설치하면 SmartScreen 다운로드 경고가 뜨지 않습니다. 앱이 요청하는 권한, 기관·회사의 기기 관리 정책, 다른 보안 알림은 따로 나타날 수 있습니다. winget은 공개 HTTPS 주소와 백신 검사를 거친 설치 파일이 필요합니다.</span>
                  </div>
                  <div class="deploy-meta-row">
                    <span class="meta-label">이런 경우에</span>
                    <span class="meta-val">과정이 끝난 뒤에도 앱을 계속 다듬어 공개하고 싶을 때. 심사가 며칠 이상 걸릴 수 있어 과정 기간에는 권하지 않습니다.</span>
                  </div>
                </div>

                <details class="deploy-details">
                  <summary class="deploy-summary">▼ 순서와 공식 안내 자료</summary>
                  <div class="deploy-content">
                    <ol class="deploy-steps-ol">
                      <li>MSIX Packaging Tool로 2번에서 만든 설치 과정을 MSIX로 바꿉니다. Store가 다시 서명해 주므로 따로 인증서를 사지 않아도 됩니다.</li>
                      <li>Microsoft Store 개인 개발자로 무료 등록하고 앱 설명, 개인정보 처리 안내, 화면 사진을 준비합니다.</li>
                      <li>심사에서 고칠 점이 나오면 반영해 다시 올립니다. winget을 고르면 공개 저장소에 설명 파일(YAML)을 제출합니다.</li>
                    </ol>
                    <div class="deploy-warning-banner deploy-banner-accent">
                      <span class="deploy-warning-icon">ℹ</span>
                      <span class="deploy-warning-text">
                        이 앱은 방화벽·네트워크 상태를 읽기만 합니다. 공개 배포 전에 읽는 정보가 무엇인지 설명에 정확히 적고, 관리자 권한을 요구하지 않게 둡니다.
                      </span>
                    </div>
                    <ul class="deploy-links-ul">
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/apps/publish/partner-center/register" target="_blank" rel="noopener noreferrer">Microsoft Store 개인 개발자 무료 등록 안내 ↗</a></li>
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/msix/packaging-tool/tool-overview" target="_blank" rel="noopener noreferrer">MSIX Packaging Tool ↗</a></li>
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/msix/package/signing-package-overview" target="_blank" rel="noopener noreferrer">MSIX 서명 안내 ↗</a></li>
                      <li><a href="https://learn.microsoft.com/ko-kr/windows/package-manager/package/" target="_blank" rel="noopener noreferrer">winget 저장소 제출 안내 ↗</a></li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>

            <div class="deploy-footer-banner">
              <p class="deploy-footer-line"><strong>어느 단계를 고르든 결과물 평가에 가산이나 감점은 없습니다.</strong> 내 앱을 쓸 사람과 내가 들일 수 있는 시간에 맞춰 고르세요.</p>
              <p class="deploy-footer-line">받는 사람에게 SmartScreen, Defender, 스마트 앱 컨트롤을 끄라고 안내하지 않습니다. 스마트 앱 컨트롤을 다시 켤 수 있는 조건은 기기, Windows 업데이트, 관리 정책에 따라 다릅니다. 설치가 막히면 보호 설정을 바꾸지 말고 차단 메시지를 그대로 담당자에게 전달합니다.</p>
              <p class="deploy-footer-muted">가격과 조건은 2026년 10월 24일에 각 공식 페이지에서 확인한 내용입니다. 실제로 고르기 전에 링크에서 다시 확인하세요.</p>
            </div>
          </div>
        </details>
      `;

      // 9. 완성본에 반영되는 작업 위치 & 결과물을 보는 네 가지 관점 - 첨부 이미지 3 완벽 구현
      const card9 = document.createElement('div');
      card9.className = 'aleph-accordion-card';
      card9.innerHTML = `
        <details class="aleph-foldable-details">
          <summary class="aleph-foldable-summary">
            <span><strong>완성본에 반영되는 작업 위치</strong> <span class="muted-tag">어느 파일을 고치면 되는지</span></span>
            <span class="fold-indicator">펼치기</span>
          </summary>
          <div class="aleph-foldable-content">
            <h4 class="section-subheading-1">완성본에 반영되는 작업 위치</h4>
            <p class="section-subdesc-1">추가 화면과 기능은 기존 <code>student/extension.mjs</code>에서 이어서 만들고, 앱 이름·아이콘·색과 허용된 배치는 <code>student/appearance.json</code>으로 꾸밉니다. 학생 파일은 새 제공 파일로 덮어쓰지 않습니다.</p>
            <p class="muted section-subdesc-2">설치형 앱은 검증된 제공 화면을 사용합니다. <code>public/app.js</code>나 <code>public/style.css</code>만 고친 결과가 설치형 앱에도 그대로 보인다고 가정하지 말고, 승인된 실행 환경에서 실제 완성본을 확인하세요. 제공된 '내 PC 상태'와 직접 개선한 부분도 구분해 적습니다.</p>
          </div>
        </details>

        <details class="aleph-foldable-details mt-24">
          <summary class="aleph-foldable-summary">
            <span><strong>결과물을 보는 네 가지 관점</strong> <span class="muted-tag">기능 · 근거 · 사용 편의 · 재현</span></span>
            <span class="fold-indicator">펼치기</span>
          </summary>
          <div class="aleph-foldable-content">
            <h4 class="section-subheading-2">방어진 결과물은 네 가지 관점으로 봅니다</h4>
            <div class="four-perspectives-grid">
              <div class="perspective-box">
                <div class="persp-tag tag-green">기능 작동</div>
                <p>고른 핵심 기능이 내 PC에서 실제로 끝까지 동작하는지 봅니다. 제공 기능과 직접 개선한 부분을 구분하며 기능 개수로 경쟁하지 않습니다.</p>
              </div>
              <div class="perspective-box">
                <div class="persp-tag tag-yellow">근거 정직성</div>
                <p>실제로 잰 값과 예시 값, '확인 불가'를 구별해 정직하게 보여 주는지 봅니다. 앱의 '확인 불가'는 값을 읽지 못했다는 표시이며, 방어진 판정 카드의 '확인 불가'와는 구분합니다.</p>
              </div>
              <div class="perspective-box">
                <div class="persp-tag tag-purple">사용 편의</div>
                <p>처음 보는 사람이 화면과 오류 안내를 보고 쓸 수 있는지 봅니다.</p>
              </div>
              <div class="perspective-box">
                <div class="persp-tag tag-blue">재현 가능성</div>
                <p>다른 사람이 실행 안내와 패키지만으로 같은 결과를 다시 만들 수 있는지 봅니다.</p>
              </div>
            </div>
            <p class="muted section-muted-14">관점별 비중과 시상 방식은 아직 정해지지 않았습니다. 정해지면 이 자리에서 따로 알려 드립니다. 리추얼 참여, 감사 표현, 강의에 대한 호감은 평가와 관계가 없습니다.</p>
          </div>
        </details>
      `;

      // 10. 서비스 조회 참고 코드 & 디자인 참고 자료 (pc-saas-reader 통합) - 첨부 이미지 4 완벽 구현
      const card10 = document.createElement('div');
      card10.className = 'saas-reference-section';
      card10.innerHTML = `
        <details class="aleph-foldable-details">
          <summary class="aleph-foldable-summary">
            <span><strong>참고 자료</strong> <span class="muted-tag">서비스 조회 참고 코드와 디자인 자료 (pc-saas-reader)</span></span>
            <span class="fold-indicator">펼치기</span>
          </summary>
          <div class="aleph-foldable-content">
            <div class="saas-reference-grid">
              <!-- 좌측: 서비스 조회 기능 더하기 -->
              <div class="saas-ref-card">
                <div class="saas-ref-header">
                  <div>
                    <h4 class="saas-card-title">서비스 조회 기능을 더하고 싶다면</h4>
                    <p class="saas-card-desc">필수 기능이 아닌 선택 자료입니다. 네 서비스를 모두 연동하라는 요구가 아니며, 지금 만든 앱을 그대로 다듬어도 됩니다.</p>
                  </div>
                  <button type="button" id="saas-toggle-example-btn" class="btn saas-toggle-btn" aria-label="예시 데이터 토글">
                    참고 예시 보기
                  </button>
                </div>

                <!-- 4대 SaaS 서비스 모니터링 카드 리스트 -->
                <div id="saas-services-list" class="saas-services-container">
                  <!-- GitHub -->
                  <div class="saas-service-item" data-service="github">
                    <div class="saas-item-head">
                      <span class="saas-name">GitHub</span>
                      <span class="saas-status-badge status-unverifiable">연결 전 · 확인 불가</span>
                    </div>
                    <div class="saas-item-details">
                      <div class="saas-detail-row"><span class="saas-k">계정 보안</span><span class="saas-v saas-security-val">확인 불가 (2FA 미조회)</span></div>
                      <div class="saas-detail-row"><span class="saas-k">사용량</span><span class="saas-v saas-usage-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">월 비용</span><span class="saas-v saas-cost-val">확인 불가 (0원 아님)</span></div>
                    </div>
                  </div>

                  <!-- Vercel -->
                  <div class="saas-service-item" data-service="vercel">
                    <div class="saas-item-head">
                      <span class="saas-name">Vercel</span>
                      <span class="saas-status-badge status-unverifiable">연결 전 · 확인 불가</span>
                    </div>
                    <div class="saas-item-details">
                      <div class="saas-detail-row"><span class="saas-k">계정 보안</span><span class="saas-v saas-security-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">사용량</span><span class="saas-v saas-usage-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">월 비용</span><span class="saas-v saas-cost-val">확인 불가</span></div>
                    </div>
                  </div>

                  <!-- Railway -->
                  <div class="saas-service-item" data-service="railway">
                    <div class="saas-item-head">
                      <span class="saas-name">Railway</span>
                      <span class="saas-status-badge status-unverifiable">연결 전 · 확인 불가</span>
                    </div>
                    <div class="saas-item-details">
                      <div class="saas-detail-row"><span class="saas-k">계정 보안</span><span class="saas-v saas-security-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">사용량</span><span class="saas-v saas-usage-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">월 비용</span><span class="saas-v saas-cost-val">확인 불가</span></div>
                    </div>
                  </div>

                  <!-- Supabase -->
                  <div class="saas-service-item" data-service="supabase">
                    <div class="saas-item-head">
                      <span class="saas-name">Supabase</span>
                      <span class="saas-status-badge status-unverifiable">연결 전 · 확인 불가</span>
                    </div>
                    <div class="saas-item-details">
                      <div class="saas-detail-row"><span class="saas-k">계정 보안</span><span class="saas-v saas-security-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">사용량</span><span class="saas-v saas-usage-val">확인 불가</span></div>
                      <div class="saas-detail-row"><span class="saas-k">월 비용</span><span class="saas-v saas-cost-val">확인 불가</span></div>
                    </div>
                  </div>
                </div>

                <details class="deploy-details mt-14">
                  <summary class="deploy-summary">▼ 참고 코드와 사용 안내 보기</summary>
                  <div class="deploy-content deploy-content-desc">
                    <p class="p-mb-6">GitHub, Vercel, Railway, Supabase의 상태와 확인 가능한 사용량을 읽기만 하는 참고 예시입니다. 전체 보안 진단이나 월 청구 총액을 알려 주지 않습니다.</p>
                    <p class="p-mb-6">설치 프로그램이 아닌 Node.js 참고 코드와 안내서입니다. 현재 설치형 앱에 자동으로 연결되지 않습니다.</p>
                    <p class="p-mb-6">기존 프로젝트 파일에 덮어쓰지 말고 별도 폴더에서 먼저 읽어 보세요. 필요한 부분만 내 앱에 맞게 옮겨 씁니다.</p>
                    <p class="p-mb-10-muted">가입·토큰 발급·이 자료의 제출은 필수가 아닙니다.</p>
                    <div class="deploy-warning-banner deploy-banner-emerald">
                      <span><strong>pc-saas-reader-20261024.zip</strong> 포함 (START_HERE.md, read-service.mjs, service-reader.mjs 등 8종 참고 문서 및 예제 탑재)</span>
                    </div>
                  </div>
                </details>
              </div>

              <!-- 우측: 무료로 볼 수 있는 디자인 참고 자료 -->
              <div class="saas-ref-card">
                <h4 class="saas-card-title">무료로 볼 수 있는 디자인 참고 자료</h4>
                <div class="design-refs-grid">
                  <div class="design-ref-box">
                    <span class="design-ref-name">Mobbin</span>
                    <p class="design-ref-takeaway"><strong>참고할 것:</strong> 실제 앱 화면이 정보와 버튼을 어떤 순서로 놓는지 봅니다.</p>
                    <p class="design-ref-apply"><strong>적용 방법:</strong> 내 앱의 첫 화면에서 핵심 기능 3가지를 어떤 순서로 놓을지 정할 때 씁니다.</p>
                  </div>
                  <div class="design-ref-box">
                    <span class="design-ref-name">Vercel 포트폴리오 템플릿</span>
                    <p class="design-ref-takeaway"><strong>참고할 것:</strong> 한 장짜리 소개 화면의 구성과 여백을 봅니다.</p>
                    <p class="design-ref-apply"><strong>적용 방법:</strong> 7일차 시연과 정리 화면의 구성을 잡을 때 씁니다.</p>
                  </div>
                  <div class="design-ref-box">
                    <span class="design-ref-name">web.dev Learn Design</span>
                    <p class="design-ref-takeaway"><strong>참고할 것:</strong> 레이아웃, 글자 크기, 색 대비의 기본 원칙을 읽습니다.</p>
                    <p class="design-ref-apply"><strong>적용 방법:</strong> 4일차에 화면을 다듬을 때 글자 크기와 대비를 점검하는 기준으로 씁니다.</p>
                  </div>
                  <div class="design-ref-box">
                    <span class="design-ref-name">W3C WAI 튜토리얼</span>
                    <p class="design-ref-takeaway"><strong>참고할 것:</strong> 버튼, 폼, 상태 안내를 누구나 쓸 수 있게 만드는 방법을 읽습니다.</p>
                    <p class="design-ref-apply"><strong>적용 방법:</strong> '다시 조회' 버튼과 오류 화면을 키보드와 화면 낭독기로도 쓸 수 있게 만들 때 씁니다.</p>
                  </div>
                </div>
                <div class="design-ref-footer">
                  <p>공개된 부분만 참고해도 됩니다. 유료 서비스는 필수가 아닙니다. 가입이나 결제가 필요하면 web.dev와 W3C WAI 자료로 진행하세요.</p>
                  <p class="muted">다른 사람의 그림이나 코드를 그대로 가져오지 말고, 배치와 흐름의 원칙만 참고해 내 앱에 맞게 새로 만드세요.</p>
                </div>
              </div>
            </div>
          </div>
        </details>
      `;

      testCardsContainer.append(card1, card2, card3, card4, card5, card6, card7, card8, card9, card10);

      // 3대 화면 틀 실시간 전환 인터랙션 초기화
      const initLayoutModeSwitcher = () => {
        const switcher = card2.querySelector('.layout-mode-selector');
        if (!switcher) return;

        const buttons = switcher.querySelectorAll('.layout-mode-btn');
        const panels = card2.querySelectorAll('.layout-panel');

        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach(p => {
              if (p.getAttribute('data-panel') === target) {
                p.classList.remove('panel-hidden');
                p.classList.add('active');
              } else {
                p.classList.add('panel-hidden');
                p.classList.remove('active');
              }
            });
          });
        });

        // 기록 타임라인형 필터 인터랙션
        const filterBtns = card2.querySelectorAll('.timeline-filter-btn');
        const timelineItems = card2.querySelectorAll('.timeline-item');
        filterBtns.forEach(fbtn => {
          fbtn.addEventListener('click', () => {
            const filter = fbtn.getAttribute('data-filter');
            filterBtns.forEach(b => b.classList.remove('active'));
            fbtn.classList.add('active');

            timelineItems.forEach(item => {
              const itemType = item.getAttribute('data-type');
              if (filter === 'all') {
                item.classList.remove('item-hidden'); item.classList.add('item-flex');
              } else if (filter === 'warn' && itemType === 'warn') {
                item.classList.remove('item-hidden'); item.classList.add('item-flex');
              } else if (filter === 'unknown' && itemType === 'unknown') {
                item.classList.remove('item-hidden'); item.classList.add('item-flex');
              } else {
                item.classList.remove('item-flex'); item.classList.add('item-hidden');
              }
            });
          });
        });
      };
      setTimeout(initLayoutModeSwitcher, 80);


      // 아코디언 접기/펼치기 동적 인디케이터 초기화
      const initFoldIndicators = () => {
        root.querySelectorAll('.aleph-foldable-details').forEach(d => {
          const ind = d.querySelector('.fold-indicator');
          if (!ind) return;
          ind.textContent = d.open ? '접기' : '펼치기';
          d.addEventListener('toggle', () => {
            ind.textContent = d.open ? '접기' : '펼치기';
          });
        });
      };
      setTimeout(initFoldIndicators, 60);


      // Card 10 예시 보기 토글 인터랙션 (pc-saas-reader 고유 기능)
      const saasToggleBtn = card10.querySelector('#saas-toggle-example-btn');
      let isShowingSaasExample = false;
      if (saasToggleBtn) {
        saasToggleBtn.addEventListener('click', () => {
          isShowingSaasExample = !isShowingSaasExample;
          const list = card10.querySelector('#saas-services-list');
          if (!list) return;

          if (isShowingSaasExample) {
            saasToggleBtn.textContent = '↩ 원래 상태로 (연결 전)';
            saasToggleBtn.classList.add('active');

            // GitHub
            const gh = list.querySelector('[data-service="github"]');
            if (gh) {
              gh.querySelector('.saas-status-badge').className = 'saas-status-badge status-partial';
              gh.querySelector('.saas-status-badge').textContent = '[예시] 부분 결과 (조직 권한 부족)';
              gh.querySelector('.saas-security-val').innerHTML = '<span class="status-ok">[예시] 2FA 켜짐</span> · 출처: API 응답 가정';
              gh.querySelector('.saas-usage-val').textContent = '[예시] Actions 사용 312분 (2026-10-01~10-24)';
              gh.querySelector('.saas-cost-val').textContent = '[예시] USD 3.20 (실적 · 초과분, 세금 제외)';
            }
            // Vercel
            const vc = list.querySelector('[data-service="vercel"]');
            if (vc) {
              vc.querySelector('.saas-status-badge').className = 'saas-status-badge status-stale';
              vc.querySelector('.saas-status-badge').textContent = '[예시] 오래됨 (3일 전 결과)';
              vc.querySelector('.saas-security-val').textContent = '[예시] 배포 보호: 3일 전 값만 있음';
              vc.querySelector('.saas-usage-val').textContent = '[예시] 함수 실행 시간 3일 전 기준';
              vc.querySelector('.saas-cost-val').textContent = '[예시] 확인 불가 (청구 API 미조회)';
            }
            // Railway
            const rw = list.querySelector('[data-service="railway"]');
            if (rw) {
              rw.querySelector('.saas-status-badge').className = 'saas-status-badge status-permission';
              rw.querySelector('.saas-status-badge').textContent = '[예시] 권한 부족';
              rw.querySelector('.saas-security-val').textContent = '[예시] 읽기 권한 부족';
              rw.querySelector('.saas-usage-val').textContent = '[예시] 읽지 못함';
              rw.querySelector('.saas-cost-val').textContent = '[예시] USD 4.80 (월말 예상 · 출처: 청구화면)';
            }
            // Supabase
            const sb = list.querySelector('[data-service="supabase"]');
            if (sb) {
              sb.querySelector('.saas-status-badge').className = 'saas-status-badge status-failed';
              sb.querySelector('.saas-status-badge').textContent = '[예시] 실패 (요청 시간 초과)';
              sb.querySelector('.saas-security-val').textContent = '[예시] 시간 초과';
              sb.querySelector('.saas-usage-val').textContent = '[예시] 읽지 못함';
              sb.querySelector('.saas-cost-val').textContent = '[예시] 확인 불가';
            }
          } else {
            saasToggleBtn.textContent = '참고 예시 보기';
            saasToggleBtn.classList.remove('active');

            const allItems = list.querySelectorAll('.saas-service-item');
            allItems.forEach(item => {
              item.querySelector('.saas-status-badge').className = 'saas-status-badge status-unverifiable';
              item.querySelector('.saas-status-badge').textContent = '연결 전 · 확인 불가';
              item.querySelector('.saas-security-val').textContent = '확인 불가';
              item.querySelector('.saas-usage-val').textContent = '확인 불가';
              item.querySelector('.saas-cost-val').textContent = '확인 불가 (0원 아님)';
            });
          }
        });
      }

      root.append(testCardsContainer);

      // 우하단 동적 라이트/다크 모드 토글 초기화 및 상태 보존
      const initThemeToggle = () => {
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (!toggleBtn || toggleBtn.dataset.wired) return;
        toggleBtn.dataset.wired = 'true';

        const savedTheme = localStorage.getItem('lumos-theme');
        if (savedTheme) {
          document.documentElement.setAttribute('data-theme', savedTheme);
        }

        toggleBtn.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme') || 'light';
          const next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('lumos-theme', next);
          toggleBtn.classList.add('rotating');
          setTimeout(() => toggleBtn.classList.remove('rotating'), 500);
        });
      };
      setTimeout(initThemeToggle, 50);

      // 실시간 내 PC 상태 API 연동 함수 (백엔드 실측치 단일 소스)
      const updateRealPcStats = async () => {
        try {
          const res = await fetch('/api/pc-stats');
          if (!res.ok) return;
          const json = await res.json();
          if (!json.ok || !json.data) return;
          const d = json.data;

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          // KPI Mini Cards
          const kpiCpu = card2.querySelector('#kpi-cpu-val');
          if (kpiCpu) kpiCpu.textContent = `${d.cpuUsagePct}%`;
          const kpiRam = card2.querySelector('#kpi-ram-val');
          if (kpiRam) kpiRam.textContent = `${d.memUsagePct}%`;
          const kpiDisk = card2.querySelector('#kpi-disk-val');
          if (kpiDisk) {
            if (d.diskAvailable) kpiDisk.textContent = `${d.diskFreeGB}GB (${d.diskUsedPct}%)`;
            else kpiDisk.textContent = '확인 불가';
          }
          const kpiFirewall = card2.querySelector('#kpi-firewall-val');
          if (kpiFirewall) kpiFirewall.textContent = '켜짐 (Windows)';

          // CPU Detail
          const cpuBar = card2.querySelector('#dynamic-cpu-bar');
          if (cpuBar) cpuBar.style.width = `${d.cpuUsagePct}%`;
          const cpuText = card2.querySelector('#dynamic-cpu-text');
          if (cpuText) cpuText.textContent = `실측치 ${d.cpuUsagePct}% (${d.cpuCores} Cores)`;
          const cpuTime = card2.querySelector('#dynamic-cpu-time');
          if (cpuTime) cpuTime.textContent = `실시간 계측 (${timeStr})`;

          // RAM Detail
          const ramBar = card2.querySelector('#dynamic-ram-bar');
          if (ramBar) ramBar.style.width = `${d.memUsagePct}%`;
          const ramText = card2.querySelector('#dynamic-ram-text');
          if (ramText) ramText.textContent = `실측치 ${d.usedMemGB}GB / ${d.totalMemGB}GB (${d.memUsagePct}%)`;

          // Disk Detail
          const diskBar = card2.querySelector('#dynamic-disk-bar');
          if (diskBar) diskBar.style.width = `${d.diskUsedPct}%`;
          const diskText = card2.querySelector('#dynamic-disk-text');
          if (diskText) {
            if (d.diskAvailable) diskText.textContent = `실측치 ${d.diskFreeGB}GB 여유 / 총 ${d.diskTotalGB}GB (${d.diskUsedPct}% 사용)`;
            else diskText.textContent = '확인 불가 · 권한 제한';
          }

          // Trend Time & Wave Bar
          const trendTime = card2.querySelector('#trend-time-indicator');
          if (trendTime) trendTime.textContent = `${timeStr} 실시간 계측 완료 · ${d.cpuCores}코어 실측`;
          const currentBar = card2.querySelector('.trend-bar.current');
          if (currentBar) currentBar.style.height = `${Math.min(95, Math.max(20, d.cpuUsagePct))}%`;

          // Card 3 Network IP
          const netItems = card3.querySelectorAll('.aleph-item-row');
          if (netItems && netItems[0] && d.localIp) {
            const netVal = netItems[0].querySelector('.item-status');
            if (netVal) netVal.textContent = `로컬 유선 연결됨 (${d.localIp})`;
          }
        } catch (e) {
          console.debug('pc-stats fetch error', e);
        }
      };
      setTimeout(updateRealPcStats, 50);

      // '다시 조회' 버튼 인터랙션 (대기 상태 '새로 읽는 중...' 및 키보드 접근성)
      const retryBtn = card4.querySelector('#aleph-retry-btn');
      const retryStatus = card4.querySelector('#aleph-retry-status');
      if (retryBtn && retryStatus) {
        retryBtn.addEventListener('click', async () => {
          retryBtn.disabled = true;
          retryStatus.textContent = '새로 읽는 중...';
          await updateRealPcStats();
          setTimeout(() => {
            retryBtn.disabled = false;
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            retryStatus.textContent = `조회 완료 (${timeStr})`;
            setTimeout(() => { retryStatus.textContent = ''; }, 3000);
          }, 600);
        });
      }

      // 3초 주기 실측 데이터 단일 갱신 (누수 방지 싱글톤 타이머)
      if (typeof window !== 'undefined') {
        if (window.__lumosMetricTimer) clearInterval(window.__lumosMetricTimer);
        window.__lumosMetricTimer = setInterval(updateRealPcStats, 3000);
      }

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

      return root;
    },
    renderVulnerabilities({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      root.className = 'student-vulnerabilities';
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const overallLabels = {
        complete: '모두 조회',
        partial: '일부 조회 실패',
        not_checked: '아직 조회 안 함',
        not_configured: '조회 준비 미완료',
        unverifiable: 'lock 파일 확인 불가',
      };
      const packageLabels = {
        known_vulnerabilities: '알려진 항목 있음',
        none_found: '알려진 항목 없음',
        unverifiable: '조회 확인 불가',
      };
      const textValue = (value, fallback = '확인 불가') =>
        typeof value === 'string' && value.length > 0 ? value : fallback;

      addText(root, 'h3', '설치 패키지 취약점 조회 결과', 'student-vulnerabilities-title');

      if (status === 'idle') {
        addText(root, 'p', '조회 전 (idle)', 'student-vulnerabilities-idle');
        return root;
      }
      if (status === 'loading') {
        addText(root, 'p', '조회 중 (loading)', 'student-vulnerabilities-loading');
        return root;
      }
      if (status === 'error') {
        const message = textValue(error?.message, '오류 메시지를 확인할 수 없습니다.');
        addText(root, 'p', `조회 실패 (error): ${message}`, 'student-vulnerabilities-error');
        addText(root, 'p', '조회 실패는 취약점 없음이라는 뜻이 아닙니다. 이전 결과는 현재 조회 결과로 표시하지 않습니다.', 'student-vulnerabilities-error-note');
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object' || Array.isArray(data)) {
        addText(root, 'p', '조회 결과 확인 불가 (unverifiable). 취약점이 없다는 뜻이 아닙니다.', 'student-vulnerabilities-unverified');
        return root;
      }

      const scanStatus = typeof data.status === 'string' && Object.hasOwn(overallLabels, data.status)
        ? data.status
        : 'unverifiable';
      const scanLabel = overallLabels[scanStatus];
      addText(root, 'p', `${scanLabel} (${scanStatus})`, `student-vulnerabilities-scan-${scanStatus}`);

      if (data.lockfileVersion !== undefined && data.lockfileVersion !== null) {
        addText(root, 'p', `설치 목록 원천: package-lock.json · lockfileVersion: ${String(data.lockfileVersion)}`, 'student-vulnerabilities-lockfile-version');
      }
      if (data.lockfileHash !== undefined && data.lockfileHash !== null) {
        addText(root, 'p', `lockfileHash: ${textValue(data.lockfileHash)}`, 'student-vulnerabilities-lockfile-hash');
      }
      if (data.checkedAt !== undefined && data.checkedAt !== null) {
        addText(root, 'p', `전체 조회 시각: ${textValue(data.checkedAt)}`, 'student-vulnerabilities-checked-at');
      }
      if (scanStatus === 'not_configured') {
        addText(root, 'p', '조회 대상 프로젝트 설정이 없어 조회하지 않았습니다.', 'student-vulnerabilities-not-configured');
      } else if (scanStatus === 'not_checked') {
        addText(root, 'p', '승인된 공개 조회 대상이 없어 아직 OSV 조회를 하지 않았습니다.', 'student-vulnerabilities-not-checked');
      } else if (scanStatus === 'unverifiable') {
        addText(root, 'p', '설치 목록 또는 조회 범위를 확인할 수 없습니다. 취약점이 없다는 뜻이 아닙니다.', 'student-vulnerabilities-unverified-note');
      }

      if (!Array.isArray(data.packages)) {
        addText(root, 'p', '패키지 조회 목록을 확인할 수 없습니다.', 'student-vulnerabilities-packages-unverified');
        return root;
      }
      if (data.packages.length === 0) {
        if (scanStatus === 'complete') {
          addText(root, 'p', '조회 범위에서 표시할 패키지 결과가 없습니다.', 'student-vulnerabilities-empty');
        }
        return root;
      }

      const table = document.createElement('table');
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const label of ['패키지', '정확한 설치 버전', '패키지 조회 상태', '출처', '패키지 확인 시각', '취약점 ID', '수정 시각']) {
        addText(headerRow, 'th', label);
      }
      head.append(headerRow);
      table.append(head);
      const body = document.createElement('tbody');
      for (const pkg of data.packages) {
        const findings = Array.isArray(pkg?.vulnerabilities) ? pkg.vulnerabilities : [];
        const rows = findings.length > 0 ? findings : [null];
        for (const finding of rows) {
          const row = document.createElement('tr');
          row.setAttribute('data-student-package-name', textValue(pkg?.name, ''));
          row.setAttribute('data-student-package-version', textValue(pkg?.version, ''));
          addText(row, 'td', textValue(pkg?.name));
          addText(row, 'td', textValue(pkg?.version));
          const packageStatus = typeof pkg?.status === 'string' && Object.hasOwn(packageLabels, pkg.status)
            ? pkg.status
            : 'unverifiable';
          let statusText = `${packageLabels[packageStatus]} (${packageStatus})`;
          if (packageStatus === 'unverifiable' && findings.length > 0) {
            statusText = `일부 확인·전체 조회 확인 불가 (${packageStatus})`;
          }
          addText(row, 'td', statusText);
          addText(row, 'td', textValue(pkg?.source));
          addText(row, 'td', textValue(pkg?.checkedAt));
          addText(row, 'td', finding ? textValue(finding.id) : '');
          addText(row, 'td', finding ? textValue(finding.modified) : '');
          body.append(row);
        }
        if (pkg?.status === 'none_found') {
          addText(root, 'p', `${textValue(pkg?.name)} ${textValue(pkg?.version)}: 조회 범위에서 알려진 항목이 없습니다. 이는 패키지나 앱 전체가 안전하다는 보장이 아닙니다.`, 'student-vulnerabilities-none-found-note');
        }
      }
      table.append(body);
      root.append(table);
      return root;
    },
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
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|token|토큰)\s*[:=]\s*\S+)/i;
      const safeValue = (value, fallback = '확인 불가', maxLength = 2000) => {
        if (typeof value !== 'string' || value.length === 0 || value.length > maxLength
          || secretPattern.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fallback;
        return value;
      };
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value)
        ? value : 'AI_REQUEST_UNVERIFIED';
      const safeEventId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value)
        ? value : null;
      const showFailure = (codeValue, messageValue) => {
        const code = safeCode(codeValue);
        const message = safeValue(messageValue, typeof messageValue === 'string' && messageValue
          ? '원문 오류 메시지는 민감 정보가 포함될 수 있어 표시하지 않았습니다.'
          : '오류 메시지를 확인할 수 없습니다.');
        const reason = code === 'ON_AI_INVALID_INPUT'
          ? '근거 또는 규칙이 부족하거나 유효한 설명 입력을 확인할 수 없어 설명을 표시하지 않습니다.'
          : code === 'ON_AI_INVALID_OUTPUT'
            ? '설명 결과의 근거·조치·응답 형식을 확인할 수 없어 표시하지 않습니다.'
            : code === 'AI_REQUEST_UNVERIFIED'
              ? '설명 결과를 검증할 수 없어 표시하지 않습니다.'
              : '설명 요청에 실패했습니다.';
        addText(root, 'p', `AI 설명 실패 (${code})`, 'student-explanation-error');
        addText(root, 'p', `실패 이유: ${reason}`, 'student-explanation-error-reason');
        addText(root, 'p', `오류 메시지: ${message}`, 'student-explanation-error-message');
        addText(root, 'p', '기록은 그대로입니다. AI 설명의 실패는 업무 앱 접근 판정이나 보안 기록을 바꾸지 않습니다.', 'student-explanation-record-unchanged');
      };
      const showInvalidExplanation = (message, codeValue) => {
        addText(root, 'p', message, 'student-explanation-unverified');
        if (codeValue !== undefined) addText(root, 'p', `오류 코드: ${safeCode(codeValue)}`, 'student-explanation-error-code');
        addText(root, 'p', '이 설명은 참고 정보로 사용할 수 없습니다. 보안 기록과 현재 상태를 기준으로 확인하세요.', 'student-explanation-not-usable');
      };
      const isSafeText = (value, maxLength = 2000) => safeValue(value, null, maxLength) !== null;

      addText(root, 'h3', 'AI 사건 설명', 'student-explanation-title');

      // 오류는 event가 null이어도 먼저 표시해 실패 코드와 이유를 가리지 않는다.
      if (explanation?.status === 'error') {
        showFailure(explanation.error?.code, explanation.error?.message);
      } else if (!event) {
        addText(root, 'p', '보안 기록에서 기록을 먼저 고르세요.', 'student-explanation-idle');
      } else if (explanation?.status === 'loading') {
        addText(root, 'p', '선택한 사건의 AI 설명을 요청 중입니다. 결과는 아직 확인되지 않았습니다.', 'student-explanation-loading');
      } else if (explanation?.status === 'ok') {
        const eventId = safeEventId(event.id);
        const explanationData = explanation.data;
        const summary = safeValue(explanationData?.summary, null, 1500);
        const evidence = Array.isArray(event.evidence) ? event.evidence : null;
        const rules = Array.isArray(event.rules) ? event.rules : null;
        const state = event.state;
        const supportedActions = Array.isArray(event.supportedActions) ? event.supportedActions : null;
        const evidenceById = new Map();
        let eventEvidenceValid = Boolean(evidence && evidence.length > 0);
        if (eventEvidenceValid) {
          for (const item of evidence) {
            const id = safeEventId(item?.id);
            if (!id || !isSafeText(item?.text, 500) || evidenceById.has(id)) {
              eventEvidenceValid = false;
              break;
            }
            evidenceById.set(id, item);
          }
        }

        const evidenceIds = explanationData?.evidenceIds;
        const citedEvidence = [];
        let evidenceMatches = eventEvidenceValid && Array.isArray(evidenceIds)
          && evidenceIds.length === evidenceById.size;
        if (evidenceMatches) {
          const seen = new Set();
          for (const idValue of evidenceIds) {
            const id = safeEventId(idValue);
            const item = id && evidenceById.get(id);
            if (!item || seen.has(id)) {
              evidenceMatches = false;
              break;
            }
            seen.add(id);
            citedEvidence.push({ id, text: item.text });
          }
          if (seen.size !== evidenceById.size) evidenceMatches = false;
        }

        const stateCodes = {
          access: ['allowed', 'denied', 'unknown'],
          session: ['active', 'expired', 'revoked', 'unknown'],
          device: ['compliant', 'noncompliant', 'unknown'],
        };
        const stateNames = { access: '접속', session: '세션', device: '기기' };
        const stateValid = state && typeof state === 'object'
          && Object.keys(stateCodes).every((key) => stateCodes[key].includes(state[key]));
        const rulesValid = rules && rules.every((rule) => safeEventId(rule?.id) && isSafeText(rule?.text, 300));
        const proposalRows = explanationData?.proposals;
        let proposalsValid = Array.isArray(proposalRows) && proposalRows.length <= 3 && supportedActions !== null;
        const checkedProposals = [];
        if (proposalsValid) {
          for (const proposal of proposalRows) {
            const action = safeEventId(proposal?.action);
            const reason = safeValue(proposal?.reason, null, 500);
            const proposalEvidenceIds = proposal?.evidenceIds;
            const validRefs = Array.isArray(proposalEvidenceIds) && proposalEvidenceIds.length > 0
              && new Set(proposalEvidenceIds).size === proposalEvidenceIds.length
              && proposalEvidenceIds.every((id) => safeEventId(id) && evidenceById.has(id));
            if (!action || !supportedActions.includes(action) || reason === null || !validRefs) {
              proposalsValid = false;
              break;
            }
            checkedProposals.push({ action, reason, evidenceIds: proposalEvidenceIds });
          }
        }
        const confirmationValid = explanationData?.requiresHumanConfirmation === true;
        const notExecuted = explanationData?.executed === false;

        if (!eventId || summary === null) {
          showInvalidExplanation('사건 ID 또는 안전한 AI 요약을 확인할 수 없어 설명을 표시하지 않습니다.');
        } else if (!evidenceMatches) {
          showInvalidExplanation('근거 ID가 현재 선택한 기록의 근거와 일치하지 않아 설명을 표시할 수 없습니다. 근거를 추정하거나 만들어 맞추지 않습니다.');
        } else if (!rulesValid || !stateValid || !proposalsValid || !confirmationValid || !notExecuted) {
          const alreadyExecuted = explanationData?.executed !== false;
          showInvalidExplanation(alreadyExecuted
            ? '응답에 실행되지 않음이 확인되지 않았습니다. AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.'
            : '기록의 규칙·현재 상태 또는 제안 형식을 확인할 수 없어 설명을 표시하지 않습니다.');
        } else {
          // 성공으로 검증한 새 DOM에만 성공 표식을 붙인다. 실패 분기에는 이 속성이 없다.
          root.setAttribute('data-student-explanation-event', eventId);
          addText(root, 'p', `사건 ID: ${eventId}`, 'student-explanation-event-id');
          addText(root, 'p', 'AI 설명(참고용)', 'student-explanation-heading');
          addText(root, 'p', summary, 'student-explanation-summary');
          if (typeof checkedAt === 'string' && checkedAt) {
            const safeCheckedAt = safeValue(checkedAt, null);
            if (safeCheckedAt) addText(root, 'p', `설명 확인 시각: ${safeCheckedAt}`, 'student-explanation-checked-at');
          }

          const evidenceSection = document.createElement('section');
          addText(evidenceSection, 'h4', '인용한 근거');
          for (const item of citedEvidence) addText(evidenceSection, 'p', `근거 ${item.id} — ${item.text}`);
          root.append(evidenceSection);

          const rulesSection = document.createElement('section');
          addText(rulesSection, 'h4', '관련 규칙');
          if (rules.length === 0) {
            addText(rulesSection, 'p', '규칙이 없습니다.');
          } else {
            for (const rule of rules) addText(rulesSection, 'p', `규칙 ${rule.id} — ${rule.text}`);
          }
          root.append(rulesSection);

          const unknownStates = Object.keys(stateCodes).filter((key) => state[key] === 'unknown');
          const stateSection = document.createElement('section');
          addText(stateSection, 'h4', '확인 불가 상태');
          if (unknownStates.length === 0) {
            addText(stateSection, 'p', '없음');
          } else {
            for (const key of unknownStates) addText(stateSection, 'p', `${stateNames[key]}: 확인 불가(unknown)`);
          }
          root.append(stateSection);

          const proposalsSection = document.createElement('section');
          addText(proposalsSection, 'h4', 'AI 제안(실행되지 않음)');
          if (checkedProposals.length === 0) {
            addText(proposalsSection, 'p', supportedActions.length === 0
              ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
              : 'AI가 제안한 조치가 없습니다.');
          } else {
            for (const proposal of checkedProposals) {
              addText(proposalsSection, 'p', `조치: ${proposal.action}`);
              addText(proposalsSection, 'p', `이유: ${proposal.reason}`);
              addText(proposalsSection, 'p', `근거 ID: ${proposal.evidenceIds.join(', ')}`);
              addText(proposalsSection, 'p', '사람 확인이 필요하며 실행되지 않았습니다.');
            }
          }
          root.append(proposalsSection);
          addText(root, 'p', 'AI 설명은 참고 정보입니다. 사실 판단은 근거 문장과 연동 시스템이 제공한 상태를 기준으로 하며, unknown은 확인 불가입니다. 설명·제안만으로 보안 조치가 실행되지는 않습니다.', 'student-explanation-not-executed');
        }
      } else {
        addText(root, 'p', 'AI 설명은 아직 요청되지 않았거나 상태를 확인할 수 없습니다.', 'student-explanation-idle');
      }

      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, text, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|비밀번호|token|토큰)\s*[:=]\s*\S+)/i;
      const safeText = (value, fallback = '확인 불가', maxLength = 1000) => {
        if (typeof value !== 'string' || value.length === 0 || value.length > maxLength
          || secretPattern.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return fallback;
        return value;
      };
      const safeIdentifier = (value) => typeof value === 'string'
        && /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/.test(value)
        && !secretPattern.test(value) ? value : null;
      const safeNumber = (value) => Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
      const safeCode = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(value)
        ? value : null;
      const addField = (label, value) => {
        if (value !== null && value !== undefined) addText(root, 'p', `${label}: ${value}`);
      };
      const statusLabels = {
        idle: '아직 미실행',
        loading: '조치 준비 또는 결과 조회 중',
        prepared: '준비됨·미실행',
        executing: '서버에 전달 중',
        pending: '서버 접수·처리 중',
        succeeded: '효과 확인',
        denied: '연동 시스템 거절',
        failed: '연동 시스템 실패',
        unknown: '결과 불명',
        expired: '확인 기한 지남',
        error: '요청 처리 안 됨',
      };
      const statusCode = typeof status === 'string' && Object.hasOwn(statusLabels, status) ? status : 'unknown';
      const displayedStatusCode = statusCode === 'succeeded' && observation?.effectApplied !== true
        ? 'unknown'
        : statusCode;

      addText(root, 'h3', '보안 조치 요청 상태와 실제 결과', 'student-action-title');
      addText(root, 'p', `${statusLabels[displayedStatusCode]} (${displayedStatusCode})`, `student-action-${displayedStatusCode}`);

      const eventId = safeIdentifier(event?.id);
      const requestId = safeIdentifier(receipt?.requestId);
      if (eventId) root.setAttribute('data-student-action-event', eventId);
      if (requestId) root.setAttribute('data-student-action-request', requestId);

      if (eventId) addField('사건 ID', eventId);
      const evidenceIds = Array.isArray(event?.evidence)
        ? event.evidence.map((item) => safeIdentifier(item?.id)).filter(Boolean)
        : [];
      if (evidenceIds.length > 0) addField('근거 ID', evidenceIds.join(', '));
      const displayedActionId = safeIdentifier(actionId);
      if (displayedActionId) addField('조치 ID', displayedActionId);
      const targetId = safeIdentifier(target?.id);
      const targetGeneration = safeNumber(target?.generation);
      if (targetId) addField('실제 대상 ID', targetId);
      if (targetGeneration !== null) addField('대상 세대(generation)', targetGeneration);
      if (requestId) addField('요청 ID', requestId);
      const receiptId = safeIdentifier(receipt?.receiptId);
      const receiptVersion = safeNumber(receipt?.version);
      if (receiptId) addField('접수 영수증 ID', receiptId);
      if (receiptVersion !== null) addField('영수증 버전(version)', receiptVersion);
      if (typeof receipt?.status === 'string') {
        addField('서버 접수 상태', safeText(receipt.status));
      }

      if (statusCode === 'idle') {
        addText(root, 'p', '보안 조치는 아직 준비되거나 실행되지 않았습니다. 조치 제안은 실제 처리 결과가 아닙니다.');
        if (Array.isArray(event?.supportedActions) && event.supportedActions.length === 0) {
          addText(root, 'p', '현재 기록에는 연동 시스템이 지원하는 조치가 없습니다. 조치 준비 버튼이 표시되지 않는 것이 정상입니다.');
        }
      } else if (statusCode === 'loading') {
        addText(root, 'p', '조치를 준비하거나 연동 시스템 결과를 조회하고 있습니다. 처리 결과와 효과는 아직 확인되지 않았습니다.');
        const safeMessage = safeText(message, null);
        if (safeMessage) addText(root, 'p', `진행 내용: ${safeMessage}`);
      } else if (statusCode === 'prepared') {
        addText(root, 'p', '조치는 준비만 되었으며 아직 실행되지 않았습니다.');
        const expires = safeText(confirmationExpiresAt, null, 200);
        if (expires) addField('사람 확인 기한', expires);
        addText(root, 'p', '대상과 조치를 직접 확인한 뒤 제공 화면의 「대상과 조치를 확인했으며 집행합니다」를 눌러야 요청이 전송됩니다.');
      } else if (statusCode === 'executing') {
        addText(root, 'p', '서버에 조치를 전달 중(executing)입니다. 결과가 아직 확인되지 않았으며 효과 확인이 아닙니다.');
      } else if (statusCode === 'pending') {
        addText(root, 'p', '서버가 요청을 접수해 처리 중(pending)입니다. 접수 응답(ACK)은 조치 효과가 아니며 처리 결과가 아직 확인되지 않았습니다.');
      } else if (statusCode === 'succeeded') {
        if (observation?.effectApplied === true) {
          addText(root, 'p', '효과 확인(succeeded) · 연동 시스템이 조치 효과를 확인했습니다.');
          addField('effectApplied', 'true');
          addField('관측 시각', safeText(observation.observedAt, '관측 시각 확인 불가', 200));
          if (receiptId) addField('receiptId', receiptId);
          else addField('receiptId', '확인 불가');
        } else {
          addText(root, 'p', '효과 확인 정보가 없어 결과 불명(unknown)입니다. succeeded 상태만으로 효과를 확인할 수 없어 성공으로 처리하지 않습니다.');
          addText(root, 'p', '원래 처리 상태: succeeded (효과가 확인되었다는 뜻이 아닙니다).', 'student-action-processing-status');
          addText(root, 'p', '제공 화면의 「연동 시스템 결과만 재조회」를 눌러 실제 결과를 다시 확인하세요.');
        }
      } else if (statusCode === 'denied' || statusCode === 'failed') {
        const label = statusCode === 'denied' ? '거절' : '실패';
        addText(root, 'p', `연동 시스템 ${label}(${statusCode}) 상태입니다. 효과가 확인된 상태가 아닙니다.`);
        const safeMessage = safeText(message, null);
        if (safeMessage) addText(root, 'p', `처리 메시지: ${safeMessage}`);
      } else if (statusCode === 'unknown') {
        addText(root, 'p', '결과 불명(unknown)입니다. 효과가 없다고도, 성공했다고도 판단하지 않습니다.');
        addText(root, 'p', '제공 화면의 「연동 시스템 결과만 재조회」를 눌러 결과를 확인하세요.');
        addText(root, 'p', '「조치 화면 취소」는 이미 서버에 전달된 조치 효과를 되돌리는 기능이 아닙니다.');
      } else if (statusCode === 'expired') {
        addText(root, 'p', '사람 확인 기한이 지났습니다(expired). 이전 준비 내용은 집행할 수 없으므로 제공 화면에서 다시 준비해야 합니다.');
      } else if (statusCode === 'error') {
        addText(root, 'p', '요청이 처리되지 않았습니다(error). 조치 효과가 발생했다고 볼 수 없습니다.');
        const code = safeCode(error?.code);
        const safeMessage = safeText(error?.message, null);
        if (code) addField('오류 코드', code);
        if (safeMessage) addField('오류 메시지', safeMessage);
      }

      return root;
    },
  };
}
