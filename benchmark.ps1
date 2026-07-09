$ErrorActionPreference = "Stop"

# Create a temporary directory for benchmarking
$testDir = "benchmark_test_repo"
if (Test-Path $testDir) {
    Remove-Item -Recurse -Force $testDir
}
New-Item -ItemType Directory -Path $testDir | Out-Null
Set-Location $testDir

Write-Host "Initializing repository..."
..\vcs.exe init | Out-Null

Write-Host "Generating large file set (1000 files)..."
for ($i = 1; $i -le 400; $i++) {
    "This is a test file for benchmarking diff and commit operations. File number $i" | Out-File "file_$i.txt"
}

Write-Host "Adding files..."
..\vcs.exe add . | Out-Null

Write-Host "Measuring commit time..."
$commitTime = Measure-Command {
    ..\vcs.exe commit -m "Initial commit of 1000 files" | Out-Null
}
Write-Host "Commit operation took: $($commitTime.TotalMilliseconds) ms"

Write-Host "Modifying 500 files for diff benchmark..."
for ($i = 1; $i -le 200; $i++) {
    "Adding a new line to simulate modifications." | Out-File -Append "file_$i.txt"
}

Write-Host "Measuring diff time..."
$diffTime = Measure-Command {
    ..\vcs.exe diff | Out-Null
}
Write-Host "Diff operation took: $($diffTime.TotalMilliseconds) ms"

# Cleanup
Set-Location ..
Remove-Item -Recurse -Force $testDir

Write-Host "Benchmark completed."
