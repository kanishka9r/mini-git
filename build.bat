@echo off
echo Compiling Mini-Git using MSYS2 MinGW-w64...
set PATH=C:\msys64\mingw64\bin;%PATH%
g++.exe -std=c++17 -Iinclude -Ilibs src\main.cpp src\vcs.cpp src\storage.cpp src\commit.cpp src\branch.cpp src\graph.cpp src\diff.cpp src\merge.cpp src\config_manager.cpp src\api_server.cpp -o vcs.exe -lws2_32
if %errorlevel% equ 0 (
    echo Build successful: vcs.exe
) else (
    echo Build failed.
)
