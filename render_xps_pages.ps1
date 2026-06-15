param(
    [Parameter(Mandatory = $true)]
    [string]$InputXps,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [int]$Dpi = 144
)

Add-Type -AssemblyName ReachFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}

$xps = New-Object System.Windows.Xps.Packaging.XpsDocument($InputXps, [System.IO.FileAccess]::Read)

try {
    $sequence = $xps.GetFixedDocumentSequence()
    $paginator = $sequence.DocumentPaginator
    $scale = $Dpi / 96.0

    for ($index = 0; $index -lt $paginator.PageCount; $index++) {
        $page = $paginator.GetPage($index)
        $width = [int][Math]::Ceiling($page.Size.Width * $scale)
        $height = [int][Math]::Ceiling($page.Size.Height * $scale)

        $visual = New-Object System.Windows.Media.DrawingVisual
        $context = $visual.RenderOpen()
        try {
            $context.DrawRectangle(
                [System.Windows.Media.Brushes]::White,
                $null,
                (New-Object System.Windows.Rect(0, 0, $width, $height))
            )
            $brush = New-Object System.Windows.Media.VisualBrush($page.Visual)
            $context.DrawRectangle(
                $brush,
                $null,
                (New-Object System.Windows.Rect(0, 0, $width, $height))
            )
        }
        finally {
            $context.Close()
        }

        $bitmap = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(
            $width,
            $height,
            $Dpi,
            $Dpi,
            [System.Windows.Media.PixelFormats]::Pbgra32
        )
        $bitmap.Render($visual)

        $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
        $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
        $path = Join-Path $OutputDirectory ("page-{0:D2}.png" -f ($index + 1))
        $stream = [System.IO.File]::Create($path)
        try {
            $encoder.Save($stream)
        }
        finally {
            $stream.Close()
        }
    }

    [PSCustomObject]@{
        PageCount = $paginator.PageCount
        OutputDirectory = $OutputDirectory
    }
}
finally {
    $xps.Close()
}
