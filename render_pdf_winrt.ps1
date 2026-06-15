param(
    [Parameter(Mandatory = $true)]
    [string]$InputPdf,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [int]$Dpi = 144
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
        $_.Name -eq "AsTask" -and
        $_.IsGenericMethod -and
        $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1

$asTaskAction = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
        $_.Name -eq "AsTask" -and
        -not $_.IsGenericMethod -and
        $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1

function Await-Result {
    param(
        [Parameter(Mandatory = $true)]$Operation,
        [Parameter(Mandatory = $true)][Type]$ResultType
    )

    $method = $asTaskGeneric.MakeGenericMethod($ResultType)
    $task = $method.Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

function Await-Action {
    param([Parameter(Mandatory = $true)]$Operation)

    $task = $asTaskAction.Invoke($null, @($Operation))
    $task.Wait()
}

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}

$inputFile = Await-Result (
    [Windows.Storage.StorageFile]::GetFileFromPathAsync($InputPdf)
) ([Windows.Storage.StorageFile])

$pdf = Await-Result (
    [Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($inputFile)
) ([Windows.Data.Pdf.PdfDocument])

$outputFolder = Await-Result (
    [Windows.Storage.StorageFolder]::GetFolderFromPathAsync($OutputDirectory)
) ([Windows.Storage.StorageFolder])

for ($index = 0; $index -lt $pdf.PageCount; $index++) {
    $page = $pdf.GetPage($index)
    try {
        $outputFile = Await-Result (
            $outputFolder.CreateFileAsync(
                ("page-{0:D2}.png" -f ($index + 1)),
                [Windows.Storage.CreationCollisionOption]::ReplaceExisting
            )
        ) ([Windows.Storage.StorageFile])

        $stream = Await-Result (
            $outputFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)
        ) ([Windows.Storage.Streams.IRandomAccessStream])

        try {
            $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
            $options.DestinationWidth = [uint32][Math]::Ceiling($page.Size.Width * $Dpi / 96.0)
            $options.DestinationHeight = [uint32][Math]::Ceiling($page.Size.Height * $Dpi / 96.0)
            Await-Action ($page.RenderToStreamAsync($stream, $options))
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $page.Dispose()
    }
}

[PSCustomObject]@{
    PageCount = $pdf.PageCount
    OutputDirectory = $OutputDirectory
}
