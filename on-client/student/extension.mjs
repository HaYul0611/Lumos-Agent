// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
