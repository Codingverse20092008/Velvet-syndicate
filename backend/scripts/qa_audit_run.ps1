$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

function ParseJson($s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  return ($s | ConvertFrom-Json)
}

function Api($method, $path, $session, $body=$null) {
  $params = @{ Method = $method; Uri = "$base$path"; WebSession = $session; UseBasicParsing = $true }
  if ($null -ne $body) {
    $params.ContentType = 'application/json'
    $params.Body = ($body | ConvertTo-Json -Depth 10)
  }
  try {
    $resp = Invoke-WebRequest @params
    return [pscustomobject]@{ status = [int]$resp.StatusCode; body = (ParseJson $resp.Content) }
  } catch {
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

function Assert($cond, $msg) { if (-not $cond) { throw "ASSERT_FAIL: $msg" } }

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userA = [pscustomobject]@{ name='QA User A'; email="qa_a_$stamp@test.local"; password='Password123!' }
$userB = [pscustomobject]@{ name='QA User B'; email="qa_b_$stamp@test.local"; password='Password123!' }

$sessionA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$null = Api 'POST' '/auth/signup' $sessionA @{ name=$userA.name; email=$userA.email; password=$userA.password }
$null = Api 'POST' '/auth/signup' $sessionB @{ name=$userB.name; email=$userB.email; password=$userB.password }
$loginA = Api 'POST' '/auth/login' $sessionA @{ email=$userA.email; password=$userA.password }
$loginB = Api 'POST' '/auth/login' $sessionB @{ email=$userB.email; password=$userB.password }
Assert ($loginA.status -eq 200 -and $loginB.status -eq 200) 'Login failed'

$chosen = [pscustomobject]@{ productId='334ff18f-4726-4a82-aed0-ac078a1c4e8d'; variantId='da98029b-4101-4f2f-833b-c72a5aab4775'; size='9'; price=1999 }

$addr1 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice One'; phone='9876543210'; street='101 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560001' }
$addr2 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Two'; phone='9876543211'; street='102 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560002' }
$addr3 = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Three'; phone='9876543212'; street='103 Test Street'; city='Bangalore'; state='Karnataka'; pincode='560003' }

$addresses1 = Api 'GET' '/user/addresses' $sessionA
$allA = @($addresses1.body.data.addresses)
$defaultsCountInitial = @($allA | Where-Object { $_.isDefault -eq $true }).Count
Assert ($defaultsCountInitial -eq 1) 'Expected exactly one default after multiple adds'

$addr2Id = $addr2.body.data.address.id
$addr3Id = $addr3.body.data.address.id
$null = Api 'POST' "/user/addresses/$addr2Id/default" $sessionA
$addresses2 = Api 'GET' '/user/addresses' $sessionA
$defaultsCountAfterSet = @($addresses2.body.data.addresses | Where-Object { $_.isDefault -eq $true }).Count
$defaultIdAfterSet = ($addresses2.body.data.addresses | Where-Object { $_.isDefault -eq $true } | Select-Object -First 1).id
Assert ($defaultsCountAfterSet -eq 1 -and $defaultIdAfterSet -eq $addr2Id) 'Default change failed or multiple defaults found'

$null = Api 'DELETE' "/user/addresses/$addr2Id" $sessionA
$addresses3 = Api 'GET' '/user/addresses' $sessionA
$defaultsAfterDelete = @($addresses3.body.data.addresses | Where-Object { $_.isDefault -eq $true })
$defaultHandling = if (@($addresses3.body.data.addresses).Count -gt 0) { $defaultsAfterDelete.Count -eq 1 } else { $true }
Assert $defaultHandling 'Default handling invalid after deleting default address'

$editedStreet = '103 Updated Audit Street'
$editedCity = 'Mysore'
$null = Api 'PATCH' "/user/addresses/$addr3Id" $sessionA @{ street=$editedStreet; city=$editedCity }
$addresses4 = Api 'GET' '/user/addresses' $sessionA
$edited = $addresses4.body.data.addresses | Where-Object { $_.id -eq $addr3Id } | Select-Object -First 1
Assert ($edited.street -eq $editedStreet -and $edited.city -eq $editedCity) 'Address edit did not persist'

$addrB = Api 'POST' '/user/addresses' $sessionB @{ name='Bob One'; phone='9876543222'; street='201 Evil Street'; city='Delhi'; state='Delhi'; pincode='110001' }
$addrBId = $addrB.body.data.address.id

$null = Api 'POST' '/cart' $sessionA @{ productId=$chosen.productId; variantId=$chosen.variantId; size=$chosen.size; quantity=1 }
$noAddressOrder = Api 'POST' '/orders' $sessionA @{}

$cartBefore = Api 'GET' '/cart' $sessionA
$expectedTotal = [double]$cartBefore.body.data.cart.total
$order1 = Api 'POST' '/orders' $sessionA @{ addressId=$addr3Id; paymentMethod='COD' }
Assert ($order1.status -eq 201) 'Valid order creation failed'
$order1Id = $order1.body.data.order.id

$order1Details = Api 'GET' "/orders/$order1Id" $sessionA
$order1Total = [double]$order1Details.body.data.order.totalAmount
$order1ItemsCount = @($order1Details.body.data.order.items).Count
$snapshotBefore = $order1Details.body.data.order.shippingAddress

$null = Api 'PATCH' "/user/addresses/$addr3Id" $sessionA @{ street='103 Mutated After Order'; city='Chennai'; state='Tamil Nadu'; pincode='600001'; phone='9123456789'; name='Alice Changed' }
$orderAfterEdit = Api 'GET' "/orders/$order1Id" $sessionA
$snapshotAfterEdit = $orderAfterEdit.body.data.order.shippingAddress

$null = Api 'DELETE' "/user/addresses/$addr3Id" $sessionA
$orderAfterDelete = Api 'GET' "/orders/$order1Id" $sessionA
$snapshotAfterDelete = $orderAfterDelete.body.data.order.shippingAddress

$null = Api 'POST' '/user/addresses' $sessionA @{ name='Alice Four'; phone='9876543233'; street='104 Test Street'; city='Pune'; state='Maharashtra'; pincode='411001'; isDefault=$true }
$addressesFinal = Api 'GET' '/user/addresses' $sessionA
$addressForRapid = ($addressesFinal.body.data.addresses | Select-Object -First 1).id
$null = Api 'POST' '/cart' $sessionA @{ productId=$chosen.productId; variantId=$chosen.variantId; size=$chosen.size; quantity=1 }
$key = "idem-$stamp"
$rapid1 = Api 'POST' '/orders' $sessionA @{ addressId=$addressForRapid; paymentMethod='COD'; idempotencyKey=$key }
$rapid2 = Api 'POST' '/orders' $sessionA @{ addressId=$addressForRapid; paymentMethod='COD'; idempotencyKey=$key }
$ordersAfterRapid = Api 'GET' '/orders' $sessionA
$rapidOrdersWithSameId = @($ordersAfterRapid.body.data.orders | Where-Object { $_.idempotencyKey -eq $key })

$null = Api 'POST' '/cart' $sessionA @{ productId=$chosen.productId; variantId=$chosen.variantId; size=$chosen.size; quantity=1 }
$rapidNoKey1 = Api 'POST' '/orders' $sessionA @{ addressId=$addressForRapid; paymentMethod='COD' }
$rapidNoKey2 = Api 'POST' '/orders' $sessionA @{ addressId=$addressForRapid; paymentMethod='COD' }

$unauthOrderAccess = Api 'GET' "/orders/$order1Id" $sessionB
$randomOrderAccess = Api 'GET' "/orders/00000000-0000-0000-0000-000000000000" $sessionB
$editOthersAddress = Api 'PATCH' "/user/addresses/$addrBId" $sessionA @{ city='Hijack City' }
$deleteOthersAddress = Api 'DELETE' "/user/addresses/$addrBId" $sessionA

$userBOrders = Api 'GET' '/orders' $sessionB
$userBAddresses = Api 'GET' '/user/addresses' $sessionB

$result = [ordered]@{
  testUsers = @{ userA = $userA.email; userB = $userB.email }
  phase1 = @{
    oneDefaultAfterMultipleAdds = ($defaultsCountInitial -eq 1)
    oneDefaultAfterChange = ($defaultsCountAfterSet -eq 1)
    changedDefaultId = $defaultIdAfterSet
    deletedDefaultHandled = $defaultHandling
    editPersisted = ($edited.street -eq $editedStreet -and $edited.city -eq $editedCity)
  }
  phase2 = @{
    orderCreated = ($order1.status -eq 201)
    orderId = $order1Id
    snapshotUnchangedAfterEdit = ($snapshotBefore -eq $snapshotAfterEdit)
    snapshotUnchangedAfterDelete = ($snapshotBefore -eq $snapshotAfterDelete)
  }
  phase3 = @{
    checkoutBlockedWithoutAddress = ($noAddressOrder.status -eq 400)
    checkoutWithoutAddressStatus = $noAddressOrder.status
    orderSuccess = ($order1.status -eq 201)
    totalCorrect = ([Math]::Abs($order1Total - $expectedTotal) -lt 0.0001)
    itemsPresent = ($order1ItemsCount -gt 0)
    rapidDoubleSubmitOneOrderWithIdempotency = (@($rapidOrdersWithSameId).Count -eq 1)
    rapidWithKeyStatuses = @($rapid1.status, $rapid2.status)
    rapidWithoutKeyStatuses = @($rapidNoKey1.status, $rapidNoKey2.status)
  }
  phase4 = @{
    otherUserOrderAccessDenied = ($unauthOrderAccess.status -in @(403,404))
    otherUserOrderAccessStatus = $unauthOrderAccess.status
    randomOrderNotFound = ($randomOrderAccess.status -eq 404)
    editOthersAddressDenied = ($editOthersAddress.status -in @(403,404))
    editOthersAddressStatus = $editOthersAddress.status
    deleteOthersAddressDenied = ($deleteOthersAddress.status -in @(403,404))
    deleteOthersAddressStatus = $deleteOthersAddress.status
  }
  integrity = @{
    snapshotBefore = $snapshotBefore
    snapshotAfterEdit = $snapshotAfterEdit
    snapshotAfterDelete = $snapshotAfterDelete
  }
  emptyStateApi = @{
    userBOrdersCount = @($userBOrders.body.data.orders).Count
    userBAddressesCount = @($userBAddresses.body.data.addresses).Count
  }
}

$result | ConvertTo-Json -Depth 20
