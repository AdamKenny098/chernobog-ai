@echo off
setlocal EnableExtensions

if "%~5"=="" (
  echo Usage: run-service.cmd VSDEVCMD ENV_ROOT REPO_ROOT HEALTH_SERVER CUDA_HOME
  exit /b 2
)

set "VSDEVCMD=%~1"
set "ENV_ROOT=%~2"
set "REPO_ROOT=%~3"
set "HEALTH_SERVER=%~4"
set "CUDA_HOME=%~5"
set "CUDA_PATH=%CUDA_HOME%"
set "CHERNOBOG_SF3D_REPOSITORY=%REPO_ROOT%"
set "PATH=%CUDA_HOME%\bin;%ENV_ROOT%;%ENV_ROOT%\Scripts;%ENV_ROOT%\Library\bin;%PATH%"
set "DISTUTILS_USE_SDK=1"
set "MSSdk=1"
set "TORCH_CUDA_ARCH_LIST=8.6"
set "MAX_JOBS=4"
set "USE_CUDA=1"
set "USE_NATIVE_ARCH=0"

call "%VSDEVCMD%" -arch=x64 -host_arch=x64
if errorlevel 1 exit /b %errorlevel%

cd /d "%REPO_ROOT%"
if errorlevel 1 exit /b %errorlevel%

"%ENV_ROOT%\python.exe" "%HEALTH_SERVER%"
if errorlevel 1 exit /b %errorlevel%

exit /b 0
