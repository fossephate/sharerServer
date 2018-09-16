REM https://stackoverflow.com/questions/7044985/how-can-i-auto-elevate-my-batch-file-so-that-it-requests-from-uac-administrator/28467343#28467343
::::::::::::::::::::::::::::::::::::::::::::
:: Elevate.cmd - Version 4
:: Automatically check & get admin rights
::::::::::::::::::::::::::::::::::::::::::::
	@echo off
	CLS
	ECHO.
	ECHO =============================
	ECHO Running Admin shell
	ECHO =============================

:init
	setlocal DisableDelayedExpansion
	set cmdInvoke=1
	set winSysFolder=System32
	set "batchPath=%~0"
	for %%k in (%0) do set batchName=%%~nk
	set "vbsGetPrivileges=%temp%\OEgetPriv_%batchName%.vbs"
	setlocal EnableDelayedExpansion

:checkPrivileges
	NET FILE 1>NUL 2>NUL
	if '%errorlevel%' == '0' ( goto gotPrivileges ) else ( goto getPrivileges )

:getPrivileges
	if '%1'=='ELEV' (echo ELEV & shift /1 & goto gotPrivileges)
	ECHO.
	ECHO **************************************
	ECHO Invoking UAC for Privilege Escalation
	ECHO **************************************

	ECHO Set UAC = CreateObject^("Shell.Application"^) > "%vbsGetPrivileges%"
	ECHO args = "ELEV " >> "%vbsGetPrivileges%"
	ECHO For Each strArg in WScript.Arguments >> "%vbsGetPrivileges%"
	ECHO args = args ^& strArg ^& " "  >> "%vbsGetPrivileges%"
	ECHO Next >> "%vbsGetPrivileges%"

	if '%cmdInvoke%'=='1' goto InvokeCmd 

	ECHO UAC.ShellExecute "!batchPath!", args, "", "runas", 1 >> "%vbsGetPrivileges%"
	goto ExecElevation

:InvokeCmd
	ECHO args = "/c """ + "!batchPath!" + """ " + args >> "%vbsGetPrivileges%"
	ECHO UAC.ShellExecute "%SystemRoot%\%winSysFolder%\cmd.exe", args, "", "runas", 1 >> "%vbsGetPrivileges%"

:ExecElevation
	"%SystemRoot%\%winSysFolder%\WScript.exe" "%vbsGetPrivileges%" %*
	exit /B

:gotPrivileges
	setlocal & cd /d %~dp0
	if '%1'=='ELEV' (del "%vbsGetPrivileges%" 1>nul 2>nul & shift /1)

	::::::::::::::::::::::::::::
	::START
	::::::::::::::::::::::::::::
	REM Run shell as admin (example) - put here code as you like
	cd /d "%~dp0"

	echo Installing ViGEm gamepad driver
	

	REM check if 32 / 64 bit
	if exist "%PROGRAMFILES(X86)%" (GOTO 64BIT) ELSE (GOTO 32BIT)
	:32BIT
		call devcon\x86\devcon.exe remove Root\ViGEmBus >nul 2>&1
		call devcon\x86\devcon.exe install ViGEmDriver\x86\ViGEmBus.inf Root\ViGEmBus >nul 2>&1
		GOTO END
	:64BIT
		call devcon\x64\devcon.exe remove Root\ViGEmBus >nul 2>&1
		call devcon\x64\devcon.exe install ViGEmDriver\x64\ViGEmBus.inf Root\ViGEmBus >nul 2>&1
		GOTO END
	:END
		if %ERRORLEVEL% == 0 goto :success
		echo Installation failed
		pause
		exit

:success
	echo Installation succeeded
	pause
	exit