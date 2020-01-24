
# requires installed UglifyJS2 for minification ('npm install uglify-js -g'): https://github.com/mishoo/UglifyJS2
$currentDir = (Get-Item -Path ".\").FullName
Write-Host "Running Typescript compiler in: $currentDir"
tsc --listEmittedFiles
Write-Host "Done!"

Write-Host ""

Write-Host -NoNewLine "Replacing export related string occurences ... "
(Get-Content .\js\BBSeeker.js).replace('Object.defineProperty(exports, "__esModule", { value: true });', '') | Set-Content .\js\BBSeeker.js
(Get-Content .\js\BBSeeker.js).replace('(BBSeeker = exports.BBSeeker || (exports.BBSeeker = {}));', '(BBSeeker || (BBSeeker = {}));') | Set-Content .\js\BBSeeker.js
Write-Host "Done!"


Write-Host -NoNewLine "Running minification of BBSeeker.js ... "
uglifyjs .\js\BBSeeker.js -o .\js\BBSeeker.min.js
Write-Host "Done!"

Write-Host -NoNewLine "Clone BBSeeker.ts to Node.js package directory ... "
copy ts/BBSeeker.ts ts/npmPackages/BBSeeker/lib.ts
Write-Host "Done!"

Write-Host -NoNewLine "Clone BBSeeker.js to Node.js package directory ... "
copy js/BBSeeker.js ts/npmPackages/BBSeeker/lib.js
Write-Host "Done!"

Write-Host -NoNewLine "Clone BBSeeker.js.map to Node.js package directory ... "
copy js/BBSeeker.js.map ts/npmPackages/BBSeeker/lib.js.map
Write-Host "Done!"

$DTS = "d:\bb-seeker\BBSeeker\src\BBSeeker\js\BBSeeker.d.ts"
if(Test-Path $DTS){
Write-Host -NoNewLine "Clone BBSeeker.d.ts to Node.js package directory ... "
copy js/BBSeeker.d.ts ts/npmPackages/BBSeeker/lib.d.ts
Write-Host "Done!"

Write-Host -NoNewLine "Removing BBSeeker.d.ts from ./js"
Remove-Item $DTS
Write-Host " ... Done!"
}

