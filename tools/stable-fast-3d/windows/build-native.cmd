@echo off
setlocal EnableExtensions

if "%~4"=="" (
  echo Usage: build-native.cmd VSDEVCMD ENV_ROOT REPO_ROOT CUDA_HOME
  exit /b 2
)

set "VSDEVCMD=%~1"
set "ENV_ROOT=%~2"
set "REPO_ROOT=%~3"
set "CUDA_HOME=%~4"
set "CUDA_PATH=%CUDA_HOME%"
set "PATH=%CUDA_HOME%\bin;%ENV_ROOT%;%ENV_ROOT%\Scripts;%ENV_ROOT%\Library\bin;%PATH%"
for %%I in ("%REPO_ROOT%\..") do set "SF3D_ROOT=%%~fI"
set "PIP_CACHE_DIR=%SF3D_ROOT%\cache\pip"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"
set "CHERNOBOG_SF3D_REPOSITORY=%REPO_ROOT%"
set "DEPENDENCY_MARKER=%SF3D_ROOT%\.native-dependencies-complete"
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

if exist "%DEPENDENCY_MARKER%" goto run_smoke_test

"%ENV_ROOT%\python.exe" -c "from importlib.metadata import version; import texture_baker, uv_unwrapper; assert version('transformers') == '4.42.3'; assert version('rembg') == '2.0.57'" >nul 2>&1
if not errorlevel 1 (
  >"%DEPENDENCY_MARKER%" echo Native dependencies detected and importable.
  goto run_smoke_test
)

if exist "%REPO_ROOT%\texture_baker\build" rmdir /s /q "%REPO_ROOT%\texture_baker\build"
if exist "%REPO_ROOT%\uv_unwrapper\build" rmdir /s /q "%REPO_ROOT%\uv_unwrapper\build"

"%ENV_ROOT%\python.exe" -m pip install --upgrade setuptools==69.5.1 wheel ninja==1.11.1.1
if errorlevel 1 exit /b %errorlevel%

"%ENV_ROOT%\python.exe" -m pip install --no-build-isolation -r requirements.txt
if errorlevel 1 exit /b %errorlevel%

>"%DEPENDENCY_MARKER%" echo Native dependencies installed successfully.

:run_smoke_test
"%ENV_ROOT%\python.exe" "%~dp0native-smoke-test.py"
if errorlevel 1 exit /b %errorlevel%

exit /b 0
