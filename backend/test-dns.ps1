
$Dns = [System.Net.Dns]::GetHostEntry("cluster0.ed51bbf.mongodb.net")
$Dns.AddressList | ForEach-Object { $_.IPAddressToString }
