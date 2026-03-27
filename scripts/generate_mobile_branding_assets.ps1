param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-Color {
  param(
    [string]$Hex,
    [int]$Alpha = 255
  )

  $value = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function New-Bitmap {
  param(
    [int]$Width,
    [int]$Height
  )

  return New-Object System.Drawing.Bitmap(
    $Width,
    $Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
}

function Set-HighQualityDrawing {
  param(
    [System.Drawing.Graphics]$Graphics
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function Draw-CenteredImage {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height
  )

  $scale = [Math]::Min($Width / $Image.Width, $Height / $Image.Height)
  $drawWidth = [float]$Image.Width * $scale
  $drawHeight = [float]$Image.Height * $scale
  $drawX = $X + (($Width - $drawWidth) / 2)
  $drawY = $Y + (($Height - $drawHeight) / 2)

  $Graphics.DrawImage($Image, $drawX, $drawY, $drawWidth, $drawHeight)
}

function Save-Png {
  param(
    [System.Drawing.Image]$Image,
    [string]$Path
  )

  $directory = Split-Path -Path $Path -Parent
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $Image.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Resize-Image {
  param(
    [System.Drawing.Image]$Source,
    [int]$Width,
    [int]$Height
  )

  $target = New-Bitmap -Width $Width -Height $Height
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  try {
    Set-HighQualityDrawing -Graphics $graphics
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($Source, 0, 0, $Width, $Height)
  } finally {
    $graphics.Dispose()
  }

  return $target
}

function Draw-CenteredText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Bounds
  )

  $format = New-Object System.Drawing.StringFormat
  try {
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
    $Graphics.DrawString($Text, $Font, $Brush, $Bounds, $format)
  } finally {
    $format.Dispose()
  }
}

$mobileRoot = Join-Path $RepoRoot "apps\infinity_portal_mobile"
$logoSourcePath = Join-Path $RepoRoot "apps\web\public\infinity-logo.png"
$brandingRoot = Join-Path $mobileRoot "assets\branding"
$androidResRoot = Join-Path $mobileRoot "android\app\src\main\res"
$iosAssetsRoot = Join-Path $mobileRoot "ios\Runner\Assets.xcassets"

if (-not (Test-Path $logoSourcePath)) {
  throw "Logo asset not found at $logoSourcePath"
}

New-Item -ItemType Directory -Path $brandingRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $androidResRoot "drawable-nodpi") -Force | Out-Null

$logo = [System.Drawing.Image]::FromFile($logoSourcePath)

try {
  Copy-Item -Path $logoSourcePath -Destination (Join-Path $brandingRoot "infinity-logo.png") -Force

  $iconMaster = New-Bitmap -Width 1024 -Height 1024
  $iconGraphics = [System.Drawing.Graphics]::FromImage($iconMaster)
  try {
    Set-HighQualityDrawing -Graphics $iconGraphics

    $iconRect = New-Object System.Drawing.Rectangle 0, 0, 1024, 1024
    $iconBackground = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $iconRect,
      (New-Color "#0A1C3F"),
      (New-Color "#1452D3"),
      45
    )
    try {
      $iconGraphics.FillRectangle($iconBackground, $iconRect)
    } finally {
      $iconBackground.Dispose()
    }

    $glowBrushA = New-Object System.Drawing.SolidBrush (New-Color "#FFFFFF" 36)
    $glowBrushB = New-Object System.Drawing.SolidBrush (New-Color "#EAB64A" 56)
    try {
      $iconGraphics.FillEllipse($glowBrushA, 110, 70, 430, 430)
      $iconGraphics.FillEllipse($glowBrushB, 640, 720, 220, 220)
    } finally {
      $glowBrushA.Dispose()
      $glowBrushB.Dispose()
    }

    $shadowPath = New-RoundedRectanglePath -X 128 -Y 160 -Width 768 -Height 704 -Radius 144
    $shadowBrush = New-Object System.Drawing.SolidBrush (New-Color "#07132A" 34)
    try {
      $iconGraphics.TranslateTransform(0, 18)
      $iconGraphics.FillPath($shadowBrush, $shadowPath)
      $iconGraphics.ResetTransform()
    } finally {
      $shadowBrush.Dispose()
      $shadowPath.Dispose()
    }

    $cardPath = New-RoundedRectanglePath -X 128 -Y 142 -Width 768 -Height 704 -Radius 144
    $cardRect = New-Object System.Drawing.Rectangle 128, 142, 768, 704
    $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $cardRect,
      (New-Color "#FFFFFF"),
      (New-Color "#EEF4FF"),
      90
    )
    $cardBorder = New-Object System.Drawing.Pen (New-Color "#D8E3FF"), 4
    try {
      $iconGraphics.FillPath($cardBrush, $cardPath)
      $iconGraphics.DrawPath($cardBorder, $cardPath)
    } finally {
      $cardBrush.Dispose()
      $cardBorder.Dispose()
      $cardPath.Dispose()
    }

    Draw-CenteredImage -Graphics $iconGraphics -Image $logo -X 184 -Y 278 -Width 656 -Height 368

    $accentBrush = New-Object System.Drawing.SolidBrush (New-Color "#EAB64A")
    try {
      $iconGraphics.FillEllipse($accentBrush, 478, 742, 68, 68)
    } finally {
      $accentBrush.Dispose()
    }
  } finally {
    $iconGraphics.Dispose()
  }

  Save-Png -Image $iconMaster -Path (Join-Path $brandingRoot "app_icon_source.png")

  $androidIcons = @{
    "mipmap-mdpi\ic_launcher.png" = 48
    "mipmap-hdpi\ic_launcher.png" = 72
    "mipmap-xhdpi\ic_launcher.png" = 96
    "mipmap-xxhdpi\ic_launcher.png" = 144
    "mipmap-xxxhdpi\ic_launcher.png" = 192
    "mipmap-mdpi\ic_launcher_round.png" = 48
    "mipmap-hdpi\ic_launcher_round.png" = 72
    "mipmap-xhdpi\ic_launcher_round.png" = 96
    "mipmap-xxhdpi\ic_launcher_round.png" = 144
    "mipmap-xxxhdpi\ic_launcher_round.png" = 192
  }

  foreach ($relativePath in $androidIcons.Keys) {
    $size = $androidIcons[$relativePath]
    $resized = Resize-Image -Source $iconMaster -Width $size -Height $size
    try {
      Save-Png -Image $resized -Path (Join-Path $androidResRoot $relativePath)
    } finally {
      $resized.Dispose()
    }
  }

  $iosContentsPath = Join-Path $iosAssetsRoot "AppIcon.appiconset\Contents.json"
  $iosDefinitions = (Get-Content -Path $iosContentsPath -Raw | ConvertFrom-Json).images
  foreach ($entry in $iosDefinitions) {
    if (-not $entry.filename) {
      continue
    }

    $baseSize, $baseScale = $entry.size -split "x", 2
    $scaleMultiplier = [int]($entry.scale.TrimEnd("x"))
    $pixelSize = [int]([Math]::Round([double]$baseSize * $scaleMultiplier))
    $resized = Resize-Image -Source $iconMaster -Width $pixelSize -Height $pixelSize
    try {
      Save-Png -Image $resized -Path (Join-Path $iosAssetsRoot "AppIcon.appiconset\$($entry.filename)")
    } finally {
      $resized.Dispose()
    }
  }

  $brandingImage = Resize-Image -Source $logo -Width 640 -Height 426
  try {
    Save-Png -Image $brandingImage -Path (Join-Path $androidResRoot "drawable-nodpi\android12_branding.png")
  } finally {
    $brandingImage.Dispose()
  }

  $heroMaster = New-Bitmap -Width 960 -Height 1380
  $heroGraphics = [System.Drawing.Graphics]::FromImage($heroMaster)
  try {
    Set-HighQualityDrawing -Graphics $heroGraphics
    $heroGraphics.Clear([System.Drawing.Color]::Transparent)

    $haloBrushA = New-Object System.Drawing.SolidBrush (New-Color "#6BA5E8" 42)
    $haloBrushB = New-Object System.Drawing.SolidBrush (New-Color "#EAB64A" 34)
    try {
      $heroGraphics.FillEllipse($haloBrushA, 80, 40, 360, 360)
      $heroGraphics.FillEllipse($haloBrushB, 640, 170, 210, 210)
    } finally {
      $haloBrushA.Dispose()
      $haloBrushB.Dispose()
    }

    $heroShadowPath = New-RoundedRectanglePath -X 78 -Y 144 -Width 804 -Height 1000 -Radius 86
    $heroShadowBrush = New-Object System.Drawing.SolidBrush (New-Color "#07132A" 28)
    try {
      $heroGraphics.TranslateTransform(0, 22)
      $heroGraphics.FillPath($heroShadowBrush, $heroShadowPath)
      $heroGraphics.ResetTransform()
    } finally {
      $heroShadowBrush.Dispose()
      $heroShadowPath.Dispose()
    }

    $heroCardPath = New-RoundedRectanglePath -X 78 -Y 122 -Width 804 -Height 1000 -Radius 86
    $heroCardRect = New-Object System.Drawing.Rectangle 78, 122, 804, 1000
    $heroCardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $heroCardRect,
      (New-Color "#FFFFFF" 246),
      (New-Color "#F4F8FF" 246),
      90
    )
    $heroBorderPen = New-Object System.Drawing.Pen (New-Color "#D7E4FF"), 3
    try {
      $heroGraphics.FillPath($heroCardBrush, $heroCardPath)
      $heroGraphics.DrawPath($heroBorderPen, $heroCardPath)
    } finally {
      $heroCardBrush.Dispose()
      $heroBorderPen.Dispose()
      $heroCardPath.Dispose()
    }

    $pillPath = New-RoundedRectanglePath -X 270 -Y 190 -Width 420 -Height 86 -Radius 43
    $pillRect = New-Object System.Drawing.Rectangle 270, 190, 420, 86
    $pillBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $pillRect,
      (New-Color "#0C2E73"),
      (New-Color "#1452D3"),
      0
    )
    try {
      $heroGraphics.FillPath($pillBrush, $pillPath)
    } finally {
      $pillBrush.Dispose()
      $pillPath.Dispose()
    }

    $pillFont = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $pillBrushText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    try {
      Draw-CenteredText -Graphics $heroGraphics -Text "INFINITY SPORTS" -Font $pillFont -Brush $pillBrushText -Bounds (New-Object System.Drawing.RectangleF 270, 190, 420, 86)
    } finally {
      $pillFont.Dispose()
      $pillBrushText.Dispose()
    }

    Draw-CenteredImage -Graphics $heroGraphics -Image $logo -X 160 -Y 320 -Width 640 -Height 280

    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 66, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 31, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $captionFont = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $titleBrush = New-Object System.Drawing.SolidBrush (New-Color "#07132A")
    $subtitleBrush = New-Object System.Drawing.SolidBrush (New-Color "#48627F")
    $captionBrush = New-Object System.Drawing.SolidBrush (New-Color "#0C2E73")
    $goldBrush = New-Object System.Drawing.SolidBrush (New-Color "#EAB64A")
    try {
      Draw-CenteredText -Graphics $heroGraphics -Text "Infinity Portal" -Font $titleFont -Brush $titleBrush -Bounds (New-Object System.Drawing.RectangleF 120, 646, 720, 92)
      $heroGraphics.FillRectangle($goldBrush, 395, 770, 170, 10)
      Draw-CenteredText -Graphics $heroGraphics -Text "Bookings, registrations, and follow-up in one calm control room." -Font $subtitleFont -Brush $subtitleBrush -Bounds (New-Object System.Drawing.RectangleF 136, 826, 688, 160)
      Draw-CenteredText -Graphics $heroGraphics -Text "Powered by Infinity Sports" -Font $captionFont -Brush $captionBrush -Bounds (New-Object System.Drawing.RectangleF 180, 1012, 600, 58)
    } finally {
      $titleFont.Dispose()
      $subtitleFont.Dispose()
      $captionFont.Dispose()
      $titleBrush.Dispose()
      $subtitleBrush.Dispose()
      $captionBrush.Dispose()
      $goldBrush.Dispose()
    }
  } finally {
    $heroGraphics.Dispose()
  }

  Save-Png -Image $heroMaster -Path (Join-Path $brandingRoot "launch_hero.png")

  $androidHero = Resize-Image -Source $heroMaster -Width 900 -Height 1294
  try {
    Save-Png -Image $androidHero -Path (Join-Path $androidResRoot "drawable-nodpi\launch_hero.png")
  } finally {
    $androidHero.Dispose()
  }

  $iosLaunchTargets = @{
    "LaunchImage.png" = @{ Width = 320; Height = 460 }
    "LaunchImage@2x.png" = @{ Width = 640; Height = 920 }
    "LaunchImage@3x.png" = @{ Width = 960; Height = 1380 }
  }

  foreach ($filename in $iosLaunchTargets.Keys) {
    $target = $iosLaunchTargets[$filename]
    $resized = Resize-Image -Source $heroMaster -Width $target.Width -Height $target.Height
    try {
      Save-Png -Image $resized -Path (Join-Path $iosAssetsRoot "LaunchImage.imageset\$filename")
    } finally {
      $resized.Dispose()
    }
  }
} finally {
  $logo.Dispose()
}

Write-Output "Mobile branding assets generated successfully."
