# Installe de quoi faire tourner Qwen-Image en quantifié GGUF sur la RX 9070.
#
# Pourquoi le GGUF : le fp8 officiel pese ~20 Go alors que la carte n'a que
# 15,9 Go de VRAM. ComfyUI faisait donc transiter des couches depuis la RAM a
# chaque etape, d'ou 9 a 15 minutes par image. Le Q4_K_M tient a ~12,5 Go,
# donc entierement en VRAM.
#
# Tout ce qui est telecharge est en Apache 2.0, usage commercial autorise.

$ErrorActionPreference = 'Stop'

$COMFY   = 'D:\MOAT\ComfyUI\ComfyUI'
$VENV    = 'D:\MOAT\ComfyUI\.venv\Scripts\python.exe'
$MODELS  = 'C:\Users\Adem\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models'
$NODES   = Join-Path $COMFY 'custom_nodes'

function Step($msg) { Write-Host "`n=== $msg ===" }

# curl.exe est livre avec Windows 10+ et sait reprendre un transfert
# interrompu, ce qui compte pour un fichier de 12 Go.
#
# La taille distante est lue par une requete HEAD avant de decider : un
# fichier deja sur disque peut n'etre qu'un transfert coupe en cours de route,
# et l'ignorer laisserait un modele tronque qu'aucun message d'erreur ne
# signalerait avant l'echec du chargement dans ComfyUI.
function Fetch($url, $dest, $label) {
  $dir = Split-Path $dest -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

  $remote = 0
  try {
    $head = Invoke-WebRequest -Uri $url -Method Head -MaximumRedirection 10 -UseBasicParsing
    $remote = [int64]$head.Headers['Content-Length'][0]
  } catch {
    Write-Host "  $label : taille distante inconnue, on tente la reprise"
  }

  if (Test-Path $dest) {
    $local = (Get-Item $dest).Length
    if ($remote -gt 0 -and $local -eq $remote) {
      Write-Host "  $label : complet ($([math]::Round($local/1MB)) Mo), ignore"
      return
    }
    Write-Host "  $label : partiel $([math]::Round($local/1MB)) / $([math]::Round($remote/1MB)) Mo, reprise"
  } else {
    Write-Host "  $label : telechargement de $([math]::Round($remote/1MB)) Mo..."
  }

  # -C - reprend a l'octet ou le transfert s'etait arrete.
  & curl.exe -L --fail --retry 5 --retry-delay 5 --retry-all-errors -C - -o $dest $url
  if ($LASTEXITCODE -ne 0) { throw "$label : echec curl (code $LASTEXITCODE)" }

  $final = (Get-Item $dest).Length
  if ($remote -gt 0 -and $final -ne $remote) {
    throw "$label : taille finale $final differe de $remote"
  }
  Write-Host "  $label : OK, $([math]::Round($final/1MB)) Mo"
}

Step 'Extension ComfyUI-GGUF'
$gguf = Join-Path $NODES 'ComfyUI-GGUF'
if (Test-Path $gguf) {
  Write-Host '  deja installee'
} else {
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
              [System.Environment]::GetEnvironmentVariable('Path','User')
  & git clone --depth 1 https://github.com/city96/ComfyUI-GGUF.git $gguf
  if ($LASTEXITCODE -ne 0) { throw 'git clone a echoue' }
  Write-Host '  clonee'
}

$req = Join-Path $gguf 'requirements.txt'
if (Test-Path $req) {
  Write-Host '  installation des dependances dans le venv...'
  & $VENV -m pip install --quiet -r $req
  if ($LASTEXITCODE -ne 0) { Write-Host '  (pip a renvoye une erreur, a verifier)' }
  else { Write-Host '  dependances OK' }
}

Step 'Modele de diffusion quantifie'
Fetch 'https://huggingface.co/unsloth/Qwen-Image-2512-GGUF/resolve/main/qwen-image-2512-Q4_K_M.gguf' `
      (Join-Path $MODELS 'unet\qwen-image-2512-Q4_K_M.gguf') `
      'qwen-image-2512-Q4_K_M.gguf'

Step 'Encodeur de texte'
Fetch 'https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors' `
      (Join-Path $MODELS 'text_encoders\qwen_2.5_vl_7b_fp8_scaled.safetensors') `
      'qwen_2.5_vl_7b_fp8_scaled.safetensors'

Step 'VAE'
Fetch 'https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors' `
      (Join-Path $MODELS 'vae\qwen_image_vae.safetensors') `
      'qwen_image_vae.safetensors'

Step 'Bilan'
foreach ($d in @('unet', 'text_encoders', 'vae', 'checkpoints')) {
  $p = Join-Path $MODELS $d
  if (Test-Path $p) {
    Get-ChildItem $p -File | ForEach-Object {
      "  $d/$($_.Name)  $([math]::Round($_.Length/1MB)) Mo"
    }
  }
}

Write-Host "`nTermine. ComfyUI doit etre redemarre pour voir l'extension et les modeles."
