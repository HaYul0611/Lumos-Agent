; Inno Setup 6 스크립트: Lumos Agent 설치 프로그램 (setup.exe)
; 첨부 이미지 가이드 2번 요건 준수:
; 1. 사용자 단위 설치 (PrivilegesRequired=lowest, 관리자 권한 불필요)
; 2. 시작 메뉴 바로가기 및 제어판 제거 프로그램(uninstaller) 자동 생성
; 3. 심사/인증서 비용 없는 무료 패키징

#define MyAppName "Lumos Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Lumos Security"
#define MyAppURL "http://127.0.0.1:5189"
#define MyAppExeName "Lumos-Agent.bat"

[Setup]
AppId={{D37E6F10-B14C-4859-9941-C785B88E523A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\Lumos-Agent
DisableProgramGroupPage=yes
; 사용자 단위 설치 (관리자 권한 요구하지 않음)
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=Lumos-Agent-setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\app.ico
UninstallDisplayIcon={app}\app.ico
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Windows 부팅 시 Lumos Agent 백그라운드 자동 실행 (추천)"; GroupDescription: "시스템 시작 설정:"

[Files]
; 앱 실행 소스 파일 복사 (버전 관리/임시 폴더 제외)
Source: "..\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,node_modules\*,dist\*,tools\dist\*,*.iss,*.tmp"

[Icons]
; 1. 기본 실행 (일반 사용자용 - 검은 창 없는 백그라운드 실행)
Name: "{autoprograms}\{#MyAppName}\{#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\Lumos-Agent.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
; 2. IT 관리자/엔지니어용 디버그 모드 (실시간 콘솔 로그 확인)
Name: "{autoprograms}\{#MyAppName}\{#MyAppName} (디버그 모드)"; Filename: "{app}\Lumos-Agent-debug.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
; 3. 서비스 종료
Name: "{autoprograms}\{#MyAppName}\{#MyAppName} 종료"; Filename: "{app}\Lumos-Agent-stop.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
; 4. 제거 프로그램
Name: "{autoprograms}\{#MyAppName}\{#MyAppName} 제거"; Filename: "{uninstallexe}"
; 5. 바탕화면 바로가기 (일반 사용자용 - 검은 창 없이 브라우저 바로 실행)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\Lumos-Agent.vbs"""; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\app.ico"
; 6. 윈도우 시작 시 자동 실행 바로가기 (부팅 시 무소음 백그라운드 상주)
Name: "{userstartup}\{#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\Lumos-Agent.vbs"""; WorkingDir: "{app}"; Tasks: startupicon; IconFilename: "{app}\app.ico"

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\Lumos-Agent.vbs"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: postinstall nowait skipifsilent
