<#
  Agente de Inventário de TI — script de inicialização do computador (GPO)

  Roda como SYSTEM a cada boot. Só instala/reinstala quando necessário:
    - agente ainda não instalado;
    - versão na pasta de rede diferente da instalada;
    - servidor ou token diferentes dos configurados na máquina.
  Se o serviço estiver DESATIVADO manualmente na estação, o script respeita e não faz nada.

  Configuração na GPO (aba "Scripts", não "PowerShell Scripts"):
    Nome do script:  powershell.exe
    Parâmetros:      -NoProfile -ExecutionPolicy Bypass -File "\\SERVIDOR\Deploy$\InventarioAgente\instalar-gpo.ps1" -Servidor "https://sistema-inventario-kohl.vercel.app" -Token "TOKEN_DA_EMPRESA"
#>
param(
  [Parameter(Mandatory = $true)][string]$Servidor,
  [Parameter(Mandatory = $true)][string]$Token,
  [int]$Intervalo = 4
)

$ErrorActionPreference = 'Continue'
$origem   = Join-Path $PSScriptRoot 'agente-inventario.exe'
$destino  = 'C:\Program Files\InventarioAgente\agente-inventario.exe'
$dirDados = 'C:\ProgramData\InventarioAgente'
$log      = Join-Path $dirDados 'gpo.log'

New-Item -ItemType Directory -Path $dirDados -Force | Out-Null
if ((Test-Path $log) -and (Get-Item $log).Length -gt 512KB) { Remove-Item $log -Force }
function Log($msg) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $msg) }

if (-not (Test-Path $origem)) { Log "ERRO: não encontrei $origem"; exit 1 }

$Servidor = $Servidor.TrimEnd('/')
$svc = Get-Service -Name InventarioAgente -ErrorAction SilentlyContinue

# Desativado manualmente pelo TI: não reinstala nem inicia
if ($svc -and $svc.StartType -eq 'Disabled') { Log "Serviço desativado nesta estação — nada a fazer."; exit 0 }

$precisa = $true
if ($svc -and (Test-Path $destino)) {
  try {
    $vRede  = (& $origem versao).Trim()
    $vLocal = (& $destino versao).Trim()
    $cfg    = Get-Content (Join-Path $dirDados 'config.json') -Raw | ConvertFrom-Json
    if ($vRede -eq $vLocal -and $cfg.servidor -eq $Servidor -and $cfg.token_empresa -eq $Token -and $cfg.intervalo_horas -eq $Intervalo) {
      $precisa = $false
    } else {
      Log "Atualização necessária (versão $vLocal -> $vRede ou configuração alterada)."
    }
  } catch { Log "Não foi possível comparar a instalação atual: $_" }
}

if ($precisa) {
  Log "Instalando agente a partir de $origem"
  $saida = & $origem instalar -servidor $Servidor -token $Token -intervalo $Intervalo 2>&1
  Log ($saida -join ' | ')
  if ($LASTEXITCODE -ne 0) { Log "ERRO na instalação (código $LASTEXITCODE)"; exit 1 }
  Log "Instalação concluída."
} elseif ($svc.Status -ne 'Running') {
  Start-Service InventarioAgente -ErrorAction SilentlyContinue
  Log "Agente já instalado; serviço estava parado e foi iniciado."
}
exit 0
