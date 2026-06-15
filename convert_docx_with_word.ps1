param(
    [Parameter(Mandatory = $true)]
    [string]$InputDocx,

    [Parameter(Mandatory = $true)]
    [string]$OutputPdf,

    [string]$OutputXps
)

$outputDirectory = Split-Path -Parent $OutputPdf
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$word = $null
$document = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $document = $word.Documents.Open($InputDocx, $false, $true)
    $document.Fields.Update() | Out-Null
    $document.ExportAsFixedFormat($OutputPdf, 17)
    if ($OutputXps) {
        $xpsDirectory = Split-Path -Parent $OutputXps
        if (-not (Test-Path -LiteralPath $xpsDirectory)) {
            New-Item -ItemType Directory -Path $xpsDirectory -Force | Out-Null
        }
        $document.ExportAsFixedFormat($OutputXps, 18)
    }
}
finally {
    if ($null -ne $document) {
        try { $document.Close($false) } catch {}
    }
    if ($null -ne $word) {
        try { $word.Quit() } catch {}
    }
}

Get-Item -LiteralPath $OutputPdf | Select-Object FullName, Length, LastWriteTime
if ($OutputXps) {
    Get-Item -LiteralPath $OutputXps | Select-Object FullName, Length, LastWriteTime
}
