$baseDir = (Resolve-Path "$PSScriptRoot\..\").Path
$geojsonPath = Join-Path $baseDir 'processed\locations.geojson'
$csvPath = Join-Path $baseDir 'processed\locations.csv'
$outJsonPath = Join-Path $baseDir 'processed\locations_full.json'
$outCsvPath = Join-Path $baseDir 'processed\locations_full.csv'

$geo = Get-Content $geojsonPath -Raw | ConvertFrom-Json
$csv = Import-Csv $csvPath

$csvById = @{}
foreach ($row in $csv) { $csvById[$row.id] = $row }

$features = @()
foreach ($feat in $geo.features) {
    $props = $feat.properties
    $fid = $props.id.ToString()
    if ($csvById.ContainsKey($fid)) {
        $row = $csvById[$fid]
        foreach ($col in $row.PSObject.Properties.Name) {
            $props | Add-Member -NotePropertyName $col -NotePropertyValue $row.$col -Force
        }
    }
    $features += [pscustomobject]@{ type='Feature'; geometry=$feat.geometry; properties=$props }
}

# Write FeatureCollection JSON
$fc = [pscustomobject]@{ type='FeatureCollection'; features=$features }
$fc | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 $outJsonPath

# Write CSV of merged properties
$mergedProps = $features | ForEach-Object { $_.properties }
$mergedProps | Export-Csv -Path $outCsvPath -NoTypeInformation -Encoding utf8
