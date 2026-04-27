$base='http://localhost:3001/api'
function J($r){ if($r){$r|ConvertTo-Json -Depth 10}else{'null'} }
function Call($m,$p,$s,$b=$null){
 $params=@{Method=$m;Uri="$base$p";WebSession=$s;UseBasicParsing=$true}
 if($b -ne $null){$params.ContentType='application/json';$params.Body=($b|ConvertTo-Json -Depth 10)}
 try{$r=Invoke-WebRequest @params; [pscustomobject]@{status=[int]$r.StatusCode;body=($r.Content|ConvertFrom-Json)}}
 catch{$res=$_.Exception.Response; $sr=New-Object IO.StreamReader($res.GetResponseStream()); $c=$sr.ReadToEnd(); [pscustomobject]@{status=[int]$res.StatusCode;raw=$c}}
}
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();$email="dbg_$stamp@test.local";$pass='Password123!';$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$signup=Call 'POST' '/auth/signup' $s @{name='Debug User';email=$email;password=$pass}; Write-Output "signup: $($signup.status) $(J $signup.body)"
$login=Call 'POST' '/auth/login' $s @{email=$email;password=$pass}; Write-Output "login: $($login.status) $(J $login.body)"
$a=Call 'POST' '/user/addresses' $s @{ name='Debug User'; phone='9876543210'; street='101 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560001' }; Write-Output "addr: $($a.status) $(if($a.body){J $a.body}else{$a.raw})"
$c=Call 'POST' '/cart' $s @{ productId='334ff18f-4726-4a82-aed0-ac078a1c4e8d'; variantId='da98029b-4101-4f2f-833b-c72a5aab4775'; size='9'; quantity=1 }; Write-Output "cart add: $($c.status) $(if($c.body){J $c.body}else{$c.raw})"
$cg=Call 'GET' '/cart' $s; Write-Output "cart get: $($cg.status) $(if($cg.body){J $cg.body}else{$cg.raw})"
$o=Call 'POST' '/orders' $s @{ addressId= $a.body.data.address.id; paymentMethod='COD' }; Write-Output "order: $($o.status) $(if($o.body){J $o.body}else{$o.raw})"
