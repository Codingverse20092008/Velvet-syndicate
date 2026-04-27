$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

function ParseJson($s) { if ([string]::IsNullOrWhiteSpace($s)) { return $null }; return ($s | ConvertFrom-Json) }
function Api($method, $path, $session, $body=$null) {
  $params = @{ Method = $method; Uri = "$base$path"; WebSession = $session; UseBasicParsing = $true }
  if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Depth 10) }
  try { $resp = Invoke-WebRequest @params; return [pscustomobject]@{ status = [int]$resp.StatusCode; body = (ParseJson $resp.Content) } }
  catch {
    $res = $_.Exception.Response
    if ($res -and $res.StatusCode) {
      $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
      $content = $reader.ReadToEnd()
      $parsed = $null
      try { $parsed = ParseJson $content } catch {}
      return [pscustomobject]@{ status = [int]$res.StatusCode; body = $parsed; raw = $content }
    }
    throw
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userA = [pscustomobject]@{ name='QA User A'; email="qa_final_a_$stamp@test.local"; password='Password123!' }
$userB = [pscustomobject]@{ name='QA User B'; email="qa_final_b_$stamp@test.local"; password='Password123!' }
$sessionA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$signupA = Api 'POST' '/auth/signup' $sessionA @{ name=$userA.name; email=$userA.email; password=$userA.password }
$signupB = Api 'POST' '/auth/signup' $sessionB @{ name=$userB.name; email=$userB.email; password=$userB.password }
$loginA = Api 'POST' '/auth/login' $sessionA @{ email=$userA.email; password=$userA.password }
$loginB = Api 'POST' '/auth/login' $sessionB @{ email=$userB.email; password=$userB.password }
$meA = Api 'GET' '/auth/me' $sessionA
$meB = Api 'GET' '/auth/me' $sessionB
$userAId = $meA.body.data.user.id
$userBId = $meB.body.data.user.id

# Phase1 address lifecycle
$addr1 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice One'; phone='9876543210'; street='101 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560001' }
$addr2 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Two'; phone='9876543211'; street='102 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560002' }
$addr3 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Three'; phone='9876543212'; street='103 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560003' }

$addresses1 = Api 'GET' '/user/addresses' $sessionA
$defaultsCountInitial = @($addresses1.body.data.addresses | Where-Object { $_.isDefault -eq $true }).Count
$addr2Id = $addr2.body.data.address.id
$addr3Id = $addr3.body.data.address.id

$setDefaultResp = Api 'POST' "/user/addresses/$addr2Id/default" $sessionA
$addresses2 = Api 'GET' '/user/addresses' $sessionA
$defaultsCountAfterSet = @($addresses2.body.data.addresses | Where-Object { $_.isDefault -eq $true }).Count
$defaultIdAfterSet = ($addresses2.body.data.addresses | Where-Object { $_.isDefault -eq $true } | Select-Object -First 1).id

$deleteDefaultResp = Api 'DELETE' "/user/addresses/$addr2Id" $sessionA
$addresses3 = Api 'GET' '/user/addresses' $sessionA
$defaultsAfterDelete = @($addresses3.body.data.addresses | Where-Object { $_.isDefault -eq $true })

$editResp = Api 'PATCH' "/user/addresses/$addr3Id" $sessionA @{ street='103 Updated Audit Street'; city='Mysore' }
$addresses4 = Api 'GET' '/user/addresses' $sessionA
$editedAddr = $addresses4.body.data.addresses | Where-Object { $_.id -eq $addr3Id } | Select-Object -First 1

# Create one address for userB (security checks)
$addrB = Api 'POST' '/user/addresses' $sessionB @{ name='Bob One'; phone='9876543222'; street='201 Evil Street'; city='Delhi'; state='Delhi'; pincode='110001' }
$addrBId = $addrB.body.data.address.id

# Phase3 checkout no-address and normal place order attempt
$cartAdd = Api 'POST' '/cart' $sessionA @{ productId='334ff18f-4726-4a82-aed0-ac078a1c4e8d'; variantId='da98029b-4101-4f2f-833b-c72a5aab4775'; size='9'; quantity=1 }
$checkoutNoAddress = Api 'POST' '/orders' $sessionA @{}
$checkoutWithAddress = Api 'POST' '/orders' $sessionA @{ addressId=$addr3Id; paymentMethod='COD' }

# Seed manual order for phase2/4/5 verification
$seedOrderId = (npx tsx d:\Velvet\backend\scripts\seed-order-for-qa.ts $userAId $editedAddr.name $editedAddr.phone $editedAddr.street $editedAddr.city $editedAddr.state $editedAddr.pincode | Select-Object -Last 1).Trim()
$orderBeforeMutations = Api 'GET' "/orders/$seedOrderId" $sessionA
$snapshotBefore = $orderBeforeMutations.body.data.order.shippingAddress

$mutateAddress = Api 'PATCH' "/user/addresses/$addr3Id" $sessionA @{ name='Alice Changed'; phone='9123456789'; street='Mutated Street'; city='Chennai'; state='Tamil Nadu'; pincode='600001' }
$orderAfterEdit = Api 'GET' "/orders/$seedOrderId" $sessionA
$snapshotAfterEdit = $orderAfterEdit.body.data.order.shippingAddress

$deleteUsedAddress = Api 'DELETE' "/user/addresses/$addr3Id" $sessionA
$orderAfterDelete = Api 'GET' "/orders/$seedOrderId" $sessionA
$snapshotAfterDelete = $orderAfterDelete.body.data.order.shippingAddress

# Rapid click simulation
$newAddr = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Rapid'; phone='9876543255'; street='104 Test Street'; city='Pune'; state='Maharashtra'; pincode='411001'; isDefault=$true }
$rapidAddressId = $newAddr.body.data.address.id
$cartAddRapid = Api 'POST' '/cart' $sessionA @{ productId='334ff18f-4726-4a82-aed0-ac078a1c4e8d'; variantId='da98029b-4101-4f2f-833b-c72a5aab4775'; size='9'; quantity=1 }
$rapid1 = Api 'POST' '/orders' $sessionA @{ addressId=$rapidAddressId; paymentMethod='COD' }
$rapid2 = Api 'POST' '/orders' $sessionA @{ addressId=$rapidAddressId; paymentMethod='COD' }

# Security tests
$otherUserOrderAccess = Api 'GET' "/orders/$seedOrderId" $sessionB
$randomOrderAccess = Api 'GET' '/orders/00000000-0000-0000-0000-000000000000' $sessionB
$editOthersAddress = Api 'PATCH' "/user/addresses/$addrBId" $sessionA @{ city='Hijack City' }
$deleteOthersAddress = Api 'DELETE' "/user/addresses/$addrBId" $sessionA

# Empty state API checks
$userBOrders = Api 'GET' '/orders' $sessionB
$noAddrSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$noAddrEmail = "qa_empty_addr_$stamp@test.local"
$null = Api 'POST' '/auth/signup' $noAddrSession @{ name='QA Empty Addr'; email=$noAddrEmail; password='Password123!' }
$null = Api 'POST' '/auth/login' $noAddrSession @{ email=$noAddrEmail; password='Password123!' }
$userNoAddrList = Api 'GET' '/user/addresses' $noAddrSession

$result = [ordered]@{
  meta = @{ runAtUtc = [DateTime]::UtcNow.ToString('o'); userA = $userA.email; userB = $userB.email; userAId = $userAId; userBId = $userBId; seededOrderId = $seedOrderId }
  phase1 = @{
    addAddressStatuses = @($addr1.status, $addr2.status, $addr3.status)
    oneDefaultAfterAdds = ($defaultsCountInitial -eq 1)
    setDefaultStatus = $setDefaultResp.status
    oneDefaultAfterChange = ($defaultsCountAfterSet -eq 1)
    defaultIdAfterChange = $defaultIdAfterSet
    deleteDefaultStatus = $deleteDefaultResp.status
    defaultsCountAfterDeleteDefault = $defaultsAfterDelete.Count
    editStatus = $editResp.status
    editPersisted = ($editedAddr.street -eq '103 Updated Audit Street' -and $editedAddr.city -eq 'Mysore')
  }
  phase2 = @{
    orderCreationViaCheckoutStatus = $checkoutWithAddress.status
    seededOrderFetchStatus = $orderBeforeMutations.status
    snapshotUnchangedAfterAddressEdit = ($snapshotBefore -eq $snapshotAfterEdit)
    snapshotUnchangedAfterAddressDelete = ($snapshotBefore -eq $snapshotAfterDelete)
  }
  phase3 = @{
    checkoutWithoutAddressStatus = $checkoutNoAddress.status
    checkoutWithoutAddressBlocked = ($checkoutNoAddress.status -eq 400)
    checkoutWithAddressStatus = $checkoutWithAddress.status
    rapidNoKeyStatuses = @($rapid1.status, $rapid2.status)
  }
  phase4 = @{
    otherUserOrderAccessStatus = $otherUserOrderAccess.status
    randomOrderAccessStatus = $randomOrderAccess.status
    editOthersAddressStatus = $editOthersAddress.status
    deleteOthersAddressStatus = $deleteOthersAddress.status
  }
  phase5 = @{
    snapshotBefore = $snapshotBefore
    snapshotAfterEdit = $snapshotAfterEdit
    snapshotAfterDelete = $snapshotAfterDelete
  }
  phase6 = @{
    userBOrdersCount = @($userBOrders.body.data.orders).Count
    userNoAddressCount = @($userNoAddrList.body.data.addresses).Count
  }
  diagnostics = @{
    cartAddStatus = $cartAdd.status
    cartAddRapidStatus = $cartAddRapid.status
    checkoutWithAddressRaw = $checkoutWithAddress.raw
  }
}

$result | ConvertTo-Json -Depth 20
