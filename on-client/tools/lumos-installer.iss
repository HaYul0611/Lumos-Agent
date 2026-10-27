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
UninstallDisplayIcon={app}\public\favicon.png

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; 앱 실행 소스 파일 복사 (버전 관리/임시 폴더 제외)
Source: "..\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,node_modules\*,dist\*,tools\dist\*,*.iss,*.tmp"

[Icons]
Name: "{autoprograms}\{#MyAppName}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autoprograms}\{#MyAppName}\{#MyAppName} 제거"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall nowait skipifsilent
