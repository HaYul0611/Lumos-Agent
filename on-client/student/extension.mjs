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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
