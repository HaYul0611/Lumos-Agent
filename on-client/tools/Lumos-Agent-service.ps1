<#
.SYNOPSIS
    Lumos Agent 엔터프라이즈 백그라운드 서비스 관리 스크립트
.DESCRIPTION
    병원, 공항, 사내 엔터프라이즈 환경에서 관리자 콘솔 창 없이
    Windows 백그라운드 작업/서비스로 영구 상주하도록 설치/관리합니다.
.PARAMETER Action
    Install, Uninstall, Start, Stop, Status 중 선택
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet("Install", "Uninstall", "Start", "Stop", "Status")]
    [string]$Action = "Status"
)

$TaskName = "LumosAgentService"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClientDir = Split-Path -Parent $ScriptDir
$VbsPath = Join-Path $ClientDir "Lumos-Agent.vbs"
$StopPath = Join-Path $ClientDir "Lumos-Agent-stop.bat"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Lumos ZTNA & XDR Enterprise Service Controller" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

switch ($Action) {
    "Install" {
        Write-Host "[1/3] 기존 등록 작업 점검 중..." -ForegroundColor Gray
        $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "기존 작업 발견. 이전 작업을 갱신합니다." -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        }

        Write-Host "[2/3] Windows 백그라운드 상주 작업 생성 중..." -ForegroundColor Gray
        $action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPath`"" -WorkingDirectory "$ClientDir"
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null

        Write-Host "[3/3] 서비스 시작 및 상태 확인..." -ForegroundColor Gray
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 2

        Write-Host "`n[성공] Lumos Agent 가 백그라운드 상주 서비스로 설치되었습니다." -ForegroundColor Green
        Write-Host "부팅/로그온 시 검은 창 없이 자동 실행되며, 비정상 종료 시 자동 복구됩니다." -ForegroundColor Green
    }

    "Uninstall" {
        Write-Host "서비스 중지 및 작업 스케줄러 등록 해제 중..." -ForegroundColor Gray
        & "$StopPath" | Out-Null
        $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Host "[완료] Lumos Agent 백그라운드 작업이 완전히 제거되었습니다." -ForegroundColor Green
        } else {
            Write-Host "등록된 LumosAgentService 작업을 찾을 수 없습니다." -ForegroundColor Yellow
        }
    }

    "Start" {
        Write-Host "Lumos Agent 백그라운드 작업 시작 중..." -ForegroundColor Gray
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "[완료] 작업이 시작되었습니다." -ForegroundColor Green
    }

    "Stop" {
        Write-Host "Lumos Agent 서비스 중지 중..." -ForegroundColor Gray
        & "$StopPath"
        Write-Host "[완료] Lumos Agent 서비스가 중지되었습니다." -ForegroundColor Green
    }

    "Status" {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Write-Host "작업 이름   : $($task.TaskName)" -ForegroundColor White
            Write-Host "작업 상태   : $($task.State)" -ForegroundColor White
        } else {
            Write-Host "작업 스케줄러: 등록되지 않음 (수동 실행 모드)" -ForegroundColor Yellow
        }

        # 포트 활성화 여부 확인
        $listening = netstat -ano | findstr ":5189 " | findstr "LISTENING"
        if ($listening) {
            Write-Host "에이전트 데몬: 활성 (127.0.0.1:5189 에서 수신 중)" -ForegroundColor Green
        } else {
            $listeningDemo = netstat -ano | findstr ":5190 " | findstr "LISTENING"
            if ($listeningDemo) {
                Write-Host "에이전트 데몬: 활성 (127.0.0.1:5190 데모 포트에서 수신 중)" -ForegroundColor Green
            } else {
                Write-Host "에이전트 데몬: 중지 상태" -ForegroundColor Red
            }
        }
    }
}
