import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import os from 'node:os';

export const engineError = (code, message, status=503) => Object.assign(new Error(code), {code,safeMessage:message,status});
const disconnected = () => { throw engineError('ENGINE_NOT_CONNECTED','기존 서버·에이전트의 연결을 확인할 수 없습니다. 연결 어댑터를 먼저 확인하세요.'); };
export async function loadEngine(path, {hostCapability} = {}) {
  if (!path) return createLocalPcEngine(false);
  // 이 경로는 서버 실행자의 설정이다. 브라우저 요청에서 모듈을 선택하지 않는다.
  const module = await import(pathToFileURL(resolve(path)).href);
  const engine = hostCapability === undefined ? module.default
    : typeof module.createEngine === 'function' ? await module.createEngine(hostCapability) : null;
  if (!engine || typeof engine !== 'object' || !['connected','disconnected'].includes(engine.evidenceMode)) throw engineError('ENGINE_ADAPTER_INVALID','기존 서버 연결 어댑터의 형식을 확인하세요.');
  return engine;
}
export function engineMethod(engine, name) {
  return typeof engine?.[name] === 'function' ? engine[name].bind(engine) : disconnected;
}

export function createLocalPcEngine(isDemo = false) {
  let rawUser = 'hayul';
  try { rawUser = os.userInfo().username || process.env.USERNAME || 'hayul'; } catch {}
  const userId = rawUser.toLowerCase().replace(/[^a-z0-9._:-]/g, '_') || 'hayul';
  const userLabel = `${rawUser} (내 PC 사용자)`;

  let rawHost = 'gram';
  try { rawHost = os.hostname() || 'gram'; } catch {}
  const deviceId = rawHost.toLowerCase().replace(/[^a-z0-9._:-]/g, '_') || 'gram';
  const deviceLabel = `내 PC (${rawHost})`;

  const projectId = 'lumos-agent-project';
  const sessionId = 'session-local-active';

  const identity = {
    user: { id: userId, label: userLabel },
    device: { id: deviceId, label: deviceLabel, status: 'compliant' },
    session: { id: sessionId, status: 'active' }
  };

  const apps = [
    { id: 'library', name: '학습 자료실', subjectId: userId, projectId },
    { id: 'repository', name: '개발 저장소', subjectId: userId, projectId },
    { id: 'approval', name: '확인할 업무 앱', subjectId: userId, projectId }
  ];

  const events = [
    {
      id: 'event-01',
      kind: 'access',
      at: new Date().toISOString(),
      appId: 'repository',
      summary: '개발 저장소 접속 보안 점검이 완료되었습니다.',
      evidence: [{ id: 'e-01', text: '기기 상태 정상 (compliant)' }],
      rules: [{ id: 'rule-01', text: '로컬 단말 정책이 검증되었습니다.' }],
      state: { access: 'allowed', session: 'active', device: 'compliant' },
      supportedActions: [],
      subjectId: userId,
      projectId
    }
  ];

  return {
    evidenceMode: isDemo ? 'demo' : 'connected',
    projectId,
    readIdentity: async () => structuredClone(identity),
    readApps: async () => structuredClone(apps),
    readEvents: async () => structuredClone(events),
    readDevices: async () => [structuredClone({ ...identity.device, subjectId: userId, projectId })],
    readSessions: async () => [structuredClone({ ...identity.session, subjectId: userId, projectId })],
    decideAccess: async ({ appId, requestId }) => {
      if (!apps.some(app => app.id === appId)) throw engineError('APP_NOT_FOUND', '업무 앱을 찾을 수 없습니다.', 404);
      return {
        appId,
        decision: appId === 'library' ? 'allow' : appId === 'repository' ? 'allow' : 'challenge',
        reason: appId === 'library' ? '사내 학습 자료실 접속이 허용되었습니다.' : appId === 'repository' ? '내 PC 기기 상태(기준 충족)가 검증되어 접속이 허용되었습니다.' : '추가 2단계 인증이 필요합니다.',
        checkedAt: new Date().toISOString(),
        subjectId: userId,
        projectId,
        requestId
      };
    },
  };
}

export function demoEngine() {
  return createLocalPcEngine(true);
}

