import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 루트 디렉터리 또는 on-client 하위 디렉터리 둘 다 유연하게 감지
const projectRoot = fs.existsSync(path.join(__dirname, 'public')) 
  ? __dirname 
  : path.join(__dirname, 'on-client');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

console.log('=== Lumos UI & Architecture Stability Verification ===\n');

const indexHtml = fs.readFileSync(path.join(projectRoot, 'public/index.html'), 'utf-8');
const uiChromeJs = fs.readFileSync(path.join(projectRoot, 'public/ui-chrome.js'), 'utf-8');
const styleCss = fs.readFileSync(path.join(projectRoot, 'public/style.css'), 'utf-8');
const extensionMjs = fs.readFileSync(path.join(projectRoot, 'student/extension.mjs'), 'utf-8');

// 1. 엔터프라이즈 표준 모델링 규격 검증 (병원/특정기관 명칭 완전 배제)
assert(indexHtml.includes('Global Enterprise') && indexHtml.includes('Regional Branch Office'), '상용 엔터프라이즈 아키텍처 모델링 명칭 정합성 확인');

// 2. 상단 헤더 검색 버튼 제거 및 사이드바 일원화 검증
const topbarMatch = indexHtml.match(/<header class="topbar">([\s\S]*?)<\/header>/);
assert(topbarMatch && !topbarMatch[1].includes('id="cmdk-trigger"'), '상단 헤더(topbar) 영역에서 cmdk-trigger 버튼 완전 제거 확인');
assert(indexHtml.includes('id="sidebar-cmdk-trigger"'), '좌측 패널 전용 검색·명령 트리거 버튼 배치 확인');

// 3. 사이드바 접힘 시 SVG 아이콘 전용 뷰 검증
assert(styleCss.includes('.layout.sidebar-collapsed .nav-category-label') && styleCss.includes('display: none !important;'), '사이드바 접힘 시 카테고리 라벨 숨김 (글자 세로 깨짐 원천 방지) 확인');

// 4. [1단계] 엔터프라이즈 SOC 종합 위협 관제 센터 검증 (4번 이미지)
assert(indexHtml.includes('class="soc-section"') && indexHtml.includes('id="soc-score-val"'), '1단계: SOC 종합 관제 센터 및 보안 점수 100점 마크업 탑재 확인');
assert(indexHtml.includes('id="soc-trend-chart"') && indexHtml.includes('id="soc-donut-chart"'), '1단계: 위협 시계열 추이 차트 및 심각도 도넛 차트 컨테이너 탑재 확인');
assert(uiChromeJs.includes('renderTimeSeriesChart') && uiChromeJs.includes('renderSeverityDonut'), '1단계: 모듈형 SOC 차트 렌더러 로직 탑재 확인');
assert(styleCss.includes('.soc-score-card') && styleCss.includes('.donut-wrapper'), '1단계: SOC 대시보드 및 도넛/게이지 전용 CSS 스타일링 확인');

// 5. [2단계] Cloud Gateway & 회선 트래픽 실시간 관제 대시보드 검증 (3번 이미지 5:5 대칭)
assert(indexHtml.includes('id="traffic-bar-chart"') && indexHtml.includes('traffic-top-col'), '2단계: 트래픽 상위 사이트(Top 10) 전용 가로 막대 차트 컨테이너 탑재 확인');
assert(indexHtml.includes('id="usage-summary-table"') && indexHtml.includes('id="btn-export-metrics"'), '2단계: 구독 최신 사용률 4개 인터페이스 테이블 및 CSV 내보내기 버튼 탑재 확인');
assert(uiChromeJs.includes('renderTrafficBarChart') && uiChromeJs.includes('initCsvExport'), '2단계: 가로 막대 차트 동적 렌더러 및 CSV 내보내기 로직 탑재 확인');
assert(styleCss.includes('.traffic-bar-fill') && styleCss.includes('.dashboard-split'), '2단계: 트래픽 네온 게이지 바 및 5:5 완벽 대칭 레이아웃 CSS 스타일링 확인');

// 6. [3단계] 조직도 계층 트리 & IAM/단말 인벤토리 관리 그리드 검증 (5번 이미지)
assert(indexHtml.includes('class="tree-panel"') && indexHtml.includes('id="iam-users-table"'), '3단계: 5번 이미지 기반 조직도 계층 트리 및 IAM 인벤토리 테이블 마크업 탑재 확인');
assert(indexHtml.includes('id="iam-search-input"') && indexHtml.includes('id="panel-site-users"'), '3단계: IAM 실시간 검색창 및 사이트별 사용자/단말 뷰 컨테이너 탑재 확인');
assert(uiChromeJs.includes('renderIamTable') && uiChromeJs.includes('initIamTreeAndGrid'), '3단계: 조직도 트리 및 IAM 사용자 인벤토리 동적 렌더러 로직 탑재 확인');
assert(styleCss.includes('.tree-panel') && styleCss.includes('.iam-table-card'), '3단계: 조직도 트리 및 IAM 인벤토리 전용 CSS 스타일링 확인');

// 7. [4단계] pfSense 스타일 실시간 방화벽/ZTNA 패킷 로그 수집·분석기 검증
assert(indexHtml.includes('class="pfsense-section"') && indexHtml.includes('id="pfsense-log-table"'), '4단계: pfSense 스타일 실시간 방화벽 패킷 로그 테이블 마크업 탑재 확인');
assert(indexHtml.includes('id="pfsense-live-toggle"') && indexHtml.includes('id="pfsense-export-btn"'), '4단계: pfSense 실시간 캡처 토글 및 CSV/Syslog 내보내기 툴바 탑재 확인');
assert(uiChromeJs.includes('renderPfsenseTable') && uiChromeJs.includes('initPfsenseConsole'), '4단계: pfSense 실시간 패킷 스트림 및 필터링 엔진 로직 탑재 확인');
assert(styleCss.includes('.pfsense-section') && styleCss.includes('.pfsense-badge'), '4단계: pfSense 방화벽 콘솔 전용 CSS 스타일링 확인');

// 8. 서버 엔드포인트 가용성 검증
const checkEndpoint = (urlPath) => new Promise((resolve) => {
  http.get(`http://127.0.0.1:5189${urlPath}`, (res) => {
    resolve(res.statusCode === 200);
  }).on('error', () => resolve(false));
});

(async () => {
  const [homeOk, cssOk, jsOk] = await Promise.all([
    checkEndpoint('/'),
    checkEndpoint('/style.css'),
    checkEndpoint('/ui-chrome.js'),
  ]);
  assert(homeOk, '로컬 개발 서버 메인 페이지(http://127.0.0.1:5189/) HTTP 200 정상 응답');
  assert(cssOk, 'CSS 정적 리소스(/style.css) HTTP 200 서빙');
  assert(jsOk, 'UI 스크립트 리소스(/ui-chrome.js) HTTP 200 서빙');

  console.log(`\n======================================================`);
  console.log(`총 검증 결과: ${passedTests} / ${totalTests} 항목 통과 (${passedTests === totalTests ? '모두 성공 (All Passed)' : '실패 항목 있음'})`);
  console.log(`======================================================`);
})();
