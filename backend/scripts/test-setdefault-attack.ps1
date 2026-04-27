$base='http://localhost:3001/api'
function P($m,$p,$s,$b=$null){$params=@{Method=$m;Uri="$base$p";WebSession=$s;UseBasicParsing=$true};if($b -ne $null){$params.ContentType='application/json';$params.Body=($b|ConvertTo-Json -Depth 10)};try{$r=Invoke-WebRequest @params;[pscustomobject]@{status=[int]$r.StatusCode;body=($r.Content|ConvertFrom-Json)}}catch{$res=$_.Exception.Response;$sr=New-Object IO.StreamReader($res.GetResponseStream());$c=$sr.ReadToEnd();[pscustomobject]@{status=[int]$res.StatusCode;raw=$c}}}
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$sa=New-Object Microsoft.PowerShell.Commands.WebRequestSession;$sb=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$ea="qa_setdef_a_$stamp@test.local";$eb="qa_setdef_b_$stamp@test.local";$pw='Password123!'
$null=P 'POST' '/auth/signup' $sa @{name='A';email=$ea;password=$pw};$null=P 'POST' '/auth/signup' $sb @{name='B';email=$eb;password=$pw};$null=P 'POST' '/auth/login' $sa @{email=$ea;password=$pw};$null=P 'POST' '/auth/login' $sb @{email=$eb;password=$pw}
$a1=P 'POST' '/user/addresses' $sa @{ name='A One'; phone='9876543210'; street='101 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560001' }
$b1=P 'POST' '/user/addresses' $sb @{ name='B One'; phone='9876543222'; street='201 Test Street'; city='Delhi'; state='Delhi'; pincode='110001' }
$bid=$b1.body.data.address.id
$attack=P 'POST' "/user/addresses/$bid/default" $sa
$bList=P 'GET' '/user/addresses' $sb
$result=[ordered]@{attackStatus=$attack.status;attackBody=$attack.body;victimAddressDefault=(($bList.body.data.addresses|Where-Object{$_.id -eq $bid}|Select-Object -First 1).isDefault)}
$result|ConvertTo-Json -Depth 10
